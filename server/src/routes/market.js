const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Advanced price fluctuation using seeded LCG
// Fluctuation range: -25% to +25% with non-linear distribution (more stable, occasional spikes)
function calcPrice(basePrice, cityId, goodsId, dateStr) {
  const seed = cityId * 1000000 + goodsId * 10000 + parseInt(dateStr);
  let rng = seed;
  for(let i=0;i<5;i++) rng=(rng*16807)%2147483647;
  const raw = (rng % 1001) - 500;
  const pct = raw / 400;
  const price = Math.max(10, Math.round(basePrice * (1 + pct/100)));
  return price;
}

function calcFluctuationPct(basePrice, price) {
  return Math.round((price - basePrice) / basePrice * 100);
}

router.get('/info', authMiddleware, async (req, res, next) => {
  try {
    const user = await db.getOne('SELECT place_id, ship_id, money FROM `user` WHERE `id` = ?', [req.user.id]);
    const place = await db.getOne("SELECT * FROM `place` WHERE `id` = ?", [user.place_id]);
    if (!place || !place.city_id) return res.status(400).json({ error: '只能在城市内交易' });
    const city = await db.getOne("SELECT * FROM `map` WHERE `id` = ?", [place.city_id]);
    const regionId = await db.getVar("SELECT `parent_id` FROM `map` WHERE `id` = ?", [city.id]);
    const regionName = regionId ? await db.getVar("SELECT `name` FROM `map` WHERE `id` = ?", [regionId]) : '';
    let ship = null, cargoUsed = 0, cargoMax = 0;
    if (user.ship_id > 0) {
      ship = await db.getOne("SELECT * FROM `ship` WHERE `id` = ?", [user.ship_id]);
      if (ship) {
        cargoMax = ship.capacity;
        const cargoRows = await db.getAll("SELECT c.*, g.weight FROM `cargo` c JOIN `goods` g ON c.goods_id = g.id WHERE c.user_id = ?", [req.user.id]);
        cargoRows.forEach(r => cargoUsed += r.quantity * r.weight);
      }
    }
    const today = new Date().toISOString().slice(0,10).replace(/-/g,'');
    const goodsList = await db.getAll("SELECT g.*, mp.base_price FROM goods g JOIN market_price mp ON g.id=mp.goods_id WHERE mp.city_id=? ORDER BY g.category, g.id", [city.id]);
    goodsList.forEach(g => {
      g.price = calcPrice(g.base_price, city.id, g.id, today);
      g.fluctuation = calcFluctuationPct(g.base_price, g.price);
    });
    const cargoHolds = await db.getAll("SELECT goods_id, quantity FROM cargo WHERE user_id=?", [req.user.id]);
    const holdMap = {};
    cargoHolds.forEach(ch => holdMap[ch.goods_id] = ch.quantity);
    goodsList.forEach(g => g.hold = holdMap[g.id] || 0);
    const hotGoods = [1,2,4,7,9,11];
    const priceHints = [];
    for (const gid of hotGoods) {
      const gn = await db.getVar("SELECT name FROM goods WHERE id=?", [gid]);
      if (!gn) continue;
      const regs = await db.getAll("SELECT m.parent_id as rid, r.name as rname, ROUND(AVG(mp.base_price)) as avgp FROM market_price mp JOIN map m ON mp.city_id=m.id JOIN map r ON m.parent_id=r.id WHERE mp.goods_id=? AND m.parent_id!=? GROUP BY m.parent_id ORDER BY avgp", [gid, regionId]);
      priceHints.push({ name: gn, regions: regs });
    }
    res.json({ city, regionName, ship, cargoUsed, cargoMax, goodsList, priceHints, money: user.money });
  } catch(e){next(e);}
});

router.post('/buy', authMiddleware, async (req, res, next) => {
  try {
    const { goods_id, quantity } = req.body;
    const qty = Math.max(1, parseInt(quantity)||1);
    const user = await db.getOne('SELECT place_id, ship_id, money FROM `user` WHERE `id` = ?', [req.user.id]);
    const place = await db.getOne("SELECT * FROM `place` WHERE `id` = ?", [user.place_id]);
    if (!place || !place.city_id) return res.status(400).json({ error: '只能在城市内交易' });
    if (!user.ship_id) return res.status(400).json({ error: '需要先拥有船只！' });
    const g = await db.getOne("SELECT g.*, mp.base_price FROM goods g JOIN market_price mp ON g.id=mp.goods_id WHERE mp.city_id=? AND g.id=?", [place.city_id, goods_id]);
    if (!g) return res.status(400).json({ error: '商品不存在' });
    const today = new Date().toISOString().slice(0,10).replace(/-/g,'');
    const price = calcPrice(g.base_price, place.city_id, g.id, today);
    const cost = price * qty;
    if (user.money < cost) return res.status(400).json({ error: `铜币不足，需要${cost}铜` });
    const ship = await db.getOne("SELECT * FROM `ship` WHERE `id` = ?", [user.ship_id]);
    const cargoRows = await db.getAll("SELECT c.*, g.weight FROM `cargo` c JOIN `goods` g ON c.goods_id = g.id WHERE c.user_id = ?", [req.user.id]);
    let cargoUsed = 0;
    cargoRows.forEach(r => cargoUsed += r.quantity * r.weight);
    if (cargoUsed + g.weight * qty > ship.capacity) return res.status(400).json({ error: `货舱不足，剩余${ship.capacity}/${cargoUsed}` });
    await db.query('UPDATE `user` SET money = money - ? WHERE `id` = ?', [cost, req.user.id]);
    const existing = await db.getOne("SELECT * FROM cargo WHERE user_id=? AND goods_id=?", [req.user.id, goods_id]);
    if (existing) await db.update('cargo', { quantity: existing.quantity + qty }, 'id=?', [existing.id]);
    else await db.insert('cargo', { user_id: req.user.id, goods_id, quantity: qty });

    try {
      const today = new Date().toISOString().slice(0,10);
      await db.query('INSERT IGNORE INTO `user_daily_activity` (user_id, date, activity_key, progress, claimed, updated_at) VALUES (?, ?, ?, 1, 0, ?)',
        [req.user.id, today, 'daily_trade', Math.floor(Date.now()/1000)]);
      await db.query('UPDATE `user_daily_activity` SET progress = LEAST(progress + 1, 5), updated_at = ? WHERE user_id = ? AND date = ? AND activity_key = ?',
        [Math.floor(Date.now()/1000), req.user.id, today, 'daily_trade']);
    } catch(e) { console.error('[daily] daily_trade progress error:', e.message); }

    res.json({ success: true, msg: `买入${g.name}×${qty}，花费${cost}铜币` });
  } catch(e){next(e);}
});

router.post('/sell', authMiddleware, async (req, res, next) => {
  try {
    const { goods_id, quantity } = req.body;
    const qty = Math.max(1, parseInt(quantity)||1);
    const c = await db.getOne("SELECT * FROM cargo WHERE user_id=? AND goods_id=?", [req.user.id, goods_id]);
    if (!c || c.quantity < qty) return res.status(400).json({ error: '货舱中没有足够的货物' });
    const user = await db.getOne('SELECT place_id FROM `user` WHERE `id` = ?', [req.user.id]);
    const place = await db.getOne("SELECT * FROM `place` WHERE `id` = ?", [user.place_id]);
    const g = await db.getOne("SELECT g.*, mp.base_price FROM goods g JOIN market_price mp ON g.id=mp.goods_id WHERE mp.city_id=? AND g.id=?", [place.city_id, goods_id]);
    if (!g) return res.status(400).json({ error: '此城市不收购该商品' });
    const today = new Date().toISOString().slice(0,10).replace(/-/g,'');
    const price = calcPrice(g.base_price, place.city_id, g.id, today);
    const gain = Math.round(price * qty * 0.9);
    if (c.quantity == qty) await db.delete('cargo', 'id=?', [c.id]);
    else await db.update('cargo', { quantity: c.quantity - qty }, 'id=?', [c.id]);
    await db.query('UPDATE `user` SET money = money + ? WHERE `id` = ?', [gain, req.user.id]);
    res.json({ success: true, msg: `卖出${g.name}×${qty}，获得${gain}铜币` });

    try {
      const today = new Date().toISOString().slice(0,10);
      await db.query('INSERT IGNORE INTO `user_daily_activity` (user_id, date, activity_key, progress, claimed, updated_at) VALUES (?, ?, ?, 1, 0, ?)',
        [req.user.id, today, 'daily_trade', Math.floor(Date.now()/1000)]);
      await db.query('UPDATE `user_daily_activity` SET progress = LEAST(progress + 1, 5), updated_at = ? WHERE user_id = ? AND date = ? AND activity_key = ?',
        [Math.floor(Date.now()/1000), req.user.id, today, 'daily_trade']);
    } catch(e) { console.error('[daily] trade progress error:', e.message); }
  } catch(e){next(e);}
});

module.exports = router;
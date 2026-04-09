const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

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
      const seed = city.id * 10000 + g.id * 100 + parseInt(today);
      let rng = seed; for(let i=0;i<4;i++) rng=(rng*16807)%2147483647;
      const pct = (rng % 31) - 15;
      g.price = Math.max(10, Math.round(g.base_price * (1 + pct/100)));
    });
    const cargoHolds = await db.getAll("SELECT goods_id, quantity FROM cargo WHERE user_id=?", [req.user.id]);
    const holdMap = {};
    cargoHolds.forEach(ch => holdMap[ch.goods_id] = ch.quantity);
    goodsList.forEach(g => g.hold = holdMap[g.id] || 0);
    // Price hints
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
    const seed = place.city_id * 10000 + g.id * 100 + parseInt(today);
    let rng = seed; for(let i=0;i<4;i++) rng=(rng*16807)%2147483647;
    const pct = (rng % 31) - 15;
    const price = Math.max(10, Math.round(g.base_price * (1 + pct/100)));
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
    const seed = place.city_id * 10000 + g.id * 100 + parseInt(today);
    let rng = seed; for(let i=0;i<4;i++) rng=(rng*16807)%2147483647;
    const pct = (rng % 31) - 15;
    const price = Math.max(10, Math.round(g.base_price * (1 + pct/100)));
    const gain = Math.round(price * qty * 0.9);
    if (c.quantity == qty) await db.delete('cargo', 'id=?', [c.id]);
    else await db.update('cargo', { quantity: c.quantity - qty }, 'id=?', [c.id]);
    await db.query('UPDATE `user` SET money = money + ? WHERE `id` = ?', [gain, req.user.id]);
    res.json({ success: true, msg: `卖出${g.name}×${qty}，获得${gain}铜币` });
  } catch(e){next(e);}
});

module.exports = router;

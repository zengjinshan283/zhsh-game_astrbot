const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

function getSailMinutes(speed){return {1:10,2:6,3:3,5:1}[speed]||10;}

router.get('/status', authMiddleware, async (req, res, next) => {
  try {
    const user = await db.getOne(
      'SELECT place_id, ship_id, sail_time, sail_from, sail_to, sail_event_checked_at, sail_remaining_sec, sail_paused FROM `user` WHERE `id` = ?',
      [req.user.id]
    );

    let ship = null;
    if (user.ship_id > 0) ship = await db.getOne("SELECT * FROM `ship` WHERE `id` = ?", [user.ship_id]);
    const allShips = await db.getAll("SELECT * FROM `ship` ORDER BY `price`");

    const place = await db.getOne("SELECT * FROM `place` WHERE `id` = ?", [user.place_id]);
    let city = null, isDock = false, reachableCities = [];
    if (place && place.city_id) {
      city = await db.getOne("SELECT * FROM `map` WHERE `id` = ?", [place.city_id]);
      isDock = place.type === 1;
      if (city) {
        const seaId = city.parent_id;
        const seen = new Set();
        const addCities = await db.getAll("SELECT * FROM `map` WHERE `type` = 1 AND `id` != ? AND `parent_id` = ? ORDER BY `id`", [city.id, seaId]);
        addCities.forEach(c => { if(!seen.has(c.id)){seen.add(c.id);reachableCities.push(c);} });
        const neighborSeas = await db.getAll("SELECT id FROM `map` WHERE `parent_id` = ?", [seaId]);
        for (const ns of neighborSeas) {
          if (ns.id === seaId) continue;
          const nc = await db.getAll("SELECT * FROM `map` WHERE `type` = 1 AND `parent_id` = ? ORDER BY `id`", [ns.id]);
          nc.forEach(c => { if(!seen.has(c.id)){seen.add(c.id);reachableCities.push(c);} });
        }
      }
    }

    let isSailing = false, sailProgress = 0, sailRemain = 0, sailFromCity = '', sailToCity = '';

    if (user.sail_time > 0 && ship) {
      const duration = getSailMinutes(ship.speed) * 60;
      const nowTs = Math.floor(Date.now()/1000);
      const elapsed = nowTs - user.sail_time;

      if (user.sail_paused) {
        const remainPaused = Math.max(1, Number(user.sail_remaining_sec || 1));
        const done = Math.max(0, duration - remainPaused);
        isSailing = true;
        sailProgress = Math.min(99, Math.round(done / duration * 100));
        sailRemain = Math.max(1, Math.ceil(remainPaused / 60));
        if (user.sail_from > 0) { const fc = await db.getOne("SELECT name FROM `map` WHERE `id` = ?", [user.sail_from]); sailFromCity = fc ? fc.name : '???'; }
        if (user.sail_to > 0) { const tc = await db.getOne("SELECT name FROM `map` WHERE `id` = ?", [user.sail_to]); sailToCity = tc ? tc.name : '???'; }
      } else {
        // 航行途中随机遇怪：A+中（20%）
        // 条件：航程超过20%，每30秒最多判定一次
        const progressRatio = duration > 0 ? (elapsed / duration) : 1;
        const canCheck = (!user.sail_event_checked_at || (nowTs - Number(user.sail_event_checked_at)) >= 30);
        if (elapsed < duration && progressRatio >= 0.2 && canCheck) {
          await db.query('UPDATE `user` SET sail_event_checked_at=? WHERE `id`=?', [nowTs, req.user.id]);
          const roll = Math.floor(Math.random()*100)+1;
          if (roll <= 20) {
            const remain = Math.max(1, duration - elapsed);
            await db.query('UPDATE `user` SET sail_paused=1, sail_remaining_sec=? WHERE `id`=?', [remain, req.user.id]);
            const fromCity = user.sail_from > 0 ? (await db.getOne("SELECT name FROM `map` WHERE `id` = ?", [user.sail_from]))?.name || '???' : '???';
            const toCity = user.sail_to > 0 ? (await db.getOne("SELECT name FROM `map` WHERE `id` = ?", [user.sail_to]))?.name || '???' : '???';
            return res.json({
              isSailing: true,
              paused: true,
              event: 'pirate_midway',
              msg: '🏴‍☠️ 航行途中遭遇海盗！',
              sailProgress: Math.max(1, Math.min(99, Math.round(progressRatio*100))),
              sailRemain: Math.ceil(remain / 60),
              sailFromCity: fromCity,
              sailToCity: toCity,
              ship, allShips, city, isDock, reachableCities,
              money: (await db.getOne('SELECT money FROM `user` WHERE `id` = ?', [req.user.id])).money
            });
          }
        }

        if (elapsed >= duration) {
          // 到港事件：仅宝藏/平安
          const eventType = Math.floor(Math.random()*10)+1;
          let msg = '🌊 平安到达目的地！';
          let event = 'safe';
          if (eventType <= 4) {
            const moneyFound = Math.floor(Math.random()*451)+50;
            await db.query('UPDATE `user` SET money = money + ? WHERE `id` = ?', [moneyFound, req.user.id]);
            msg = `🎁 航行途中发现了一箱宝藏！获得 ${moneyFound} 铜币！`;
            event = 'treasure';
          }

          let newPlaceId = user.place_id;
          if (user.sail_to > 0) {
            const dockPlace = await db.getOne("SELECT * FROM `place` WHERE `city_id` = ? AND `type` = 1 LIMIT 1", [user.sail_to]);
            newPlaceId = dockPlace ? dockPlace.id : user.place_id;
          }

          await db.query('UPDATE `user` SET place_id=?, sail_time=0, sail_from=0, sail_to=0, sail_event_checked_at=0, sail_remaining_sec=0, sail_paused=0 WHERE `id` = ?', [newPlaceId, req.user.id]);
          const updatedUser = await db.getOne('SELECT * FROM `user` WHERE `id` = ?', [req.user.id]);
          const updatedPlace = await db.getOne('SELECT city_id FROM `place` WHERE `id` = ?', [updatedUser.place_id]);
          const updatedCity = updatedPlace?.city_id ? await db.getOne("SELECT * FROM `map` WHERE `id` = ?", [updatedPlace.city_id]) : null;
          return res.json({ arrived: true, event, msg, user: updatedUser, ship, allShips, city: updatedCity });
        }

        isSailing = true;
        sailProgress = Math.round(elapsed / duration * 100);
        sailRemain = Math.ceil((duration - elapsed) / 60);
        if (user.sail_from > 0) { const fc = await db.getOne("SELECT name FROM `map` WHERE `id` = ?", [user.sail_from]); sailFromCity = fc ? fc.name : '???'; }
        if (user.sail_to > 0) { const tc = await db.getOne("SELECT name FROM `map` WHERE `id` = ?", [user.sail_to]); sailToCity = tc ? tc.name : '???'; }
      }
    }

    res.json({
      isSailing, sailProgress, sailRemain, sailFromCity, sailToCity,
      ship, allShips, city, isDock, reachableCities,
      money: (await db.getOne('SELECT money FROM `user` WHERE `id` = ?', [req.user.id])).money
    });
  } catch(e){next(e);}
});

router.post('/buy-ship', authMiddleware, async (req, res, next) => {
  try {
    const { ship_id } = req.body;
    const user = await db.getOne('SELECT ship_id, money FROM `user` WHERE `id` = ?', [req.user.id]);
    const ship = await db.getOne("SELECT * FROM `ship` WHERE `id` = ?", [ship_id]);
    if (!ship) return res.status(400).json({ error: '船只不存在' });
    if (user.ship_id == ship_id) return res.status(400).json({ error: '你已经拥有这艘船了' });
    if (user.money < ship.price) return res.status(400).json({ error: `铜钱不足！需要 ${ship.price} 铜钱` });
    await db.query('UPDATE `user` SET money = money - ?, ship_id = ? WHERE `id` = ?', [ship.price, ship_id, req.user.id]);
    res.json({ success: true, msg: `🎉 成功购买了「${ship.name}」！` });
  } catch(e){next(e);}
});

router.post('/depart', authMiddleware, async (req, res, next) => {
  try {
    const { target_city_id } = req.body;
    const user = await db.getOne('SELECT place_id, ship_id, sail_time, hp FROM `user` WHERE `id` = ?', [req.user.id]);
    if (user.sail_time > 0) return res.status(400).json({ error: '正在航海中' });
    if (!user.ship_id) return res.status(400).json({ error: '没有船只' });
    if (user.hp <= 0) return res.status(400).json({ error: '体力不足，无法出海' });
    const place = await db.getOne("SELECT * FROM `place` WHERE `id` = ?", [user.place_id]);
    if (!place || place.type !== 1) return res.status(400).json({ error: '需要在码头才能出航' });
    const targetCity = await db.getOne("SELECT * FROM `map` WHERE `id` = ? AND `type` = 1", [target_city_id]);
    if (!targetCity) return res.status(400).json({ error: '目标城市不存在' });
    if (targetCity.id === place.city_id) return res.status(400).json({ error: '你已经在当前城市了' });
    await db.query('UPDATE `user` SET sail_time=?, sail_from=?, sail_to=?, sail_event_checked_at=0, sail_remaining_sec=0, sail_paused=0 WHERE `id` = ?', [Math.floor(Date.now()/1000), place.city_id, target_city_id, req.user.id]);
    res.json({ success: true });
  } catch(e){next(e);}
});

module.exports = router;

const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

function getSailMinutes(speed){return {1:3,2:2,3:1,5:0}[speed]||3;}
// speed 5 = 0.5分钟（测试用极速），JS里0*60=0会导致除零，改用0.5
function getSailDurationSec(speed){const m=getSailMinutes(speed);return (m===0?0.5:m)*60;}
// ============================================================
 // 航海事件系统：5种随机事件类型
 // ============================================================

 // 事件定义：type, trigger probability (out of 100), label, description
 const SAIL_EVENTS = [
   { type: 'pirate',       prob: 20, label: '海盗船',     desc: '遭遇海盗拦截！' },
   { type: 'drift_bottle', prob: 15, label: '漂流瓶',     desc: '海面漂浮着一个瓶子…' },
   { type: 'reef',        prob: 15, label: '暗礁',       desc: '前方发现暗礁群！' },
   { type: 'sea_monster', prob: 10, label: '海怪',       desc: '海面掀起巨大波澜，有东西在靠近…' },
   { type: 'merchant',    prob: 10, label: '商船',       desc: '一艘商船缓缓驶来…' },
   { type: 'storm',       prob: 10, label: '风暴',       desc: '乌云压顶，风浪渐起！' },
 ];

 // 根据概率选择一个事件类型
 function randomSailEvent() {
   const roll = Math.floor(Math.random() * 100) + 1;
   let cumulative = 0;
   for (const e of SAIL_EVENTS) {
     cumulative += e.prob;
     if (roll <= cumulative) return e;
   }
   return null; // no event
 }

 // 处理到达港事件
 function arrivalEvent() {
   const roll = Math.floor(Math.random() * 100) + 1;
   if (roll <= 40) {
     // 宝藏：40%概率
     const moneyFound = Math.floor(Math.random() * 451) + 50;
     return { event: 'treasure', msg: `🎁 航行途中发现了一箱宝藏！获得 ${moneyFound} 铜币！`, moneyGain: moneyFound };
   } else if (roll <= 55) {
     // 暗礁受损：15%
     const dmg = Math.floor(Math.random() * 51) + 20;
     return { event: 'reef_damage', msg: `🪸 触礁了！船身受损，失去 ${dmg} 点耐久`, shipDmg: dmg };
   } else if (roll <= 65) {
     // 天气延误：10%
     const delay = Math.floor(Math.random() * 3) + 2;
     return { event: 'weather_delay', msg: `⛈️ 遭遇风雨，航程延长 ${delay} 分钟`, delayMin: delay };
   }
   // 平安：35%
   return { event: 'safe', msg: '🌊 平安到达目的地！', moneyGain: 0, shipDmg: 0, delayMin: 0 };
 }

 // ============================================================
 // 主状态查询 + 事件触发
 // ============================================================
 router.get('/status', authMiddleware, async (req, res, next) => {
   try {
     const user = await db.getOne(
       'SELECT place_id, ship_id, sail_time, sail_from, sail_to, sail_event_checked_at, sail_remaining_sec, sail_paused FROM `user` WHERE `id` = ?',
       [req.user.id]
     );

     let ship = null, shipHp = 0, shipHpMax = 0;
     if (user.ship_id > 0) {
       ship = await db.getOne("SELECT * FROM `ship` WHERE `id` = ?", [user.ship_id]);
       if (ship) {
         const us = await db.getOne('SELECT hp, hp_max FROM `user_ship` WHERE `user_id` = ? AND `ship_id` = ?', [req.user.id, user.ship_id]);
         shipHp = us ? us.hp : ship.hp_max;
         shipHpMax = ship.hp_max;
       }
     }
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
       const duration = getSailDurationSec(ship.speed);
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
         // 航行途中随机事件检查
         const progressRatio = duration > 0 ? (elapsed / duration) : 1;
         const canCheckTs = Number(user.sail_event_checked_at) || 0;
         if (elapsed < duration && progressRatio >= 0.2 && (nowTs - canCheckTs) >= 30) {
           const upd = await db.query('UPDATE `user` SET sail_event_checked_at=? WHERE `id`=? AND (sail_event_checked_at IS NULL OR sail_event_checked_at<?)', [nowTs, req.user.id, nowTs]);
           if (!upd || upd.affectedRows === 0) {
             isSailing = true;
             sailProgress = Math.max(1, Math.min(99, Math.round(progressRatio*100)));
             sailRemain = Math.ceil((duration - elapsed) / 60);
             if (user.sail_from > 0) { const fc = await db.getOne("SELECT name FROM `map` WHERE `id` = ?", [user.sail_from]); sailFromCity = fc ? fc.name : '???'; }
             if (user.sail_to > 0) { const tc = await db.getOne("SELECT name FROM `map` WHERE `id` = ?", [user.sail_to]); sailToCity = tc ? tc.name : '???'; }
             return res.json({ isSailing, sailProgress, sailRemain, sailFromCity, sailToCity, ship, shipHp, shipHpMax, allShips, city, isDock, reachableCities, money: (await db.getOne('SELECT money FROM `user` WHERE `id` = ?', [req.user.id])).money });
           }
           // 随机抽取一个事件
           const sailEvent = randomSailEvent();
           if (sailEvent) {
             const remain = Math.max(1, duration - elapsed);
             let eventData = { type: sailEvent.type, label: sailEvent.label, desc: sailEvent.desc };
             eventData.choices = buildEventChoices(sailEvent.type, req.user.id);
             eventData.remainSec = remain;
             await db.query('UPDATE `user` SET sail_paused=1, sail_remaining_sec=? WHERE `id`=?', [remain, req.user.id]);
             const fromCity = user.sail_from > 0 ? (await db.getOne("SELECT name FROM `map` WHERE `id` = ?", [user.sail_from]))?.name || '???' : '???';
             const toCity = user.sail_to > 0 ? (await db.getOne("SELECT name FROM `map` WHERE `id` = ?", [user.sail_to]))?.name || '???' : '???';
             return res.json({
               isSailing: true, paused: true,
               sailEvent: eventData,
               sailProgress: Math.max(1, Math.min(99, Math.round(progressRatio*100))),
               sailRemain: Math.ceil(remain / 60),
               sailFromCity: fromCity, sailToCity: toCity,
               ship, shipHp, shipHpMax, allShips, city, isDock, reachableCities,
               money: (await db.getOne('SELECT money FROM `user` WHERE `id` = ?', [req.user.id])).money
             });
           }
         }

         // 到达处理
         if (elapsed >= duration) {
           const arr = arrivalEvent();
           let msg = arr.msg;
           if (arr.moneyGain > 0) await db.query('UPDATE `user` SET money = money + ? WHERE `id` = ?', [arr.moneyGain, req.user.id]);
           if (arr.shipDmg > 0) {
             const curHp = await db.getOne('SELECT hp FROM `user_ship` WHERE `user_id`=? AND `ship_id`=?', [req.user.id, user.ship_id]);
             if (curHp) await db.query('UPDATE `user_ship` SET hp = GREATEST(1, hp - ?) WHERE `user_id`=? AND `ship_id`=?', [arr.shipDmg, req.user.id, user.ship_id]);
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
           const arrPlace = await db.getOne('SELECT city_id FROM `place` WHERE `id` = ?', [updatedUser.place_id]);
           let arrIsDock = false, arrReachable = [];
           if (arrPlace && arrPlace.city_id) {
             const arrCity = await db.getOne("SELECT * FROM `map` WHERE `id` = ?", [arrPlace.city_id]);
             arrIsDock = arrPlace.city_id === (place?.city_id) ? isDock : !!(await db.getOne("SELECT type FROM `place` WHERE `id` = ? AND `type` = 1", [updatedUser.place_id]));
             if (arrCity) {
               const arrSea = arrCity.parent_id;
               const seen2 = new Set();
               const ac1 = await db.getAll("SELECT * FROM `map` WHERE `type` = 1 AND `id` != ? AND `parent_id` = ? ORDER BY `id`", [arrCity.id, arrSea]);
               ac1.forEach(c => { if(!seen2.has(c.id)){seen2.add(c.id);arrReachable.push(c);} });
               const nbs = await db.getAll("SELECT id FROM `map` WHERE `parent_id` = ?", [arrSea]);
               for (const ns2 of nbs) { if (ns2.id !== arrSea) { const nc2 = await db.getAll("SELECT * FROM `map` WHERE `type` = 1 AND `parent_id` = ? ORDER BY `id`", [ns2.id]); nc2.forEach(c => { if(!seen2.has(c.id)){seen2.add(c.id);arrReachable.push(c);} }); } }
             }
           }
           let cargoUsed = 0, cargoMax = ship ? ship.capacity : 0;
           if (ship) { const cargoRows = await db.getAll("SELECT c.quantity, g.weight FROM `cargo` c JOIN `goods` g ON c.goods_id = g.id WHERE c.user_id = ?", [req.user.id]); cargoRows.forEach(r => cargoUsed += r.quantity * r.weight); }
           const ownedShipsArr = (await db.getAll('SELECT ship_id FROM user_ship WHERE user_id = ?', [req.user.id])).map(r => r.ship_id);
           return res.json({ arrived: true, event: arr.event, msg, user: updatedUser, ship, shipHp: (await db.getOne('SELECT hp FROM `user_ship` WHERE `user_id`=? AND `ship_id`=?', [req.user.id, user.ship_id]))?.hp || shipHp, shipHpMax, allShips, city: updatedCity, isDock: arrIsDock, reachableCities: arrReachable, money: updatedUser.money, cargoUsed, cargoMax, ownedShips: ownedShipsArr });
         }

         isSailing = true;
         sailProgress = Math.round(elapsed / duration * 100);
         sailRemain = Math.ceil((duration - elapsed) / 60);
         if (user.sail_from > 0) { const fc = await db.getOne("SELECT name FROM `map` WHERE `id` = ?", [user.sail_from]); sailFromCity = fc ? fc.name : '???'; }
         if (user.sail_to > 0) { const tc = await db.getOne("SELECT name FROM `map` WHERE `id` = ?", [user.sail_to]); sailToCity = tc ? tc.name : '???'; }
       }
     }

     let cargoUsed = 0, cargoMax = ship ? ship.capacity : 0;
     if (ship) { const cargoRows = await db.getAll("SELECT c.quantity, g.weight FROM `cargo` c JOIN `goods` g ON c.goods_id = g.id WHERE c.user_id = ?", [req.user.id]); cargoRows.forEach(r => cargoUsed += r.quantity * r.weight); }
     const ownedShipsArr = (await db.getAll('SELECT DISTINCT ship_id FROM user_ship WHERE user_id = ? UNION SELECT ship_id FROM user WHERE id = ?', [req.user.id, req.user.id])).map(r => r.ship_id);
     res.json({ isSailing, sailProgress, sailRemain, sailFromCity, sailToCity, ship, shipHp, shipHpMax, allShips, city, isDock, reachableCities, money: (await db.getOne('SELECT money FROM `user` WHERE `id` = ?', [req.user.id])).money, cargoUsed, cargoMax, ownedShips: ownedShipsArr });
   } catch(e){next(e);}
 });

 // 根据事件类型构建选项
 function buildEventChoices(eventType, userId) {
   switch (eventType) {
     case 'pirate':
       return [
         { action: 'fight', label: '⚔️ 迎战', desc: '消耗装备耐久，但有机会获得战利品' },
         { action: 'flee', label: '🏃 逃跑', desc: '消耗铜币，但安全脱离' }
       ];
     case 'sea_monster':
       return [
         { action: 'fight', label: '⚔️ 应战', desc: '高风险高回报，击败后可获得珍珠/海兽牙' },
         { action: 'flee', label: '🏃 逃离', desc: '消耗铜币，安全' }
       ];
     case 'merchant':
       return [
         { action: 'trade', label: '🤝 交易', desc: '可购买特殊货物赚取差价，或直接卖货获铜币' },
         { action: 'attack', label: '⚔️ 抢劫', desc: '风险行为，失败会损失声望' },
         { action: 'ignore', label: '🚶 离开', desc: '不发生任何事' }
       ];
     case 'drift_bottle':
       return [
         { action: 'open', label: '📦 打开瓶子', desc: '可能获得银币、物品或藏宝图碎片' },
         { action: 'ignore', label: '🚶 不理会', desc: '不发生任何事' }
       ];
     case 'reef':
       return [
         { action: 'slow', label: '🐢 减速绕行', desc: '航程延长3分钟，但船只安全' },
         { action: 'rush', label: '⚡ 全速冲过', desc: '可能触礁受损，但节省时间' }
       ];
     case 'storm':
       return [
         { action: 'shelter', label: '⛵ 寻找避风港', desc: '航程延长5分钟，船只安全' },
         { action: 'push', label: '🌊 强行穿越', desc: '可能遭遇船损，但也可能早到' }
       ];
     default:
       return [{ action: 'ignore', label: '🚶 离开', desc: '' }];
   }
}

// ============================================================
router.post('/buy-ship', authMiddleware, async (req, res, next) => {
  try {
    const { ship_id } = req.body;
    const user = await db.getOne('SELECT ship_id, money FROM `user` WHERE `id` = ?', [req.user.id]);
    const ship = await db.getOne("SELECT * FROM `ship` WHERE `id` = ?", [ship_id]);
    if (!ship) return res.status(400).json({ error: '船只不存在' });
    if (user.ship_id == ship_id) return res.status(400).json({ error: '你正在使用这艘船' });
    const owned = await db.getOne('SELECT id FROM user_ship WHERE user_id = ? AND ship_id = ?', [req.user.id, ship_id]);
    if (owned) {
      await db.query('UPDATE `user` SET ship_id = ? WHERE `id` = ?', [ship_id, req.user.id]);
      return res.json({ success: true, switched: true, msg: '⛵ 已切换到「' + ship.name + '」' });
    }
    if (user.money < ship.price) return res.status(400).json({ error: `铜钱不足！需要 ${ship.price} 铜钱` });
    await db.query('UPDATE `user` SET money = money - ?, ship_id = ? WHERE `id` = ?', [ship.price, ship_id, req.user.id]);
    await db.query('INSERT IGNORE INTO user_ship (user_id, ship_id) VALUES (?, ?)', [req.user.id, ship_id]);

    // 引导：买船成功后，推进到"起航"步骤
    (async () => {
      try {
        const guideUser = await db.getOne('SELECT guide_step FROM `user` WHERE `id` = ?', [req.user.id]);
        if (guideUser.guide_step === 4) {
          await db.update('user', { guide_step: 5 }, '`id` = ?', [req.user.id]);
        }
      } catch (e) {}
    })();

    res.json({ success: true, switched: false, msg: '🎉 成功购买了「' + ship.name + '」！' });
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

    // 引导：起航成功 → step 99（同时处理 step 5→6→99 的正常流程，以及直接 5→99 的跳过流程）
    (async () => {
      try {
        const guideUser = await db.getOne('SELECT guide_step FROM `user` WHERE `id` = ?', [req.user.id]);
        if (guideUser.guide_step === 5) {
          await db.update('user', { guide_step: 6 }, '`id` = ?', [req.user.id]);
        } else if (guideUser.guide_step === 6) {
          await db.update('user', { guide_step: 99 }, '`id` = ?', [req.user.id]);
        }
      } catch (e) {}
    })();

    res.json({ success: true });
  } catch(e){next(e);}
});

// 逃离海盗
router.post('/flee-pirate', authMiddleware, async (req, res, next) => {
  try {
    const user = await db.getOne('SELECT ship_id, money FROM `user` WHERE `id` = ?', [req.user.id]);
    if (!user || !user.ship_id) return res.status(400).json({ error: '没有船只' });
    if (!user.sail_paused) return res.status(400).json({ error: '当前没有海盗威胁' });

    // 扣钱：船速越快，逃跑成功率越高，但费用也高
    const ship = await db.getOne('SELECT speed FROM `ship` WHERE `id` = ?', [user.ship_id]);
    const fleeCost = ship ? {1:200,2:150,3:100,5:50}[ship.speed] || 100 : 100;
    if (Number(user.money) < fleeCost) return res.status(400).json({ error: `铜币不足，逃离需要 ${fleeCost} 铜币，你只有 ${user.money} 铜币` });

    await db.query('UPDATE `user` SET money=money-?, sail_paused=0, sail_remaining_sec=0, sail_event_checked_at=? WHERE `id` = ?', [fleeCost, Math.floor(Date.now()/1000), req.user.id]);
    res.json({ success: true, msg: `🏃 成功逃离海盗，消耗 ${fleeCost} 铜币` });
  } catch(e){next(e);}
});

// ============================================================
// 航海事件处理：用户选择事件选项后的结果
// ============================================================
router.post('/event-action', authMiddleware, async (req, res, next) => {
  try {
    const user = await db.getOne('SELECT ship_id, sail_paused, sail_remaining_sec FROM `user` WHERE `id` = ?', [req.user.id]);
    if (!user || !user.sail_paused) return res.status(400).json({ error: '当前没有待处理的事件' });

    const { action } = req.body;
    if (!action) return res.status(400).json({ error: '缺少action参数' });

    const ship = user.ship_id > 0 ? await db.getOne('SELECT * FROM `ship` WHERE `id` = ?', [user.ship_id]) : null;
    const us = ship ? await db.getOne('SELECT hp, hp_max FROM `user_ship` WHERE `user_id`=? AND `ship_id`=?', [req.user.id, user.ship_id]) : null;
    const shipHpBefore = us ? us.hp : 0;

    // 获取当前暂停的事件类型（需从 sail_remaining_sec 或其他标记推断）
    // 这里用 sail_remaining_sec 最高位存储事件类型，低位存储剩余秒数
    // 简化处理：默认 pirate，直到事件真正需要更精细的状态管理
    // 实际项目中应增加 event_type 字段到 user 表

    let result = { msg: '', eventResolved: true, shipHpAfter: shipHpBefore, moneyDelta: 0 };

    switch (action) {
      case 'fight': {
        // 战斗：模拟海盗战斗，胜利获战利品，失败扣耐久
        const winRoll = Math.random();
        if (winRoll >= 0.5) {
          const loot = Math.floor(Math.random() * 301) + 100; // 100~400铜币
          await db.query('UPDATE `user` SET money = money + ? WHERE `id` = ?', [loot, req.user.id]);
          result.msg = `⚔️ 战斗中获胜！获得 ${loot} 铜币战利品！`;
          result.moneyDelta = loot;
        } else {
          const dmg = Math.floor(Math.random() * 31) + 20; // 20~50耐久
          if (us) await db.query('UPDATE `user_ship` SET hp = GREATEST(1, hp - ?) WHERE `user_id`=? AND `ship_id`=?', [dmg, req.user.id, user.ship_id]);
          result.msg = `⚔️ 战斗失败！船身受损，损失 ${dmg} 点耐久。`;
        }
        break;
      }
      case 'flee': {
        // 逃跑：扣铜币，继续航行
        const ship2 = await db.getOne('SELECT speed FROM `ship` WHERE `id` = ?', [user.ship_id]);
        const fleeCost = ship2 ? {1:200,2:150,3:100,5:50}[ship2.speed] || 100 : 100;
        const u = await db.getOne('SELECT money FROM `user` WHERE `id` = ?', [req.user.id]);
        if (u.money < fleeCost) return res.status(400).json({ error: `铜币不足，逃离需要 ${fleeCost} 铜币` });
        await db.query('UPDATE `user` SET money = money - ? WHERE `id` = ?', [fleeCost, req.user.id]);
        result.msg = `🏃 成功逃离！消耗 ${fleeCost} 铜币。`;
        result.moneyDelta = -fleeCost;
        break;
      }
      case 'open': {
        // 漂流瓶：随机获得奖励
        const roll = Math.random();
        if (roll < 0.3) {
          const silver = Math.floor(Math.random() * 3) + 1; // 1~3银币
          await db.query('UPDATE `user` SET silver = silver + ? WHERE `id` = ?', [silver, req.user.id]);
          result.msg = `📦 瓶子内有一张纸条和 ${silver} 银币！`;
          result.moneyDelta = silver * 100;
        } else if (roll < 0.6) {
          const money = Math.floor(Math.random() * 201) + 50;
          await db.query('UPDATE `user` SET money = money + ? WHERE `id` = ?', [money, req.user.id]);
          result.msg = `📦 瓶子里有 ${money} 铜币！`;
          result.moneyDelta = money;
        } else if (roll < 0.85) {
          // 藏宝图碎片（用物品模拟，3个碎片合成藏宝图）
          result.msg = '📦 瓶子里有一张古老的羊皮纸碎片，上面画着奇怪的符号…';
        } else {
          result.msg = '📦 瓶子是空的，只有一封看不懂的信。';
        }
        break;
      }
      case 'ignore': {
        result.msg = '🚶 你选择不理会，继续航行。';
        break;
      }
      case 'slow': {
        // 减速绕行：延长航程3分钟（通过增加 sail_remaining_sec）
        const delay = 180; // 3分钟
        await db.query('UPDATE `user` SET sail_remaining_sec = sail_remaining_sec + ? WHERE `id` = ?', [delay, req.user.id]);
        result.msg = '🐢 你选择绕行，航程延长3分钟，但船只安全。';
        break;
      }
      case 'rush': {
        // 快速冲过：可能触礁
        const roll = Math.random();
        if (roll < 0.6) {
          const dmg = Math.floor(Math.random() * 41) + 30; // 30~70耐久
          if (us) await db.query('UPDATE `user_ship` SET hp = GREATEST(1, hp - ?) WHERE `user_id`=? AND `ship_id`=?', [dmg, req.user.id, user.ship_id]);
          result.msg = `⚡ 触礁了！船身受损，损失 ${dmg} 点耐久。`;
        } else {
          result.msg = '⚡ 顺利冲过暗礁区域，节省了时间！';
        }
        break;
      }
      case 'shelter': {
        // 避风港：延长5分钟
        const delay = 300;
        await db.query('UPDATE `user` SET sail_remaining_sec = sail_remaining_sec + ? WHERE `id` = ?', [delay, req.user.id]);
        result.msg = '⛵ 找到避风港，风浪过后继续航行，航程延长5分钟。';
        break;
      }
      case 'push': {
        // 强行穿越：可能早到或船损
        const roll = Math.random();
        if (roll < 0.4) {
          // 40%早到
          const early = Math.floor(Math.random() * 60) + 30;
          await db.query('UPDATE `user` SET sail_remaining_sec = GREATEST(1, sail_remaining_sec - ?) WHERE `id` = ?', [early, req.user.id]);
          result.msg = `🌊 顺利穿越！比预计早到 ${Math.ceil(early/60)} 分钟！`;
        } else {
          const dmg = Math.floor(Math.random() * 31) + 20;
          if (us) await db.query('UPDATE `user_ship` SET hp = GREATEST(1, hp - ?) WHERE `user_id`=? AND `ship_id`=?', [dmg, req.user.id, user.ship_id]);
          result.msg = `🌊 穿越失败！船身受损，损失 ${dmg} 点耐久。`;
        }
        break;
      }
      case 'trade': {
        // 商船交易：低价出售货物给玩家，可之后到市场卖出赚差价
        const goods = await db.getAll(
          `SELECT g.id, g.name, g.category, mp.base_price FROM goods g
           JOIN market_price mp ON g.id=mp.goods_id
           WHERE mp.city_id = (SELECT city_id FROM map WHERE id=? LIMIT 1)
           ORDER BY RAND() LIMIT 1`,
          [user.place_id]
        );
        if (goods.length > 0) {
          const g = goods[0];
          // 以市场价的30%出售给玩家（相当于利润空间）
          const price = Math.max(1, Math.floor(g.base_price * 0.3));
          const qty = Math.floor(Math.random() * 3) + 1;
          const totalCost = price * qty;
          const user2 = await db.getOne('SELECT money FROM user WHERE id=?', [req.user.id]);
          if (user2.money >= totalCost) {
            await db.query('UPDATE user SET money=money-? WHERE id=?', [totalCost, req.user.id]);
            const existing = await db.getOne('SELECT id,quantity FROM cargo WHERE user_id=? AND goods_id=?', [req.user.id, g.id]);
            if (existing) await db.query('UPDATE cargo SET quantity=quantity+? WHERE id=?', [qty, existing.id]);
            else await db.insert('cargo', { user_id: req.user.id, goods_id: g.id, quantity: qty });
            result.msg = `🤝 商船船员出售给你${g.name}×${qty}，单价${price}铜币（市场价${g.base_price}），可去市场转卖赚取差价！`;
            result.goods = { id: g.id, name: g.name, qty, price, marketPrice: g.base_price };
          } else {
            result.msg = `🤝 商船船员出售${g.name}×${qty}，但铜币不足（需要${totalCost}铜币）。`;
          }
        } else {
          // 没有可用货物，给少量铜币
          const money = Math.floor(Math.random() * 201) + 100;
          await db.query('UPDATE user SET money=money+? WHERE id=?', [money, req.user.id]);
          result.msg = `🤝 商船船员和你交换航海图，获得${money}铜币补偿。`;
          result.moneyDelta = money;
        }
        break;
      }
      case 'attack': {
        // 抢劫商船：成功率高但损失声望（暂用银币惩罚模拟）
        const roll = Math.random();
        if (roll < 0.35) {
          const loot = Math.floor(Math.random() * 401) + 200;
          await db.query('UPDATE `user` SET money = money + ? WHERE `id` = ?', [loot, req.user.id]);
          result.msg = `⚔️ 抢劫成功！但你感觉失去了什么…`;
          result.moneyDelta = loot;
        } else {
          const dmg = Math.floor(Math.random() * 41) + 30;
          if (us) await db.query('UPDATE `user_ship` SET hp = GREATEST(1, hp - ?) WHERE `user_id`=? AND `ship_id`=?', [dmg, req.user.id, user.ship_id]);
          result.msg = `⚔️ 抢劫失败！船只受损，损失 ${dmg} 点耐久，被商船逃脱了。`;
        }
        break;
      }
      default:
        return res.status(400).json({ error: '未知action: ' + action });
    }

    // 恢复航行
    const usAfter = us ? await db.getOne('SELECT hp FROM `user_ship` WHERE `user_id`=? AND `ship_id`=?', [req.user.id, user.ship_id]) : null;
    await db.query('UPDATE `user` SET sail_paused=0, sail_remaining_sec=0 WHERE `id` = ?', [req.user.id]);
    result.shipHpAfter = usAfter?.hp || shipHpBefore;
    result.msg += ' 航行继续…';

    res.json({ success: true, ...result });
  } catch(e){next(e);}
});

module.exports = router;

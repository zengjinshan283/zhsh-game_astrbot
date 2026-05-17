/**
 * 地图路由 - 场景信息、移动、在线玩家
 */
const express = require('express');
const db = require('../db');
const config = require('../config');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 获取当前场景信息
router.get('/scene', authMiddleware, async (req, res, next) => {
  try {
    const user = await db.getOne('SELECT place_id, hp, sail_time FROM `user` WHERE `id` = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: '角色不存在' });

    // 航海中 - 检查是否已到期
    if (user.sail_time > 0) {
      const fullUser = await db.getOne('SELECT ship_id, sail_time, sail_to, sail_paused, sail_remaining_sec FROM `user` WHERE `id` = ?', [req.user.id]);
      if (fullUser && fullUser.ship_id > 0) {
        const ship = await db.getOne("SELECT speed FROM `ship` WHERE `id` = ?", [fullUser.ship_id]);
        const sailSpeed = ship ? ship.speed : 1;
        const duration = {1:10,2:6,3:3,5:1}[sailSpeed] || 10;
        let elapsed;
        if (fullUser.sail_paused) {
          elapsed = Math.max(0, duration * 60 - (Number(fullUser.sail_remaining_sec) || 0));
        } else {
          elapsed = Math.floor(Date.now()/1000) - fullUser.sail_time;
        }
        if (elapsed >= duration * 60) {
          // Auto-arrive: clear sail state and move to destination
          let newPlaceId = fullUser.place_id;
          if (fullUser.sail_to > 0) {
            const dock = await db.getOne("SELECT id FROM `place` WHERE `city_id` = ? AND `type` = 1 LIMIT 1", [fullUser.sail_to]);
            if (dock) newPlaceId = dock.id;
          }
          await db.query('UPDATE `user` SET place_id=?, sail_time=0, sail_from=0, sail_to=0, sail_event_checked_at=0, sail_remaining_sec=0, sail_paused=0 WHERE `id` = ?', [newPlaceId, req.user.id]);
          // Fall through to buildScene with new place_id
        } else {
          return res.json({ sailing: true, sail_time: fullUser.sail_time });
        }
      } else {
        return res.json({ sailing: true, sail_time: user.sail_time });
      }
    }

    const placeId = user.place_id || config.game.startPlaceId;
    const place = await db.getOne('SELECT * FROM `place` WHERE `id` = ?', [placeId]);
    if (!place) {
      // 重置到起点
      await db.update('user', { place_id: config.game.startPlaceId }, '`id` = ?', [req.user.id]);
      return res.json(await buildScene(config.game.startPlaceId, req.user.id));
    }

    res.json(await buildScene(placeId, req.user.id));
  } catch (err) { next(err); }
});

// 移动
router.post('/move', authMiddleware, async (req, res, next) => {
  try {
    const { dir } = req.body; // n, s, e, w
    if (!['n', 's', 'e', 'w'].includes(dir)) return res.status(400).json({ error: '无效方向' });

    const user = await db.getOne('SELECT place_id, sail_time, hp FROM `user` WHERE `id` = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: '角色不存在' });
    if (user.sail_time > 0) return res.status(400).json({ error: '航海中无法移动' });
    // Allow movement even at 0 HP (player may need to walk to tavern)

    const place = await db.getOne('SELECT * FROM `place` WHERE `id` = ?', [user.place_id]);
    if (!place) return res.status(400).json({ error: '当前位置异常' });

    const targetId = parseInt(place[dir]) || 0;
    if (targetId <= 0) return res.status(400).json({ error: '这个方向没有出口' });

    await db.update('user', { place_id: targetId }, '`id` = ?', [req.user.id]);
    const scene = await buildScene(targetId, req.user.id);

    // 触发新手引导：进入地点检查（异步，不阻塞主流程）
    require('../routes/guide'); // 确保路由已加载
    db.query("SELECT 1").then(() => {}).catch(() => {});
    // 用最新方式触发引导检查（通过内部调用）
    (async () => {
      try {
        const guideUser = await db.getOne('SELECT guide_step FROM `user` WHERE `id` = ?', [req.user.id]);
        if (guideUser.guide_step === 3 && targetId === 1022) {
          await db.update('user', { guide_step: 4 }, '`id` = ?', [req.user.id]);
        }
      } catch (e) {}
    })();

    res.json({ ...scene, success: true });
  } catch (err) { next(err); }
});

// 回酒店休息（恢复HP）
router.post('/heal', authMiddleware, async (req, res, next) => {
  try {
    const user = await db.getOne('SELECT place_id, hp, hp_max FROM `user` WHERE `id` = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: '角色不存在' });

    const place = await db.getOne('SELECT * FROM `place` WHERE `id` = ?', [user.place_id]);
    if (!place || place.type !== 4) {
      return res.status(400).json({ error: '这里无法休息，请前往酒馆或旅店' });
    }

    await db.update('user', { hp: user.hp_max }, '`id` = ?', [req.user.id]);
    res.json({ success: true, hp: user.hp_max, hp_max: user.hp_max });
  } catch (err) { next(err); }
});

// 构建场景数据
async function buildScene(placeId, userId) {
  const place = await db.getOne('SELECT * FROM `place` WHERE `id` = ?', [placeId]);
  if (!place) return null;

  let city = null;
  if (place.city_id) {
    city = await db.getOne('SELECT * FROM `map` WHERE `id` = ?', [place.city_id]);
  }

  // 怪物列表
  const monsters = await db.getAll(
    'SELECT * FROM `monster` WHERE `place_id` = ? OR `place_id` = 0 ORDER BY `id`',
    [placeId]
  );

  // NPC 列表（含动态对话）
  const npcs = await db.getAll('SELECT * FROM `npc` WHERE `place_id` = ? ORDER BY `id`', [placeId]);
  const npcsPlain = npcs.map(n => Object.assign({}, n));
  // Optimized: batch query all NPC quest stats in one pass (N+1 -> 3 queries)
  if (npcsPlain.length > 0) {
    const npcIds = npcsPlain.map(n => n.id);
    const npcIdList = npcIds.join(',');
    // Query 1: user quest counts per NPC (ready, active, done)
    const uqStats = await db.getAll(
      `SELECT q.npc_id, uq.status, COUNT(*) as cnt
       FROM user_quest uq JOIN quest q ON uq.quest_id=q.id
       WHERE uq.user_id=? AND q.npc_id IN (${npcIdList})
       GROUP BY q.npc_id, uq.status`,
      [userId]
    );
    // Query 2: total quests per NPC
    const totalQs = await db.getAll(
      `SELECT npc_id, COUNT(*) as cnt FROM quest WHERE npc_id IN (${npcIdList}) GROUP BY npc_id`
    );
    // Query 3: available quests per NPC (single query)
    const availQs = await db.getAll(
      `SELECT q.npc_id, COUNT(*) as cnt
       FROM quest q
       WHERE q.npc_id IN (${npcIdList})
         AND q.level_req<=(SELECT level FROM user WHERE id=?)
         AND q.id NOT IN (SELECT quest_id FROM user_quest WHERE user_id=?)
         AND (q.pre_quest_id=0 OR q.pre_quest_id IN (SELECT quest_id FROM user_quest WHERE user_id=? AND status>=1))
       GROUP BY q.npc_id`,
      [userId, userId, userId]
    );
    // Build lookup maps from queries 1-3
    const uqMap = {}; // npcId -> {0:cnt, 1:cnt, 2:cnt}
    uqStats.forEach(r => { if (!uqMap[r.npc_id]) uqMap[r.npc_id] = {}; uqMap[r.npc_id][r.status] = r.cnt; });
    const totalMap = {};
    totalQs.forEach(r => { totalMap[r.npc_id] = r.cnt; });
    const availMap = {};
    availQs.forEach(r => { availMap[r.npc_id] = r.cnt; });

    // Query 4: load all relevant dialogs, then match in JS (avoids MySQL derived-table correlation limit)
    const allDialogs = await db.getAll(
      'SELECT npc_id, trigger_type, content FROM npc_dialog WHERE npc_id IN (' + npcIdList + ') ORDER BY sort_order'
    );
    const dialogMap = {};
    for (const npc of npcsPlain) {
      const uq = uqMap[npc.id] || {};
      const hasReady = uq[1] || 0;
      const hasActive = uq[0] || 0;
      const availQ = availMap[npc.id] || 0;
      const doneQ = uq[2] || 0;
      const totalQ = totalMap[npc.id] || 0;
      let trigger = 'idle';
      if (hasReady > 0) trigger = 'quest_ready';
      else if (hasActive > 0) trigger = 'quest_active';
      else if (availQ > 0) trigger = 'quest_available';
      else if (doneQ > 0 && totalQ > 0 && doneQ >= totalQ) trigger = 'all_done';
      const d = allDialogs.find(x => x.npc_id === npc.id && (x.trigger_type === trigger || x.trigger_type === 'all'));
      if (d) dialogMap[npc.id] = d.content;
    }
    // Assign to NPCs
    for (const npc of npcsPlain) {
      const uq = uqMap[npc.id] || {};
      const hasReady = uq[1] || 0;
      const hasActive = uq[0] || 0;
      const doneQ = uq[2] || 0;
      const totalQ = totalMap[npc.id] || 0;
      const availQ = availMap[npc.id] || 0;
      npc.quest_count = hasReady + hasActive + availQ;
      if (dialogMap[npc.id]) npc.dialog = dialogMap[npc.id];
    }
  }

  // 同场景在线玩家
  const onlineUsers = await db.getAll(
    'SELECT id, username, sex, level FROM `user` WHERE `place_id` = ? AND `lastdate` > ? AND `id` != ? AND (sail_time = 0 OR sail_time IS NULL)',
    [placeId, Math.floor(Date.now() / 1000) - config.game.onlineTimeout, userId]
  );

  // 可用出口
  const exits = {};
  for (const d of ['n', 's', 'e', 'w']) {
    if (place[d] > 0) {
      const target = await db.getOne('SELECT id, name FROM `place` WHERE `id` = ?', [place[d]]);
      if (target) exits[d] = { id: target.id, name: target.name };
    }
  }

  // 返回数据（已在第214行 buildScene 返回）
  return { place, city, monsters, npcs: npcsPlain, onlineUsers, exits };
}

// place.type 含义（兼容 CityMapView）
// 0=普通野外 1=码头 2=广场 3=功能NPC(银行/铁匠) 4=酒馆 5=商店

module.exports = router;

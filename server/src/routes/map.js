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

    // 航海中
    if (user.sail_time > 0) {
      return res.json({ sailing: true, sail_time: user.sail_time });
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
  // Convert RowDataPacket to plain objects so dynamic fields stick
  const npcsPlain = npcs.map(n => Object.assign({}, n));
  for (const npc of npcsPlain) {
    const hasReady = await db.getVar(
      "SELECT COUNT(*) FROM user_quest uq JOIN quest q ON uq.quest_id=q.id WHERE uq.user_id=? AND q.npc_id=? AND uq.status=1",
      [userId, npc.id]
    ) || 0;
    const hasActive = await db.getVar(
      "SELECT COUNT(*) FROM user_quest uq JOIN quest q ON uq.quest_id=q.id WHERE uq.user_id=? AND q.npc_id=? AND uq.status=0",
      [userId, npc.id]
    ) || 0;
    const totalQ = await db.getVar("SELECT COUNT(*) FROM quest WHERE npc_id=?", [npc.id]) || 0;
    const doneQ = await db.getVar(
      "SELECT COUNT(*) FROM user_quest uq JOIN quest q ON uq.quest_id=q.id WHERE uq.user_id=? AND q.npc_id=? AND uq.status=2",
      [userId, npc.id]
    ) || 0;
    const availQ = await db.getVar(
      "SELECT COUNT(*) FROM quest q WHERE q.npc_id=? AND q.level_req<=(SELECT level FROM user WHERE id=?) AND q.id NOT IN (SELECT quest_id FROM user_quest WHERE user_id=?) AND (q.pre_quest_id=0 OR q.pre_quest_id IN (SELECT quest_id FROM user_quest WHERE user_id=? AND status>=1))",
      [npc.id, userId, userId, userId]
    ) || 0;
    let triggerType = 'idle';
    if (hasReady > 0) triggerType = 'quest_ready';
    else if (hasActive > 0) triggerType = 'quest_active';
    else if (availQ > 0) triggerType = 'quest_available';
    else if (totalQ > 0 && doneQ >= totalQ) triggerType = 'all_done';
    const nd = await db.getOne(
      "SELECT content FROM npc_dialog WHERE npc_id=? AND trigger_type=? ORDER BY sort_order LIMIT 1",
      [npc.id, triggerType]
    );
    if (nd) npc.dialog = nd.content;
    npc.quest_count = hasReady + hasActive + availQ;
  }

  // 同场景在线玩家
  const onlineUsers = await db.getAll(
    'SELECT id, username, sex, level FROM `user` WHERE `place_id` = ? AND `lastdate` > ? AND `id` != ?',
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

  return { place, city, monsters, npcs: npcsPlain, onlineUsers, exits };
}

module.exports = router;

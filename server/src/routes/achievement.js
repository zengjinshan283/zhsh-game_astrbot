const express = require('express');
const db = require('../db');
const router = express.Router();

/**
 * 检查并触发成就
 * @param {number} userId
 * @param {string} triggerType - level_up|battle_win|sail|dungeon|enhance|identify|quest_complete|item_get|arena_win|mentor_take|mentor_graduate
 * @param {number} currentValue - 当前累计值（部分trigger需要）
 */
async function triggerAchievements(userId, triggerType, currentValue = 0) {
  const results = [];
  const row = await db.getOne(
    'SELECT COUNT(*) as total FROM achievement WHERE trigger_type = ?',
    [triggerType]
  );
  if (!row || row.total === 0) return results;

  const achievements = await db.getAll(
    'SELECT * FROM achievement WHERE trigger_type = ? AND target_value <= ?',
    [triggerType, currentValue]
  );

  for (const ach of achievements) {
    const existing = await db.getOne(
      'SELECT id FROM user_achievement WHERE user_id = ? AND achievement_id = ?',
      [userId, ach.id]
    );
    if (existing) continue;

    const ts = Math.floor(Date.now() / 1000);
    await db.query(
      'INSERT INTO user_achievement (user_id, achievement_id, achievement_key, achieved_at) VALUES (?, ?, ?, ?)',
      [userId, ach.id, ach.key, ts]
    );

    // 发奖励
    if (ach.reward_value > 0) {
      if (ach.reward_type === 'money') {
        await db.query('UPDATE user SET money = money + ? WHERE id = ?', [ach.reward_value, userId]);
      } else if (ach.reward_type === 'exp') {
        await db.query('UPDATE user SET exp = exp + ? WHERE id = ?', [ach.reward_value, userId]);
      } else if (ach.reward_type === 'title') {
        // 称号暂存到扩展字段或缓存
        await db.query('UPDATE user SET title = ? WHERE id = ?', [ach.title, userId]);
      }
    }

    results.push({
      key: ach.key,
      name: ach.name,
      description: ach.description,
      reward: ach.reward_type === 'money' ? `+${ach.reward_value} 铜币` :
               ach.reward_type === 'exp' ? `+${ach.reward_value} 经验` :
               ach.reward_type === 'title' ? `获得称号：${ach.title}` : '',
      title: ach.title
    });
  }
  return results;
}

// GET /api/achievement/list  成就列表（含用户进度）
router.get('/list', async (req, res, next) => {
  try {
    const userId = parseInt(req.query.user_id || req.user?.id || 0);
    const all = await db.getAll('SELECT * FROM achievement ORDER BY sort_order');
    const achieved = await db.getAll(
      'SELECT achievement_key, achieved_at FROM user_achievement WHERE user_id = ?',
      [userId]
    );
    const achMap = {};
    achieved.forEach(a => { achMap[a.achievement_key] = a.achieved_at; });

    const list = all.map(a => ({
      key: a.key,
      name: a.name,
      description: a.description,
      target: a.target_value,
      reward_type: a.reward_type,
      reward_value: a.reward_value,
      title: a.title,
      achieved: !!achMap[a.key],
      achieved_at: achMap[a.key] || null
    }));
    res.json({ list });
  } catch (e) { next(e); }
});

// GET /api/achievement/progress  用户当前各维度进度
router.get('/progress', async (req, res, next) => {
  try {
    const userId = parseInt(req.query.user_id || req.user?.id || 0);
    if (!userId) return res.status(400).json({ error: '未提供用户ID' });

    const user = await db.getOne('SELECT level FROM user WHERE id = ?', [userId]);
    const battleWin = await db.getOne(
      'SELECT COUNT(*) as c FROM user_achievement ua JOIN achievement a ON ua.achievement_id = a.id WHERE ua.user_id = ? AND a.trigger_type = ?',
      [userId, 'battle_win']
    );
    const sailCount = await db.getOne('SELECT COUNT(*) as c FROM user_achievement ua JOIN achievement a ON ua.achievement_id = a.id WHERE ua.user_id = ? AND a.trigger_type = ?', [userId, 'sail']);
    const dungeonCount = await db.getOne('SELECT COUNT(*) as c FROM user_achievement ua JOIN achievement a ON ua.achievement_id = a.id WHERE ua.user_id = ? AND a.trigger_type = ?', [userId, 'dungeon']);

    res.json({
      level: user?.level || 1,
      battle_win_count: battleWin?.c || 0,
      sail_count: sailCount?.c || 0,
      dungeon_count: dungeonCount?.c || 0
    });
  } catch (e) { next(e); }
});

module.exports = router;
module.exports.triggerAchievements = triggerAchievements;
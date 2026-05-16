/**
 * 每日活跃系统
 * GET  /api/daily/status     - 获取当日活跃状态
 * POST /api/daily/claim/:rewardId - 领取宝箱
 * POST /api/daily/progress  - 增加进度（内部接口）
 */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 获取今日日期字符串
function getToday() {
  return new Date().toISOString().slice(0, 10);
}

// 获取用户活跃状态
router.get('/status', authMiddleware, async (req, res, next) => {
  try {
    const today = getToday();
    const userId = req.user.id;

    // 获取所有任务配置
    const activities = await db.getAll('SELECT `key`, name, description, target, active_point FROM `daily_activity` ORDER BY id');
    // 获取今日进度
    const progressRows = await db.getAll(
      'SELECT activity_key, progress, claimed FROM `user_daily_activity` WHERE user_id = ? AND `date` = ?',
      [userId, today]
    );
    const progressMap = {};
    progressRows.forEach(r => { progressMap[r.activity_key] = r; });

    // 获取宝箱配置
    const rewards = await db.getAll('SELECT id, active_point, reward_type, reward_value, quantity FROM `activity_reward` ORDER BY active_point');
    // 获取已领取记录
    const claimedRows = await db.getAll(
      'SELECT reward_id FROM `user_activity_reward` WHERE user_id = ? AND `date` = ?',
      [userId, today]
    );
    const claimedSet = new Set(claimedRows.map(r => r.reward_id));

    // 计算总活跃度
    let totalActivePoint = 0;
    const tasks = activities.map(a => {
      const p = progressMap[a.key] || { progress: 0, claimed: 0 };
      totalActivePoint += Math.min(p.progress / a.target, 1) * a.active_point;
      return {
        key: a.key,
        name: a.name,
        description: a.description,
        target: a.target,
        progress: p.progress,
        claimed: Boolean(p.claimed),
        active_point: a.active_point,
        completed: p.progress >= a.target
      };
    });

    // 宝箱状态
    const rewardBoxes = rewards.map(r => ({
      id: r.id,
      active_point: r.active_point,
      reward_type: r.reward_type,
      reward_value: r.reward_value,
      quantity: r.quantity,
      claimed: claimedSet.has(r.id),
      can_claim: totalActivePoint >= r.active_point && !claimedSet.has(r.id)
    }));

    res.json({
      date: today,
      total_active_point: Math.floor(totalActivePoint),
      tasks,
      reward_boxes: rewardBoxes
    });
  } catch (err) { next(err); }
});

// 领取宝箱
router.post('/claim/:rewardId', authMiddleware, async (req, res, next) => {
  try {
    const today = getToday();
    const userId = req.user.id;
    const rewardId = parseInt(req.params.rewardId);

    // 检查宝箱配置
    const reward = await db.getOne('SELECT * FROM `activity_reward` WHERE id = ?', [rewardId]);
    if (!reward) return res.status(404).json({ error: '宝箱不存在' });

    // 检查是否已领取
    const existing = await db.getOne(
      'SELECT id FROM `user_activity_reward` WHERE user_id = ? AND `date` = ? AND reward_id = ?',
      [userId, today, rewardId]
    );
    if (existing) return res.status(400).json({ error: '已领取过该宝箱' });

    // 检查活跃度是否足够
    const activities = await db.getAll('SELECT `key`, target, active_point FROM `daily_activity`');
    const progressRows = await db.getAll(
      'SELECT activity_key, progress FROM `user_daily_activity` WHERE user_id = ? AND `date` = ?',
      [userId, today]
    );
    const progressMap = {};
    progressRows.forEach(r => { progressMap[r.activity_key] = r.progress; });

    let totalActivePoint = 0;
    for (const a of activities) {
      const p = progressMap[a.key] || 0;
      totalActivePoint += Math.min(p / a.target, 1) * a.active_point;
    }

    if (totalActivePoint < reward.active_point) {
      return res.status(400).json({ error: `活跃度不足，需要${reward.active_point}点，当前${Math.floor(totalActivePoint)}点` });
    }

    // 发放奖励
    if (reward.reward_type === 'money') {
      await db.query('UPDATE `user` SET money = money + ? WHERE id = ?', [reward.quantity, userId]);
    } else if (reward.reward_type === 'item') {
      // 检查是否已存在该物品
      const existingInv = await db.getOne(
        'SELECT id, quantity FROM `inventory` WHERE user_id = ? AND item_id = ? AND equipped = 0',
        [userId, reward.reward_value]
      );
      if (existingInv) {
        await db.query('UPDATE `inventory` SET quantity = quantity + ? WHERE id = ?', [reward.quantity, existingInv.id]);
      } else {
        await db.insert('inventory', {
          user_id: userId,
          item_id: reward.reward_value,
          quantity: reward.quantity,
          equipped: 0,
          enhance_level: 0
        });
      }
    }

    // 记录领取
    await db.insert('user_activity_reward', {
      user_id: userId,
      date: today,
      reward_id: rewardId,
      claimed_at: Math.floor(Date.now() / 1000)
    });

    // 获取物品名称
    let rewardName = `${reward.quantity}铜币`;
    if (reward.reward_type === 'item') {
      const item = await db.getOne('SELECT name FROM `item` WHERE id = ?', [reward.reward_value]);
      if (item) rewardName = `${item.name}×${reward.quantity}`;
    }

    res.json({ success: true, msg: `领取成功：${rewardName}` });
  } catch (err) { next(err); }
});

// 增加活动进度（内部接口）
router.post('/progress', authMiddleware, async (req, res, next) => {
  try {
    const today = getToday();
    const userId = req.user.id;
    const { activity_key, delta = 1 } = req.body;

    if (!activity_key) return res.status(400).json({ error: '缺少activity_key' });

    // 检查任务是否存在
    const activity = await db.getOne('SELECT `key`, target FROM `daily_activity` WHERE `key` = ?', [activity_key]);
    if (!activity) return res.status(404).json({ error: '无效的活动key' });

    // 更新或插入进度
    const existing = await db.getOne(
      'SELECT id, progress FROM `user_daily_activity` WHERE user_id = ? AND `date` = ? AND activity_key = ?',
      [userId, today, activity_key]
    );

    if (existing) {
      const newProgress = Math.min(existing.progress + delta, activity.target);
      await db.query(
        'UPDATE `user_daily_activity` SET progress = ?, updated_at = ? WHERE id = ?',
        [newProgress, Math.floor(Date.now() / 1000), existing.id]
      );
    } else {
      await db.insert('user_daily_activity', {
        user_id: userId,
        date: today,
        activity_key,
        progress: Math.min(delta, activity.target),
        claimed: 0,
        updated_at: Math.floor(Date.now() / 1000)
      });
    }

    res.json({ success: true, activity_key, delta });
  } catch (err) { next(err); }
});

module.exports = router;
/**
 * 签到系统路由
 * 7天循环签到，连签奖励，每日重置
 */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 获取中国时间(UTC+8)日期字符串 YYYY-MM-DD
function getCSTDate() {
  const now = new Date();
  const cst = new Date(now.getTime() + 8 * 3600000);
  return cst.toISOString().slice(0, 10);
}

// 获取昨日日期
function getYesterdayDate() {
  const now = new Date();
  const cst = new Date(now.getTime() + 8 * 3600000);
  cst.setDate(cst.getDate() - 1);
  return cst.toISOString().slice(0, 10);
}

// 获取奖励配置列表
router.get('/rewards', authMiddleware, async (req, res, next) => {
  try {
    const rewards = await db.getAll('SELECT * FROM `sign_reward` ORDER BY `day`');
    res.json({ rewards });
  } catch (err) { next(err); }
});

// 获取签到状态（今日是否签到 + 连签天数）
router.get('/status', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const today = getCSTDate();
    const yesterday = getYesterdayDate();

    // 今日是否已签到
    const todayRecord = await db.getOne(
      'SELECT * FROM `sign_in` WHERE `user_id` = ? AND `sign_date` = ?',
      [uid, today]
    );

    if (todayRecord) {
      // 今日已签
      return res.json({
        signed: true,
        consecutive_days: todayRecord.consecutive_days,
        today,
        reward_day: (todayRecord.consecutive_days % 7) || 7,
      });
    }

    // 查找昨日记录算连签天数
    const yesterdayRecord = await db.getOne(
      'SELECT * FROM `sign_in` WHERE `user_id` = ? AND `sign_date` = ?',
      [uid, yesterday]
    );

    const consecutive_days = yesterdayRecord ? yesterdayRecord.consecutive_days : 0;
    const reward_day = ((consecutive_days + 1) % 7) || 7; // 连签天数+1后取模

    res.json({
      signed: false,
      consecutive_days,
      today,
      reward_day,
    });
  } catch (err) { next(err); }
});

// 签到
router.post('/in', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const today = getCSTDate();
    const yesterday = getYesterdayDate();

    // 检查今日是否已签
    const existing = await db.getOne(
      'SELECT * FROM `sign_in` WHERE `user_id` = ? AND `sign_date` = ?',
      [uid, today]
    );
    if (existing) {
      return res.status(400).json({ error: '今日已签到，明日再来吧！' });
    }

    // 计算连签天数
    const yesterdayRecord = await db.getOne(
      'SELECT * FROM `sign_in` WHERE `user_id` = ? AND `sign_date` = ?',
      [uid, yesterday]
    );
    const consecutive_days = yesterdayRecord ? yesterdayRecord.consecutive_days + 1 : 1;

    // 确定领哪天的奖励（1-7循环）
    const reward_day = ((consecutive_days % 7) || 7);
    const reward = await db.getOne('SELECT * FROM `sign_reward` WHERE `day` = ?', [reward_day]);
    if (!reward) {
      return res.status(500).json({ error: '奖励配置异常' });
    }

    // 发奖
    const rewards = [];
    const rewardValue = Number(reward.reward_value);
    if (!Number.isFinite(rewardValue) || rewardValue > 1e15) {
      return res.status(500).json({ error: '奖励值异常' });
    }
    if (reward.reward_type === 'money') {
      await db.query('UPDATE `user` SET `money` = `money` + ? WHERE `id` = ?', [rewardValue, uid]);
      rewards.push(`铜币+${reward.reward_value}`);
    } else if (reward.reward_type === 'exp') {
      const user = await db.getOne('SELECT exp, exp_max, level FROM `user` WHERE `id` = ?', [uid]);
      let newExp = user.exp + rewardValue;
      let newLevel = user.level;
      let newExpMax = user.exp_max || 500;
      let leveled = false;
      while (newExp >= newExpMax) {
        newExp -= newExpMax; newLevel++; newExpMax = 500 + 300 * (newLevel - 1); leveled = true;
      }
      await db.query('UPDATE `user` SET `exp` = ?, `level` = ?, `exp_max` = ? WHERE `id` = ?', [newExp, newLevel, newExpMax, uid]);
      rewards.push(`经验+${rewardValue}`);
      if (leveled) rewards.push('🎉升级！');
    } else if (reward.reward_type === 'gold') {
      await db.query('UPDATE `user` SET `gold` = `gold` + ? WHERE `id` = ?', [rewardValue, uid]);
      rewards.push(`金币+${rewardValue}`);
    } else if (reward.reward_type === 'item') {
      const itemId = Number(reward.reward_value);
      const itemQty = Number(reward.reward_qty) || 1;
      if (!Number.isFinite(itemId) || !Number.isFinite(itemQty)) {
        return res.status(500).json({ error: '物品奖励值异常' });
      }
      const existing = await db.getOne(
        'SELECT * FROM `inventory` WHERE `user_id` = ? AND `item_id` = ? AND `equipped` = 0',
        [uid, itemId]
      );
      if (existing) {
        await db.query('UPDATE `inventory` SET `quantity` = `quantity` + ? WHERE `id` = ?', [itemQty, existing.id]);
      } else {
        await db.insert('inventory', { user_id: uid, item_id: itemId, quantity: itemQty, equipped: 0, enhance_level: 0 });
      }
      const item = await db.getOne('SELECT `name` FROM `item` WHERE `id` = ?', [itemId]);
      rewards.push(`${item ? item.name : '物品'} x${itemQty}`);
    }

    // 记录签到
    await db.insert('sign_in', {
      user_id: uid,
      sign_date: today,
      consecutive_days,
      created_at: Math.floor(Date.now() / 1000),
    });

    res.json({
      success: true,
      msg: `签到成功！${rewards.join('，')}`,
      consecutive_days,
      reward_day,
      reward: reward.description,
    });
  } catch (err) { next(err); }
});

module.exports = router;

/**
 * 福利系统路由 - 新手福利/7日登录/成长里程碑
 * 注册礼包在 auth.js 注册时已发放（starter 已在 claimed_rewards 中）
 * welfare.js 只处理 7日登录 和 里程碑奖励 的领取
 */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// 统一发物品帮助函数
async function addItems(uid, items) {
  for (const item of items) {
    const existing = await db.getOne(
      "SELECT id, quantity FROM `inventory` WHERE `user_id` = ? AND `item_id` = ? AND `equipped` = 0",
      [uid, item.id]
    );
    if (existing) {
      await db.query(
        "UPDATE `inventory` SET quantity = quantity + ? WHERE id = ?",
        [item.qty, existing.id]
      );
    } else {
      await db.query(
        "INSERT INTO `inventory` (`user_id`, `item_id`, `quantity`, `equipped`) VALUES (?, ?, ?, 0)",
        [uid, item.id, item.qty]
      );
    }
  }
}

// 7日登录奖励表
const LOGIN_REWARDS = {
  1: { money: 500,  items: [{ id: 1, qty: 2 }] },
  2: { money: 800,  items: [{ id: 3, qty: 1 }] },
  3: { money: 1200, items: [{ id: 10, qty: 1 }] },
  4: { money: 1500, items: [{ id: 1, qty: 3 }] },
  5: { money: 2000, items: [{ id: 16, qty: 1 }] },
  6: { money: 2500, items: [{ id: 101, qty: 1 }] },
  7: { money: 5000, items: [{ id: 200, qty: 1 }] }
};

// 里程碑奖励（按 level 计）
const MILESTONES = [
  { level: 5,  money: 1000, items: [{ id: 1, qty: 5 }],   desc: '5级' },
  { level: 10, money: 3000, items: [{ id: 12, qty: 1 }],  desc: '10级' },
  { level: 15, money: 5000, items: [{ id: 13, qty: 1 }],  desc: '15级' },
  { level: 20, money: 8000, items: [{ id: 14, qty: 1 }],  desc: '20级' },
  { level: 30, money: 15000,items: [{ id: 102, qty: 1 }], desc: '30级' }
];

// 在线奖励配置（每5分钟一档，60分钟循环）
const ONLINE_TIERS = [
  { minutes: 5,  reward_type: 'money', reward_value: 100,  quantity: 1 },
  { minutes: 10, reward_type: 'money', reward_value: 200,  quantity: 1 },
  { minutes: 15, reward_type: 'money', reward_value: 300,  quantity: 1 },
  { minutes: 20, reward_type: 'money', reward_value: 500,  quantity: 1 },
  { minutes: 25, reward_type: 'item',   reward_value: 96,   quantity: 1 }, // 体力宝
  { minutes: 30, reward_type: 'money', reward_value: 800,  quantity: 1 },
  { minutes: 35, reward_type: 'money', reward_value: 1000, quantity: 1 },
  { minutes: 40, reward_type: 'money', reward_value: 1500, quantity: 1 },
  { minutes: 45, reward_type: 'item',   reward_value: 97,   quantity: 1 }, // 大体力宝
  { minutes: 50, reward_type: 'money', reward_value: 2000, quantity: 1 },
  { minutes: 55, reward_type: 'money', reward_value: 2500, quantity: 1 },
  { minutes: 60, reward_type: 'both',  reward_value: 94,   quantity: 2 }, // 龙泉水×2 + 5000铜币
];
const CYCLE_MINUTES = 60;
const TIER_INTERVAL = 5; // 每5分钟一档

// 福利状态
router.get('/status', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const user = await db.getOne(
      'SELECT login_days, level, guide_step, claimed_rewards FROM `user` WHERE `id` = ?',
      [uid]
    );

    let claimed = [];
    try { claimed = JSON.parse(user.claimed_rewards || '[]'); } catch (_) { claimed = []; }

    // 注册礼包：auth.js 注册时已发放，starterClaimed 永远为 true
    const starterClaimed = true;
    const loginDay = Math.min(user.login_days || 1, 7);
    const nextLoginKey = `login_${loginDay}`;
    const nextLoginClaimed = claimed.includes(nextLoginKey);

    const milestones = MILESTONES.map(m => ({
      level: m.level,
      desc: m.desc,
      claimed: claimed.includes(`milestone_${m.level}`),
      reward: { money: m.money, items: m.items }
    }));

    res.json({
      starterClaimed,
      loginDay,
      nextLoginKey,
      nextLoginClaimed,
      loginRewards: LOGIN_REWARDS,
      milestones,
      guide_step: user.guide_step
    });
  } catch (err) { next(err); }
});

// 领取每日登录奖励
router.post('/claim-login', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const user = await db.getOne('SELECT login_days, claimed_rewards FROM `user` WHERE `id` = ?', [uid]);

    let claimed = [];
    try { claimed = JSON.parse(user.claimed_rewards || '[]'); } catch (_) { claimed = []; }

    const dayIndex = Math.min(user.login_days || 1, 7);
    const key = `login_${dayIndex}`;

    if (claimed.includes(key)) {
      return res.status(400).json({ error: `第${dayIndex}日奖励已领取` });
    }

    const reward = LOGIN_REWARDS[dayIndex];
    if (!reward) return res.status(400).json({ error: '奖励配置错误' });

    await db.query('UPDATE `user` SET money = money + ?, claimed_rewards = ? WHERE `id` = ?',
      [reward.money, JSON.stringify([...claimed, key]), uid]);
    if (reward.items.length > 0) await addItems(uid, reward.items);

    const itemNames = reward.items.map(i => `物品×${i.qty}`).join('、');
    res.json({ success: true, msg: `🎁 第${dayIndex}日奖励：铜币+${reward.money}${itemNames ? '，' + itemNames : ''}` });
  } catch (err) { next(err); }
});

// 领取里程碑奖励
router.post('/claim-milestone', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const { level } = req.body;

    const reward = MILESTONES.find(m => m.level === level);
    if (!reward) return res.status(400).json({ error: '无效的里程碑' });

    const user = await db.getOne('SELECT level, claimed_rewards FROM `user` WHERE `id` = ?', [uid]);

    let claimed = [];
    try { claimed = JSON.parse(user.claimed_rewards || '[]'); } catch (_) { claimed = []; }

    if (user.level < reward.level) {
      return res.status(400).json({ error: `需要达到${reward.level}级才能领取` });
    }

    const key = `milestone_${reward.level}`;
    if (claimed.includes(key)) {
      return res.status(400).json({ error: '该里程碑奖励已领取' });
    }

    await db.query('UPDATE `user` SET money = money + ?, claimed_rewards = ? WHERE `id` = ?',
      [reward.money, JSON.stringify([...claimed, key]), uid]);
    if (reward.items.length > 0) await addItems(uid, reward.items);

    res.json({ success: true, msg: `🎁 里程碑奖励已发放：铜币+${reward.money}` });
  } catch (err) { next(err); }
});

// ======================== 在线奖励 ========================

// 获取用户在线奖励记录，不存在则创建
async function getOrCreateUserOnlineReward(uid) {
  let record = await db.getOne('SELECT * FROM `user_online_reward` WHERE `user_id` = ?', [uid]);
  if (!record) {
    await db.query('INSERT INTO `user_online_reward` (`user_id`, `last_claim_at`, `total_claimed`) VALUES (?, 0, 0)', [uid]);
    record = await db.getOne('SELECT * FROM `user_online_reward` WHERE `user_id` = ?', [uid]);
  }
  return record;
}

// 获取当前应到的档位（根据在线时长）
function getCurrentTierIndex(elapsedMinutes) {
  for (let i = ONLINE_TIERS.length - 1; i >= 0; i--) {
    if (elapsedMinutes >= ONLINE_TIERS[i].minutes) {
      return i;
    }
  }
  return -1; // 未达到第一档
}

// 在线状态
router.get('/online-status', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const now = Math.floor(Date.now() / 1000);
    const record = await getOrCreateUserOnlineReward(uid);

    const elapsedSec = now - record.last_claim_at;
    const elapsedMinutes = Math.floor(elapsedSec / 60);

    // 找到当前档位
    let tierIndex = getCurrentTierIndex(elapsedMinutes);
    let canClaim = false;
    let remainingSeconds = 0;

    if (tierIndex === -1) {
      // 未达到第一档，还差多少秒
      remainingSeconds = (ONLINE_TIERS[0].minutes * 60) - elapsedSec;
      canClaim = false;
    } else if (tierIndex < ONLINE_TIERS.length - 1) {
      // 还没到最后一档，检查下一档
      const nextTier = ONLINE_TIERS[tierIndex + 1];
      const nextThresholdSec = nextTier.minutes * 60;
      remainingSeconds = nextThresholdSec - elapsedSec;
      canClaim = false;
    } else {
      // 已到最后一档(60分钟)，可以领取
      canClaim = true;
      remainingSeconds = 0;
    }

    // 累计在线时间（取整分）
    const totalMinutes = elapsedMinutes % CYCLE_MINUTES;

    res.json({
      canClaim,
      remainingSeconds: Math.max(0, remainingSeconds),
      currentTier: tierIndex >= 0 ? tierIndex : 0,
      totalMinutes,
      totalClaimed: record.total_claimed,
      reward: ONLINE_TIERS[tierIndex >= 0 ? tierIndex : 0]
    });
  } catch (err) { next(err); }
});

// 领取在线奖励
router.post('/claim-online', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const now = Math.floor(Date.now() / 1000);
    const record = await getOrCreateUserOnlineReward(uid);

    const elapsedSec = now - record.last_claim_at;
    const elapsedMinutes = Math.floor(elapsedSec / 60);
    const tierIndex = getCurrentTierIndex(elapsedMinutes);

    if (tierIndex === -1) {
      return res.status(400).json({ error: '在线时间不足，还无法领取奖励' });
    }

    const tier = ONLINE_TIERS[tierIndex];
    const nextTier = tierIndex < ONLINE_TIERS.length - 1 ? ONLINE_TIERS[tierIndex + 1] : null;

    // 更新 last_claim_at 为本档位开始时间，重置计时
    const cycleStartSec = now - (elapsedMinutes % CYCLE_MINUTES) * 60;
    await db.query(
      'UPDATE `user_online_reward` SET `last_claim_at` = ?, `total_claimed` = `total_claimed` + 1 WHERE `user_id` = ?',
      [cycleStartSec, uid]
    );

    let msg = '';
    if (tier.reward_type === 'money') {
      await db.query('UPDATE `user` SET money = money + ? WHERE `id` = ?', [tier.reward_value, uid]);
      msg = `🎁 在线奖励：铜币+${tier.reward_value}`;
    } else if (tier.reward_type === 'item') {
      await addItems(uid, [{ id: tier.reward_value, qty: tier.quantity }]);
      const item = await db.getOne('SELECT name FROM `item` WHERE id = ?', [tier.reward_value]);
      msg = `🎁 在线奖励：${item?.name || '物品'}×${tier.quantity}`;
    } else if (tier.reward_type === 'both') {
      await db.query('UPDATE `user` SET money = money + 5000 WHERE `id` = ?', [uid]);
      await addItems(uid, [{ id: tier.reward_value, qty: tier.quantity }]);
      const item = await db.getOne('SELECT name FROM `item` WHERE id = ?', [tier.reward_value]);
      msg = `🎁 在线奖励：铜币+5000，${item?.name || '物品'}×${tier.quantity}`;
    }

    res.json({ success: true, msg, nextTier: nextTier ? { minutes: nextTier.minutes, reward: nextTier } : null });
  } catch (err) { next(err); }
});

module.exports = router;
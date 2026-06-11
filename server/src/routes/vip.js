/**
 * VIP + 累充 + 月卡 完整路由
 * GET  /api/vip/status              - 全部状态(vip/月卡/累充/今日)
 * POST /api/vip/charge              - 充值金币（mock 支付）
 * POST /api/vip/buy-monthly         - 购买月卡（100金币）
 * POST /api/vip/claim-daily         - 领取月卡每日奖励
 * POST /api/vip/claim-charge-reward - 领取累充奖励档位
 * GET  /api/vip/recharge-history    - 充值历史
 *
 * 货币：gold 金币 / silver 银币 / money 铜币 / charge_total 累计充值
 */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// ============== 配置常量 ==============
const MONTHLY_CARD_PRICE = 100;
const MONTHLY_CARD_DAYS  = 30;
const MONTHLY_CARD_DAILY_SILVER = 100;

// VIP 档位（按累计 charge_total 自动激活）
const VIP_LEVELS = {
  1: { name: '铜卡', color: '#cd7f32', need: 100,  desc: '每日登录额外领取100银币+离线收益+10%', dailySilver: 100, perks: { offlineBonus: 0.1, expBonus: 0.05 } },
  2: { name: '银卡', color: '#c0c0c0', need: 500,  desc: '铜卡特权+攻击/防御+10%+银币日奖150', dailySilver: 150, perks: { offlineBonus: 0.2, expBonus: 0.1, atkBonus: 0.1, defBonus: 0.1 } },
  3: { name: '金卡', color: '#ffd700', need: 2000, desc: '银卡特权+稀有物品掉落+20%+专属金边框', dailySilver: 200, perks: { offlineBonus: 0.3, expBonus: 0.2, atkBonus: 0.2, defBonus: 0.2, dropBonus: 0.2 } },
};

// 充值档（人民币：金币 = 1:10）
const CHARGE_TIERS = [
  { rmb: 6,    gold: 60,    label: '新手礼包', bonus: 0 },
  { rmb: 30,   gold: 300,   label: '小试牛刀', bonus: 30 },
  { rmb: 98,   gold: 980,   label: '月卡首选', bonus: 100 },
  { rmb: 198,  gold: 1980,  label: '超值充值', bonus: 300 },
  { rmb: 488,  gold: 4880,  label: '豪华大礼', bonus: 800 },
  { rmb: 988,  gold: 9880,  label: '至尊王者', bonus: 2000 },
  { rmb: 1988, gold: 19880, label: '神豪专享', bonus: 5000 },
  { rmb: 4988, gold: 49880, label: '传说霸服', bonus: 15000 },
];

// 累充档位奖励
const CHARGE_REWARD_TIERS = [
  { tier: 1,   need: 30,   label: '初次见面', rewards: { silver: 200,  item: { id: 1001, name: '小还丹×5', qty: 5 } } },
  { tier: 2,   need: 98,   label: '小有积累', rewards: { silver: 500,  item: { id: 1002, name: '中还丹×5', qty: 5 } } },
  { tier: 3,   need: 198,  label: '逐渐成长', rewards: { silver: 1000, item: { id: 2001, name: '藏宝图×1', qty: 1 } } },
  { tier: 4,   need: 488,  label: '实力认可', rewards: { silver: 3000, item: { id: 90001, name: '高级藏宝图×1', qty: 1 } } },
  { tier: 5,   need: 988,  label: '金卡达成', rewards: { silver: 8000, item: { id: 3001, name: '金钥匙×3', qty: 3 } } },
  { tier: 6,   need: 1988, label: '小资玩家', rewards: { silver: 20000, item: { id: 4001, name: '至尊宠物蛋×1', qty: 1 } } },
  { tier: 7,   need: 4988, label: '神豪专属', rewards: { silver: 60000, item: { id: 5001, name: '传说装备箱×1', qty: 1 } } },
  { tier: 8,   need: 9988, label: '传说霸服', rewards: { silver: 150000, item: { id: 9999, name: '至尊神器×1', qty: 1 } } },
];

// ============== 状态接口 ==============
router.get('/status', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const now = Math.floor(Date.now() / 1000);

    const user = await db.getOne(
      'SELECT gold, silver, vip_level, vip_expire, monthly_card, monthly_card_expire, charge_total FROM `user` WHERE `id` = ?',
      [uid]
    );
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const hasMonthlyCard = user.monthly_card > 0 && user.monthly_card_expire > now;
    const monthlyCardRemainDays = hasMonthlyCard ? Math.max(0, Math.ceil((user.monthly_card_expire - now) / 86400)) : 0;
    const hasVip = user.vip_level > 0 && user.vip_expire > now;
    const vipRemainDays = hasVip ? Math.max(0, Math.ceil((user.vip_expire - now) / 86400)) : 0;

    const todayStart = now - (now % 86400);
    const todayStr = new Date(todayStart * 1000).toISOString().slice(0, 10);
    const dailyClaimed = await db.getOne(
      'SELECT id FROM `user_daily_activity` WHERE `user_id` = ? AND `date` = ? AND `activity_key` = ?',
      [uid, todayStr, 'monthly_card_daily']
    );

    // 已领取累充档
    const claimedTiers = await db.query(
      'SELECT tier FROM charge_reward_record WHERE user_id = ?',
      [uid]
    );
    const claimedTierIds = claimedTiers.map(r => r.tier);

    // 累充档位完整状态
    const chargeRewards = CHARGE_REWARD_TIERS.map(t => ({
      ...t,
      achieved: user.charge_total >= t.need,
      claimed: claimedTierIds.includes(t.tier),
    }));

    // 当前 VIP 实际生效档（取累充解锁的最高档）
    const unlockedVipLevel = Object.entries(VIP_LEVELS)
      .filter(([lv, cfg]) => user.charge_total >= cfg.need)
      .map(([lv]) => parseInt(lv))
      .reduce((a, b) => Math.max(a, b), 0);

    res.json({
      gold: user.gold || 0,
      silver: user.silver || 0,
      vipLevel: user.vip_level || 0,
      vipExpire: user.vip_expire || 0,
      vipRemainDays,
      hasVip,
      unlockedVipLevel,
      monthlyCard: user.monthly_card || 0,
      monthlyCardExpire: user.monthly_card_expire || 0,
      monthlyCardRemainDays,
      hasMonthlyCard,
      dailyClaimed: !!dailyClaimed,
      chargeTotal: user.charge_total || 0,
      chargeRewards,
      chargeTiers: CHARGE_TIERS,
      vipLevels: VIP_LEVELS,
      monthlyCardConfig: {
        price: MONTHLY_CARD_PRICE,
        days: MONTHLY_CARD_DAYS,
        dailySilver: MONTHLY_CARD_DAILY_SILVER,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ============== 充值（mock） ==============
router.post('/charge', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const { tier } = req.body;
    const cfg = CHARGE_TIERS.find(t => t.rmb === tier || t.gold === tier);
    if (!cfg) return res.status(400).json({ error: '充值档位无效' });

    const now = Math.floor(Date.now() / 1000);
    const totalGold = cfg.gold + cfg.bonus;

    // 记录订单
    const orderRes = await db.query(
      'INSERT INTO charge_order (user_id, gold, amount_rmb, pay_method, status, created_at) VALUES (?, ?, ?, ?, 1, ?)',
      [uid, totalGold, cfg.rmb, 'mock', now]
    );

    // 加金币 + 累充 + 检查升档
    const user = await db.getOne('SELECT gold, charge_total, vip_level, vip_expire FROM `user` WHERE `id` = ?', [uid]);
    const newChargeTotal = (user.charge_total || 0) + totalGold;

    // 解锁新 VIP 等级
    const unlockedLevel = Object.entries(VIP_LEVELS)
      .filter(([lv, c]) => newChargeTotal >= c.need)
      .map(([lv]) => parseInt(lv))
      .reduce((a, b) => Math.max(a, b), 0);

    let vipExpire = user.vip_expire || 0;
    let vipLevel = user.vip_level || 0;
    let upgradeMsg = '';

    if (unlockedLevel > vipLevel) {
      // 升档：累充型 VIP 永久
      vipLevel = unlockedLevel;
      // 月卡型或首次：30天；已是 VIP：叠加 30 天
      vipExpire = Math.max(now, vipExpire) + 30 * 86400;
      upgradeMsg = ` 🎉 解锁${VIP_LEVELS[unlockedLevel].name}！`;
    } else if (unlockedLevel > 0 && vipLevel > 0) {
      // 已 VIP 续期
      vipExpire = Math.max(now, vipExpire) + 30 * 86400;
    }

    await db.query(
      'UPDATE `user` SET gold = gold + ?, charge_total = ?, vip_level = ?, vip_expire = ? WHERE id = ?',
      [totalGold, newChargeTotal, vipLevel, vipExpire, uid]
    );

    res.json({
      success: true,
      msg: `💰 充值成功！获得${totalGold}金币（含${cfg.bonus}赠送）${upgradeMsg}`,
      goldAdded: totalGold,
      newGold: (user.gold || 0) + totalGold,
      chargeTotal: newChargeTotal,
      vipLevel,
      vipExpire,
      vipUpgrade: !!upgradeMsg,
    });
  } catch (err) {
    next(err);
  }
});

// ============== 购买月卡 ==============
router.post('/buy-monthly', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const now = Math.floor(Date.now() / 1000);

    const user = await db.getOne('SELECT gold, monthly_card, monthly_card_expire FROM `user` WHERE `id` = ?', [uid]);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    if (user.monthly_card > 0 && user.monthly_card_expire > now) {
      const remainDays = Math.ceil((user.monthly_card_expire - now) / 86400);
      return res.status(400).json({ error: `月卡还有${remainDays}天到期，请到期后再续费` });
    }
    if ((user.gold || 0) < MONTHLY_CARD_PRICE) {
      return res.status(400).json({ error: `金币不足，需要${MONTHLY_CARD_PRICE}金币，您有${user.gold || 0}金币` });
    }

    const baseTime = Math.max(user.monthly_card_expire, now);
    const newExpire = baseTime + MONTHLY_CARD_DAYS * 86400;
    await db.query(
      'UPDATE `user` SET gold = gold - ?, monthly_card = 1, monthly_card_expire = ? WHERE `id` = ?',
      [MONTHLY_CARD_PRICE, newExpire, uid]
    );
    res.json({
      success: true,
      msg: `🎉 月卡购买成功！有效期至${new Date(newExpire * 1000).toLocaleDateString('zh-CN')}，每日可领${MONTHLY_CARD_DAILY_SILVER}银币`,
      monthlyCardExpire: newExpire,
    });
  } catch (err) {
    next(err);
  }
});

// ============== 月卡每日奖励 ==============
router.post('/claim-daily', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const now = Math.floor(Date.now() / 1000);

    const user = await db.getOne('SELECT monthly_card, monthly_card_expire, silver FROM `user` WHERE `id` = ?', [uid]);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    if (user.monthly_card <= 0 || user.monthly_card_expire <= now) {
      return res.status(400).json({ error: '您还没有有效月卡，请先购买' });
    }

    const todayStart = now - (now % 86400);
    const todayStr = new Date(todayStart * 1000).toISOString().slice(0, 10);
    const already = await db.getOne(
      'SELECT id FROM `user_daily_activity` WHERE `user_id` = ? AND `date` = ? AND `activity_key` = ?',
      [uid, todayStr, 'monthly_card_daily']
    );
    if (already) return res.status(400).json({ error: '今日月卡奖励已领取' });

    await db.query('UPDATE `user` SET silver = silver + ? WHERE `id` = ?', [MONTHLY_CARD_DAILY_SILVER, uid]);
    await db.query(
      'INSERT INTO `user_daily_activity` (user_id, date, activity_key, progress, claimed, updated_at) VALUES (?, ?, ?, 1, 1, ?) ON DUPLICATE KEY UPDATE claimed = 1, updated_at = ?',
      [uid, todayStr, 'monthly_card_daily', now, now]
    );

    const newSilver = (user.silver || 0) + MONTHLY_CARD_DAILY_SILVER;
    res.json({ success: true, msg: `🎁 月卡每日奖励：银币+${MONTHLY_CARD_DAILY_SILVER}！当前银币：${newSilver}`, silver: newSilver });
  } catch (err) {
    next(err);
  }
});

// ============== 累充档奖励 ==============
router.post('/claim-charge-reward', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const { tier } = req.body;
    const cfg = CHARGE_REWARD_TIERS.find(t => t.tier === tier);
    if (!cfg) return res.status(400).json({ error: '档位无效' });

    const user = await db.getOne('SELECT silver, charge_total FROM `user` WHERE `id` = ?', [uid]);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    if ((user.charge_total || 0) < cfg.need) return res.status(400).json({ error: `累计充值未达${cfg.need}金币` });

    const already = await db.getOne('SELECT id FROM charge_reward_record WHERE user_id = ? AND tier = ?', [uid, tier]);
    if (already) return res.status(400).json({ error: '该档位奖励已领取' });

    const now = Math.floor(Date.now() / 1000);
    const silver = cfg.rewards.silver || 0;
    await db.query('UPDATE `user` SET silver = silver + ? WHERE id = ?', [silver, uid]);

    // 发道具进背包
    if (cfg.rewards.item) {
      const it = cfg.rewards.item;
      const existing = await db.getOne('SELECT id, quantity FROM inventory WHERE user_id = ? AND item_id = ?', [uid, it.id]);
      if (existing) {
        await db.query('UPDATE inventory SET quantity = quantity + ? WHERE id = ?', [it.qty, existing.id]);
      } else {
        await db.query(
          'INSERT INTO inventory (user_id, item_id, quantity) VALUES (?, ?, ?)',
          [uid, it.id, it.qty]
        );
      }
    }

    await db.query(
      'INSERT INTO charge_reward_record (user_id, tier, rewards, claimed_at) VALUES (?, ?, ?, ?)',
      [uid, tier, JSON.stringify(cfg.rewards), now]
    );

    res.json({
      success: true,
      msg: `🎁 领取「${cfg.label}」成功！银币+${silver}${cfg.rewards.item ? ` + ${cfg.rewards.item.name}` : ''}`,
      rewards: cfg.rewards,
      newSilver: (user.silver || 0) + silver,
    });
  } catch (err) {
    next(err);
  }
});

// ============== 充值历史 ==============
router.get('/recharge-history', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const rows = await db.query(
      'SELECT id, gold, amount_rmb, pay_method, status, created_at FROM charge_order WHERE user_id = ? ORDER BY id DESC LIMIT 30',
      [uid]
    );
    res.json({ list: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
/**
 * VIP + 月卡系统路由
 * GET  /api/vip/status       - 获取VIP/月卡状态
 * POST /api/vip/buy-monthly - 购买月卡（100金币）
 * POST /api/vip/claim-daily - 领取月卡每日奖励（100银币）
 * 
 * 货币说明：
 * - gold  金币：高级货币，月卡价格单位
 * - silver 银币：月卡每日奖励，通过 silver 字段存储
 * - money 铜币：游戏主货币（已存在）
 * 
 * VIP等级：0=无，1=铜卡，2=银卡，3=金卡
 */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// ===================== 常量配置 =====================
const MONTHLY_CARD_PRICE = 100;    // 月卡价格（金币）
const MONTHLY_CARD_DAYS  = 30;     // 月卡天数
const MONTHLY_CARD_DAILY_SILVER = 100; // 月卡每日奖励（银币）

// VIP等级配置
const VIP_LEVELS = {
  1: { name: '铜卡',   color: '#cd7f32', desc: '每日登录额外领取100银币+体力恢复加速', dailySilver: 100 },
  2: { name: '银卡',   color: '#c0c0c0', desc: '铜卡特权+攻击/防御+10%', dailySilver: 150 },
  3: { name: '金卡',   color: '#ffd700', desc: '银卡特权+稀有物品掉落率+20%', dailySilver: 200 },
};

// ===================== 状态接口 =====================
router.get('/status', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const now = Math.floor(Date.now() / 1000);

    const user = await db.getOne(
      'SELECT gold, silver, vip_level, vip_expire, monthly_card, monthly_card_expire FROM `user` WHERE `id` = ?',
      [uid]
    );

    if (!user) return res.status(404).json({ error: '用户不存在' });

    // 判断月卡是否有效
    const hasMonthlyCard = user.monthly_card > 0 && user.monthly_card_expire > now;
    const monthlyCardRemainDays = hasMonthlyCard 
      ? Math.max(0, Math.ceil((user.monthly_card_expire - now) / 86400))
      : 0;

    // 判断VIP是否有效
    const hasVip = user.vip_level > 0 && user.vip_expire > now;
    const vipRemainDays = hasVip
      ? Math.max(0, Math.ceil((user.vip_expire - now) / 86400))
      : 0;

    // 查询今日是否已领取月卡奖励
    const todayStart = now - (now % 86400);
    const dailyClaimed = await db.getOne(
      'SELECT id FROM `user_daily_activity` WHERE `user_id` = ? AND `date` = ? AND `activity_key` = ?',
      [uid, todayStart, 'monthly_card_daily']
    );

    res.json({
      gold: user.gold || 0,
      silver: user.silver || 0,
      vipLevel: user.vip_level || 0,
      vipExpire: user.vip_expire || 0,
      vipRemainDays,
      hasVip,
      monthlyCard: user.monthly_card || 0,
      monthlyCardExpire: user.monthly_card_expire || 0,
      monthlyCardRemainDays,
      hasMonthlyCard,
      dailyClaimed: !!dailyClaimed,
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

// ===================== 购买月卡 =====================
router.post('/buy-monthly', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const now = Math.floor(Date.now() / 1000);

    // 检查金币
    const user = await db.getOne('SELECT gold, monthly_card, monthly_card_expire FROM `user` WHERE `id` = ?', [uid]);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    // 检查是否已有有效月卡
    if (user.monthly_card > 0 && user.monthly_card_expire > now) {
      const remainDays = Math.ceil((user.monthly_card_expire - now) / 86400);
      return res.status(400).json({ error: `月卡还有${remainDays}天到期，请到期后再续费` });
    }

    // 扣金币
    if ((user.gold || 0) < MONTHLY_CARD_PRICE) {
      return res.status(400).json({ error: `金币不足，需要${MONTHLY_CARD_PRICE}金币，您有${user.gold || 0}金币` });
    }

    // 计算新到期时间：叠加到现有月卡上
    const baseTime = Math.max(user.monthly_card_expire, now);
    const newExpire = baseTime + MONTHLY_CARD_DAYS * 86400;

    await db.query(
      'UPDATE `user` SET gold = gold - ?, monthly_card = 1, monthly_card_expire = ? WHERE `id` = ?',
      [MONTHLY_CARD_PRICE, newExpire, uid]
    );

    res.json({
      success: true,
      msg: `🎉 月卡购买成功！有效期至${new Date(newExpire * 1000).toLocaleDateString('zh-CN')}，每日可领取${MONTHLY_CARD_DAILY_SILVER}银币！`,
      monthlyCardExpire: newExpire,
    });
  } catch (err) {
    next(err);
  }
});

// ===================== 领取月卡每日奖励 =====================
router.post('/claim-daily', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const now = Math.floor(Date.now() / 1000);

    // 检查月卡是否有效
    const user = await db.getOne(
      'SELECT monthly_card, monthly_card_expire, silver FROM `user` WHERE `id` = ?',
      [uid]
    );
    if (!user) return res.status(404).json({ error: '用户不存在' });

    if (user.monthly_card <= 0 || user.monthly_card_expire <= now) {
      return res.status(400).json({ error: '您还没有购买月卡，请先购买月卡' });
    }

    // 检查今日是否已领取
    const todayStart = now - (now % 86400);
    const alreadyClaimed = await db.getOne(
      'SELECT id FROM `user_daily_activity` WHERE `user_id` = ? AND `date` = ? AND `activity_key` = ?',
      [uid, todayStart, 'monthly_card_daily']
    );
    if (alreadyClaimed) {
      return res.status(400).json({ error: '今日月卡奖励已领取，请明日再来！' });
    }

    // 发放银币
    await db.query('UPDATE `user` SET silver = silver + ? WHERE `id` = ?', [MONTHLY_CARD_DAILY_SILVER, uid]);

    // 记录领取
    await db.query(
      'INSERT INTO `user_daily_activity` (`user_id`, `date`, `activity_key`, `progress`, `claimed`, `updated_at`) VALUES (?, ?, ?, 1, 1, ?) ON DUPLICATE KEY UPDATE `claimed` = 1, `updated_at` = ?',
      [uid, todayStart, 'monthly_card_daily', now, now]
    );

    const newSilver = (user.silver || 0) + MONTHLY_CARD_DAILY_SILVER;
    res.json({
      success: true,
      msg: `🎁 月卡每日奖励：银币+${MONTHLY_CARD_DAILY_SILVER}！当前银币：${newSilver}`,
      silver: newSilver,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
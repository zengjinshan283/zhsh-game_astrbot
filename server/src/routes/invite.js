/**
 * 推广中心路由 - 邀请好友奖励
 * GET  /api/invite/status     - 获取推广状态
 * POST /api/invite/claim/:invitedId - 领取邀请奖励（被邀请人升级时）
 */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 邀请奖励配置：每邀请一人，被邀请人达到特定等级时，邀请人获得奖励
const REWARD_LEVELS = [
  { level: 5,  silver: 5,  money: 5000,  desc: '5级：银币×5，铜币×5000' },
  { level: 10, silver: 10, money: 10000, desc: '10级：银币×10，铜币×10000' },
  { level: 20, silver: 20, money: 20000, desc: '20级：银币×20，铜币×20000' },
];

// 获取推广状态
router.get('/status', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;

    // 获取我邀请的人
    const invited = await db.getAll(
      `SELECT ir.*, u.username, u.level as invited_level
       FROM invite_reward ir
       JOIN user u ON ir.invited_id = u.id
       WHERE ir.inviter_id = ?`,
      [uid]
    );

    // 统计
    const totalInvited = invited.length;
    const totalEarned = invited.reduce((sum, r) => {
      let earned = 0;
      REWARD_LEVELS.forEach(cfg => {
        if (r.invited_level >= cfg.level) earned += cfg.silver;
      });
      return sum + earned;
    }, 0);

    // 每个被邀请人的奖励领取状态
    const invitedList = invited.map(inv => {
      const rewards = REWARD_LEVELS.map(cfg => ({
        level: cfg.level,
        desc: cfg.desc,
        claimed: inv.reward_claimed >= cfg.level,
        eligible: inv.invited_level >= cfg.level
      }));
      return {
        invited_id: inv.invited_id,
        username: inv.username,
        invited_level: inv.invited_level,
        rewards
      };
    });

    res.json({
      total_invited: totalInvited,
      total_earned_silver: totalEarned,
      rewards_config: REWARD_LEVELS.map(r => ({ level: r.level, desc: r.desc })),
      invited_list: invitedList
    });
  } catch (err) { next(err); }
});

// 记录邀请关系（注册时调用）
router.post('/bind', authMiddleware, async (req, res, next) => {
  try {
    const inviterId = parseInt(req.body.inviter_id);
    const invitedId = req.user.id;

    if (!inviterId || inviterId === invitedId) {
      return res.status(400).json({ error: '无效的邀请人' });
    }

    // 检查是否已有绑定关系
    const existing = await db.getOne(
      'SELECT id FROM invite_reward WHERE invited_id = ?',
      [invitedId]
    );
    if (existing) {
      return res.json({ success: true, msg: '已绑定邀请关系' });
    }

    // 检查邀请人是否存在
    const inviter = await db.getOne('SELECT id FROM user WHERE id = ?', [inviterId]);
    if (!inviter) {
      return res.status(400).json({ error: '邀请人不存在' });
    }

    await db.insert('invite_reward', {
      inviter_id: inviterId,
      invited_id: invitedId,
      reward_claimed: 0,
      created_at: Math.floor(Date.now() / 1000)
    });

    res.json({ success: true, msg: '邀请关系绑定成功' });
  } catch (err) { next(err); }
});

// 领取邀请奖励（当被邀请人达到特定等级时自动发放，这里提供手动查询补发）
router.post('/claim/:invitedId', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const invitedId = parseInt(req.params.invitedId);

    // 检查邀请关系
    const record = await db.getOne(
      'SELECT * FROM invite_reward WHERE inviter_id = ? AND invited_id = ?',
      [uid, invitedId]
    );
    if (!record) return res.status(400).json({ error: '无邀请关系' });

    // 获取被邀请人等级
    const invited = await db.getOne('SELECT level FROM user WHERE id = ?', [invitedId]);
    if (!invited) return res.status(400).json({ error: '被邀请人不存在' });

    // 找出可领取但未领取的奖励
    let totalSilver = 0;
    let totalMoney = 0;
    const earned = [];

    for (const cfg of REWARD_LEVELS) {
      if (invited.level >= cfg.level && record.reward_claimed < cfg.level) {
        totalSilver += cfg.silver;
        totalMoney += cfg.money;
        earned.push(cfg.desc);
      }
    }

    if (totalSilver === 0) {
      return res.status(400).json({ error: '暂无可领取的奖励' });
    }

    // 发放奖励
    await db.query(
      'UPDATE user SET silver = silver + ?, money = money + ? WHERE id = ?',
      [totalSilver, totalMoney, uid]
    );

    // 更新领取记录（记录到达的最高等级）
    const newClaimed = Math.max(record.reward_claimed, invited.level);
    await db.query(
      'UPDATE invite_reward SET reward_claimed = ? WHERE id = ?',
      [newClaimed, record.id]
    );

    res.json({
      success: true,
      msg: `🎉 领取成功：${earned.join('、')}，银币+${totalSilver}，铜币+${totalMoney}`
    });
  } catch (err) { next(err); }
});

module.exports = router;
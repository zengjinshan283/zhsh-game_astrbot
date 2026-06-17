/**
 * 离线扫荡系统
 * GET  /api/offline/status   - 计算离线时长 + 可领收益预览
 * POST /api/offline/claim    - 领取离线收益（一次性）
 * GET  /api/offline/sweep    - 扫荡设置（场景/模式）
 * POST /api/offline/start    - 开启扫荡（VIP特权）
 * POST /api/offline/stop     - 停止扫荡
 *
 * 收益公式（基础）:
 * - money = level * 60 / 3600 * offline_seconds
 * - exp   = level * 40 / 3600 * offline_seconds
 * - silver = level * 5  / 3600 * offline_seconds
 *
 * 上限：12小时（43200s）即使离线更久也按 12h 计算
 * VIP加成：vip.level 1/2/3 分别 1.1/1.2/1.3 倍
 * 模式：money_only / exp_only / balanced / silver（扫荡倍率）
 */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

const MAX_OFFLINE_SEC = 12 * 3600;          // 上限12小时
const BASE_RATE = { money: 60, exp: 40, silver: 5 };  // 每小时每级收益
const VIP_MULT = { 0: 1.0, 1: 1.1, 2: 1.2, 3: 1.3 };

const SWEEP_MODES = {
  balanced:  { name: '均衡模式', money: 1.0, exp: 1.0, silver: 1.0, label: '钱/经验/银币均衡' },
  money:     { name: '铜币优先', money: 1.8, exp: 0.5, silver: 0.5, label: '铜币收益+80%，经验/银币减半' },
  exp:       { name: '经验优先', money: 0.5, exp: 1.8, silver: 0.5, label: '经验收益+80%，钱/银币减半' },
  silver:    { name: '银币优先', money: 0.5, exp: 0.5, silver: 1.8, label: '银币收益+80%，钱/经验减半' },
};

// 计算单次离线收益
function calcReward(level, seconds, vipLevel, mode = 'balanced') {
  const eff = Math.min(seconds, MAX_OFFLINE_SEC);
  const hours = eff / 3600;
  const mult = VIP_MULT[vipLevel] || 1;
  const m = SWEEP_MODES[mode] || SWEEP_MODES.balanced;
  return {
    seconds: eff,
    capped: seconds > MAX_OFFLINE_SEC,
    money: Math.floor(BASE_RATE.money * level * hours * mult * m.money),
    exp: Math.floor(BASE_RATE.exp * level * hours * mult * m.exp),
    silver: Math.floor(BASE_RATE.silver * level * hours * mult * m.silver),
    vipMult: mult,
    mode,
  };
}

// GET /api/offline/status
router.get('/status', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const now = Math.floor(Date.now() / 1000);

    const user = await db.getOne(
      'SELECT level, last_offline_at, last_login, vip_level, sweep_mode, sweep_started_at FROM `user` WHERE id=?',
      [uid]
    );
    if (!user) return res.status(404).json({ error: '用户不存在' });

    // 上次离线时间
    const lastOff = user.last_offline_at || 0;
    const offlineSec = lastOff > 0 ? Math.max(0, now - lastOff) : 0;
    const capped = offlineSec > MAX_OFFLINE_SEC;
    const effSec = Math.min(offlineSec, MAX_OFFLINE_SEC);

    // 是否已领过本次离线（防双领）：用 last_offline_at 是否已 update 标记
    const preview = calcReward(user.level, offlineSec, user.vip_level || 0, user.sweep_mode || 'balanced');

    // 扫荡进行中状态
    const sweeping = user.sweep_started_at > 0;
    let sweepReward = null;
    if (sweeping) {
      const sweepSec = now - user.sweep_started_at;
      sweepReward = calcReward(user.level, sweepSec, user.vip_level || 0, user.sweep_mode || 'balanced');
    }

    res.json({
      lastOfflineAt: lastOff,
      offlineSeconds: offlineSec,
      offlineHours: (effSec / 3600).toFixed(1),
      capped,
      maxSeconds: MAX_OFFLINE_SEC,
      level: user.level,
      vipLevel: user.vip_level || 0,
      reward: preview,
      sweeping,
      sweepStartedAt: user.sweep_started_at || 0,
      sweepReward,
      sweepMode: user.sweep_mode || 'balanced',
      modes: SWEEP_MODES,
    });
  } catch (err) { next(err); }
});

// POST /api/offline/claim
router.post('/claim', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const now = Math.floor(Date.now() / 1000);

    const user = await db.getOne(
      'SELECT level, last_offline_at, vip_level, sweep_mode, money, exp, silver FROM `user` WHERE id=?',
      [uid]
    );
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const lastOff = user.last_offline_at || 0;
    const offlineSec = lastOff > 0 ? Math.max(0, now - lastOff) : 0;
    if (offlineSec < 60) return res.status(400).json({ error: '离线时间太短（至少1分钟）' });

    const reward = calcReward(user.level, offlineSec, user.vip_level || 0, user.sweep_mode || 'balanced');

    // 写入记录 + 更新用户（重置 last_offline_at 为 now 表示已结算）
    await db.query(
      'INSERT INTO offline_reward_log (user_id, offline_seconds, money, exp, silver, claimed_at) VALUES (?, ?, ?, ?, ?, ?)',
      [uid, reward.seconds, reward.money, reward.exp, reward.silver, now]
    );
    await db.query(
      'UPDATE `user` SET money = money + ?, exp = exp + ?, silver = silver + ?, last_offline_at = ? WHERE id=?',
      [reward.money, reward.exp, reward.silver, now, uid]
    );

    res.json({
      success: true,
      msg: `🎁 领取离线收益成功！离线 ${(reward.seconds/3600).toFixed(1)}小时，获得铜币+${reward.money} 经验+${reward.exp} 银币+${reward.silver}`,
      reward,
      newMoney: (user.money || 0) + reward.money,
      newExp: (user.exp || 0) + reward.exp,
      newSilver: (user.silver || 0) + reward.silver,
    });
  } catch (err) { next(err); }
});

// POST /api/offline/start - 开启扫荡（VIP才能享受后台自动累计，free用户也能开但无额外加成）
router.post('/start', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const { mode } = req.body;
    if (!SWEEP_MODES[mode]) return res.status(400).json({ error: '模式无效' });
    const now = Math.floor(Date.now() / 1000);
    await db.query('UPDATE `user` SET sweep_mode = ?, sweep_started_at = ?, last_offline_at = ? WHERE id=?',
      [mode, now, now, uid]);
    res.json({ success: true, msg: `⚔️ 已开启${SWEEP_MODES[mode].name}扫荡`, sweepMode: mode });
  } catch (err) { next(err); }
});

// POST /api/offline/stop - 停止扫荡
router.post('/stop', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const now = Math.floor(Date.now() / 1000);
    await db.query('UPDATE `user` SET sweep_started_at = 0, last_offline_at = ? WHERE id=?', [now, uid]);
    res.json({ success: true, msg: '⏸️ 已停止扫荡' });
  } catch (err) { next(err); }
});

// 提供给其他路由调用的 helper：登录时更新 last_offline_at
router.updateLastOffline = async function(uid) {
  const now = Math.floor(Date.now() / 1000);
  // 取已有 last_offline_at，如果从未设过，用当前时间（避免刚注册用户立即领奖）
  const user = await db.getOne('SELECT last_offline_at FROM `user` WHERE id=?', [uid]);
  if (!user) return;
  if (user.last_offline_at === 0) {
    await db.query('UPDATE `user` SET last_offline_at = ? WHERE id=?', [now, uid]);
  }
  // 否则保留上次时间，下次 claim 时计算差
};

module.exports = router;
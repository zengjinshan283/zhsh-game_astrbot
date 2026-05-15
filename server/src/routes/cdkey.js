/**
 * CDKEY/礼包兑换系统
 */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// 查询CDKEY信息（不消耗）
router.get('/query/:code', authMiddleware, async (req, res, next) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    const now = Math.floor(Date.now() / 1000);
    const cdkey = await db.getOne('SELECT * FROM `cdkey` WHERE `code` = ?', [code]);
    if (!cdkey) return res.status(404).json({ ok: false, msg: 'CDKEY不存在' });
    if (cdkey.start_time > 0 && cdkey.start_time > now) return res.status(400).json({ ok: false, msg: 'CDKEY未开始' });
    if (cdkey.end_time > 0 && cdkey.end_time < now) return res.status(400).json({ ok: false, msg: 'CDKEY已过期' });
    if (cdkey.used_count >= cdkey.max_count) return res.status(400).json({ ok: false, msg: 'CDKEY已兑完' });
    const rewards = await db.getAll('SELECT * FROM `cdkey_reward` WHERE `cdkey_id` = ?', [cdkey.id]);
    const canClaim = cdkey.used_count < cdkey.max_count;
    res.json({ ok: true, type: cdkey.type, reward_type: cdkey.reward_type, reward_desc: cdkey.reward_desc, rewards, canClaim });
  } catch (err) { next(err); }
});

// 兑换CDKEY
router.post('/redeem', authMiddleware, async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ ok: false, msg: '请输入CDKEY' });
    const codeTrimmed = code.trim().toUpperCase();
    const now = Math.floor(Date.now() / 1000);

    const cdkey = await db.getOne('SELECT * FROM `cdkey` WHERE `code` = ?', [codeTrimmed]);
    if (!cdkey) return res.status(404).json({ ok: false, msg: 'CDKEY不存在' });
    if (cdkey.start_time > 0 && cdkey.start_time > now) return res.status(400).json({ ok: false, msg: 'CDKEY未开始' });
    if (cdkey.end_time > 0 && cdkey.end_time < now) return res.status(400).json({ ok: false, msg: 'CDKEY已过期' });
    if (cdkey.used_count >= cdkey.max_count) return res.status(400).json({ ok: false, msg: 'CDKEY已兑完' });

    // 检查是否已经兑换过
    const usedLog = await db.getOne('SELECT id FROM `cdkey_log` WHERE `cdkey_id` = ? AND `user_id` = ?', [cdkey.id, req.user.id]);
    if (usedLog) return res.status(400).json({ ok: false, msg: '您已兑换过此CDKEY' });

    // 获取奖励
    const rewardList = await db.getAll('SELECT * FROM `cdkey_reward` WHERE `cdkey_id` = ?', [cdkey.id]);
    const results = [];

    if (cdkey.reward_type === 'items' && rewardList.length > 0) {
      for (const r of rewardList) {
        if (r.item_id > 0) {
          const exInv = await db.getOne('SELECT id, quantity FROM `inventory` WHERE `user_id` = ? AND `item_id` = ? AND `equipped` = 0', [req.user.id, r.item_id]);
          if (exInv) {
            await db.update('inventory', { quantity: exInv.quantity + r.quantity }, '`id` = ?', [exInv.id]);
          } else {
            await db.insert('inventory', { user_id: req.user.id, item_id: r.item_id, quantity: r.quantity, equipped: 0, enhance_level: 0 });
          }
          results.push(`${r.item_name} x${r.quantity}`);
        }
        if (r.money > 0) {
          await db.query('UPDATE `user` SET `money` = `money` + ? WHERE `id` = ?', [r.money, req.user.id]);
          results.push(`铜币 +${r.money}`);
        }
        if (r.coupon > 0) {
          await db.query('UPDATE `user` SET `coupon` = `coupon` + ? WHERE `id` = ?', [r.coupon, req.user.id]);
          results.push(`礼券 +${r.coupon}`);
        }
      }
    } else if (cdkey.reward_type === 'money') {
      // reward_desc格式: money_5000
      const parts = cdkey.reward_desc.split('_');
      const amount = parseInt(parts[1]) || 0;
      if (amount > 0) {
        await db.query('UPDATE `user` SET `money` = `money` + ? WHERE `id` = ?', [amount, req.user.id]);
        results.push(`铜币 +${amount}`);
      }
    }

    // 更新计数和日志
    await db.query('UPDATE `cdkey` SET `used_count` = `used_count` + 1 WHERE `id` = ?', [cdkey.id]);
    await db.insert('cdkey_log', { cdkey_id: cdkey.id, user_id: req.user.id, code: codeTrimmed, reward_desc: cdkey.reward_desc, created_at: now });

    res.json({ ok: true, msg: `兑换成功！获得：${results.join('、')}`, rewards: results });
  } catch (err) { next(err); }
});

module.exports = router;

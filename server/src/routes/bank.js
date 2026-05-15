/**
 * 银行路由 - 独立银行系统
 */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// 银行 - 查询余额和日志
router.get('/info', authMiddleware, async (req, res, next) => {
  try {
    const user = await db.getOne('SELECT money, bank_money FROM `user` WHERE `id` = ?', [req.user.id]);
    const logs = await db.getAll('SELECT * FROM `bank_log` WHERE `user_id` = ? ORDER BY `id` DESC LIMIT 20', [req.user.id]);
    res.json({ money: user.money, bank_money: user.bank_money, total: user.money + user.bank_money, logs });
  } catch (err) { next(err); }
});

// 银行 - 存款
router.post('/deposit', authMiddleware, async (req, res, next) => {
  try {
    const { amount } = req.body;
    const amt = parseInt(amount);
    if (!amt || amt <= 0) return res.status(400).json({ error: '请输入有效金额' });
    const user = await db.getOne('SELECT money, bank_money FROM `user` WHERE `id` = ?', [req.user.id]);
    if (user.money < amt) return res.status(400).json({ error: '铜币不足' });
    await db.query('UPDATE `user` SET `money` = `money` - ?, `bank_money` = `bank_money` + ? WHERE `id` = ?', [amt, amt, req.user.id]);
    await db.insert('bank_log', { user_id: req.user.id, type: 1, amount: amt, balance: user.bank_money + amt, created_at: Math.floor(Date.now() / 1000) });
    const updated = await db.getOne('SELECT money, bank_money FROM `user` WHERE `id` = ?', [req.user.id]);
    res.json({ success: true, money: updated.money, bank_money: updated.bank_money });
  } catch (err) { next(err); }
});

// 银行 - 取款
router.post('/withdraw', authMiddleware, async (req, res, next) => {
  try {
    const { amount } = req.body;
    const amt = parseInt(amount);
    if (!amt || amt <= 0) return res.status(400).json({ error: '请输入有效金额' });
    const user = await db.getOne('SELECT money, bank_money FROM `user` WHERE `id` = ?', [req.user.id]);
    if (user.bank_money < amt) return res.status(400).json({ error: '存款不足' });
    await db.query('UPDATE `user` SET `money` = `money` + ?, `bank_money` = `bank_money` - ? WHERE `id` = ?', [amt, amt, req.user.id]);
    await db.insert('bank_log', { user_id: req.user.id, type: 0, amount: amt, balance: user.bank_money - amt, created_at: Math.floor(Date.now() / 1000) });
    const updated = await db.getOne('SELECT money, bank_money FROM `user` WHERE `id` = ?', [req.user.id]);
    res.json({ success: true, money: updated.money, bank_money: updated.bank_money });
  } catch (err) { next(err); }
});

module.exports = router;

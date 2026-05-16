const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.post('/bet', authMiddleware, async (req, res, next) => {
  try {
    const { amount, choice } = req.body;
    if (!['big','small'].includes(choice)) return res.status(400).json({ error: '无效选择' });
    const betAmount = parseInt(amount);
    if (!betAmount || betAmount <= 0) return res.status(400).json({ error: '请输入有效金额' });
    const user = await db.getOne('SELECT money FROM `user` WHERE `id` = ?', [req.user.id]);
    if (user.money < betAmount) return res.status(400).json({ error: '铜币不足！' });
    // Simple daily limit check
    const today = new Date().toISOString().slice(0,10);
    const todayLog = await db.getOne("SELECT COALESCE(SUM(amount),0) as total_bet FROM `bank_log` WHERE `user_id` = ? AND `type` = 5 AND `created_at` > ?", [req.user.id, Math.floor(new Date(today).getTime()/1000)]);
    const limit = 10000;
    if (todayLog && todayLog.total_bet + betAmount > limit) return res.status(400).json({ error: `超过今日限额！剩余：${limit - todayLog.total_bet}` });
    await db.query('UPDATE `user` SET money = money - ? WHERE `id` = ?', [betAmount, req.user.id]);
    await db.insert('bank_log', { user_id: req.user.id, type: 5, amount: betAmount, balance: 0, created_at: Math.floor(Date.now()/1000) });

    // 调用每日活跃进度 - 赌场娱乐
    try {
      const today = new Date().toISOString().slice(0,10);
      await db.query('INSERT IGNORE INTO `user_daily_activity` (user_id, date, activity_key, progress, claimed, updated_at) VALUES (?, ?, ?, 1, 0, ?)',
        [req.user.id, today, 'daily_gamble', Math.floor(Date.now()/1000)]);
      await db.query('UPDATE `user_daily_activity` SET progress = LEAST(progress + 1, 1), updated_at = ? WHERE user_id = ? AND date = ? AND activity_key = ?',
        [Math.floor(Date.now()/1000), req.user.id, today, 'daily_gamble']);
    } catch(e) { console.error('[daily] daily_gamble progress error:', e.message); }
    const dice1 = Math.floor(Math.random()*6)+1;
    const dice2 = Math.floor(Math.random()*6)+1;
    const total = dice1 + dice2;
    const isBig = total >= 7;
    const isWin = (choice === 'big' && isBig) || (choice === 'small' && !isBig);
    if (isWin) {
      const winAmount = betAmount * 2;
      await db.query('UPDATE `user` SET money = money + ? WHERE `id` = ?', [winAmount, req.user.id]);
      res.json({ success: true, dice1, dice2, total, isBig, choice, isWin: true, winAmount, msg: `恭喜！赢了 ${winAmount} 铜币！` });
    } else {
      res.json({ success: false, dice1, dice2, total, isBig, choice, isWin: false, msg: `可惜！输了 ${betAmount} 铜币` });
    }
  } catch(e){next(e);}
});

module.exports = router;

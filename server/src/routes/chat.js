/**
 * 聊天路由
 */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 获取最近消息
router.get('/messages', authMiddleware, async (req, res, next) => {
  try {
    const messages = await db.getAll(
      'SELECT c.*, u.username, u.sex, u.level FROM `chat` c JOIN `user` u ON c.user_id = u.id ORDER BY c.id DESC LIMIT 50',
      []
    );
    res.json({ messages: messages.reverse() });
  } catch (err) { next(err); }
});

// 发送消息
router.post('/send', authMiddleware, async (req, res, next) => {
  try {
    const { message, target_id } = req.body;
    const msg = (message || '').trim();
    if (msg.length < 1 || msg.length > 200) return res.status(400).json({ error: '消息长度1-200字符' });
    const tid = parseInt(target_id) || 0;
    const id = await db.insert('chat', { user_id: req.user.id, target_id: tid, message: msg, created_at: Math.floor(Date.now() / 1000) });
    const user = await db.getOne('SELECT username, sex, level FROM `user` WHERE `id` = ?', [req.user.id]);

    // 调用每日活跃进度 - 世界聊天
    try {
      const today = new Date().toISOString().slice(0,10);
      await db.query('INSERT IGNORE INTO `user_daily_activity` (user_id, date, activity_key, progress, claimed, updated_at) VALUES (?, ?, ?, 1, 0, ?)',
        [req.user.id, today, 'daily_chat', Math.floor(Date.now()/1000)]);
      await db.query('UPDATE `user_daily_activity` SET progress = LEAST(progress + 1, 1), updated_at = ? WHERE user_id = ? AND date = ? AND activity_key = ?',
        [Math.floor(Date.now()/1000), req.user.id, today, 'daily_chat']);
    } catch(e) { console.error('[daily] daily_chat progress error:', e.message); }

    res.json({ id, user_id: req.user.id, username: user.username, sex: user.sex, level: user.level, message: msg });
  } catch (err) { next(err); }
});

module.exports = router;

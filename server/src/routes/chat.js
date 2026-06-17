/**
 * 聊天路由
 */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 获取最近消息（默认全频道；可传 ?scope=all|world|system|chat）
router.get('/messages', authMiddleware, async (req, res, next) => {
  try {
    const scope = (req.query.scope || 'all').toString();
    let where = '';
    if (scope === 'world') where = 'WHERE c.type IN (1,3)';        // 世界广播 + 宝图分享
    else if (scope === 'system') where = 'WHERE c.type = 2';         // 系统
    else if (scope === 'chat') where = 'WHERE c.type = 0';          // 普通聊天
    const messages = await db.getAll(
      `SELECT c.*, u.username, u.sex, u.level FROM \`chat\` c JOIN \`user\` u ON c.user_id = u.id ${where} ORDER BY c.id DESC LIMIT 80`,
      []
    );
    res.json({ messages: messages.reverse() });
  } catch (err) { next(err); }
});

// 世界频道（独立路由，等价 /messages?scope=world）
router.get('/world', authMiddleware, async (req, res, next) => {
  try {
    const messages = await db.getAll(
      'SELECT c.*, u.username, u.sex, u.level FROM `chat` c JOIN `user` u ON c.user_id = u.id WHERE c.type IN (1,3) ORDER BY c.id DESC LIMIT 80',
      []
    );
    res.json({ messages: messages.reverse() });
  } catch (err) { next(err); }
});

// 发送消息（type 0=普通 1=世界广播 2=系统（禁止）3=宝图分享（禁止））
router.post('/send', authMiddleware, async (req, res, next) => {
  try {
    const { message, target_id, type } = req.body;
    const msg = (message || '').trim();
    if (msg.length < 1 || msg.length > 200) return res.status(400).json({ error: '消息长度1-200字符' });
    const tid = parseInt(target_id) || 0;
    // 世界广播限流：每用户 90 秒最多 1 条 type=1
    let msgType = parseInt(type) || 0;
    if (msgType === 1) {
      const now = Math.floor(Date.now() / 1000);
      const last = await db.getOne('SELECT created_at FROM `chat` WHERE user_id=? AND type=1 ORDER BY id DESC LIMIT 1', [req.user.id]);
      if (last && now - last.created_at < 90) return res.status(400).json({ error: '世界广播冷却中，请稍后再试' });
    }
    if (msgType === 2 || msgType === 3) return res.status(400).json({ error: '该类型消息不能由用户发送' });

    const id = await db.insert('chat', { user_id: req.user.id, target_id: tid, message: msg, type: msgType, created_at: Math.floor(Date.now() / 1000) });
    const user = await db.getOne('SELECT username, sex, level FROM `user` WHERE `id` = ?', [req.user.id]);

    // 调用每日活跃进度 - 世界聊天
    try {
      const today = new Date().toISOString().slice(0,10);
      await db.query('INSERT IGNORE INTO `user_daily_activity` (user_id, date, activity_key, progress, claimed, updated_at) VALUES (?, ?, ?, 1, 0, ?)',
        [req.user.id, today, 'daily_chat', Math.floor(Date.now()/1000)]);
      await db.query('UPDATE `user_daily_activity` SET progress = LEAST(progress + 1, 1), updated_at = ? WHERE user_id = ? AND date = ? AND activity_key = ?',
        [Math.floor(Date.now()/1000), req.user.id, today, 'daily_chat']);
    } catch(e) { console.error('[daily] daily_chat progress error:', e.message); }

    res.json({ id, user_id: req.user.id, username: user.username, sex: user.sex, level: user.level, message: msg, type: msgType });
  } catch (err) { next(err); }
});

// 系统广播（管理员/系统调用，写入 type=2 系统频道）
async function systemBroadcast(text) {
  try {
    await db.insert('chat', {
      user_id: 0, target_id: 0, message: text, type: 2, created_at: Math.floor(Date.now() / 1000)
    });
  } catch(e) { console.error('[chat] systemBroadcast error:', e.message); }
}

// GET /api/chat/unread - 各频道未读数（基于 chat_read 表）
router.get('/unread', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const scopes = {
      world:    'c.type IN (1,3)',  // 世界+宝图
      system:   'c.type = 2',        // 系统
      chat:     'c.type = 0',        // 普通聊天
    };
    const reads = await db.getAll('SELECT scope, last_read_id FROM chat_read WHERE user_id=?', [uid]);
    const readMap = {};
    for (const r of reads) readMap[r.scope] = r.last_read_id;
    const result = {};
    for (const [k, cond] of Object.entries(scopes)) {
      const lastId = readMap[k] || 0;
      const row = await db.getOne(`SELECT COUNT(*) as cnt, MAX(c.id) as max_id FROM chat c WHERE ${cond} AND c.id > ?`, [lastId]);
      result[k] = { count: row.cnt, maxId: row.max_id || lastId };
    }
    // 总未读
    result.total = result.world.count + result.system.count + result.chat.count;
    res.json(result);
  } catch (err) { next(err); }
});

// POST /api/chat/mark-read { scope }
router.post('/mark-read', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const { scope } = req.body;
    const scopes = { world: 1, system: 1, chat: 1 };
    if (!scopes[scope]) return res.status(400).json({ error: 'scope 必须 world/system/chat' });
    // 取该 scope 最新 id
    const cond = scope === 'world' ? 'type IN (1,3)' : (scope === 'system' ? 'type = 2' : 'type = 0');
    const last = await db.getOne(`SELECT MAX(id) as max_id FROM chat WHERE ${cond}`);
    const now = Math.floor(Date.now() / 1000);
    await db.query('INSERT INTO chat_read (user_id, scope, last_read_id, last_read_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE last_read_id=VALUES(last_read_id), last_read_at=VALUES(last_read_at)',
      [uid, scope, last.max_id || 0, now]);
    res.json({ success: true, scope, lastReadId: last.max_id || 0 });
  } catch (err) { next(err); }
});

module.exports = router;
module.exports.systemBroadcast = systemBroadcast;

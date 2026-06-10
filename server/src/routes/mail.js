const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

// 收件箱列表
router.get('/list', authMiddleware, async (req, res, next) => {
  try {
    const { filter = 'all' } = req.query;
    let where = 'to_user_id = ?';
    const params = [req.user.id];
    if (filter === 'unread') where += ' AND read_at = 0';
    if (filter === 'reward') where += ' AND rewards IS NOT NULL';
    if (filter === 'claimed') where += ' AND claimed = 1';

    const list = await db.getAll(
      `SELECT id, from_user_id, from_name, title, content, rewards, claimed, read_at, created_at, expires_at
       FROM mail WHERE ${where} ORDER BY id DESC LIMIT 100`,
      params
    );
    const unread_count = (await db.getVar('SELECT COUNT(*) FROM mail WHERE to_user_id=? AND read_at=0', [req.user.id])) || 0;
    res.json({ list, unread_count });
  } catch (e) { next(e); }
});

// 读取单封（自动标已读）
router.get('/read/:id', authMiddleware, async (req, res, next) => {
  try {
    const m = await db.getOne('SELECT * FROM mail WHERE id=? AND to_user_id=?', [req.params.id, req.user.id]);
    if (!m) return res.status(404).json({ error: '邮件不存在' });
    if (m.read_at === 0) {
      await db.query('UPDATE mail SET read_at=? WHERE id=?', [Math.floor(Date.now() / 1000), m.id]);
      m.read_at = Math.floor(Date.now() / 1000);
    }
    res.json({ mail: m });
  } catch (e) { next(e); }
});

// 一键领取附件
router.post('/claim/:id', authMiddleware, async (req, res, next) => {
  try {
    const m = await db.getOne('SELECT * FROM mail WHERE id=? AND to_user_id=?', [req.params.id, req.user.id]);
    if (!m) return res.status(404).json({ error: '邮件不存在' });
    if (m.claimed) return res.status(400).json({ error: '附件已领取' });
    if (!m.rewards) return res.status(400).json({ error: '邮件无附件' });

    const rewards = typeof m.rewards === 'string' ? JSON.parse(m.rewards) : m.rewards;
    const granted = [];
    for (const r of rewards) {
      if (r.type === 'money') {
        await db.query('UPDATE `user` SET money = money + ? WHERE id=?', [r.amount, req.user.id]);
        granted.push(`+${r.amount} 铜币`);
      } else if (r.type === 'silver') {
        await db.query('UPDATE `user` SET silver = silver + ? WHERE id=?', [r.amount, req.user.id]);
        granted.push(`+${r.amount} 银币`);
      } else if (r.type === 'item') {
        // 调 inventory helper
        try {
          const inv = await db.getOne('SELECT id, quantity FROM inventory WHERE user_id=? AND item_id=? AND equipped=0', [req.user.id, r.item_id]);
          if (inv) {
            await db.query('UPDATE inventory SET quantity = quantity + ? WHERE id=?', [r.amount || 1, inv.id]);
          } else {
            await db.query('INSERT INTO inventory (user_id, item_id, quantity, equipped) VALUES (?, ?, ?, 0)', [req.user.id, r.item_id, r.amount || 1]);
          }
          const it = await db.getOne('SELECT name FROM item WHERE id=?', [r.item_id]);
          granted.push(`+${it?.name || '物品'} ×${r.amount || 1}`);
        } catch (e) { granted.push(`物品${r.item_id}发放失败`); }
      }
    }
    await db.query('UPDATE mail SET claimed=1 WHERE id=?', [m.id]);
    res.json({ success: true, msg: '领取成功: ' + granted.join(' / '), granted });
  } catch (e) { next(e); }
});

// 一键全部领取
router.post('/claim-all', authMiddleware, async (req, res, next) => {
  try {
    const list = await db.getAll("SELECT id, rewards FROM mail WHERE to_user_id=? AND claimed=0 AND rewards IS NOT NULL", [req.user.id]);
    let claimed_count = 0;
    const allGranted = [];
    for (const m of list) {
      const rewards = typeof m.rewards === 'string' ? JSON.parse(m.rewards) : m.rewards;
      for (const r of rewards) {
        if (r.type === 'money') {
          await db.query('UPDATE `user` SET money = money + ? WHERE id=?', [r.amount, req.user.id]);
          allGranted.push(`+${r.amount} 铜币`);
        } else if (r.type === 'silver') {
          await db.query('UPDATE `user` SET silver = silver + ? WHERE id=?', [r.amount, req.user.id]);
          allGranted.push(`+${r.amount} 银币`);
        } else if (r.type === 'item') {
          const inv = await db.getOne('SELECT id, quantity FROM inventory WHERE user_id=? AND item_id=? AND equipped=0', [req.user.id, r.item_id]);
          if (inv) {
            await db.query('UPDATE inventory SET quantity = quantity + ? WHERE id=?', [r.amount || 1, inv.id]);
          } else {
            await db.query('INSERT INTO inventory (user_id, item_id, quantity, equipped) VALUES (?, ?, ?, 0)', [req.user.id, r.item_id, r.amount || 1]);
          }
          const it = await db.getOne('SELECT name FROM item WHERE id=?', [r.item_id]);
          allGranted.push(`+${it?.name || '物品'} ×${r.amount || 1}`);
        }
      }
      await db.query('UPDATE mail SET claimed=1 WHERE id=?', [m.id]);
      claimed_count++;
    }
    res.json({ success: true, claimed_count, msg: claimed_count > 0 ? `已领取 ${claimed_count} 封附件` : '没有可领取的附件', granted: allGranted });
  } catch (e) { next(e); }
});

// 删除已读
router.post('/delete/:id', authMiddleware, async (req, res, next) => {
  try {
    const r = await db.query('DELETE FROM mail WHERE id=? AND to_user_id=?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (e) { next(e); }
});

// 系统发邮件（内部 API，不需 auth，依赖 X-Internal-Key 或管理员调用）
async function sendMail({ to_user_id, from_user_id = 0, from_name = '系统', title, content, rewards = null, expires_at = 0 }) {
  await db.query(
    'INSERT INTO mail (to_user_id, from_user_id, from_name, title, content, rewards, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [to_user_id, from_user_id, from_name, title, content, rewards ? JSON.stringify(rewards) : null, Math.floor(Date.now() / 1000), expires_at]
  );
}

module.exports = router;
module.exports.sendMail = sendMail;

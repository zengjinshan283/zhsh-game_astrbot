/**
 * 管理后台 - CDKEY管理
 */
const express = require('express');
const db = require('../../db');
const { adminAuth } = require('../../middleware/adminAuth');
const router = express.Router();
const crypto = require('crypto');

function genCode(prefix, n=8) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < n; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return prefix + result;
}

// 列表
router.get('/list', adminAuth, async (req, res, next) => {
  try {
    const { type, page = 1, pageSize = 20 } = req.query;
    let where = '';
    const params = [];
    if (type) { where = 'WHERE type = ?'; params.push(type); }
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const rows = await db.getAll(`SELECT c.*, (SELECT COUNT(*) FROM cdkey_log cl WHERE cl.cdkey_id=c.id) as actual_used FROM cdkey c ${where} ORDER BY c.id DESC LIMIT ${parseInt(pageSize)} OFFSET ${offset}`, params);
    const total = await db.getVar(`SELECT COUNT(*) as v FROM cdkey c ${where}`, params);
    res.json({ rows, total, page: parseInt(page), pageSize: parseInt(pageSize) });
  } catch (err) { next(err); }
});

// 批量生成
router.post('/generate', adminAuth, async (req, res, next) => {
  try {
    const { prefix, type = 1, reward_type = 'items', reward_desc, max_count = 1, count = 10, days_valid = 365 } = req.body;
    if (!prefix || !reward_desc) return res.status(400).json({ error: '缺少参数' });
    const now = Math.floor(Date.now() / 1000);
    const endTime = now + (days_valid || 365) * 86400;
    const codes = [];
    for (let i = 0; i < (count || 10); i++) {
      codes.push([genCode(prefix || 'KEY', 8), type, reward_type, reward_desc, 0, max_count || 1, 0, endTime, now]);
    }
    for (const c of codes) {
      await db.insert('cdkey', { code: c[0], type: c[1], reward_type: c[2], reward_desc: c[3], used_count: 0, max_count: c[5], start_time: 0, end_time: c[7], created_at: c[8] });
    }
    res.json({ success: true, count: codes.length, codes: codes.map(c => c[0]) });
  } catch (err) { next(err); }
});

// 删除
router.post('/delete', adminAuth, async (req, res, next) => {
  try {
    const { id } = req.body;
    await db.query('DELETE FROM cdkey WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// 查看兑换记录
router.get('/logs/:id', adminAuth, async (req, res, next) => {
  try {
    const logs = await db.getAll('SELECT cl.*, u.username, u.level FROM cdkey_log cl LEFT JOIN `user` u ON cl.user_id=u.id WHERE cl.cdkey_id = ? ORDER BY cl.id DESC', [req.params.id]);
    res.json({ logs });
  } catch (err) { next(err); }
});

module.exports = router;

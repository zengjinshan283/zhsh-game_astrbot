/**
 * 管理后台 - 操作日志
 */
const express = require('express');
const db = require('../../db');
const { adminAuth } = require('../../middleware/adminAuth');

const router = express.Router();
router.use(adminAuth);

// 管理员列表（供筛选下拉使用）
router.get('/admins', async (req, res) => {
  try {
    const list = await db.getAll(
      'SELECT id, username, nickname FROM admin_user WHERE is_active = 1 ORDER BY id'
    );
    res.json({ code: 0, data: list, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, action, adminId, startDate, endDate } = req.query;
    let where = '1=1';
    const params = [];
    if (action) { where += ' AND al.action LIKE ?'; params.push(`%${action}%`); }
    if (adminId) { where += ' AND al.admin_id = ?'; params.push(adminId); }
    if (startDate) { where += ' AND al.created_at >= ?'; params.push(startDate); }
    if (endDate) { where += ' AND al.created_at <= ?'; params.push(endDate + ' 23:59:59'); }
    const total = await db.getVar(`SELECT COUNT(*) FROM admin_log al WHERE ${where}`, params);
    const list = await db.getAll(
      `SELECT al.*, au.username, au.nickname FROM admin_log al LEFT JOIN admin_user au ON al.admin_id = au.id WHERE ${where} ORDER BY al.id DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize)]
    );
    res.json({ code: 0, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) }, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;

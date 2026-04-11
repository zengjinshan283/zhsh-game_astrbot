/**
 * 管理后台 - 数据变更日志
 */
const express = require('express');
const db = require('../../db');
const { adminAuth } = require('../../middleware/adminAuth');

const router = express.Router();
router.use(adminAuth);

router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, tableName, action, adminId, startDate, endDate } = req.query;
    let where = '1=1';
    const params = [];
    if (tableName) { where += ' AND dc.table_name = ?'; params.push(tableName); }
    if (action) { where += ' AND dc.action = ?'; params.push(action); }
    if (adminId) { where += ' AND dc.admin_id = ?'; params.push(adminId); }
    if (startDate) { where += ' AND dc.created_at >= ?'; params.push(startDate); }
    if (endDate) { where += ' AND dc.created_at <= ?'; params.push(endDate + ' 23:59:59'); }
    const total = await db.getVar(`SELECT COUNT(*) FROM data_changelog dc WHERE ${where}`, params);
    const list = await db.getAll(
      `SELECT dc.*, au.username, au.nickname FROM data_changelog dc LEFT JOIN admin_user au ON dc.admin_id = au.id WHERE ${where} ORDER BY dc.id DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize)]
    );
    res.json({ code: 0, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) }, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;

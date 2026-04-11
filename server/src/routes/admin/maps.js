/**
 * 管理后台 - 地图/城市管理
 */
const express = require('express');
const db = require('../../db');
const { adminAuth, logAction, logChangelog } = require('../../middleware/adminAuth');

const router = express.Router();
router.use(adminAuth);

// 列表
router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (m.name LIKE ?)'; params.push(`%${keyword}%`); }
    const totalSql = `SELECT COUNT(*) FROM map m WHERE ${where}`;
    const listSql = `SELECT m.*, (SELECT COUNT(*) FROM place WHERE city_id = m.id) AS place_count FROM map m WHERE ${where} ORDER BY m.sort_order, m.id LIMIT ? OFFSET ?`;
    const total = await db.getVar(totalSql, params);
    const list = await db.getAll(listSql, [...params, parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize)]);
    res.json({ code: 0, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) }, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 详情
router.get('/:id', async (req, res) => {
  try {
    const row = await db.getOne('SELECT * FROM map WHERE id = ?', [req.params.id]);
    if (!row) return res.json({ code: 1, message: '记录不存在' });
    res.json({ code: 0, data: row, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 新增
router.post('/', async (req, res) => {
  try {
    const { name, parent_id, type, sort_order } = req.body;
    const id = await db.insert('map', { name, parent_id: parent_id || 0, type: type || 0, sort_order: sort_order || 0 });
    await logAction(req.admin.id, 'create', 'map', `新增地图: ${name}`, req);
    await logChangelog(req.admin.id, 'map', id, 'create', null, req.body, req);
    res.json({ code: 0, data: { id }, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 更新
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const old = await db.getOne('SELECT * FROM map WHERE id = ?', [id]);
    if (!old) return res.json({ code: 1, message: '记录不存在' });
    const { name, parent_id, type, sort_order } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (parent_id !== undefined) data.parent_id = parent_id;
    if (type !== undefined) data.type = type;
    if (sort_order !== undefined) data.sort_order = sort_order;
    await db.update('map', data, 'id = ?', [id]);
    await logAction(req.admin.id, 'update', 'map', `更新地图: ${old.name}`, req);
    await logChangelog(req.admin.id, 'map', id, 'update', old, { ...old, ...data }, req);
    res.json({ code: 0, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 删除
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const old = await db.getOne('SELECT * FROM map WHERE id = ?', [id]);
    if (!old) return res.json({ code: 1, message: '记录不存在' });
    // Check for child maps and places
    const children = await db.getVar('SELECT COUNT(*) FROM map WHERE parent_id = ?', [id]);
    if (children > 0) return res.json({ code: 1, message: '存在子地图，无法删除' });
    await db.delete('map', 'id = ?', [id]);
    await logAction(req.admin.id, 'delete', 'map', `删除地图: ${old.name}`, req);
    await logChangelog(req.admin.id, 'map', id, 'delete', old, null, req);
    res.json({ code: 0, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;

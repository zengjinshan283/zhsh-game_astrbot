/**
 * 管理后台 - 枚举管理
 */
const express = require('express');
const db = require('../../db');
const { adminAuth, logAction, logChangelog } = require('../../middleware/adminAuth');

const router = express.Router();
router.use(adminAuth);

// 获取所有枚举分组
router.get('/groups', async (req, res) => {
  try {
    const groups = await db.getAll(
      'SELECT DISTINCT group_name FROM enum_definition ORDER BY group_name'
    );
    res.json({ code: 0, data: groups.map(g => g.group_name), message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 获取指定分组的枚举列表
router.get('/group/:groupName', async (req, res) => {
  try {
    const list = await db.getAll(
      'SELECT * FROM enum_definition WHERE group_name = ? ORDER BY sort_order, id',
      [req.params.groupName]
    );
    res.json({ code: 0, data: list, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 枚举列表（分页）
router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, groupName, keyword } = req.query;
    let where = '1=1';
    const params = [];
    if (groupName) { where += ' AND group_name = ?'; params.push(groupName); }
    if (keyword) { where += ' AND (label LIKE ? OR description LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    const total = await db.getVar(`SELECT COUNT(*) FROM enum_definition WHERE ${where}`, params);
    const list = await db.getAll(
      `SELECT * FROM enum_definition WHERE ${where} ORDER BY group_name, sort_order, id LIMIT ? OFFSET ?`,
      [...params, parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize)]
    );
    res.json({ code: 0, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) }, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 新增枚举
router.post('/', async (req, res) => {
  try {
    const { group_name, key_value, label, description, sort_order } = req.body;
    const id = await db.insert('enum_definition', { group_name, key_value, label, description: description || null, sort_order: sort_order || 0 });
    await logAction(req.admin.id, 'create', 'enum_definition', `新增枚举 ${group_name}:${key_value}`, req);
    await logChangelog(req.admin.id, 'enum_definition', id, 'create', null, req.body, req);
    res.json({ code: 0, data: { id }, message: 'success' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.json({ code: 1, message: '该枚举键已存在' });
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 更新枚举
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const old = await db.getOne('SELECT * FROM enum_definition WHERE id = ?', [id]);
    if (!old) return res.json({ code: 1, message: '记录不存在' });
    const { label, description, sort_order, is_active } = req.body;
    const data = {};
    if (label !== undefined) data.label = label;
    if (description !== undefined) data.description = description;
    if (sort_order !== undefined) data.sort_order = sort_order;
    if (is_active !== undefined) data.is_active = is_active;
    await db.update('enum_definition', data, 'id = ?', [id]);
    await logAction(req.admin.id, 'update', 'enum_definition', `更新枚举 ${old.group_name}:${old.key_value}`, req);
    await logChangelog(req.admin.id, 'enum_definition', id, 'update', old, { ...old, ...data }, req);
    res.json({ code: 0, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 删除枚举
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const old = await db.getOne('SELECT * FROM enum_definition WHERE id = ?', [id]);
    if (!old) return res.json({ code: 1, message: '记录不存在' });
    await db.delete('enum_definition', 'id = ?', [id]);
    await logAction(req.admin.id, 'delete', 'enum_definition', `删除枚举 ${old.group_name}:${old.key_value}`, req);
    await logChangelog(req.admin.id, 'enum_definition', id, 'delete', old, null, req);
    res.json({ code: 0, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;

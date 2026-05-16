/**
 * 管理后台 - 游戏配置
 */
const express = require('express');
const db = require('../../db');
const { adminAuth, logAction, logChangelog } = require('../../middleware/adminAuth');

const router = express.Router();
router.use(adminAuth);

// 配置列表
router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, category, keyword } = req.query;
    let where = '1=1';
    const params = [];
    if (category) { where += ' AND category = ?'; params.push(category); }
    if (keyword) { where += ' AND (config_key LIKE ? OR description LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    const total = await db.getVar(`SELECT COUNT(*) FROM game_config WHERE ${where}`, params);
    const list = await db.getAll(
      `SELECT * FROM game_config WHERE ${where} ORDER BY category, id LIMIT ? OFFSET ?`,
      [...params, parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize)]
    );
    res.json({ code: 0, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) }, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 获取所有配置（key-value形式）
router.get('/all', async (req, res) => {
  try {
    const list = await db.getAll('SELECT * FROM game_config ORDER BY category, id');
    const grouped = {};
    for (const item of list) {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    }
    res.json({ code: 0, data: grouped, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 新增配置
router.post('/', async (req, res) => {
  try {
    const { category, config_key, config_value, value_type, description } = req.body;
    const id = await db.insert('game_config', {
      category, config_key, config_value,
      value_type: value_type || 'string',
      description: description || null
    });
    await logAction(req.admin.id, 'create', 'game_config', `新增配置 ${category}.${config_key}`, req);
    await logChangelog(req.admin.id, 'game_config', id, 'create', null, req.body, req);
    res.json({ code: 0, data: { id }, message: 'success' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.json({ code: 1, message: '该配置键已存在' });
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 更新配置
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const old = await db.getOne('SELECT * FROM game_config WHERE id = ?', [id]);
    if (!old) return res.json({ code: 1, message: '记录不存在' });
    const { config_value, description } = req.body;
    const data = {};
    if (config_value !== undefined) data.config_value = config_value;
    if (description !== undefined) data.description = description;
    await db.update('game_config', data, 'id = ?', [id]);
    await logAction(req.admin.id, 'update', 'game_config', `更新配置 ${old.category}.${old.config_key}`, req);
    await logChangelog(req.admin.id, 'game_config', id, 'update', old, { ...old, ...data }, req);
    res.json({ code: 0, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 删除配置
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const old = await db.getOne('SELECT * FROM game_config WHERE id = ?', [id]);
    if (!old) return res.json({ code: 1, message: '记录不存在' });
    await db.delete('game_config', 'id = ?', [id]);
    await logAction(req.admin.id, 'delete', 'game_config', `删除配置 ${old.category}.${old.config_key}`, req);
    await logChangelog(req.admin.id, 'game_config', id, 'delete', old, null, req);
    res.json({ code: 0, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;

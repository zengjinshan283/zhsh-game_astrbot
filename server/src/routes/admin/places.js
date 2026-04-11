/**
 * 管理后台 - 场景管理
 */
const express = require('express');
const db = require('../../db');
const { adminAuth, logAction, logChangelog } = require('../../middleware/adminAuth');

const router = express.Router();
router.use(adminAuth);

router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword, cityId, type } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (p.name LIKE ?)'; params.push(`%${keyword}%`); }
    if (cityId) { where += ' AND p.city_id = ?'; params.push(cityId); }
    if (type !== undefined && type !== '') { where += ' AND p.type = ?'; params.push(type); }
    const total = await db.getVar(`SELECT COUNT(*) FROM place p WHERE ${where}`, params);
    const list = await db.getAll(
      `SELECT p.*, m.name AS city_name FROM place p LEFT JOIN map m ON p.city_id = m.id WHERE ${where} ORDER BY p.city_id, p.id LIMIT ? OFFSET ?`,
      [...params, parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize)]
    );
    res.json({ code: 0, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) }, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});


// 场景搜索接口（供前端选择器使用）
router.get('/search', async (req, res) => {
  try {
    const { keyword } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (p.name LIKE ? OR m.name LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    const list = await db.getAll(
      `SELECT p.id, p.name, m.name AS city_name FROM place p LEFT JOIN map m ON p.city_id = m.id WHERE ${where} ORDER BY p.id LIMIT 50`,
      params
    );
    res.json({ code: 0, data: list, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await db.getOne(
      'SELECT p.*, m.name AS city_name FROM place p LEFT JOIN map m ON p.city_id = m.id WHERE p.id = ?',
      [req.params.id]
    );
    if (!row) return res.json({ code: 1, message: '记录不存在' });
    res.json({ code: 0, data: row, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { city_id, name, n, s, e, w, notice, type, is_market } = req.body;
    const id = await db.insert('place', {
      city_id, name, n: n || 0, s: s || 0, e: e || 0, w: w || 0,
      notice: notice || '', type: type || 0, is_market: is_market || 0
    });
    await logAction(req.admin.id, 'create', 'place', `新增场景: ${name}`, req);
    await logChangelog(req.admin.id, 'place', id, 'create', null, req.body, req);
    res.json({ code: 0, data: { id }, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const old = await db.getOne('SELECT * FROM place WHERE id = ?', [id]);
    if (!old) return res.json({ code: 1, message: '记录不存在' });
    const { name, n, s, e, w, notice, type, is_market, city_id } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (n !== undefined) data.n = n;
    if (s !== undefined) data.s = s;
    if (e !== undefined) data.e = e;
    if (w !== undefined) data.w = w;
    if (notice !== undefined) data.notice = notice;
    if (type !== undefined) data.type = type;
    if (is_market !== undefined) data.is_market = is_market;
    if (city_id !== undefined) data.city_id = city_id;
    await db.update('place', data, 'id = ?', [id]);
    await logAction(req.admin.id, 'update', 'place', `更新场景: ${old.name}`, req);
    await logChangelog(req.admin.id, 'place', id, 'update', old, { ...old, ...data }, req);
    res.json({ code: 0, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const old = await db.getOne('SELECT * FROM place WHERE id = ?', [id]);
    if (!old) return res.json({ code: 1, message: '记录不存在' });
    await db.delete('place', 'id = ?', [id]);
    await logAction(req.admin.id, 'delete', 'place', `删除场景: ${old.name}`, req);
    await logChangelog(req.admin.id, 'place', id, 'delete', old, null, req);
    res.json({ code: 0, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;

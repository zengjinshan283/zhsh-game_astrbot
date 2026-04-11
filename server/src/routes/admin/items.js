/**
 * 管理后台 - 物品管理
 */
const express = require('express');
const db = require('../../db');
const { adminAuth, logAction, logChangelog } = require('../../middleware/adminAuth');

const router = express.Router();
router.use(adminAuth);


// 物品搜索接口（供前端选择器使用）
router.get('/search', async (req, res) => {
  try {
    const { keyword } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (i.name LIKE ?)'; params.push('%' + keyword + '%'); }
    const list = await db.getAll(
      'SELECT i.id, i.name, i.type FROM item i WHERE ' + where + ' ORDER BY i.id LIMIT 50',
      params
    );
    res.json({ code: 0, data: list, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword, type } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (i.name LIKE ?)'; params.push(`%${keyword}%`); }
    if (type !== undefined && type !== '') { where += ' AND i.type = ?'; params.push(type); }
    const total = await db.getVar(`SELECT COUNT(*) FROM item i WHERE ${where}`, params);
    const list = await db.getAll(
      `SELECT i.* FROM item i WHERE ${where} ORDER BY i.type, i.id LIMIT ? OFFSET ?`,
      [...params, parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize)]
    );
    res.json({ code: 0, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) }, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await db.getOne('SELECT * FROM item WHERE id = ?', [req.params.id]);
    if (!row) return res.json({ code: 1, message: '记录不存在' });
    res.json({ code: 0, data: row, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, type, subtype, atk, def_val, hp, price_buy, price_sell, description, level_req } = req.body;
    const id = await db.insert('item', {
      name, type: type || 0, subtype: subtype || '',
      atk: atk || 0, def_val: def_val || 0, hp: hp || 0,
      price_buy: price_buy || 0, price_sell: price_sell || 0,
      description: description || '', level_req: level_req || 1
    });
    await logAction(req.admin.id, 'create', 'item', `新增物品: ${name}`, req);
    await logChangelog(req.admin.id, 'item', id, 'create', null, req.body, req);
    res.json({ code: 0, data: { id }, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const old = await db.getOne('SELECT * FROM item WHERE id = ?', [id]);
    if (!old) return res.json({ code: 1, message: '记录不存在' });
    const allowed = ['name','type','subtype','atk','def_val','hp','price_buy','price_sell','description','level_req'];
    const data = {};
    for (const k of allowed) { if (req.body[k] !== undefined) data[k] = req.body[k]; }
    await db.update('item', data, 'id = ?', [id]);
    await logAction(req.admin.id, 'update', 'item', `更新物品: ${old.name}`, req);
    await logChangelog(req.admin.id, 'item', id, 'update', old, { ...old, ...data }, req);
    res.json({ code: 0, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const old = await db.getOne('SELECT * FROM item WHERE id = ?', [id]);
    if (!old) return res.json({ code: 1, message: '记录不存在' });
    await db.delete('npc_shop_item', 'item_id = ?', [id]);
    await db.delete('item', 'id = ?', [id]);
    await logAction(req.admin.id, 'delete', 'item', `删除物品: ${old.name}`, req);
    await logChangelog(req.admin.id, 'item', id, 'delete', old, null, req);
    res.json({ code: 0, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;

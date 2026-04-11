/**
 * 管理后台 - 宠物管理
 */
const express = require('express');
const db = require('../../db');
const { adminAuth, logAction, logChangelog } = require('../../middleware/adminAuth');

const router = express.Router();
router.use(adminAuth);

router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword, type } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (p.name LIKE ?)'; params.push(`%${keyword}%`); }
    if (type !== undefined && type !== '') { where += ' AND p.type = ?'; params.push(type); }
    const total = await db.getVar(`SELECT COUNT(*) FROM pet p WHERE ${where}`, params);
    const list = await db.getAll(
      `SELECT p.* FROM pet p WHERE ${where} ORDER BY p.id LIMIT ? OFFSET ?`,
      [...params, parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize)]
    );
    res.json({ code: 0, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) }, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await db.getOne('SELECT * FROM pet WHERE id = ?', [req.params.id]);
    if (!row) return res.json({ code: 1, message: '记录不存在' });
    res.json({ code: 0, data: row, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 查看持有该宠物的玩家
router.get('/:id/owners', async (req, res) => {
  try {
    const petId = req.params.id;
    const list = await db.getAll(
      `SELECT u.id, u.username, u.level, u.pet_level, u.lastdate
       FROM user u
       WHERE u.pet_id = ?
       ORDER BY u.level DESC`,
      [petId]
    );
    res.json({ code: 0, data: list, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, type, atk, def_val, hp, skill_name, skill_desc, capture_rate } = req.body;
    const id = await db.insert('pet', {
      name, type: type || 0, atk: atk || 0, def_val: def_val || 0, hp: hp || 0,
      skill_name: skill_name || '', skill_desc: skill_desc || '', capture_rate: capture_rate || 50
    });
    await logAction(req.admin.id, 'create', 'pet', `新增宠物: ${name}`, req);
    await logChangelog(req.admin.id, 'pet', id, 'create', null, req.body, req);
    res.json({ code: 0, data: { id }, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const old = await db.getOne('SELECT * FROM pet WHERE id = ?', [id]);
    if (!old) return res.json({ code: 1, message: '记录不存在' });
    const allowed = ['name','type','atk','def_val','hp','skill_name','skill_desc','capture_rate'];
    const data = {};
    for (const k of allowed) { if (req.body[k] !== undefined) data[k] = req.body[k]; }
    await db.update('pet', data, 'id = ?', [id]);
    await logAction(req.admin.id, 'update', 'pet', `更新宠物: ${old.name}`, req);
    await logChangelog(req.admin.id, 'pet', id, 'update', old, { ...old, ...data }, req);
    res.json({ code: 0, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const old = await db.getOne('SELECT * FROM pet WHERE id = ?', [id]);
    if (!old) return res.json({ code: 1, message: '记录不存在' });
    await db.delete('pet', 'id = ?', [id]);
    await logAction(req.admin.id, 'delete', 'pet', `删除宠物: ${old.name}`, req);
    await logChangelog(req.admin.id, 'pet', id, 'delete', old, null, req);
    res.json({ code: 0, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;

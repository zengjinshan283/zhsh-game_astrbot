/**
 * 管理后台 - NPC管理（含对话管理）
 */
const express = require('express');
const db = require('../../db');
const { adminAuth, logAction, logChangelog } = require('../../middleware/adminAuth');

const router = express.Router();
router.use(adminAuth);


// NPC搜索接口（供前端选择器使用）
router.get('/search', async (req, res) => {
  try {
    const { keyword } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (n.name LIKE ?)'; params.push('%' + keyword + '%'); }
    const list = await db.getAll(
      'SELECT n.id, n.name, p.name AS place_name FROM npc n LEFT JOIN place p ON n.place_id = p.id WHERE ' + where + ' ORDER BY n.id LIMIT 50',
      params
    );
    res.json({ code: 0, data: list, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// NPC列表
router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword, type, placeId } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (n.name LIKE ?)'; params.push(`%${keyword}%`); }
    if (type !== undefined && type !== '') { where += ' AND n.type = ?'; params.push(type); }
    if (placeId) { where += ' AND n.place_id = ?'; params.push(placeId); }
    const total = await db.getVar(`SELECT COUNT(*) FROM npc n WHERE ${where}`, params);
    const list = await db.getAll(
      `SELECT n.*, p.name AS place_name, m.name AS city_name FROM npc n LEFT JOIN place p ON n.place_id = p.id LEFT JOIN map m ON p.city_id = m.id WHERE ${where} ORDER BY n.id LIMIT ? OFFSET ?`,
      [...params, parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize)]
    );
    res.json({ code: 0, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) }, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// NPC详情
router.get('/:id', async (req, res) => {
  try {
    const npc = await db.getOne(
      'SELECT n.*, p.name AS place_name, m.name AS city_name FROM npc n LEFT JOIN place p ON n.place_id = p.id LEFT JOIN map m ON p.city_id = m.id WHERE n.id = ?',
      [req.params.id]
    );
    if (!npc) return res.json({ code: 1, message: 'NPC不存在' });
    const dialogs = await db.getAll(
      'SELECT * FROM npc_dialog WHERE npc_id = ? ORDER BY trigger_type, sort_order',
      [req.params.id]
    );
    const shopItems = await db.getAll(
      'SELECT ns.item_id, i.name, i.type FROM npc_shop_item ns JOIN item i ON ns.item_id = i.id WHERE ns.npc_id = ?',
      [req.params.id]
    );
    res.json({ code: 0, data: { npc, dialogs, shopItems }, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 新增NPC
router.post('/', async (req, res) => {
  try {
    const { name, place_id, avatar, dialog, type } = req.body;
    const id = await db.insert('npc', {
      name, place_id: place_id || 0,
      avatar: avatar || '', dialog: dialog || '', type: type || 0
    });
    await logAction(req.admin.id, 'create', 'npc', `新增NPC: ${name}`, req);
    await logChangelog(req.admin.id, 'npc', id, 'create', null, req.body, req);
    res.json({ code: 0, data: { id }, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 更新NPC
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const old = await db.getOne('SELECT * FROM npc WHERE id = ?', [id]);
    if (!old) return res.json({ code: 1, message: 'NPC不存在' });
    const { name, place_id, avatar, dialog, type } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (place_id !== undefined) data.place_id = place_id;
    if (avatar !== undefined) data.avatar = avatar;
    if (dialog !== undefined) data.dialog = dialog;
    if (type !== undefined) data.type = type;
    await db.update('npc', data, 'id = ?', [id]);
    await logAction(req.admin.id, 'update', 'npc', `更新NPC: ${old.name}`, req);
    await logChangelog(req.admin.id, 'npc', id, 'update', old, { ...old, ...data }, req);
    res.json({ code: 0, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 删除NPC
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const old = await db.getOne('SELECT * FROM npc WHERE id = ?', [id]);
    if (!old) return res.json({ code: 1, message: 'NPC不存在' });
    await db.delete('npc_dialog', 'npc_id = ?', [id]);
    await db.delete('npc_shop_item', 'npc_id = ?', [id]);
    await db.delete('npc', 'id = ?', [id]);
    await logAction(req.admin.id, 'delete', 'npc', `删除NPC: ${old.name}`, req);
    await logChangelog(req.admin.id, 'npc', id, 'delete', old, null, req);
    res.json({ code: 0, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// === 对话管理 ===

// 获取NPC对话列表
router.get('/:npcId/dialogs', async (req, res) => {
  try {
    const list = await db.getAll(
      'SELECT * FROM npc_dialog WHERE npc_id = ? ORDER BY trigger_type, sort_order',
      [req.params.npcId]
    );
    res.json({ code: 0, data: list, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 新增对话
router.post('/:npcId/dialogs', async (req, res) => {
  try {
    const { trigger_type, content, sort_order } = req.body;
    const id = await db.insert('npc_dialog', {
      npc_id: parseInt(req.params.npcId),
      trigger_type: trigger_type || 'idle',
      content,
      sort_order: sort_order || 0
    });
    await logAction(req.admin.id, 'create', 'npc_dialog', `NPC ${req.params.npcId} 新增对话`, req);
    res.json({ code: 0, data: { id }, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 更新对话
router.put('/dialogs/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const old = await db.getOne('SELECT * FROM npc_dialog WHERE id = ?', [id]);
    if (!old) return res.json({ code: 1, message: '对话不存在' });
    const { trigger_type, content, sort_order } = req.body;
    const data = {};
    if (trigger_type !== undefined) data.trigger_type = trigger_type;
    if (content !== undefined) data.content = content;
    if (sort_order !== undefined) data.sort_order = sort_order;
    await db.update('npc_dialog', data, 'id = ?', [id]);
    await logAction(req.admin.id, 'update', 'npc_dialog', `更新对话 #${id}`, req);
    res.json({ code: 0, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 删除对话
router.delete('/dialogs/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete('npc_dialog', 'id = ?', [id]);
    await logAction(req.admin.id, 'delete', 'npc_dialog', `删除对话 #${id}`, req);
    res.json({ code: 0, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;

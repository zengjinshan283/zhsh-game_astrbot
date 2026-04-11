/**
 * 管理后台 - 任务管理
 */
const express = require('express');
const db = require('../../db');
const { adminAuth, logAction, logChangelog } = require('../../middleware/adminAuth');

const router = express.Router();
router.use(adminAuth);


// 任务链树形数据（全部任务的扁平列表）
router.get('/tree', async (req, res) => {
  try {
    const list = await db.getAll(
      `SELECT q.id, q.name, q.pre_quest_id, q.npc_id, n.name AS npc_name,
              q.type, q.category, q.level_req
       FROM quest q
       LEFT JOIN npc n ON q.npc_id = n.id
       ORDER BY q.id`
    );
    res.json({ code: 0, data: list, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 任务搜索接口（供前端选择器使用）
router.get('/search', async (req, res) => {
  try {
    const { keyword } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (q.name LIKE ?)'; params.push('%' + keyword + '%'); }
    const list = await db.getAll(
      'SELECT q.id, q.name FROM quest q WHERE ' + where + ' ORDER BY q.id LIMIT 50',
      params
    );
    res.json({ code: 0, data: list, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword, type, category } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (q.name LIKE ? OR q.description LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    if (type !== undefined && type !== '') { where += ' AND q.type = ?'; params.push(type); }
    if (category !== undefined && category !== '') { where += ' AND q.category = ?'; params.push(category); }
    const total = await db.getVar(`SELECT COUNT(*) FROM quest q WHERE ${where}`, params);
    const list = await db.getAll(
      `SELECT q.*, n.name AS npc_name FROM quest q LEFT JOIN npc n ON q.npc_id = n.id WHERE ${where} ORDER BY q.sort_order, q.id LIMIT ? OFFSET ?`,
      [...params, parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize)]
    );
    res.json({ code: 0, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) }, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await db.getOne('SELECT * FROM quest WHERE id = ?', [req.params.id]);
    if (!row) return res.json({ code: 1, message: '记录不存在' });
    res.json({ code: 0, data: row, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, type, category, repeatable, reset_type, require_value, target_id,
            reward_exp, reward_money, reward_gold, reward_item_id, reward_item_qty,
            level_req, pre_quest_id, npc_id, sort_order } = req.body;
    const id = await db.insert('quest', {
      name, description: description || '',
      type: type || 0, category: category || 0,
      repeatable: repeatable || 0, reset_type: reset_type || 0,
      require_value: require_value || 1, target_id: target_id || 0,
      reward_exp: reward_exp || 0, reward_money: reward_money || 0,
      reward_gold: reward_gold || 0, reward_item_id: reward_item_id || 0,
      reward_item_qty: reward_item_qty || 0, level_req: level_req || 1,
      pre_quest_id: pre_quest_id || 0, npc_id: npc_id || 0, sort_order: sort_order || 0
    });
    await logAction(req.admin.id, 'create', 'quest', `新增任务: ${name}`, req);
    await logChangelog(req.admin.id, 'quest', id, 'create', null, req.body, req);
    res.json({ code: 0, data: { id }, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const old = await db.getOne('SELECT * FROM quest WHERE id = ?', [id]);
    if (!old) return res.json({ code: 1, message: '记录不存在' });
    const allowed = ['name','description','type','category','repeatable','reset_type','require_value','target_id','reward_exp','reward_money','reward_gold','reward_item_id','reward_item_qty','level_req','pre_quest_id','npc_id','sort_order'];
    const data = {};
    for (const k of allowed) { if (req.body[k] !== undefined) data[k] = req.body[k]; }
    await db.update('quest', data, 'id = ?', [id]);
    await logAction(req.admin.id, 'update', 'quest', `更新任务: ${old.name}`, req);
    await logChangelog(req.admin.id, 'quest', id, 'update', old, { ...old, ...data }, req);
    res.json({ code: 0, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const old = await db.getOne('SELECT * FROM quest WHERE id = ?', [id]);
    if (!old) return res.json({ code: 1, message: '记录不存在' });
    await db.delete('user_quest', 'quest_id = ?', [id]);
    await db.delete('quest', 'id = ?', [id]);
    await logAction(req.admin.id, 'delete', 'quest', `删除任务: ${old.name}`, req);
    await logChangelog(req.admin.id, 'quest', id, 'delete', old, null, req);
    res.json({ code: 0, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;

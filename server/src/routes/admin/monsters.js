/**
 * 管理后台 - 怪物管理
 */
const express = require('express');
const db = require('../../db');
const { adminAuth, logAction, logChangelog } = require('../../middleware/adminAuth');

const router = express.Router();
router.use(adminAuth);

router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword, regionId } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (m.name LIKE ?)'; params.push(`%${keyword}%`); }
    if (regionId !== undefined && regionId !== '') { where += ' AND m.region_id = ?'; params.push(regionId); }
    const total = await db.getVar(`SELECT COUNT(*) FROM monster m WHERE ${where}`, params);
    const list = await db.getAll(
      `SELECT m.*, p.name AS place_name, mp.name AS city_name FROM monster m LEFT JOIN place p ON m.place_id = p.id LEFT JOIN map mp ON p.city_id = mp.id WHERE ${where} ORDER BY m.id LIMIT ? OFFSET ?`,
      [...params, parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize)]
    );
    res.json({ code: 0, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) }, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await db.getOne('SELECT * FROM monster WHERE id = ?', [req.params.id]);
    if (!row) return res.json({ code: 1, message: '记录不存在' });
    res.json({ code: 0, data: row, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, hp, atk_min, atk_max, def, exp_reward, money_reward_min, money_reward_max, place_id, region_id, description, captureable, capture_rate } = req.body;
    const id = await db.insert('monster', {
      name, hp: hp || 50, atk_min: atk_min || 1, atk_max: atk_max || 10,
      def: def || 0, exp_reward: exp_reward || 10,
      money_reward_min: money_reward_min || 1, money_reward_max: money_reward_max || 10,
      place_id: place_id || 0, region_id: region_id || 0,
      description: description || '', captureable: captureable || 0, capture_rate: capture_rate || 0
    });
    await logAction(req.admin.id, 'create', 'monster', `新增怪物: ${name}`, req);
    await logChangelog(req.admin.id, 'monster', id, 'create', null, req.body, req);
    res.json({ code: 0, data: { id }, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const old = await db.getOne('SELECT * FROM monster WHERE id = ?', [id]);
    if (!old) return res.json({ code: 1, message: '记录不存在' });
    const allowed = ['name','hp','atk_min','atk_max','def','exp_reward','money_reward_min','money_reward_max','place_id','region_id','description','captureable','capture_rate'];
    const data = {};
    for (const k of allowed) { if (req.body[k] !== undefined) data[k] = req.body[k]; }
    await db.update('monster', data, 'id = ?', [id]);
    await logAction(req.admin.id, 'update', 'monster', `更新怪物: ${old.name}`, req);
    await logChangelog(req.admin.id, 'monster', id, 'update', old, { ...old, ...data }, req);
    res.json({ code: 0, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const old = await db.getOne('SELECT * FROM monster WHERE id = ?', [id]);
    if (!old) return res.json({ code: 1, message: '记录不存在' });
    await db.delete('monster', 'id = ?', [id]);
    await logAction(req.admin.id, 'delete', 'monster', `删除怪物: ${old.name}`, req);
    await logChangelog(req.admin.id, 'monster', id, 'delete', old, null, req);
    res.json({ code: 0, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;

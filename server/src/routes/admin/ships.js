/**
 * 管理后台 - 船舶管理
 */
const express = require('express');
const db = require('../../db');
const { adminAuth, logAction, logChangelog } = require('../../middleware/adminAuth');

const router = express.Router();
router.use(adminAuth);

router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (name LIKE ?)'; params.push(`%${keyword}%`); }
    const total = await db.getVar(`SELECT COUNT(*) FROM ship WHERE ${where}`, params);
    const list = await db.getAll(
      `SELECT * FROM ship WHERE ${where} ORDER BY id LIMIT ? OFFSET ?`,
      [...params, parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize)]
    );
    res.json({ code: 0, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) }, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await db.getOne('SELECT * FROM ship WHERE id = ?', [req.params.id]);
    if (!row) return res.json({ code: 1, message: '记录不存在' });
    res.json({ code: 0, data: row, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 查看拥有该船舶的玩家
router.get('/:id/owners', async (req, res) => {
  try {
    const shipId = req.params.id;
    const list = await db.getAll(
      `SELECT u.id, u.username, u.level, u.lastdate
       FROM user u
       WHERE u.ship_id = ?
       ORDER BY u.level DESC`,
      [shipId]
    );
    res.json({ code: 0, data: list, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 航海时间预览
router.get('/:id/sail-preview', async (req, res) => {
  try {
    const shipId = req.params.id;
    const ship = await db.getOne('SELECT speed FROM ship WHERE id = ?', [shipId]);
    if (!ship) return res.json({ code: 1, message: '船舶不存在' });
    // Get all places with their sail connections
    const places = await db.getAll(
      `SELECT p.id, p.name, p.map_id, m.name AS map_name
       FROM place p
       LEFT JOIN map m ON p.map_id = m.id
       ORDER BY p.id`
    );
    // Calculate sail times between places (distance / speed)
    // Use a simple formula: time = distance_factor / speed * base_time
    const speed = Math.max(1, ship.speed);
    const baseTime = 300; // 5 minutes base at speed 1
    const previews = places.map((p, i) => {
      // Simple distance calc between consecutive places
      const distances = [];
      for (let j = 0; j < places.length; j++) {
        if (i !== j) {
          const dist = Math.abs(i - j);
          const time = Math.round((dist * baseTime) / speed);
          distances.push({
            to_place_id: places[j].id,
            to_place_name: places[j].name,
            seconds: time,
            text: formatSec(time)
          });
        }
      }
      distances.sort((a, b) => a.seconds - b.seconds);
      return {
        place_id: p.id,
        place_name: p.name,
        nearest: distances.slice(0, 5)
      };
    });
    res.json({ code: 0, data: { speed: ship.speed, previews }, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

function formatSec(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}时${m}分`;
  return `${m}分`;
}

router.post('/', async (req, res) => {
  try {
    const { name, speed, capacity, price, desc } = req.body;
    const id = await db.insert('ship', {
      name, speed: speed || 1, capacity: capacity || 100, price: price || 0, desc: desc || ''
    });
    await logAction(req.admin.id, 'create', 'ship', `新增船舶: ${name}`, req);
    await logChangelog(req.admin.id, 'ship', id, 'create', null, req.body, req);
    res.json({ code: 0, data: { id }, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const old = await db.getOne('SELECT * FROM ship WHERE id = ?', [id]);
    if (!old) return res.json({ code: 1, message: '记录不存在' });
    const allowed = ['name','speed','capacity','price','desc'];
    const data = {};
    for (const k of allowed) { if (req.body[k] !== undefined) data[k] = req.body[k]; }
    await db.update('ship', data, 'id = ?', [id]);
    await logAction(req.admin.id, 'update', 'ship', `更新船舶: ${old.name}`, req);
    await logChangelog(req.admin.id, 'ship', id, 'update', old, { ...old, ...data }, req);
    res.json({ code: 0, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const old = await db.getOne('SELECT * FROM ship WHERE id = ?', [id]);
    if (!old) return res.json({ code: 1, message: '记录不存在' });
    await db.delete('ship', 'id = ?', [id]);
    await logAction(req.admin.id, 'delete', 'ship', `删除船舶: ${old.name}`, req);
    await logChangelog(req.admin.id, 'ship', id, 'delete', old, null, req);
    res.json({ code: 0, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const db = require('../db');

// 获取城市野外地图列表
router.get('/list/:cityId', authMiddleware, async (req, res, next) => {
  try {
    const cityId = parseInt(req.params.cityId);
    if (!cityId) return res.status(400).json({ error: '无效城市' });

    const city = await db.getOne('SELECT id, name, parent_id FROM map WHERE id = ? AND type = 1', [cityId]);
    if (!city) return res.status(400).json({ error: '城市不存在' });

    const wilds = await db.getAll(
      'SELECT id, city_id, direction, level, name, description, monster_ids, level_req FROM wild_map WHERE city_id = ? ORDER BY direction, level',
      [cityId]
    );

    // 按方向分组
    const grouped = { n: [], s: [], e: [], w: [] };
    wilds.forEach(w => {
      if (grouped[w.direction]) grouped[w.direction].push(w);
    });

    res.json({ city, wilds: grouped });
  } catch(e) { next(e); }
});

// 进入野外区域并触发遇怪
router.post('/go-wild', authMiddleware, async (req, res, next) => {
  try {
    const { wild_map_id } = req.body;
    const userId = req.user.id;

    const user = await db.getOne('SELECT place_id, level FROM user WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    if (user.place_id <= 0) return res.status(400).json({ error: '无法进入野外' });

    // 获取野外区域
    const wild = await db.getOne('SELECT * FROM wild_map WHERE id = ?', [wild_map_id]);
    if (!wild) return res.status(400).json({ error: '野外区域不存在' });

    // 检查等级
    if (user.level < wild.level_req) {
      return res.status(400).json({ error: `需要等级 ${wild.level_req}` });
    }

    // 从monster_ids中随机选一个怪物
    const monsterIds = (wild.monster_ids || '').split(',').map(Number).filter(Boolean);
    if (!monsterIds.length) return res.status(400).json({ error: '该区域没有怪物' });

    const monsterId = monsterIds[Math.floor(Math.random() * monsterIds.length)];

    // 找该城市的一个户外地点（type=0）作为传送点
    const outdoorPlace = await db.getOne(
      'SELECT id FROM place WHERE city_id = ? AND type = 0 ORDER BY RAND() LIMIT 1',
      [wild.city_id]
    );

    let targetPlaceId = 0;
    if (outdoorPlace) {
      targetPlaceId = outdoorPlace.id;
      // 传送用户到户外地点
      await db.query('UPDATE user SET place_id = ? WHERE id = ?', [targetPlaceId, userId]);
    }

    res.json({
      success: true,
      monster_id: monsterId,
      place_id: targetPlaceId,
      wild_name: wild.name,
      monster_ids: monsterIds
    });
  } catch(e) { next(e); }
});

// 获取野外战斗入口（从城门节点点击进入）
router.get('/from-gate/:cityId/:direction', authMiddleware, async (req, res, next) => {
  try {
    const cityId = parseInt(req.params.cityId);
    const dir = req.params.direction;

    const wilds = await db.getAll(
      'SELECT id, city_id, direction, level, name, description, monster_ids, level_req FROM wild_map WHERE city_id = ? AND direction = ? ORDER BY level',
      [cityId, dir]
    );

    if (!wilds.length) return res.json({ wilds: [], direction: dir });
    res.json({ wilds, direction: dir });
  } catch(e) { next(e); }
});

module.exports = router;

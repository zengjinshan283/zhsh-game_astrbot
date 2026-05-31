/**
 * 城门路由 - type=5 城门独立操作
 * POST /api/gate/go-wild  从城门进入野外
 */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { buildScene } = require('./map');

const router = express.Router();

// 从城门进入野外
router.post('/go-wild', authMiddleware, async (req, res, next) => {
  try {
    const { direction } = req.body; // n/s/e/w
    if (!['n', 's', 'e', 'w'].includes(direction)) {
      return res.status(400).json({ error: '无效方向' });
    }

    const userId = req.user.id;
    const user = await db.getOne('SELECT place_id, level, hp FROM `user` WHERE `id` = ?', [userId]);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const place = await db.getOne('SELECT * FROM `place` WHERE `id` = ?', [user.place_id]);
    if (!place) return res.status(400).json({ error: '当前位置异常' });

    if (place.type !== 5) {
      return res.status(400).json({ error: '这里不是城门' });
    }

    const wilds = await db.getAll(
      'SELECT * FROM wild_map WHERE city_id = ? AND direction = ? ORDER BY level DESC',
      [place.city_id, direction]
    );
    if (!wilds || wilds.length === 0) {
      return res.status(400).json({ error: '该方向没有可进入的野外区域' });
    }

    const wild = wilds.find(w => w.level_req <= user.level) || wilds[wilds.length - 1];
    if (user.level < wild.level_req) {
      return res.status(400).json({ error: `需要等级 ${wild.level_req} 才能进入${wild.name}` });
    }

    const targetPlaceId = wild.place_id || 0;
    if (targetPlaceId > 0) {
      await db.query('UPDATE `user` SET `place_id` = ? WHERE `id` = ?', [targetPlaceId, userId]);
    }

    // 构建新场景并返回完整 scene 数据
    const scene = await buildScene(req.user.id, targetPlaceId);
    res.json(scene);
  } catch (err) { next(err); }
});

module.exports = router;

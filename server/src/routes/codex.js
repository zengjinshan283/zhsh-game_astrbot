/**
 * 装备图鉴路由 - 展示玩家已收集的装备图鉴
 * GET  /api/codex/list      - 获取图鉴列表（含解锁状态）
 * POST /api/codex/unlock/:itemId - 解锁图鉴（获得装备时调用）
 */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 获取装备图鉴列表
router.get('/list', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const { category } = req.query; // weapon/armor/accessory/consumable/material

    // 物品类型映射：1=武器,2=防具,3=饰品,4=消耗品,5=材料
    const typeMap = { weapon: 1, armor: 2, accessory: 3, consumable: 4, material: 5 };
    const typeFilter = category && typeMap[category] ? `AND type = ${typeMap[category]}` : '';

    // 获取所有物品（分页）
    const items = await db.getAll(
      `SELECT id, name, type, subtype, description, atk, def_val, quality FROM item WHERE type IN (1,2,3,4,5) ${typeFilter} ORDER BY type, id`
    );

    // 获取已解锁记录
    const unlocked = await db.getAll('SELECT item_id FROM user_codex WHERE user_id = ?', [uid]);
    const unlockedSet = new Set(unlocked.map(r => r.item_id));

    // 统计
    const total = items.length;
    const unlockedCount = items.filter(i => unlockedSet.has(i.id)).length;

    // 分类标签
    const categories = [
      { key: 'all', label: '全部', count: items.length },
      { key: 'weapon', label: '武器', count: items.filter(i => i.type === 1).length },
      { key: 'armor', label: '防具', count: items.filter(i => i.type === 2).length },
      { key: 'accessory', label: '饰品', count: items.filter(i => i.type === 3).length },
      { key: 'consumable', label: '消耗品', count: items.filter(i => i.type === 4).length },
      { key: 'material', label: '材料', count: items.filter(i => i.type === 5).length },
    ];

    res.json({
      categories,
      total,
      unlocked_count: unlockedCount,
      items: items.map(i => ({
        ...i,
        unlocked: unlockedSet.has(i.id),
        // 品质颜色：0白/1绿/2蓝/3紫/4橙
        quality_color: ['', '#4caf50', '#2196f3', '#9c27b0', '#ff9800'][i.quality] || '#999',
        type_name: ['', '武器', '防具', '饰品', '消耗品', '材料'][i.type] || '其他'
      }))
    });
  } catch (err) { next(err); }
});

// 解锁图鉴（获得装备时自动调用，或首次获得时）
router.post('/unlock/:itemId', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const itemId = parseInt(req.params.itemId);

    const existing = await db.getOne(
      'SELECT id FROM user_codex WHERE user_id = ? AND item_id = ?',
      [uid, itemId]
    );
    if (existing) {
      return res.json({ success: true, msg: '已解锁' });
    }

    await db.insert('user_codex', {
      user_id: uid,
      item_id: itemId,
      unlocked_at: Math.floor(Date.now() / 1000)
    });

    const item = await db.getOne('SELECT name FROM item WHERE id = ?', [itemId]);
    res.json({ success: true, msg: `图鉴解锁：${item?.name || '未知物品'}` });
  } catch (err) { next(err); }
});

module.exports = router;
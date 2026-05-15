/**
 * 用户路由 - 背包/装备/状态
 */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 背包
router.get('/inventory', authMiddleware, async (req, res, next) => {
  try {
    const items = await db.getAll(
      'SELECT inv.id AS inv_id, inv.quantity, inv.equipped, inv.enhance_level, inv.durability, inv.durability_max, i.* FROM `inventory` inv JOIN `item` i ON inv.item_id = i.id WHERE inv.user_id = ? ORDER BY inv.equipped DESC, i.type, i.id',
      [req.user.id]
    );
    // Load affixes for each inventory item
    for (const item of items) {
      const affixes = await db.getAll(
        "SELECT ia.stat_value, ia.affix_id, ia.id AS inv_affix_id, ia.inventory_id, " +
        "ia2.name, ia2.stat_type, ia2.stat_min, ia2.stat_max, ia2.quality " +
        "FROM `inventory_affix` ia " +
        "JOIN `item_affix` ia2 ON ia.affix_id = ia2.id " +
        "WHERE ia.inventory_id = ?",
        [item.inv_id]
      );
      item.affixes = affixes || [];
    }
    res.json({ items });
  } catch (err) { next(err); }
});

// 装备/卸下
router.post('/equip', authMiddleware, async (req, res, next) => {
  try {
    const { inventory_id } = req.body;
    const inv = await db.getOne('SELECT inv.*, i.type, i.subtype FROM `inventory` inv JOIN `item` i ON inv.item_id = i.id WHERE inv.id = ? AND inv.user_id = ?', [inventory_id, req.user.id]);
    if (!inv) return res.status(400).json({ error: '物品不存在' });

    if (inv.equipped) {
      // 卸下
      await db.update('inventory', { equipped: 0 }, '`id` = ?', [inventory_id]);
      // 减属性
      const bonus = getItemBonus(inv, inv.enhance_level);
      await db.query('UPDATE `user` SET `atk_min` = GREATEST(0, `atk_min` - ?), `atk_max` = GREATEST(0, `atk_max` - ?), `def` = GREATEST(0, `def` - ?), `hp_max` = GREATEST(1, `hp_max` - ?) WHERE `id` = ?',
        [bonus.atk, bonus.atk, bonus.def, bonus.hp, req.user.id]);
    } else {
      // 装备 - 先卸下同类型
      const same = await db.getAll('SELECT inv.id FROM `inventory` inv JOIN `item` i ON inv.item_id = i.id WHERE inv.user_id = ? AND inv.equipped = 1 AND i.subtype = ?', [req.user.id, inv.subtype]);
      for (const s of same) {
        await db.update('inventory', { equipped: 0 }, '`id` = ?', [s.id]);
      }
      await db.update('inventory', { equipped: 1 }, '`id` = ?', [inventory_id]);
      const bonus = getItemBonus(inv, inv.enhance_level);
      await db.query('UPDATE `user` SET `atk_min` = `atk_min` + ?, `atk_max` = `atk_max` + ?, `def` = `def` + ?, `hp_max` = `hp_max` + ? WHERE `id` = ?',
        [bonus.atk, bonus.atk, bonus.def, bonus.hp, req.user.id]);
    }
    res.json({ success: true, equipped: !inv.equipped });
  } catch (err) { next(err); }
});

// 使用物品
router.post('/use', authMiddleware, async (req, res, next) => {
  try {
    const { inventory_id } = req.body;
    const inv = await db.getOne('SELECT inv.*, i.* FROM `inventory` inv JOIN `item` i ON inv.item_id = i.id WHERE inv.id = ? AND inv.user_id = ?', [inventory_id, req.user.id]);
    if (!inv) return res.status(400).json({ error: '物品不存在' });
    if (inv.type !== 3) return res.status(400).json({ error: '该物品无法使用' });

    const user = await db.getOne('SELECT hp, hp_max FROM `user` WHERE `id` = ?', [req.user.id]);
    const healAmount = inv.hp;
    const newHp = Math.min(user.hp_max, user.hp + healAmount);

    if (inv.quantity <= 1) {
      await db.delete('inventory', '`id` = ?', [inventory_id]);
    } else {
      await db.update('inventory', { quantity: inv.quantity - 1 }, '`id` = ?', [inventory_id]);
    }
    await db.query('UPDATE `user` SET `hp` = ? WHERE `id` = ?', [newHp, req.user.id]);

    res.json({ success: true, heal: newHp - user.hp, hp: newHp, hp_max: user.hp_max });
  } catch (err) { next(err); }
});

function getItemBonus(item, enhanceLevel) {
  const eLv = enhanceLevel || 0;
  const mult = 1 + eLv * 0.1;
  return {
    atk: Math.round((item.atk || 0) * mult),
    def: Math.round((item.def_val || 0) * mult),
    hp: item.hp || 0
  };
}

module.exports = router;

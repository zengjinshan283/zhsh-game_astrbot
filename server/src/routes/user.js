const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();
const statusUtil = require('../utils/status');

async function consumeOne(invId, item, uid) {
  if (item.quantity <= 1) {
    await db.delete('inventory', '`id` = ?', [invId]);
  } else {
    await db.update('inventory', { quantity: item.quantity - 1 }, '`id` = ?', [invId]);
  }
}

// Get inventory
router.get('/inventory', authMiddleware, async (req, res, next) => {
  try {
    const items = await db.getAll(
      'SELECT inv.id AS inv_id, inv.quantity, inv.equipped, inv.enhance_level, inv.durability, inv.durability_max, i.* FROM `inventory` inv JOIN `item` i ON inv.item_id = i.id WHERE inv.user_id = ? ORDER BY i.type, i.subtype',
      [req.user.id]
    );
    res.json({ items });
  } catch (err) { next(err); }
});

// Equip item
router.post('/equip', authMiddleware, async (req, res, next) => {
  try {
    const { inventory_id } = req.body;
    const inv = await db.getOne('SELECT * FROM `inventory` WHERE `id` = ? AND `user_id` = ?', [inventory_id, req.user.id]);
    if (!inv) return res.status(400).json({ error: '物品不存在' });
    const item = await db.getOne('SELECT * FROM `item` WHERE `id` = ?', [inv.item_id]);
    if (!item) return res.status(400).json({ error: '物品数据异常' });

    // Unequip current item of same subtype
    const curEquipped = await db.getAll(
      'SELECT inv.id FROM `inventory` inv JOIN `item` i ON inv.item_id = i.id WHERE inv.user_id = ? AND inv.equipped = 1 AND i.subtype = ?',
      [req.user.id, item.subtype]
    );
    for (const ce of curEquipped) {
      await db.query('UPDATE `inventory` SET `equipped` = 0 WHERE `id` = ?', [ce.id]);
    }

    await db.query('UPDATE `inventory` SET `equipped` = 1 WHERE `id` = ?', [inventory_id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Unequip item
router.post('/unequip', authMiddleware, async (req, res, next) => {
  try {
    const { inventory_id } = req.body;
    const inv = await db.getOne('SELECT * FROM `inventory` WHERE `id` = ? AND `user_id` = ? AND `equipped` = 1', [inventory_id, req.user.id]);
    if (!inv) return res.status(400).json({ error: '未装备该物品' });
    await db.query('UPDATE `inventory` SET `equipped` = 0 WHERE `id` = ?', [inventory_id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// 查询当前状态效果（Buff/Debuff）
router.get('/status', authMiddleware, async (req, res, next) => {
  try {
    await statusUtil.clearExpired(req.user.id);
    const statuses = await statusUtil.getUserStatuses(req.user.id);
    const defs = await statusUtil.getAllStatusDefs();
    const now = Math.floor(Date.now() / 1000);
    const result = statuses.map(s => {
      const def = defs.find(d => d.id === s.id);
      return {
        id: s.id,
        name: s.name,
        icon: s.icon,
        type: s.type,
        stack: s.stack || 1,
        remain_sec: Math.max(0, (s.end_at || now) - now),
        tick_seconds: def ? def.tick_seconds : 0,
        tick_damage: def ? def.tick_damage : 0,
        description: def ? def.description : s.description || ''
      };
    });
    res.json({ statuses: result });
  } catch (err) { next(err); }
});

// Use consumable / item
router.post('/use', authMiddleware, async (req, res, next) => {
  try {
    const { inventory_id } = req.body;
    const inv = await db.getOne('SELECT inv.*, i.* FROM `inventory` inv JOIN `item` i ON inv.item_id = i.id WHERE inv.id = ? AND inv.user_id = ?', [inventory_id, req.user.id]);
    if (!inv) return res.status(400).json({ error: '物品不存在' });
    if (inv.type !== 1) return res.status(400).json({ error: '该物品无法使用' });

    const user = await db.getOne('SELECT * FROM `user` WHERE `id` = ?', [req.user.id]);

    // Navigation items
    if (inv.subtype === 'navigation') {
      // 引路蜂：传送到当前任务目标地点
      if (inv.name.includes('引路蜂')) {
        // 找进行中的任务（status=0/1），优先取探索类(type=3)任务的目标
        const activeQuests = await db.getAll(
          "SELECT q.*, uq.status FROM `quest` q JOIN `user_quest` uq ON q.id = uq.quest_id WHERE uq.user_id = ? AND uq.status IN (0,1) ORDER BY uq.status DESC, q.sort_order LIMIT 5",
          [req.user.id]
        );
        let targetPlaceId = null;
        for (const q of activeQuests) {
          // type=3 是探索地区，target_id 就是 place_id
          if (q.type === 3 && q.target_id > 0) {
            const placeExists = await db.getVar('SELECT COUNT(*) FROM `place` WHERE `id` = ?', [q.target_id]);
            if (placeExists > 0) { targetPlaceId = q.target_id; break; }
          }
        }
        // 如果没有探索任务，尝试对话类(type=2)：target_id是npc_id，找npc所在的place
        if (!targetPlaceId) {
          for (const q of activeQuests) {
            if (q.type === 2 && q.target_id > 0) {
              const npc = await db.getOne('SELECT place_id FROM `npc` WHERE `id` = ?', [q.target_id]);
              if (npc && npc.place_id > 0) { targetPlaceId = npc.place_id; break; }
            }
          }
        }
        if (!targetPlaceId) return res.status(400).json({ error: '当前没有需要前往的任务目标' });
        await consumeOne(inventory_id, inv, req.user.id);
        await db.query('UPDATE `user` SET `place_id` = ?, `sail_time`=0, `sail_from`=0, `sail_to`=0, `sail_paused`=0 WHERE `id` = ?', [targetPlaceId, req.user.id]);
        return res.json({ success: true, msg: `引路蜂带你飞向任务目标地点！`, place_id: targetPlaceId });
      }

      // 其他导航道具：传送到最近港口
      let dockPlace = null;
      if (user.place_id) {
        const currentPlace = await db.getOne('SELECT city_id FROM `place` WHERE `id` = ?', [user.place_id]);
        if (currentPlace && currentPlace.city_id) {
          dockPlace = await db.getOne('SELECT * FROM `place` WHERE `city_id` = ? AND `type` = 1 LIMIT 1', [currentPlace.city_id]);
        }
      }
      if (!dockPlace) {
        dockPlace = await db.getOne('SELECT p.* FROM `place` p JOIN `map` m ON p.city_id = m.id WHERE m.type = 1 AND p.type = 1 LIMIT 1');
      }
      if (!dockPlace) return res.status(400).json({ error: '无法找到附近的港口' });
      await consumeOne(inventory_id, inv, req.user.id);
      await db.query('UPDATE `user` SET `place_id` = ?, `sail_time`=0, `sail_from`=0, `sail_to`=0, `sail_paused`=0 WHERE `id` = ?', [dockPlace.id, req.user.id]);
      return res.json({ success: true, msg: `传送至 ${dockPlace.name}！`, place_id: dockPlace.id });
    }

    // Buff items
    if (inv.subtype === 'buff') {
      const name = inv.name;
      let flag = 0, duration = 0, buffMsg = '', statusId = null;
      if (name.includes('罗盘')) { flag = 1; duration = 86400; buffMsg = '航行速度+20%！'; statusId = 'navigator'; }
      else if (name.includes('幸运符')) { flag = 2; duration = 86400; buffMsg = '下次战斗掉落率+30%！'; statusId = 'lucky'; }
      else if (name.includes('护体石')) { flag = 4; duration = 1800; buffMsg = '30分钟内受到伤害-20%！'; statusId = 'ironwall'; }
      else if (name.includes('力量粉')) { flag = 8; duration = 1800; buffMsg = '30分钟内攻击+15%！'; statusId = 'energy'; }
      else if (name.includes('幸运星')) { flag = 16; duration = 1800; buffMsg = '30分钟内经验值+20%！'; statusId = 'wisdom'; }
      else return res.status(400).json({ error: '暂不支持该增益物品' });

      const now = Math.floor(Date.now() / 1000);
      const newEnd = Math.max(Number(user.buff_end || 0), now) + duration;
      const newFlags = (Number(user.buff_flags || 0) | flag);
      await consumeOne(inventory_id, inv, req.user.id);
      await db.query('UPDATE `user` SET `buff_end` = ?, `buff_flags` = ? WHERE `id` = ?', [newEnd, newFlags, req.user.id]);
      // Also apply new status system
      if (statusId) await statusUtil.applyStatus(req.user.id, statusId, duration, 1);
      return res.json({ success: true, msg: buffMsg });
    }

    // Battle items
    if (inv.subtype === 'battle_item') {
      return res.status(400).json({ error: '该物品需要在战斗中使用', battle_item: true });
    }

    // Regular consumables (HP healing, stamina, ship repair)
    let healAmount = 0;
    let msg = '';

    if (inv.name.includes('体力宝')) {
      healAmount = inv.name.includes('大') ? 200 : 50;
      msg = `恢复${healAmount}点体力`;
    } else if (inv.name.includes('船舶修复包')) {
      if (!user.ship_id) return res.status(400).json({ error: '你没有船只' });
      const us = await db.getOne('SELECT * FROM `user_ship` WHERE `user_id` = ? AND `ship_id` = ?', [req.user.id, user.ship_id]);
      if (!us) return res.status(400).json({ error: '船只状态异常' });
      const repaired = Math.min(us.hp_max - us.hp, 100);
      if (repaired <= 0) return res.status(400).json({ error: '船只无需修理' });
      await consumeOne(inventory_id, inv, req.user.id);
      await db.query('UPDATE `user_ship` SET `hp` = `hp` + ? WHERE `user_id` = ? AND `ship_id` = ?', [repaired, req.user.id, user.ship_id]);
      return res.json({ success: true, msg: `修好船只${repaired}HP！`, ship_hp: us.hp + repaired, ship_hp_max: us.hp_max });
    } else if (inv.hp > 0) {
      healAmount = inv.hp;
    }

    if (healAmount > 0) {
      const newHp = Math.min(user.hp_max, user.hp + healAmount);
      await consumeOne(inventory_id, inv, req.user.id);
      await db.query('UPDATE `user` SET `hp` = ? WHERE `id` = ?', [newHp, req.user.id]);
      return res.json({ success: true, heal: newHp - user.hp, hp: newHp, hp_max: user.hp_max, msg: msg || `恢复${healAmount}点HP` });
    }

    return res.status(400).json({ error: '该物品无法直接使用' });
  } catch (err) { next(err); }
});

module.exports = router;

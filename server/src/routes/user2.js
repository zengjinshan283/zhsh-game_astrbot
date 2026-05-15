const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// User status page
router.get('/status', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const user = await db.getOne('SELECT id, username, sex, level, exp, exp_max, hp, hp_max, atk_min, atk_max, def, agility, money, gold, bank_money, place_id, pet_id, pet_name, pet_level, shortcut_slot_1, shortcut_slot_2, shortcut_slot_3 FROM `user` WHERE `id` = ?', [uid]);
    const place = await db.getOne("SELECT name FROM `place` WHERE `id` = ?", [user.place_id]);
    // Effective stats
    const equips = await db.getAll("SELECT i.*, inv.enhance_level FROM `inventory` inv JOIN `item` i ON inv.item_id = i.id WHERE inv.user_id = ? AND inv.equipped = 1", [uid]);
    let bonusAtk = 0, bonusDef = 0;
    equips.forEach(eq => {
      const mult = 1 + (eq.enhance_level||0) * 0.03;
      bonusAtk += Math.round((eq.atk||0) * mult);
      bonusDef += Math.round((eq.def_val||0) * mult);
    });
    // Battle stats
    const battleCount = await db.getVar("SELECT COUNT(*) FROM `battle_log` WHERE `user_id` = ?", [uid]);
    const winCount = await db.getVar("SELECT COUNT(*) FROM `battle_log` WHERE `user_id` = ? AND `result` = 1", [uid]);
    // Pet
    let pet = null;
    if (user.pet_id > 0) {
      pet = await db.getOne("SELECT * FROM `pet` WHERE `id` = ?", [user.pet_id]);
      if (pet) { pet.nickname = user.pet_name || pet.name; pet.level = user.pet_level; }
    }
    // Inventory count
    const invCount = await db.getVar("SELECT COUNT(*) FROM `inventory` WHERE `user_id` = ? AND `equipped` = 0", [uid]);
    // Shortcut items
    const shortcuts = [];
    for (let i = 1; i <= 3; i++) {
      const slotCol = `shortcut_slot_${i}`;
      const invId = Number(user[slotCol]) || 0;
      if (invId > 0) {
        const inv = await db.getOne("SELECT inv.id AS inv_id, inv.quantity, i.name, i.hp AS item_hp FROM `inventory` inv JOIN `item` i ON inv.item_id = i.id WHERE inv.id = ? AND inv.user_id = ?", [invId, uid]);
        if (inv) shortcuts[i-1] = inv;
      }
    }
    // Consumables for shortcut picker
    const consumables = await db.getAll("SELECT inv.id AS inv_id, inv.quantity, i.name, i.hp AS item_hp FROM `inventory` inv JOIN `item` i ON inv.item_id = i.id WHERE inv.user_id = ? AND inv.equipped = 0 AND i.type = 1 AND i.subtype IN ('consumable', 'navigation', 'buff', 'battle_item') ORDER BY i.hp", [uid]);
    res.json({ user, place, stats: { atk_min: user.atk_min, atk_max: user.atk_max, def: user.def, bonusAtk, bonusDef }, equips, battleCount, winCount, pet, invCount, shortcuts, consumables });
  } catch(e){next(e);}
});

// Set shortcut slot
router.post('/shortcut', authMiddleware, async (req, res, next) => {
  try {
    const { slot, inv_id } = req.body;
    const slotNum = parseInt(slot);
    if (slotNum < 1 || slotNum > 3) return res.status(400).json({ error: '无效槽位' });
    const slotCol = `shortcut_slot_${slotNum}`;
    if (inv_id > 0) {
      const inv = await db.getOne("SELECT * FROM `inventory` WHERE `id` = ? AND `user_id` = ? AND `equipped` = 0", [inv_id, req.user.id]);
      if (inv) {
        const item = await db.getOne("SELECT * FROM `item` WHERE `id` = ?", [inv.item_id]);
        if (item && item.subtype === 'consumable') {
          // Remove from other slots
          for (let j = 1; j <= 3; j++) {
            const col = `shortcut_slot_${j}`;
            await db.query(`UPDATE \`user\` SET \`${col}\` = 0 WHERE \`id\` = ? AND \`${col}\` = ?`, [req.user.id, inv_id]);
          }
          await db.query(`UPDATE \`user\` SET \`${slotCol}\` = ? WHERE \`id\` = ?`, [inv_id, req.user.id]);
        }
      }
    } else {
      await db.query(`UPDATE \`user\` SET \`${slotCol}\` = 0 WHERE \`id\` = ?`, [req.user.id]);
    }
    res.json({ success: true });
  } catch(e){next(e);}
});

// Equipment page
router.get('/equipment', authMiddleware, async (req, res, next) => {
  try {
    const equipped = await db.getAll("SELECT inv.id AS inv_id, inv.quantity, inv.enhance_level, i.* FROM `inventory` inv JOIN `item` i ON inv.item_id = i.id WHERE inv.user_id = ? AND inv.equipped = 1 ORDER BY i.subtype, i.id", [req.user.id]);
    const user = await db.getOne('SELECT atk_min, atk_max, def FROM `user` WHERE `id` = ?', [req.user.id]);
    let totalBonusAtk = 0, totalBonusDef = 0;
    equipped.forEach(eq => {
      const mult = 1 + (eq.enhance_level||0) * 0.03;
      totalBonusAtk += Math.round((eq.atk||0) * mult);
      totalBonusDef += Math.round((eq.def_val||0) * mult);
    });
    res.json({ equipped, stats: { atk_min: user.atk_min, atk_max: user.atk_max, def: user.def, bonusAtk: totalBonusAtk, bonusDef: totalBonusDef } });
  } catch(e){next(e);}
});

// View other player
router.get('/view/:id', authMiddleware, async (req, res, next) => {
  try {
    const target = await db.getOne("SELECT id, username, sex, level, hp, hp_max, atk_min, atk_max, def, agility FROM `user` WHERE `id` = ?", [req.params.id]);
    if (!target) return res.status(404).json({ error: '该玩家不存在' });
    const equipped = await db.getAll("SELECT i.*, inv.quantity FROM `inventory` inv JOIN `item` i ON inv.item_id = i.id WHERE inv.user_id = ? AND inv.equipped = 1", [target.id]);
    const winCount = await db.getVar("SELECT COUNT(*) FROM `battle_log` WHERE `user_id` = ? AND `result` = 1", [target.id]);
    const battleCount = await db.getVar("SELECT COUNT(*) FROM `battle_log` WHERE `user_id` = ?", [target.id]);
    res.json({ target, equipped, winCount, battleCount });
  } catch(e){next(e);}
});

// City map
router.get('/citymap/:cityId?', authMiddleware, async (req, res, next) => {
  try {
    const user = await db.getOne('SELECT place_id FROM `user` WHERE `id` = ?', [req.user.id]);
    const cityId = parseInt(req.params.cityId) || (await db.getOne("SELECT city_id FROM `place` WHERE `id` = ?", [user.place_id]))?.city_id || 0;
    const city = await db.getOne("SELECT * FROM `map` WHERE `id` = ?", [cityId]);
    if (!city) return res.status(400).json({ error: '城市不存在' });
    const places = await db.getAll("SELECT * FROM `place` WHERE `city_id` = ? ORDER BY `id`", [cityId]);
    res.json({ city, places, currentPlaceId: user.place_id });
  } catch(e){next(e);}
});

// Teleport to city place
router.post('/teleport', authMiddleware, async (req, res, next) => {
  try {
    const pid = parseInt(req.body.place_id);
    if (!pid || pid <= 0) return res.status(400).json({ error: '无效地点' });

    const user = await db.getOne('SELECT sail_time FROM `user` WHERE `id` = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: '角色不存在' });
    if (user.sail_time > 0) return res.status(400).json({ error: '航海中无法传送' });

    const place = await db.getOne('SELECT id FROM `place` WHERE `id` = ?', [pid]);
    if (!place) return res.status(400).json({ error: '目标地点不存在' });

    await db.query('UPDATE `user` SET place_id = ? WHERE `id` = ?', [pid, req.user.id]);
    res.json({ success: true, place_id: pid });
  } catch(e){next(e);}
});

// Discard item
router.post('/discard', authMiddleware, async (req, res, next) => {
  try {
    const { inventory_id } = req.body;
    const inv = await db.getOne("SELECT * FROM `inventory` WHERE `id` = ? AND `user_id` = ? AND `equipped` = 0", [inventory_id, req.user.id]);
    if (!inv) return res.status(400).json({ error: '物品不存在' });
    await db.delete('inventory', '`id` = ?', [inventory_id]);
    res.json({ success: true, msg: '已丢弃' });
  } catch(e){next(e);}
});

module.exports = router;

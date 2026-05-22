const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// User status page
router.get('/status', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    // Single query: user + place in one
    const user = await db.getOne(
      'SELECT u.id, u.username, u.sex, u.level, u.exp, u.exp_max, u.hp, u.hp_max, u.atk_min, u.atk_max, u.def, u.agility, u.money, u.gold, u.talent_points, u.bank_money, u.place_id, u.pet_id, u.pet_name, u.pet_level, u.shortcut_slot_1, u.shortcut_slot_2, u.shortcut_slot_3, p.name AS place_name ' +
      'FROM `user` u LEFT JOIN `place` p ON p.id = u.place_id WHERE u.id = ?', [uid]);
    // Single query: equipped items with set info
    const equips = await db.getAll(
      "SELECT i.*, inv.enhance_level, inv.id AS inv_id FROM `inventory` inv " +
      "JOIN `item` i ON inv.item_id = i.id WHERE inv.user_id = ? AND inv.equipped = 1", [uid]);
    let bonusAtk = 0, bonusDef = 0, bonusHp = 0;
    // Enhancement bonus
    equips.forEach(eq => {
      const mult = 1 + (eq.enhance_level||0) * 0.03;
      bonusAtk += Math.round((eq.atk||0) * mult);
      bonusDef += Math.round((eq.def_val||0) * mult);
    });
    // Set bonus: collect all set_names, do ONE query for all
    const setNames = [...new Set(equips.filter(eq => eq.set_name).map(eq => eq.set_name))];
    const setCounts = {};
    equips.forEach(eq => { if (eq.set_name) setCounts[eq.set_name] = (setCounts[eq.set_name] || 0) + 1; });
    const bestSets = {};
    if (setNames.length > 0) {
      const validSets = setNames.filter(sn => setCounts[sn] >= 2);
      if (validSets.length > 0) {
        const placeholders = validSets.map(() => '?').join(',');
        const allSets = await db.getAll(
          `SELECT * FROM \`item_set\` WHERE \`set_name\` IN (${placeholders}) ORDER BY set_name, piece_count DESC`,
          validSets);
        allSets.forEach(row => {
          const cnt = setCounts[row.set_name] || 0;
          if (row.piece_count <= cnt && (!bestSets[row.set_name] || row.piece_count > bestSets[row.set_name].piece_count)) {
            bestSets[row.set_name] = row;
          }
        });
        Object.values(bestSets).forEach(s => {
          bonusAtk += s.bonus_atk || 0;
          bonusDef += s.bonus_def || 0;
          bonusHp += s.bonus_hp || 0;
        });
      }
    }
    // Set overview: all defined sets with user's owned piece count (equipped + backpack)
    const allSets = await db.getAll("SELECT * FROM `item_set` ORDER BY set_name, piece_count");
    const backpackItems = await db.getAll("SELECT i.set_name FROM `inventory` inv JOIN `item` i ON inv.item_id = i.id WHERE inv.user_id = ? AND i.set_name IS NOT NULL AND i.set_name != ''", [uid]);
    const backpackSetGroups = {};
    backpackItems.forEach(bi => { if (bi.set_name) backpackSetGroups[bi.set_name] = (backpackSetGroups[bi.set_name] || 0) + 1; });
    // Merge equipped + backpack for total owned per set
    const ownedSetGroups = {};
    for (const [sn, cnt] of Object.entries(setCounts)) ownedSetGroups[sn] = (ownedSetGroups[sn] || 0) + cnt;
    for (const [sn, cnt] of Object.entries(backpackSetGroups)) ownedSetGroups[sn] = (ownedSetGroups[sn] || 0) + cnt;
    // Group allSets by set_name for easy rendering
    const setOverviewMap = {};
    allSets.forEach(row => {
      if (!setOverviewMap[row.set_name]) setOverviewMap[row.set_name] = { name: row.set_name, owned: ownedSetGroups[row.set_name] || 0, tiers: [] };
      setOverviewMap[row.set_name].tiers.push({ piece_count: row.piece_count, bonus_atk: row.bonus_atk, bonus_def: row.bonus_def, bonus_hp: row.bonus_hp, description: row.description || '' });
    });
    const setOverview = Object.values(setOverviewMap);
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
    // Active sets info
    // Active sets info (reuse bestSets computed above)
    const activeSets = Object.entries(bestSets || {}).map(([name, s]) => ({ name, count: setCounts[name], bonus: s }));
    res.json({ user, place_name: user.place_name, stats: { atk_min: user.atk_min, atk_max: user.atk_max, def: user.def, hp_max: user.hp_max, bonusAtk, bonusDef, bonusHp }, equips, activeSets, setOverview, battleCount, winCount, pet, invCount, shortcuts, consumables });
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
    const uid = req.user.id;
    const equipped = await db.getAll("SELECT inv.id AS inv_id, inv.quantity, inv.enhance_level, i.* FROM `inventory` inv JOIN `item` i ON inv.item_id = i.id WHERE inv.user_id = ? AND inv.equipped = 1 ORDER BY i.subtype, i.id", [uid]);
    const user = await db.getOne('SELECT atk_min, atk_max, def FROM `user` WHERE `id` = ?', [uid]);
    let totalBonusAtk = 0, totalBonusDef = 0, totalBonusHp = 0;
    const setGroups = {};
    equipped.forEach(eq => {
      const mult = 1 + (eq.enhance_level||0) * 0.03;
      totalBonusAtk += Math.round((eq.atk||0) * mult);
      totalBonusDef += Math.round((eq.def_val||0) * mult);
      if (eq.set_name) setGroups[eq.set_name] = (setGroups[eq.set_name]||0) + 1;
    });
    const activeSets = [];
    for (const [setName, count] of Object.entries(setGroups)) {
      if (count < 2) continue;
      const setRows = await db.getAll(
        "SELECT * FROM `item_set` WHERE `set_name` = ? AND `piece_count` <= ? ORDER BY `piece_count` DESC",
        [setName, count]);
      if (setRows.length > 0) {
        const best = setRows[0];
        totalBonusAtk += best.bonus_atk || 0;
        totalBonusDef += best.bonus_def || 0;
        totalBonusHp += best.bonus_hp || 0;
        activeSets.push({ name: setName, count, bonus: best });
      }
    }
    // Set overview: all defined sets with user's owned piece count (equipped + backpack)
    const allSets = await db.getAll("SELECT * FROM `item_set` ORDER BY set_name, piece_count");
    const backpackItems = await db.getAll("SELECT i.set_name FROM `inventory` inv JOIN `item` i ON inv.item_id = i.id WHERE inv.user_id = ? AND i.set_name IS NOT NULL AND i.set_name != ''", [uid]);
    const backpackSetGroups = {};
    backpackItems.forEach(bi => { if (bi.set_name) backpackSetGroups[bi.set_name] = (backpackSetGroups[bi.set_name] || 0) + 1; });
    const ownedSetGroups = {};
    for (const [sn, cnt] of Object.entries(setGroups)) ownedSetGroups[sn] = (ownedSetGroups[sn] || 0) + cnt;
    for (const [sn, cnt] of Object.entries(backpackSetGroups)) ownedSetGroups[sn] = (ownedSetGroups[sn] || 0) + cnt;
    const setOverviewMap = {};
    allSets.forEach(row => {
      if (!setOverviewMap[row.set_name]) setOverviewMap[row.set_name] = { name: row.set_name, owned: ownedSetGroups[row.set_name] || 0, tiers: [] };
      setOverviewMap[row.set_name].tiers.push({ piece_count: row.piece_count, bonus_atk: row.bonus_atk, bonus_def: row.bonus_def, bonus_hp: row.bonus_hp, description: row.description || '' });
    });
    const setOverview = Object.values(setOverviewMap);
    res.json({ equipped, stats: { atk_min: user.atk_min, atk_max: user.atk_max, def: user.def, bonusAtk: totalBonusAtk, bonusDef: totalBonusDef, bonusHp: totalBonusHp }, activeSets, setOverview });
  } catch(e){next(e);}
});

// Set detail: all pieces of a specific set with equipped/backpack status
router.get('/set-detail/:setName', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const setName = decodeURIComponent(req.params.setName);
    // Get tiers for this set
    const tiers = await db.getAll("SELECT * FROM `item_set` WHERE `set_name` = ? ORDER BY piece_count", [setName]);
    if (!tiers.length) return res.status(404).json({ error: '套装不存在' });
    // Get items belonging to this set
    const setItems = await db.getAll("SELECT id, name, subtype, set_name, atk, def_val FROM `item` WHERE `set_name` = ?", [setName]);
    // Get equipped pieces
    const equipped = await db.getAll(
      "SELECT inv.id AS inv_id, inv.enhance_level, i.id AS item_id, i.name, i.subtype, i.set_name, i.atk, i.def_val, 1 AS equipped " +
      "FROM `inventory` inv JOIN `item` i ON inv.item_id = i.id " +
      "WHERE inv.user_id = ? AND i.set_name = ? AND inv.equipped = 1", [uid, setName]);
    // Get backpack pieces
    const backpack = await db.getAll(
      "SELECT inv.id AS inv_id, inv.enhance_level, i.id AS item_id, i.name, i.subtype, i.set_name, i.atk, i.def_val, 0 AS equipped " +
      "FROM `inventory` inv JOIN `item` i ON inv.item_id = i.id " +
      "WHERE inv.user_id = ? AND i.set_name = ? AND inv.equipped = 0", [uid, setName]);
    const pieces = [...equipped, ...backpack];
    const equippedCount = equipped.length;
    const backpackCount = backpack.length;
    const owned = equippedCount + backpackCount;
    res.json({ name: setName, tiers, pieces, equippedCount, backpackCount, owned });
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

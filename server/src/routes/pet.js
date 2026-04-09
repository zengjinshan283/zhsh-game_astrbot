const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();
const MAX_PETS = 3;

function petExpMax(level) { return 100 + (level - 1) * 50; }
function petMult(level) { return 1 + level * 0.15; }

// Get all user pets + active pet detail
router.get('/info', authMiddleware, async (req, res, next) => {
  try {
    const myPets = await db.getAll(
      'SELECT up.*, p.name as species_name, p.type, p.atk, p.def_val, p.hp, p.skill_name, p.skill_desc, p.capture_rate FROM user_pet up JOIN pet p ON up.pet_id = p.id WHERE up.user_id = ? ORDER BY up.is_active DESC, up.id', [req.user.id]
    );
    let activePet = null;
    const enriched = [];
    for (const up of myPets) {
      const mult = petMult(up.level);
      const expMax = petExpMax(up.level);
      const obj = { ...up, species_name: up.species_name || up.nickname, effective_atk: Math.round(up.atk * mult), effective_hp: Math.round(up.hp * mult), effective_def: Math.round((up.def_val||0) * mult), exp_max: expMax, feed_cost: up.level * 200 };
      enriched.push(obj);
      if (up.is_active) activePet = obj;
    }
    const allSpecies = await db.getAll('SELECT * FROM pet ORDER BY type DESC, id');
    // Pet food in inventory
    const petFoods = await db.getAll(
      "SELECT i.id as item_id, i.name, i.price_buy, inv.quantity FROM inventory inv JOIN item i ON inv.item_id = i.id WHERE inv.user_id = ? AND i.subtype = 'pet_food' AND inv.equipped = 0 ORDER BY i.price_buy",
      [req.user.id]
    );
    res.json({ pets: enriched, activePet, allSpecies, petFoods });
  } catch(e) { next(e); }
});

// Capture a pet
router.post('/capture', authMiddleware, async (req, res, next) => {
  try {
    const { pet_id } = req.body;
    const count = await db.getVar('SELECT COUNT(*) FROM user_pet WHERE user_id = ?', [req.user.id]);
    if (count >= MAX_PETS) return res.status(400).json({ error: `最多只能捕捉${MAX_PETS}只宠物` });
    const existing = await db.getOne('SELECT id FROM user_pet WHERE user_id = ? AND pet_id = ?', [req.user.id, pet_id]);
    if (existing) return res.status(400).json({ error: '你已经拥有这种宠物了' });
    const target = await db.getOne('SELECT * FROM pet WHERE id = ?', [pet_id]);
    if (!target) return res.status(400).json({ error: '宠物不存在' });
    const roll = Math.floor(Math.random() * 100) + 1;
    if (roll <= target.capture_rate) {
      // Set as active if first pet
      const currentActive = await db.getVar('SELECT COUNT(*) FROM user_pet WHERE user_id = ? AND is_active = 1', [req.user.id]);
      const isActive = currentActive === 0 ? 1 : 0;
      await db.insert('user_pet', { user_id: req.user.id, pet_id, nickname: target.name, level: 1, exp: 0, is_active: isActive, created_at: Math.floor(Date.now() / 1000) });
      // Sync user table for backward compat
      if (isActive) {
        await db.query('UPDATE user SET pet_id=?, pet_name=?, pet_level=1, pet_exp=0 WHERE id=?', [pet_id, target.name, req.user.id]);
      }
      res.json({ success: true, msg: `🎉 成功捕捉了${target.name}！` });
    } else {
      res.json({ success: false, msg: `😥 ${target.name} 挣脱了...` });
    }
  } catch(e) { next(e); }
});

// Set active pet
router.post('/setActive', authMiddleware, async (req, res, next) => {
  try {
    const { user_pet_id } = req.body;
    const myPet = await db.getOne('SELECT * FROM user_pet WHERE id = ? AND user_id = ?', [user_pet_id, req.user.id]);
    if (!myPet) return res.status(400).json({ error: '宠物不存在' });
    // Deactivate all
    await db.query('UPDATE user_pet SET is_active = 0 WHERE user_id = ?', [req.user.id]);
    // Activate target
    await db.query('UPDATE user_pet SET is_active = 1 WHERE id = ?', [user_pet_id]);
    // Sync user table
    const species = await db.getOne('SELECT name FROM pet WHERE id = ?', [myPet.pet_id]);
    await db.query('UPDATE user SET pet_id=?, pet_name=?, pet_level=?, pet_exp=? WHERE id=?', [myPet.pet_id, myPet.nickname || species?.name, myPet.level, myPet.exp, req.user.id]);
    res.json({ success: true, msg: `${myPet.nickname} 已设为出战宠物！` });
  } catch(e) { next(e); }
});

// Feed pet with food item
router.post('/feed', authMiddleware, async (req, res, next) => {
  try {
    const { item_id } = req.body;
    // Find pet_food item in inventory
    const inv = await db.getOne(
      'SELECT inv.id as inv_id, inv.quantity, i.name, i.id as item_id FROM inventory inv JOIN item i ON inv.item_id = i.id WHERE inv.user_id = ? AND inv.item_id = ? AND i.subtype = ? AND inv.equipped = 0',
      [req.user.id, item_id, 'pet_food']
    );
    if (!inv) return res.status(400).json({ error: '背包中没有该口粮' });
    const pet = await db.getOne('SELECT * FROM user_pet WHERE user_id = ? AND is_active = 1', [req.user.id]);
    if (!pet) return res.status(400).json({ error: '没有出战宠物' });
    if (pet.satiety >= 100) return res.status(400).json({ error: '宠物已经吃饱了' });
    const feedValues = { 19: 30, 20: 60, 21: 100 };
    const satietyGain = feedValues[item_id] || 30;
    const newSatiety = Math.min(100, pet.satiety + satietyGain);
    await db.query('UPDATE user_pet SET satiety = ? WHERE id = ?', [newSatiety, pet.id]);
    if (inv.quantity > 1) {
      await db.query('UPDATE inventory SET quantity = quantity - 1 WHERE id = ?', [inv.inv_id]);
    } else {
      await db.query('DELETE FROM inventory WHERE id = ?', [inv.inv_id]);
    }
    res.json({ success: true, satiety: newSatiety, msg: `🍽️ 喂食成功，饱食度+${satietyGain}` });
  } catch(e) { next(e); }
});

// Release pet
router.post('/release', authMiddleware, async (req, res, next) => {
  try {
    const { user_pet_id } = req.body;
    const pet = await db.getOne('SELECT * FROM user_pet WHERE id = ? AND user_id = ?', [user_pet_id, req.user.id]);
    if (!pet) return res.status(400).json({ error: '宠物不存在' });
    const wasActive = pet.is_active;
    await db.query('DELETE FROM user_pet WHERE id = ? AND user_id = ?', [user_pet_id, req.user.id]);
    if (wasActive) {
      // Activate another if exists
      const next = await db.getOne('SELECT * FROM user_pet WHERE user_id = ? ORDER BY id LIMIT 1', [req.user.id]);
      if (next) {
        await db.query('UPDATE user_pet SET is_active = 1 WHERE id = ?', [next.id]);
        const sp = await db.getOne('SELECT name FROM pet WHERE id = ?', [next.pet_id]);
        await db.query('UPDATE user SET pet_id=?, pet_name=?, pet_level=?, pet_exp=? WHERE id=?', [next.pet_id, next.nickname||sp?.name, next.level, next.exp, req.user.id]);
      } else {
        await db.query('UPDATE user SET pet_id=0, pet_name="", pet_level=0, pet_exp=0 WHERE id=?', [req.user.id]);
      }
    }
    res.json({ success: true, msg: '已放生' });
  } catch(e) { next(e); }
});

// Rename pet
router.post('/rename', authMiddleware, async (req, res, next) => {
  try {
    const { user_pet_id, name } = req.body;
    if (!name || name.length < 1 || name.length > 20) return res.status(400).json({ error: '名字不合法(1-20字符)' });
    const pet = await db.getOne('SELECT * FROM user_pet WHERE id = ? AND user_id = ?', [user_pet_id, req.user.id]);
    if (!pet) return res.status(400).json({ error: '宠物不存在' });
    await db.query('UPDATE user_pet SET nickname=? WHERE id=?', [name, user_pet_id]);
    if (pet.is_active) await db.query('UPDATE user SET pet_name=? WHERE id=?', [name, req.user.id]);
    res.json({ success: true, msg: `已改名为 ${name}` });
  } catch(e) { next(e); }
});

module.exports = router;

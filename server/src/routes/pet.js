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
      'SELECT up.*, p.name as species_name, p.type, p.atk as base_pet_atk, p.def_val as base_pet_def, p.hp as base_pet_hp, p.skill_name, p.skill_desc, p.capture_rate FROM user_pet up JOIN pet p ON up.pet_id = p.id WHERE up.user_id = ? ORDER BY up.is_active DESC, up.id', [req.user.id]
    );
    let activePet = null;
    const enriched = [];
    for (const up of myPets) {
      const expMax = petExpMax(up.level);
      // user_pet.atk/hp/def_val are already the scaled stats; effective_* = stored values
      const obj = { ...up, species_name: up.species_name || up.nickname, effective_atk: up.atk, effective_hp: up.hp, effective_def: up.def_val, exp_max: expMax, feed_cost: up.level * 200 };
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
      // Initialize pet stats (level 1 scaled values)
      const initHp = target.hp;
      const initAtk = Math.round(target.atk * (1 + 1 * 0.15));
      const initDef = target.def_val;
      await db.insert('user_pet', {
        user_id: req.user.id, pet_id, nickname: target.name,
        level: 1, exp: 0, is_active: isActive, created_at: Math.floor(Date.now() / 1000),
        hp: initHp, hp_max: initHp, atk: initAtk, def_val: initDef
      });
      // Sync user table for backward compat
      if (isActive) {
        await db.query('UPDATE user SET pet_id=?, pet_name=?, pet_level=1, pet_exp=0 WHERE id=?', [pet_id, target.name, req.user.id]);
      }
      // 解锁宠物图鉴
      await db.query('INSERT IGNORE INTO user_pet_codex (user_id, pet_id, unlocked_at) VALUES (?, ?, ?)', [req.user.id, pet_id, Math.floor(Date.now()/1000)]);
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
    // Daily activity: 宠物喂食
    try {
      const today = new Date().toISOString().slice(0,10);
      await db.query('INSERT IGNORE INTO `user_daily_activity` (user_id, date, activity_key, progress, claimed, updated_at) VALUES (?, ?, ?, 1, 0, ?)',
        [req.user.id, today, 'daily_feed_pet', Math.floor(Date.now()/1000)]);
      await db.query('UPDATE `user_daily_activity` SET progress = LEAST(progress + 1, 100), updated_at = ? WHERE user_id = ? AND date = ? AND activity_key = ?',
        [Math.floor(Date.now()/1000), req.user.id, today, 'daily_feed_pet']);
    } catch(e) {}
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

// ============================================================
// 宠物被动技能系统
// ============================================================

// 学习技能（消耗技能书）
router.post('/learn-skill', authMiddleware, async (req, res, next) => {
  try {
    const { user_pet_id, item_id } = req.body;
    const pet = await db.getOne('SELECT * FROM user_pet WHERE id=? AND user_id=?', [user_pet_id, req.user.id]);
    if (!pet) return res.status(400).json({ error: '宠物不存在' });

    const bookItem = await db.getOne('SELECT * FROM `item` WHERE id=? AND subtype=?', [item_id, 'pet_skill']);
    if (!bookItem) return res.status(400).json({ error: '这不是宠物技能书' });

    const inv = await db.getOne('SELECT id, quantity FROM `inventory` WHERE user_id=? AND item_id=? AND equipped=0', [req.user.id, item_id]);
    if (!inv) return res.status(400).json({ error: '背包中没有该技能书' });

    // 从技能书找到对应技能
    const skill = await db.getOne('SELECT * FROM `pet_skill` WHERE book_item_id=?', [item_id]);
    if (!skill) return res.status(400).json({ error: '技能书没有对应技能' });

    // 检查宠物等级要求
    if (pet.level < bookItem.level_req) return res.status(400).json({ error: `宠物需要${bookItem.level_req}级才能学习此技能` });

    // 检查技能槽是否已满（3个槽）
    const filledSlots = [pet.skill_1, pet.skill_2, pet.skill_3].filter(s => s && s.length > 0);
    if (filledSlots.length >= 3) return res.status(400).json({ error: '技能槽已满（3个），需遗忘一个才能学新技能' });

    // 检查是否已学会该技能
    if ([pet.skill_1, pet.skill_2, pet.skill_3].includes(skill.skill_key)) {
      return res.status(400).json({ error: '宠物已学会该技能' });
    }

    // 找空槽写入
    let newSkill1 = pet.skill_1 || '', newSkill2 = pet.skill_2 || '', newSkill3 = pet.skill_3 || '';
    if (!newSkill1) newSkill1 = skill.skill_key;
    else if (!newSkill2) newSkill2 = skill.skill_key;
    else newSkill3 = skill.skill_key;

    await db.query('UPDATE user_pet SET skill_1=?, skill_2=?, skill_3=? WHERE id=?', [newSkill1, newSkill2, newSkill3, pet.id]);

    // 消耗技能书
    if (inv.quantity > 1) await db.query('UPDATE inventory SET quantity=quantity-1 WHERE id=?', [inv.id]);
    else await db.delete('inventory', 'id=?', [inv.id]);

    res.json({ success: true, msg: `🎉 ${pet.nickname}学会了「${skill.name}」！${skill.desc}` });
  } catch(e) { next(e); }
});

// 遗忘技能（指定槽位）
router.post('/forget-skill', authMiddleware, async (req, res, next) => {
  try {
    const { user_pet_id, slot } = req.body; // slot: 1/2/3
    if (![1,2,3].includes(slot)) return res.status(400).json({ error: '无效的技能槽位' });
    const pet = await db.getOne('SELECT * FROM user_pet WHERE id=? AND user_id=?', [user_pet_id, req.user.id]);
    if (!pet) return res.status(400).json({ error: '宠物不存在' });

    const skills = [pet.skill_1, pet.skill_2, pet.skill_3];
    if (!skills[slot-1]) return res.status(400).json({ error: '该槽位没有技能' });

    const oldSkill = await db.getOne('SELECT * FROM pet_skill WHERE skill_key=?', [skills[slot-1]]);
    if (slot === 1) await db.query('UPDATE user_pet SET skill_1=? WHERE id=?', ['', pet.id]);
    else if (slot === 2) await db.query('UPDATE user_pet SET skill_2=? WHERE id=?', ['', pet.id]);
    else await db.query('UPDATE user_pet SET skill_3=? WHERE id=?', ['', pet.id]);

    res.json({ success: true, msg: `${pet.nickname}遗忘了「${oldSkill?.name || '技能'}」` });
  } catch(e) { next(e); }
});

// 查看所有可学习的技能书
router.get('/skill-books', authMiddleware, async (req, res, next) => {
  try {
    const books = await db.getAll("SELECT i.id, i.name, i.level_req, i.quality, ps.skill_key, ps.name as skill_name, ps.stat_key, ps.stat_value FROM item i JOIN pet_skill ps ON ps.book_item_id=i.id WHERE i.subtype='pet_skill' ORDER BY i.quality, i.level_req");
    const inInventory = await db.getAll("SELECT item_id, quantity FROM inventory WHERE user_id=? AND item_id IN (SELECT id FROM item WHERE subtype='pet_skill') AND equipped=0", [req.user.id]);
    const invMap = {};
    inInventory.forEach(r => { invMap[r.item_id] = r.quantity; });
    books.forEach(b => { b.owned = invMap[b.id] || 0; });
    res.json({ books });
  } catch(e) { next(e); }
});

// 计算宠物技能加成（供其他模块调用）
// 导出函数到全局，供 battle.js / user2.js 使用
module.exports = router;
module.exports.getPetBonus = async function(userId) {
  const bonus = { atk: 0, def: 0, hp: 0, crit: 0, dodge: 0, money_exp: 0 };
  try {
    const pet = await db.getOne('SELECT skill_1, skill_2 FROM user_pet WHERE user_id=? AND is_active=1', [userId]);
    if (!pet) return bonus;
    const skills = [pet.skill_1, pet.skill_2].filter(s => s);
    for (const sk of skills) {
      const s = await db.getOne('SELECT stat_key, stat_value FROM pet_skill WHERE skill_key=?', [sk]);
      if (s && bonus.hasOwnProperty(s.stat_key)) bonus[s.stat_key] += s.stat_value;
    }
  } catch(e) {}
  return bonus;
};

// ============================================================
// 宠物进阶 — 喂食 + 金币 + 等级/星级提升
// ============================================================

// 星级配置表 (内存) - 3星要玄铁石 id=50, 4星要翡翠石 id=51
const PET_STAR_CONFIG = {
  1: { next: 2, needLevel: 10, needMoney: 5000,  needItem: 0,  atkBonus: 5,  defBonus: 3,  hpBonus: 20,  rarity: 'common',    color: '#9ca3af' },
  2: { next: 3, needLevel: 25, needMoney: 30000, needItem: 0,  atkBonus: 15, defBonus: 10, hpBonus: 60,  rarity: 'uncommon',  color: '#22c55e' },
  3: { next: 4, needLevel: 50, needMoney: 120000, needItem: 50, atkBonus: 40, defBonus: 25, hpBonus: 180, rarity: 'rare',      color: '#3b82f6' },
  4: { next: 5, needLevel: 80, needMoney: 500000, needItem: 51, atkBonus: 100, defBonus: 60, hpBonus: 500, rarity: 'epic',     color: '#a855f7' },
  // 5 满星不再升级
};

// POST /api/pet/upgrade — 宠物进阶（升星）
router.post('/upgrade', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const { user_pet_id } = req.body;
    if (!user_pet_id) return res.status(400).json({ error: '缺少 user_pet_id' });

    // 读用户宠物
    const pet = await db.getOne('SELECT * FROM user_pet WHERE id=? AND user_id=?', [user_pet_id, uid]);
    if (!pet) return res.status(404).json({ error: '宠物不存在' });

    // 读用户金币
    const u = await db.getOne('SELECT money FROM `user` WHERE id=?', [uid]);
    if (!u) return res.status(404).json({ error: '用户不存在' });

    const currentStar = pet.star || 1;
    const cfg = PET_STAR_CONFIG[currentStar];
    if (!cfg) return res.status(400).json({ error: '宠物已是最高星级 ⭐⭐⭐⭐⭐' });
    if (pet.level < cfg.needLevel) return res.status(400).json({ error: `需要宠物等级 ${cfg.needLevel}，当前 ${pet.level}` });
    if (u.money < cfg.needMoney) return res.status(400).json({ error: `需要 ${cfg.needMoney} 铜币，当前 ${u.money}` });

    // 检查升星材料（cfg.needItem 是 item.id：玄铁石/翡翠石）
    let needItem = null;
    if (cfg.needItem > 0) {
      const itemId = cfg.needItem;
      const itemDef = await db.getOne('SELECT id, name FROM item WHERE id=?', [itemId]);
      if (!itemDef) return res.status(400).json({ error: '升星材料未配置' });
      const inv = await db.getOne('SELECT quantity FROM inventory WHERE user_id=? AND item_id=?', [uid, itemId]);
      const have = inv ? inv.quantity : 0;
      if (have < 1) return res.status(400).json({ error: `需要 ${itemDef.name} x1` });
      needItem = { id: itemId, name: itemDef.name, have };
    }

    // 扣钱
    await db.query('UPDATE `user` SET money=money-? WHERE id=?', [cfg.needMoney, uid]);
    // 扣材料
    if (needItem) {
      await db.query('UPDATE inventory SET quantity=quantity-1 WHERE user_id=? AND item_id=?', [uid, needItem.id]);
      // 防负数清理
      await db.query('DELETE FROM inventory WHERE user_id=? AND item_id=? AND quantity<=0', [uid, needItem.id]);
    }

    // 升星 + 加属性
    const newStar = cfg.next;
    await db.query(
      'UPDATE user_pet SET star=?, atk=atk+?, def_val=def_val+?, hp_max=hp_max+?, hp=LEAST(hp+?, hp_max+?) WHERE id=?',
      [newStar, cfg.atkBonus, cfg.defBonus, cfg.hpBonus, cfg.hpBonus, cfg.hpBonus, user_pet_id]
    );

    // 触发成就 + 每日活跃
    try {
      const { triggerAchievements } = require('./achievement');
      await triggerAchievements(uid, 'pet_upgrade', newStar);
      const dailyMod = require('./daily');
      if (dailyMod.triggerActivity) await dailyMod.triggerActivity(uid, 'daily_pet_upgrade', 1);
    } catch(e) {}

    res.json({
      success: true,
      msg: `🎉 进阶成功！${pet.nickname} → ⭐x${newStar}`,
      pet: { id: user_pet_id, star: newStar, atk: pet.atk + cfg.atkBonus, def_val: pet.def_val + cfg.defBonus, hp_max: pet.hp_max + cfg.hpBonus },
      cost: { money: cfg.needMoney, item: needItem?.name || null },
      rarity: cfg.rarity
    });
  } catch(e) { next(e); }
});

// GET /api/pet/star-config — 获取升星配置
router.get('/star-config', authMiddleware, async (req, res, next) => {
  try {
    res.json({ stars: PET_STAR_CONFIG });
  } catch(e) { next(e); }
});

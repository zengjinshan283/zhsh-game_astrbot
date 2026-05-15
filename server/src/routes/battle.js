/**
 * 战斗路由 - 回合制战斗 (step-by-step)
 */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const config = require('../config').game;

const router = express.Router();
function randInt(min, max) { return Math.floor(Math.random() * (Number(max) - Number(min) + 1)) + Number(min); }

// In-memory battle sessions (keyed by userId)
const battleSessions = new Map();

// Apply durability loss to an equipped item (weapon or armor), returns { broken, name }
async function applyDurabilityLoss(userId, subtype, loss) {
  const inv = await db.getOne(
    `SELECT inv.id AS inv_id, inv.durability, inv.durability_max, i.name, i.price_buy FROM \`inventory\` inv JOIN \`item\` i ON inv.item_id = i.id WHERE inv.user_id = ? AND inv.equipped = 1 AND i.subtype = ?`,
    [userId, subtype]
  );
  if (!inv) return { broken: false, name: null };
  let newDur = Math.max(0, inv.durability - loss);
  await db.query('UPDATE `inventory` SET durability = ? WHERE `id` = ?', [newDur, inv.inv_id]);
  if (newDur === 0) {
    // Auto-unequip
    await db.query('UPDATE `inventory` SET equipped = 0 WHERE `id` = ?', [inv.inv_id]);
    return { broken: true, name: inv.name };
  }
  return { broken: false, name: null };
}

// Persist durability for all equipped items after battle ends
async function persistDurability(userId) {
  // Equipped items durability already persisted via applyDurabilityLoss calls, but ensure current session weapon/armor are saved
  // The battle session may hold references - we just ensure DB is up to date
  const equipped = await db.getAll(
    `SELECT inv.id AS inv_id, inv.durability FROM \`inventory\` inv JOIN \`item\` i ON inv.item_id = i.id WHERE inv.user_id = ? AND inv.equipped = 1 AND i.subtype IN ('weapon','armor')`,
    [userId]
  );
  // Already saved via applyDurabilityLoss, nothing extra needed unless we tracked in-session values
}


// 开始海盗战斗（航海随机事件）
router.post('/start-pirate', authMiddleware, async (req, res, next) => {
  try {
    const user = await db.getOne(
      'SELECT id, username, level, hp, hp_max, atk_min, atk_max, def, agility, pet_id, place_id, money, sail_time, sail_paused, sail_remaining_sec FROM `user` WHERE `id` = ?',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: '角色不存在' });
    if (user.hp <= 0) return res.status(400).json({ error: '你已经倒下了，请回酒馆休息' });
    if (!user.sail_time) return res.status(400).json({ error: '当前不在航行中' });
    if (!user.sail_paused) {
      const speedShip = await db.getOne("SELECT speed FROM `ship` WHERE `id`=?", [user.ship_id || 0]);
      const duration = getSailMinutes((speedShip && speedShip.speed) ? speedShip.speed : 1) * 60;
      const elapsed = Math.floor(Date.now()/1000) - user.sail_time;
      const remain = Math.max(1, duration - elapsed);
      await db.query('UPDATE `user` SET sail_paused=1, sail_remaining_sec=? WHERE `id`=?', [remain, req.user.id]);
      user.sail_remaining_sec = remain;
    }
    if (!user.sail_time) return res.status(400).json({ error: '当前不在航行中' });



    // Use a fixed pirate template monster (virtual)
    const pirate = {
      id: 999001,
      name: '海盗船长',
      hp: Math.max(120, 80 + user.level * 18),
      atk_min: Math.max(18, 10 + user.level * 3),
      atk_max: Math.max(28, 16 + user.level * 4),
      def: Math.max(8, 5 + Math.floor(user.level * 1.5)),
      exp_reward: Math.max(80, 40 + user.level * 12),
      money_reward_min: Math.max(50, 20 + user.level * 8),
      money_reward_max: Math.max(120, 50 + user.level * 12),
      description: '凶悍的海盗首领，挥舞弯刀向你袭来！',
      captureable: 0,
      capture_rate: 0
    };

    let petName = '', petAtk = 0, petUpId = 0, petSatiety = 0;
    if (user.pet_id > 0) {
      const up = await db.getOne('SELECT up.id, up.level, up.satiety, up.nickname, p.atk, p.name as species_name FROM user_pet up JOIN pet p ON up.pet_id = p.id WHERE up.user_id = ? AND up.is_active = 1', [req.user.id]);
      if (up) {
        petUpId = up.id;
        petSatiety = up.satiety;
        petName = up.nickname || up.species_name || '';
        if (up.satiety > 0) {
          petAtk = Math.round(up.atk * (1 + up.level * 0.15));
        } else {
          petAtk = 0; // will show warning below
        }
      }
    }

    const battle = {
      monster_id: pirate.id, monster_name: pirate.name,
      monster_hp: Number(pirate.hp), monster_hp_max: Number(pirate.hp),
      monster_atk_min: Number(pirate.atk_min), monster_atk_max: Number(pirate.atk_max), monster_def: Number(pirate.def),
      monster_exp: Number(pirate.exp), monster_money_min: Math.floor(Number(pirate.money) * 0.9), monster_money_max: Math.floor(Number(pirate.money) * 1.1),
      monster_desc: pirate.description || '',
      captureable: 0, capture_rate: 0,
      round: 1, result: null, finished: false,
      from_sail: true, sail_remaining_sec: Number(user.sail_remaining_sec || 0),
      pet_name: petName, pet_atk: petAtk, pet_up_id: petUpId, pet_satiety: petSatiety,
      log: [{ type: 'info', text: '🏴‍☠️ 海盗船逼近！战斗开始！' }],
    };
    if (petAtk > 0) battle.log.push({ type: 'info', text: `🐾 ${petName} 在一旁准备战斗！` });

    battle.sail_remaining_sec = Number(user.sail_remaining_sec || 0);
    battleSessions.set(req.user.id, battle);
    res.json(buildBattleResponse(battle, user));
  } catch (err) { next(err); }
});

// 开始战斗
router.post('/start', authMiddleware, async (req, res, next) => {
  try {
    const { monster_id } = req.body;
    const user = await db.getOne(
      'SELECT id, username, level, hp, hp_max, atk_min, atk_max, def, agility, pet_id, place_id, money, sail_time, sail_paused, sail_remaining_sec FROM `user` WHERE `id` = ?',
      [req.user.id]
    );
    if (user.hp <= 0) return res.status(400).json({ error: '你已经倒下了，请回酒店休息' });

    const monster = await db.getOne('SELECT * FROM `monster` WHERE `id` = ?', [monster_id]);
    if (!monster) return res.status(404).json({ error: '怪物不存在' });

    const placeMonsters = await db.getAll('SELECT id FROM `monster` WHERE (`place_id` = ? OR `place_id` = 0)', [user.place_id]);
    if (!placeMonsters.some(m => m.id === monster.id)) return res.status(400).json({ error: '无法与该怪物战斗' });

    let petName = '', petAtk = 0, petUpId = 0, petSatiety = 0;
    if (user.pet_id > 0) {
      const up = await db.getOne('SELECT up.id, up.level, up.satiety, up.nickname, p.atk, p.name as species_name FROM user_pet up JOIN pet p ON up.pet_id = p.id WHERE up.user_id = ? AND up.is_active = 1', [req.user.id]);
      if (up) {
        petUpId = up.id;
        petSatiety = up.satiety;
        petName = up.nickname || up.species_name || '';
        if (up.satiety > 0) {
          petAtk = Math.round(up.atk * (1 + up.level * 0.15));
        } else {
          petAtk = 0; // will show warning below
        }
      }
    }
    const battle = {
      monster_id, monster_name: monster.name,
      monster_hp: Number(monster.hp), monster_hp_max: Number(monster.hp),
      monster_atk_min: Number(monster.atk_min), monster_atk_max: Number(monster.atk_max), monster_def: Number(monster.def),
      monster_exp: Number(monster.exp), monster_money_min: Math.floor(Number(monster.money) * 0.9), monster_money_max: Math.floor(Number(monster.money) * 1.1),
      monster_desc: monster.description || '',
      captureable: Number(monster.captureable) || 0, capture_rate: Number(monster.capture_rate) || 0,
      round: 1, result: null, finished: false,
      pet_name: petName, pet_atk: petAtk, pet_up_id: petUpId, pet_satiety: petSatiety,
      log: [{ type: 'info', text: `你遭遇了${monster.name}！` }],
    };
    if (petAtk > 0) battle.log.push({ type: 'info', text: `🐾 ${petName} 在一旁准备战斗！` });

    battleSessions.set(req.user.id, battle);
    res.json(buildBattleResponse(battle, user));
  } catch (err) { next(err); }
});

// 执行动作 (attack/flee/capture)
router.post('/action', authMiddleware, async (req, res, next) => {
  try {
    const { action } = req.body; // 'attack', 'flee', 'capture'
    const battle = battleSessions.get(req.user.id);
    if (!battle || battle.finished) return res.status(400).json({ error: '没有进行中的战斗' });

    const user = await db.getOne(
      'SELECT id, username, level, hp, hp_max, mp, mp_max, atk_min, atk_max, def, agility, pet_id, place_id, money, exp, exp_max FROM `user` WHERE `id` = ?',
      [req.user.id]
    );

    if (action === 'attack') {
      // Player attacks
      const atkBoost = battle.temp_atk_boost || 1;
      const pAtk = Math.floor(randInt(user.atk_min, user.atk_max) * atkBoost);
      const pDmg = Math.max(1, pAtk - battle.monster_def);
      battle.monster_hp -= pDmg;
      battle.log.push({ type: 'attack', text: `你挥剑攻击${battle.monster_name}，造成 ${pDmg} 点伤害！` });

      // Weapon durability -1 to -2
      const weaponLoss = randInt(1, 2);
      const weaponResult = await applyDurabilityLoss(req.user.id, 'weapon', weaponLoss);
      if (weaponResult.broken) {
        battle.log.push({ type: 'system', text: `⚠️ 你的${weaponResult.name}损坏了！` });
      }

      // Pet attacks
      if (battle.pet_atk > 0 && battle.monster_hp > 0) {
        const petDmg = Math.max(1, randInt(Math.floor(battle.pet_atk * 0.7), battle.pet_atk));
        battle.monster_hp -= petDmg;
        battle.log.push({ type: 'attack', text: `🐾 ${battle.pet_name} 追加 ${petDmg} 点伤害！` });
      }

      if (battle.monster_hp <= 0) {
        await handleMonsterKill(user, battle);
        await resumeSailingIfNeeded(req.user.id, battle);
        battleSessions.delete(req.user.id);
        return res.json(buildBattleResponse(battle, user));
      }

      // Monster retaliates
      await monsterRetaliate(user, battle);
      if (user.hp <= 0) {
        await handlePlayerDeath(user, battle);
        await resumeSailingIfNeeded(req.user.id, battle);
        battleSessions.delete(req.user.id);
        return res.json(buildBattleResponse(battle, user));
      }

    } else if (action === 'flee') {
      if (randInt(1, 100) <= 50) {
        battle.log.push({ type: 'info', text: '你成功逃离了战斗！' });
        battle.result = 'flee';
        battle.finished = true;
        await resumeSailingIfNeeded(req.user.id, battle);
        battleSessions.delete(req.user.id);
        return res.json(buildBattleResponse(battle, user));
      } else {
        battle.log.push({ type: 'system', text: '逃跑失败！' });
        await monsterRetaliate(user, battle);
        if (user.hp <= 0) {
          await handlePlayerDeath(user, battle);
          battleSessions.delete(req.user.id);
          return res.json(buildBattleResponse(battle, user));
        }
      }

    } else if (action === 'capture') {
      if (!battle.captureable) {
        battle.log.push({ type: 'system', text: '这个怪物无法捕捉！' });
        return res.json(buildBattleResponse(battle, user));
      }
      const petCount = await db.getVar('SELECT COUNT(*) FROM user_pet WHERE user_id = ?', [req.user.id]);
      if (petCount >= 3) {
        battle.log.push({ type: 'system', text: '宠物已满（最多3只）！' });
        return res.json(buildBattleResponse(battle, user));
      }
      const hpLoss = 1 - (Math.max(0, battle.monster_hp) / battle.monster_hp_max);
      const rate = Math.min(99, Math.round(battle.capture_rate * (1 + hpLoss * 2)));
      if (randInt(1, 100) <= rate) {
        await db.update('user', { pet_id: battle.monster_id, pet_name: battle.monster_name, pet_level: 1, pet_exp: 0 }, '`id` = ?', [req.user.id]);
        battle.log.push({ type: 'info', text: `🎉 捕捉成功！${battle.monster_name} 成为了你的伙伴！（成功率${rate}%）` });
        battle.result = 'capture';
        battle.finished = true;
        battle.exp_gained = 0;
        battle.money_gained = 0;
        await resumeSailingIfNeeded(req.user.id, battle);
        battleSessions.delete(req.user.id);
        return res.json(buildBattleResponse(battle, user));
      } else {
        battle.log.push({ type: 'system', text: `捕捉失败！${battle.monster_name} 挣脱了…（成功率${rate}%）` });
        await monsterRetaliate(user, battle);
        if (user.hp <= 0) {
          await handlePlayerDeath(user, battle);
          battleSessions.delete(req.user.id);
          return res.json(buildBattleResponse(battle, user));
        }
      }
    } else if (action === 'skill') {
      const { skill_id } = req.body;
      if (!skill_id) return res.status(400).json({ error: '缺少技能ID' });

      // Get user's learned skill
      const userSkill = await db.getOne(
        'SELECT us.*, s.name, s.type, s.atk_multiplier, s.def_multiplier, s.mp_cost, s.cooldown, s.level_req FROM `user_skill` us JOIN `skill` s ON us.skill_id = s.id WHERE us.user_id = ? AND us.skill_id = ?',
        [req.user.id, skill_id]
      );
      if (!userSkill) return res.status(400).json({ error: '尚未学会该技能' });

      const now = Math.floor(Date.now() / 1000);

      // Check cooldown
      if (userSkill.cooldown_end > now) {
        const remain = userSkill.cooldown_end - now;
        battle.log.push({ type: 'system', text: `${userSkill.name} 冷却中（${remain}秒）` });
        return res.json(buildBattleResponse(battle, user));
      }

      // Check level requirement
      if (user.level < userSkill.level_req) {
        battle.log.push({ type: 'system', text: `${userSkill.name} 需要 Lv.${userSkill.level_req}` });
        return res.json(buildBattleResponse(battle, user));
      }

      // Check MP
      if ((user.mp || 0) < userSkill.mp_cost) {
        battle.log.push({ type: 'system', text: `魔法值不足（需要${userSkill.mp_cost}点）` });
        return res.json(buildBattleResponse(battle, user));
      }

      // Deduct MP
      const newMp = (user.mp || 0) - userSkill.mp_cost;
      await db.query('UPDATE `user` SET mp = ? WHERE `id` = ?', [newMp, req.user.id]);
      user.mp = newMp;

      // Set cooldown
      const cooldownEnd = now + userSkill.cooldown;
      await db.query('UPDATE `user_skill` SET cooldown_end = ? WHERE user_id = ? AND skill_id = ?', [cooldownEnd, req.user.id, skill_id]);

      // Apply skill effect
      if (userSkill.type === 1) {
        // Attack skill
        const hits = skill_id == 3 ? 2 : 1; // Skill 3 = Double Strike (2 hits)
        for (let h = 0; h < hits; h++) {
          const pAtk = randInt(user.atk_min, user.atk_max);
          const pDmg = Math.max(1, Math.floor((pAtk * Number(userSkill.atk_multiplier)) - battle.monster_def));
          battle.monster_hp -= pDmg;
          battle.log.push({ type: 'skill', text: `你施展了${userSkill.name}，造成 ${pDmg} 点伤害！` });
        }
      } else if (userSkill.type === 2) {
        // Defense skill - temporarily boost def (handled in retaliation calc via battle state)
        battle.temp_def_boost = Number(userSkill.def_multiplier);
        battle.log.push({ type: 'skill', text: `你施展了${userSkill.name}，防御力提升 ${userSkill.def_multiplier} 倍！` });
      } else if (userSkill.type === 3) {
        // Buff skill
        battle.temp_atk_boost = Number(userSkill.atk_multiplier);
        battle.log.push({ type: 'skill', text: `你施展了${userSkill.name}，攻击力提升 ${userSkill.atk_multiplier} 倍！` });
      }

      if (battle.monster_hp <= 0) {
        await handleMonsterKill(user, battle);
        await resumeSailingIfNeeded(req.user.id, battle);
        battleSessions.delete(req.user.id);
        return res.json(buildBattleResponse(battle, user));
      }

      // Monster retaliates
      await monsterRetaliate(user, battle);
      if (user.hp <= 0) {
        await handlePlayerDeath(user, battle);
        await resumeSailingIfNeeded(req.user.id, battle);
        battleSessions.delete(req.user.id);
        return res.json(buildBattleResponse(battle, user));
      }
    } else if (action === 'use_shortcut') {
      const slot = Number(req.body.slot);
      if (slot < 1 || slot > 3) return res.status(400).json({ error: '无效槽位' });

      const field = `shortcut_slot_${slot}`;
      const fullUser = await db.getOne(`SELECT ${field} FROM \`user\` WHERE \`id\` = ?`, [req.user.id]);
      const invId = Number(fullUser && fullUser[field]);
      if (!invId) {
        battle.log.push({ type: 'system', text: `快捷栏槽位${slot}为空！` });
        return res.json(buildBattleResponse(battle, user));
      }

      const inv = await db.getOne(
        `SELECT inv.id AS inv_id, inv.quantity, i.name, i.type, i.subtype, i.atk, i.def_val, i.hp AS item_hp FROM \`inventory\` inv JOIN \`item\` i ON inv.item_id = i.id WHERE inv.id = ? AND inv.user_id = ? AND inv.equipped = 0`,
        [invId, req.user.id]
      );
      if (!inv) {
        await db.query(`UPDATE \`user\` SET ${field} = 0 WHERE \`id\` = ?`, [req.user.id]);
        battle.log.push({ type: 'system', text: `快捷栏槽位${slot}物品已不存在！` });
        return res.json(buildBattleResponse(battle, user));
      }

      if (inv.item_hp > 0 && Number(user.hp) < Number(user.hp_max)) {
        const healAmt = Math.min(Number(inv.item_hp), Number(user.hp_max) - Number(user.hp));
        const newHp = Number(user.hp) + healAmt;
        await db.query('UPDATE `user` SET hp = ? WHERE `id` = ?', [newHp, req.user.id]);
        user.hp = newHp;
        battle.log.push({ type: 'heal', text: `你使用了${inv.name}，恢复了 ${healAmt} 点体力。` });
        if (inv.quantity > 1) {
          await db.query('UPDATE `inventory` SET quantity = ? WHERE `id` = ?', [inv.quantity - 1, inv.inv_id]);
        } else {
          await db.query('DELETE FROM `inventory` WHERE `id` = ?', [inv.inv_id]);
        }
        await monsterRetaliate(user, battle);
        if (user.hp <= 0) {
          await handlePlayerDeath(user, battle);
          battleSessions.delete(req.user.id);
          return res.json(buildBattleResponse(battle, user));
        }
      } else {
        battle.log.push({ type: 'system', text: `当前无法使用${inv.name}。` });
        return res.json(buildBattleResponse(battle, user));
      }
    }

    battle.round++;
    battleSessions.set(req.user.id, battle);
    res.json(buildBattleResponse(battle, user));
  } catch (err) { next(err); }
});

// 获取当前战斗状态
router.get('/state', authMiddleware, (req, res) => {
  const battle = battleSessions.get(req.user.id);
  if (!battle) return res.json({ inBattle: false });
  res.json({ inBattle: true, ...buildBattleResponse(battle, null) });
});



async function resumeSailingIfNeeded(userId, battle) {
  try {
    if (!battle || !battle.from_sail) return;
    const remain = Math.max(1, Number(battle.sail_remaining_sec || 0));
    const u = await db.getOne('SELECT ship_id, sail_to, sail_from FROM `user` WHERE `id`=?', [userId]);
    if (!u || !u.ship_id || !u.sail_to) return;
    const ship = await db.getOne('SELECT speed FROM `ship` WHERE `id`=?', [u.ship_id]);
    const duration = getSailMinutes((ship && ship.speed) ? ship.speed : 1) * 60;
    const elapsedShouldBe = Math.max(0, duration - remain);
    await db.query(
      'UPDATE `user` SET sail_time=?, sail_paused=0, sail_remaining_sec=0, sail_event_checked_at=? WHERE `id`=?',
      [Math.floor(Date.now()/1000) - elapsedShouldBe, Math.floor(Date.now()/1000), userId]
    );
  } catch (_) {}
}

// Helper functions
async function monsterRetaliate(user, battle) {
  const mAtk = randInt(battle.monster_atk_min, battle.monster_atk_max);
  // Apply temp defense boost from skill
  const defBoost = battle.temp_def_boost || 1;
  const effectiveDef = Math.floor(Number(user.def) * defBoost);
  const mDmg = Math.max(1, mAtk - effectiveDef);
  const newHp = Math.max(0, Number(user.hp) - mDmg);
  await db.query('UPDATE `user` SET hp = ? WHERE `id` = ?', [newHp, user.id]);
  user.hp = newHp;
  battle.log.push({ type: 'defend', text: `${battle.monster_name}反击，对你造成 ${mDmg} 点伤害！` });
  battle.round++;

  // Ship takes damage during pirate battles (from_sail=true)
  // 30% chance each round, 5-15 damage
  if (battle.from_sail && user.ship_id) {
    const shipRoll = Math.floor(Math.random() * 100) + 1;
    if (shipRoll <= 30) {
      const shipDmg = randInt(5, 15);
      const shipInfo = await db.getOne('SELECT hp, hp_max FROM `user_ship` WHERE `user_id` = ? AND `ship_id` = ?', [user.id, user.ship_id]);
      const shipBase = await db.getOne('SELECT hp_max FROM `ship` WHERE `id` = ?', [user.ship_id]);
      const currentShipHp = shipInfo ? shipInfo.hp : (shipBase ? shipBase.hp_max : 100);
      const newShipHp = Math.max(0, currentShipHp - shipDmg);

      if (shipInfo) {
        await db.query('UPDATE `user_ship` SET hp = ? WHERE `user_id` = ? AND `ship_id` = ?', [newShipHp, user.id, user.ship_id]);
      } else {
        await db.query('INSERT INTO `user_ship` (user_id, ship_id, hp, hp_max) VALUES (?, ?, ?, ?)', [user.id, user.ship_id, newShipHp, shipBase ? shipBase.hp_max : 100]);
      }

      battle.log.push({ type: 'system', text: `⛵ 船只受到波及，损失 ${shipDmg} 点HP！(船只HP: ${newShipHp}/${shipBase ? shipBase.hp_max : 100})` });

      // Check if ship sinks
      if (newShipHp <= 0) {
        battle.log.push({ type: 'system', text: `💀 船只损毁！你被迫返回最近的港口！` });
        battle.ship_sunk = true;
        // Reset ship HP to minimal and return to dock
        await db.query('UPDATE `user_ship` SET hp = 1 WHERE `user_id` = ? AND `ship_id` = ?', [user.id, user.ship_id]);
        const userRow = await db.getOne('SELECT place_id FROM `user` WHERE `id` = ?', [user.id]);
        if (userRow) {
          await db.query('UPDATE `user` SET place_id = ?, hp = ?, sail_time = 0, sail_from = 0, sail_to = 0, sail_paused = 0, sail_remaining_sec = 0 WHERE `id` = ?', [userRow.place_id, Math.floor(Number(user.hp_max) * 0.1), user.id]);
        }
        battle.finished = true;
        battle.result = 'ship_sunk';
      }
    }
  }

  // Pet satiety -2 per round
  if (battle.pet_up_id && battle.pet_satiety > 0) {
    const newSat = Math.max(0, battle.pet_satiety - 2);
    battle.pet_satiety = newSat;
    await db.query('UPDATE user_pet SET satiety = ? WHERE id = ?', [newSat, battle.pet_up_id]);
    if (newSat <= 0 && battle.pet_atk > 0) {
      battle.pet_atk = 0;
      battle.log.push({ type: 'system', text: `🐶 ${battle.pet_name}饱食度耗尽，无法继续战斗！` });
    }
  }
}

async function handleMonsterKill(user, battle) {
  const expGain = battle.monster_exp;
  const moneyGain = randInt(battle.monster_money_min, battle.monster_money_max);
  battle.log.push({ type: 'info', text: `${battle.monster_name}被击败了！` });
  battle.log.push({ type: 'info', text: `获得经验 +${expGain}，铜币 +${moneyGain}` });

  // Pet satiety deduction on kill round
  if (battle.pet_up_id && battle.pet_satiety > 0) {
    const newSat = Math.max(0, battle.pet_satiety - 2);
    battle.pet_satiety = newSat;
    await db.query('UPDATE user_pet SET satiety = ? WHERE id = ?', [newSat, battle.pet_up_id]);
  }

  // Pet gains 50% of monster exp
  if (battle.pet_up_id) {
    // Pet gains exp if equipped (even if satiety ran out mid-fight)
    const petExpGain = Math.floor(battle.monster_exp * 0.5);
    const up = await db.getOne('SELECT level, exp FROM user_pet WHERE id = ?', [battle.pet_up_id]);
    if (up) {
      let pNewExp = up.exp + petExpGain;
      let pNewLevel = up.level;
      while (pNewExp >= (100 + (pNewLevel - 1) * 50)) {
        pNewExp -= (100 + (pNewLevel - 1) * 50);
        pNewLevel++;
      }
      await db.query('UPDATE user_pet SET level=?, exp=? WHERE id=?', [pNewLevel, pNewExp, battle.pet_up_id]);
      await db.query('UPDATE user SET pet_level=?, pet_exp=? WHERE id=?', [pNewLevel, pNewExp, user.id]);
      if (pNewLevel > up.level) {
        battle.log.push({ type: 'info', text: `🐶 ${battle.pet_name}升级到 Lv.${pNewLevel}！` });
      }
    }
  }


  let newExp = Number(user.exp) + expGain;
  let newLevel = Number(user.level);
  let newExpMax = Number(user.exp_max) || 500;
  let newHpMax = Number(user.hp_max);
  let newAtkMin = Number(user.atk_min);
  let newAtkMax = Number(user.atk_max);
  let newDef = Number(user.def);

  while (newExp >= newExpMax) {
    newExp -= newExpMax;
    newLevel++;
    newExpMax = config.baseExpMax + config.expGrowth * (newLevel - 1);
    newHpMax += config.levelHpBonus;
    newAtkMin += config.levelAtkMinBonus;
    newAtkMax += config.levelAtkMaxBonus;
    newDef += config.levelDefBonus;
    battle.log.push({ type: 'info', text: `🎉 恭喜升级！你现在 Lv.${newLevel} 了！` });
  }

  await db.query('UPDATE `user` SET level=?, exp=?, exp_max=?, hp_max=?, atk_min=?, atk_max=?, def=?, money=money+? WHERE id=?',
    [newLevel, newExp, newExpMax, newHpMax, newAtkMin, newAtkMax, newDef, moneyGain, user.id]);
  user.level = newLevel; user.exp = newExp; user.exp_max = newExpMax;
  user.hp_max = newHpMax; user.money = Number(user.money) + moneyGain;

  battle.result = 'win';
  battle.finished = true;
  battle.exp_gained = expGain;
  battle.money_gained = moneyGain;

  // Check kill quests
  const quests = await db.getAll(
    'SELECT q.id, q.name, q.require_value, uq.progress FROM `quest` q JOIN `user_quest` uq ON q.id = uq.quest_id WHERE uq.user_id = ? AND q.type = 0 AND q.target_id = ? AND uq.status = 0',
    [user.id, battle.monster_id]
  );
  for (const q of quests) {
    const newProgress = Math.min(q.require_value, q.progress + 1);
    const status = newProgress >= q.require_value ? 1 : 0;
    await db.update('user_quest', { progress: newProgress, status }, '`user_id` = ? AND `quest_id` = ?', [user.id, q.id]);
    if (status === 1) battle.log.push({ type: 'info', text: `📋 任务「${q.name}」已完成！` });
  }

  // Handle item drops with quality roll
  const drops = await db.getAll('SELECT md.item_id, md.quantity_min, md.quantity_max FROM `monster_drop` md WHERE md.monster_id = ?', [battle.monster_id]);
  for (const drop of drops) {
    if (randInt(1, 10000) <= drop.drop_rate) {
      const qty = randInt(drop.quantity_min, drop.quantity_max);
      // Roll quality: white 60%, green 25%, blue 10%, purple 4%, orange 1%
      const roll = randInt(1, 100);
      let quality = 0;
      if (roll <= 60) quality = 0;       // white
      else if (roll <= 85) quality = 1;   // green
      else if (roll <= 95) quality = 2;    // blue
      else if (roll <= 99) quality = 3;   // purple
      else quality = 4;                    // orange

      // Insert inventory item
      const invId = await db.insert('inventory', {
        user_id: user.id,
        item_id: drop.item_id,
        quantity: qty,
        equipped: 0,
        enhance_level: 0
      });

      // Update item quality
      await db.query('UPDATE `item` SET `quality` = ? WHERE `id` = ?', [quality, drop.item_id]);

      // Generate affixes if quality > 0
      if (quality > 0) {
        const numAffixes = randInt(1, quality + 1);
        const affixes = await db.getAll(
          'SELECT * FROM `item_affix` WHERE `quality` <= ? ORDER BY RAND() LIMIT ?',
          [quality, numAffixes]
        );
        for (const affix of affixes) {
          const statValue = randInt(affix.stat_min, affix.stat_max);
          await db.insert('inventory_affix', {
            inventory_id: invId,
            affix_id: affix.id,
            stat_value: statValue
          });
        }
        const qualityNames = ['', '绿色', '蓝色', '紫色', '橙色'];
        battle.log.push({ type: 'info', text: `💎 获得${qualityNames[quality]}装备！` });
      }
    }
  }

  await db.insert('battle_log', {
    user_id: user.id, monster_id: battle.monster_id, enemy_user_id: 0,
    result: 1, exp_gained: expGain, money_gained: moneyGain,
    log_text: battle.log.map(l => l.text).join('\n'), created_at: Math.floor(Date.now() / 1000)
  });
}

async function handlePlayerDeath(user, battle) {
  const lostMoney = Math.floor(Number(user.money) * 0.05);
  const newHp = Math.floor(Number(user.hp_max) * 0.1);
  // Find tavern in current city
  let tavernId = 1011;
  let tavernName = '威尼斯酒馆';
  try {
    const curPlace = await db.getOne('SELECT city_id FROM place WHERE id = ?', [user.place_id]);
    if (curPlace && curPlace.city_id) {
      const tavern = await db.getOne('SELECT id, name FROM place WHERE city_id = ? AND type = 4 LIMIT 1', [curPlace.city_id]);
      if (tavern) {
        tavernId = tavern.id;
        const cityRow = await db.getOne('SELECT name FROM map WHERE id = ?', [curPlace.city_id]);
        tavernName = (cityRow ? cityRow.name : '') + tavern.name;
      }
    }
  } catch(e) { console.error('[DEATH] Error finding tavern:', e.message); }
  console.log('[DEATH] user.place_id=', user.place_id, 'tavernId=', tavernId, 'tavernName=', tavernName);
  await db.query('UPDATE `user` SET hp=?, money=GREATEST(0, money-?), place_id=? WHERE `id` = ?', [newHp, lostMoney, tavernId, user.id]);
  user.hp = newHp; user.money = Math.max(0, Number(user.money) - lostMoney); user.place_id = tavernId;

  battle.log.push({ type: 'defend', text: '你被击败了……' });
  battle.log.push({ type: 'info', text: `你被送回了${tavernName}。` });
  if (lostMoney > 0) battle.log.push({ type: 'info', text: `你损失了 ${lostMoney} 铜币。` });

  battle.result = 'lose';
  battle.finished = true;
  battle.exp_gained = 0;
  battle.money_gained = -lostMoney;
  battle.teleported = true; // flag for frontend

  await db.insert('battle_log', {
    user_id: user.id, monster_id: battle.monster_id, enemy_user_id: 0,
    result: 0, exp_gained: 0, money_gained: -lostMoney,
    log_text: battle.log.map(l => l.text).join('\n'), created_at: Math.floor(Date.now() / 1000)
  });
}

function buildBattleResponse(battle, user) {
  const resp = {
    inBattle: !battle.finished,
    finished: battle.finished,
    result: battle.result,
    round: battle.round,
    monster_id: battle.monster_id,
    monster_name: battle.monster_name,
    monster_hp: Math.max(0, battle.monster_hp),
    monster_hp_max: battle.monster_hp_max,
    monster_desc: battle.monster_desc,
    captureable: battle.captureable,
    capture_rate: battle.capture_rate,
    exp_gained: battle.exp_gained || 0,
    money_gained: battle.money_gained || 0,
    teleport: battle.teleported || false,
    log: battle.finished ? battle.log : battle.log.slice(-30),
  };
  if (user) {
    resp.player_hp = user.hp;
    resp.player_hp_max = user.hp_max;
    resp.player_level = user.level;
    resp.player_exp = user.exp;
    resp.player_exp_max = user.exp_max;
    resp.player_money = user.money;
    resp.player_atk_min = user.atk_min;
    resp.player_atk_max = user.atk_max;
    resp.player_def = user.def;
    resp.player_mp = user.mp || 0;
    resp.player_mp_max = user.mp_max || 100;
    resp.pet_name = battle.pet_name;
    resp.pet_satiety = battle.pet_satiety || 0;
    resp.pet_up_id = battle.pet_up_id || 0;
  }
  // Calculate capture rate
  if (battle.captureable && battle.monster_hp_max > 0) {
    const hpLoss = 1 - (Math.max(0, battle.monster_hp) / battle.monster_hp_max);
    resp.current_capture_rate = Math.min(99, Math.round(battle.capture_rate * (1 + hpLoss * 2)));
  }
  return resp;
}

module.exports = router;

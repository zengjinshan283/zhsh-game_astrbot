/**
 * 副本路由 - 牛头山、四象圣殿
 */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const config = require('../config').game;

const router = express.Router();
function randInt(min, max) { return Math.floor(Math.random() * (Number(max) - Number(min) + 1)) + Number(min); }

// 10 silver = 10000 copper (temporary)
const SILVER_TO_COPPER = 1000;

// In-memory dungeon session per user (keyed by userId)
// Structure: { dungeonId, dungeonName, currentFloor, maxFloor, enteredAt, inProgress }
const dungeonSessions = new Map();

// In-memory dungeon battle state per user
let dungeonBattlesMap = new Map();

// ===== GET /api/dungeon/list - 副本列表 =====
router.get('/list', authMiddleware, async (req, res, next) => {
  try {
    const user = await db.getOne('SELECT id, level, money FROM `user` WHERE `id` = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: '角色不存在' });

    // Get unique dungeon entries (one per dungeon name)
    const dungeons = await db.getAll(`
      SELECT d.name, d.place_id, MIN(d.floor) as min_floor, MAX(d.floor) as max_floor,
             d.level_req, d.entry_fee, d.monster_id, d.description
      FROM dungeon d
      GROUP BY d.name, d.place_id, d.level_req, d.entry_fee, d.monster_id, d.description
      ORDER BY d.place_id
    `);

    const result = dungeons.map(d => {
      const totalFloors = d.max_floor;
      // Entry fee: entry_fee stores silver, convert to copper for comparison
      const entryFeeCopper = Number(d.entry_fee || 0) * SILVER_TO_COPPER;
      return {
        name: d.name,
        place_id: d.place_id,
        min_floor: d.min_floor,
        max_floor: totalFloors,
        level_req: d.level_req,
        entry_fee: d.entry_fee, // silver
        entry_fee_copper: entryFeeCopper, // copper for comparison
        monster_id: d.monster_id,
        description: d.description,
        can_enter: user.level >= d.level_req,
        has_enough_money: user.money >= entryFeeCopper,
        is_free: entryFeeCopper === 0
      };
    });

    res.json({ dungeons: result });
  } catch (err) { next(err); }
});

// ===== GET /api/dungeon/:id/floors - 获取某副本所有楼层信息 =====
router.get('/:id/floors', authMiddleware, async (req, res, next) => {
  try {
    const dungeonName = req.params.id;
    const user = await db.getOne('SELECT id, level, money FROM `user` WHERE `id` = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: '角色不存在' });

    const dungeon = await db.getOne(`
      SELECT name, place_id, level_req, entry_fee
      FROM dungeon WHERE name = ? LIMIT 1
    `, [dungeonName]);
    if (!dungeon) return res.status(404).json({ error: '副本不存在' });

    const floors = await db.getAll(`
      SELECT d.floor, d.level_req, d.entry_fee, d.monster_id, d.description,
             m.name as monster_name, m.hp as monster_hp, m.atk_min, m.atk_max, m.def,
             m.exp as monster_exp, m.money as monster_money
      FROM dungeon d
      LEFT JOIN monster m ON d.monster_id = m.id
      WHERE d.name = ?
      ORDER BY d.floor ASC
    `, [dungeonName]);

    // Check which floors are cleared (user_dungeon_progress table or in-memory session)
    const session = dungeonSessions.get(req.user.id);
    const clearedFloors = new Set();
    if (session && session.dungeonId === dungeonName) {
      for (let f = 1; f < session.currentFloor; f++) clearedFloors.add(f);
    }

    res.json({
      dungeon: {
        name: dungeon.name,
        place_id: dungeon.place_id,
        level_req: dungeon.level_req,
        entry_fee: dungeon.entry_fee,
        entry_fee_copper: Number(dungeon.entry_fee || 0) * SILVER_TO_COPPER,
        current_floor: session?.dungeonId === dungeonName ? session.currentFloor : null,
        in_progress: session?.dungeonId === dungeonName
      },
      floors: floors.map(f => ({
        floor: f.floor,
        level_req: f.level_req,
        monster_id: f.monster_id,
        monster_name: f.monster_name || '???',
        monster_hp: f.monster_hp || 0,
        monster_atk_min: f.atk_min || 0,
        monster_atk_max: f.atk_max || 0,
        monster_def: f.def || 0,
        monster_exp: f.monster_exp || 0,
        monster_money: f.monster_money || 0,
        description: f.description || '',
        cleared: clearedFloors.has(f.floor)
      }))
    });
  } catch (err) { next(err); }
});

// ===== POST /api/dungeon/:id/enter - 进入副本 =====
router.post('/:id/enter', authMiddleware, async (req, res, next) => {
  try {
    const dungeonName = req.params.id;
    const user = await db.getOne('SELECT id, level, money, hp FROM `user` WHERE `id` = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: '角色不存在' });
    if (user.hp <= 0) return res.status(400).json({ error: '你已经倒下了，请回酒馆休息' });

    const dungeon = await db.getOne(`
      SELECT name, place_id, level_req, entry_fee, MIN(floor) as min_floor, MAX(floor) as max_floor
      FROM dungeon WHERE name = ? GROUP BY name, place_id, level_req, entry_fee
    `, [dungeonName]);
    if (!dungeon) return res.status(404).json({ error: '副本不存在' });

    if (user.level < dungeon.level_req) {
      return res.status(400).json({ error: `需要 Lv.${dungeon.level_req} 才能进入` });
    }

    const entryFeeCopper = Number(dungeon.entry_fee || 0) * SILVER_TO_COPPER;
    if (user.money < entryFeeCopper) {
      if (entryFeeCopper === 0) {
        return res.status(400).json({ error: '铜币不足' });
      }
      return res.status(400).json({ error: `入场费不足，需要 ${dungeon.entry_fee} 银币（约${entryFeeCopper}铜币）` });
    }

    // Deduct entry fee
    if (entryFeeCopper > 0) {
      await db.query('UPDATE `user` SET money = money - ? WHERE `id` = ?', [entryFeeCopper, req.user.id]);
    }

    // Create session - start from floor 1 (or furthest cleared + 1)
    const session = {
      dungeonId: dungeonName,
      dungeonName: dungeon.name,
      currentFloor: 1,
      maxFloor: dungeon.max_floor,
      enteredAt: Date.now()
    };
    dungeonSessions.set(req.user.id, session);

    // 自动触发 type=3 进入副本任务（如牛头山/四象圣殿入口任务）
    (async () => {
      try {
        const arriveQuests = await db.getAll(
          "SELECT q.id, q.name, q.require_value, uq.progress FROM `quest` q JOIN `user_quest` uq ON q.id = uq.quest_id WHERE uq.user_id = ? AND q.type = 3 AND q.target_id = ? AND uq.status = 0",
          [req.user.id, dungeon.place_id]
        );
        for (const q of arriveQuests) {
          const newProgress = Math.min(q.require_value, q.progress + 1);
          const status = newProgress >= q.require_value ? 1 : 0;
          await db.update('user_quest', { progress: newProgress, status }, '`user_id` = ? AND `quest_id` = ?', [req.user.id, q.id]);
        }
      } catch (e) {}
    })();

    res.json({
      ok: 1,
      msg: `成功进入 ${dungeon.name}！当前第 1 层`,
      dungeon: {
        name: dungeon.name,
        current_floor: 1,
        max_floor: dungeon.max_floor,
        entry_fee_paid: entryFeeCopper
      }
    });
  } catch (err) { next(err); }
});

// ===== POST /api/dungeon/:id/floor/:floor/attack - 攻击当前楼层怪物 =====
router.post('/:id/floor/:floor/attack', authMiddleware, async (req, res, next) => {
  try {
    const dungeonName = req.params.id;
    const targetFloor = parseInt(req.params.floor);
    const session = dungeonSessions.get(req.user.id);

    if (!session || session.dungeonId !== dungeonName) {
      return res.status(400).json({ error: '未进入该副本，请先进入副本' });
    }

    if (targetFloor !== session.currentFloor) {
      return res.status(400).json({ error: `当前正在第 ${session.currentFloor} 层，无法跳层` });
    }

    const dungeonFloor = await db.getOne(`
      SELECT d.*, m.name as monster_name, m.hp as monster_hp,
             m.atk_min, m.atk_max, m.def, m.exp as monster_exp,
             m.money as monster_money_min
      FROM dungeon d
      LEFT JOIN monster m ON d.monster_id = m.id
      WHERE d.name = ? AND d.floor = ?
    `, [dungeonName, targetFloor]);

    if (!dungeonFloor) return res.status(404).json({ error: '楼层不存在' });

    const user = await db.getOne(
      'SELECT id, username, level, hp, hp_max, exp, exp_max, atk_min, atk_max, def, agility, pet_id FROM `user` WHERE `id` = ?',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: '角色不存在' });
    if (user.hp <= 0) return res.status(400).json({ error: '你已经倒下了，请回酒馆休息' });

    // Build dungeon battle state (in-memory, keyed by userId)
    let battle = dungeonBattlesMap.get(req.user.id);

    if (!battle || battle.floor !== targetFloor) {
      // Start new battle on this floor
      const monsterMoneyMax = Math.floor(Number(dungeonFloor.monster_money_min || 0) * 1.1);
      battle = {
        floor: targetFloor,
        monster_id: dungeonFloor.monster_id,
        monster_name: dungeonFloor.monster_name || '???',
        monster_hp: Number(dungeonFloor.monster_hp) || 100,
        monster_hp_max: Number(dungeonFloor.monster_hp) || 100,
        monster_atk_min: Number(dungeonFloor.atk_min) || 10,
        monster_atk_max: Number(dungeonFloor.atk_max) || 15,
        monster_def: Number(dungeonFloor.def) || 5,
        monster_exp: Number(dungeonFloor.monster_exp) || 50,
        monster_money_min: Math.floor(Number(dungeonFloor.monster_money_min || 0) * 0.9),
        monster_money_max: monsterMoneyMax,
        round: 1,
        finished: false,
        result: null,
        log: [{ type: 'info', text: `你遭遇了 ${dungeonFloor.monster_name || '???'}！` }],
        player_hp: user.hp,
        player_hp_max: user.hp_max
      };
      dungeonBattlesMap.set(req.user.id, battle);
    }

    // Process attack action
    const { action } = req.body;

    if (action === 'attack') {
      // Player attacks
      const pAtk = randInt(user.atk_min, user.atk_max);
      const pDmg = Math.max(1, Math.floor(pAtk - battle.monster_def));
      battle.monster_hp -= pDmg;
      battle.log.push({ type: 'attack', text: `⚔️ 你挥剑攻击，造成 ${pDmg} 点伤害！` });

      // Monster defeated
      if (battle.monster_hp <= 0) {
        const expGain = battle.monster_exp;
        const moneyGain = randInt(battle.monster_money_min, battle.monster_money_max);

        // Update user exp/money/level
        let newExp = Number(user.exp || 0) + expGain;
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

        await db.query(
          'UPDATE `user` SET level=?, exp=?, exp_max=?, hp_max=?, atk_min=?, atk_max=?, def=?, hp=LEAST(hp+?, hp_max), money=money+? WHERE id=?',
          [newLevel, newExp, newExpMax, newHpMax, newAtkMin, newAtkMax, newDef, Math.floor(newHpMax * 0.3), moneyGain, req.user.id]
        );

        battle.log.push({ type: 'info', text: `${battle.monster_name}被击败了！` });
        battle.log.push({ type: 'info', text: `获得经验 +${expGain}，铜币 +${moneyGain}` });

        // Check if dungeon cleared
        if (targetFloor >= session.maxFloor) {
          // Dungeon complete! Give bonus
          battle.log.push({ type: 'info', text: `🏆 ${dungeonName} 全部通关！` });
          battle.log.push({ type: 'info', text: `🎁 通关奖励：经验 +${Math.floor(expGain * 2)}，铜币 +${Math.floor(moneyGain * 2)}` });
          await db.query('UPDATE `user` SET exp=exp+?, money=money+? WHERE id=?',
            [Math.floor(expGain * 2), Math.floor(moneyGain * 2), req.user.id]);

          // Daily activity: dungeon completed
          try {
            await db.query(
              'INSERT IGNORE INTO `user_daily_activity` (user_id, date, activity_key, progress, claimed, updated_at) VALUES (?, ?, ?, 1, 0, ?)',
              [req.user.id, new Date().toISOString().slice(0,10), 'daily_dungeon', Math.floor(Date.now()/1000)]
            );
            await db.query(
              'UPDATE `user_daily_activity` SET progress = LEAST(progress + 1, 100), updated_at = ? WHERE user_id = ? AND date = ? AND activity_key = ?',
              [Math.floor(Date.now()/1000), req.user.id, new Date().toISOString().slice(0,10), 'daily_dungeon']
            );
          } catch(e) {}

          battle.result = 'dungeon_clear';
        } else {
          // Next floor
          battle.log.push({ type: 'info', text: `准备进入第 ${targetFloor + 1} 层…` });
          session.currentFloor = targetFloor + 1;
          battle.result = 'floor_clear';
        }

        battle.finished = true;
        battle.exp_gained = expGain;
        battle.money_gained = moneyGain;
        battle.player_hp = Math.min(user.hp, user.hp_max);

        dungeonBattlesMap.set(req.user.id, battle);
        return res.json(buildDungeonBattleResponse(battle, user, session));
      }

      // Monster retaliates
      const mAtk = randInt(battle.monster_atk_min, battle.monster_atk_max);
      const mDmg = Math.max(1, mAtk - user.def);
      battle.player_hp = Math.max(0, battle.player_hp - mDmg);
      battle.log.push({ type: 'defend', text: `${battle.monster_name}反击，对你造成 ${mDmg} 点伤害！` });

      if (battle.player_hp <= 0) {
        battle.log.push({ type: 'system', text: '你倒下了……副本挑战失败！' });
        battle.finished = true;
        battle.result = 'lose';
        battle.player_hp = 0;

        // Update user hp to 1 (not full death in dungeon)
        await db.query('UPDATE `user` SET hp = 1 WHERE `id` = ?', [req.user.id]);

        dungeonBattlesMap.set(req.user.id, battle);
        return res.json(buildDungeonBattleResponse(battle, user, session));
      }

      battle.round++;
      battle.player_hp_max = user.hp_max;
      dungeonBattlesMap.set(req.user.id, battle);
      return res.json(buildDungeonBattleResponse(battle, user, session));

    } else if (action === 'flee') {
      battle.log.push({ type: 'info', text: '你从副本中撤退了！' });
      battle.finished = true;
      battle.result = 'flee';
      dungeonBattles.delete(req.user.id);
      dungeonSessions.delete(req.user.id);
      return res.json({
        ...buildDungeonBattleResponse(battle, user, session),
        fled: true
      });
    }

    battle.player_hp_max = user.hp_max;
    dungeonBattlesMap.set(req.user.id, battle);
    res.json(buildDungeonBattleResponse(battle, user, session));
  } catch (err) { next(err); }
});

// ===== GET /api/dungeon/:id/status - 获取当前副本挑战状态 =====
router.get('/:id/status', authMiddleware, async (req, res, next) => {
  try {
    const dungeonName = req.params.id;
    const session = dungeonSessions.get(req.user.id);

    if (!session || session.dungeonId !== dungeonName) {
      return res.json({ in_dungeon: false, dungeon: null });
    }

    res.json({
      in_dungeon: true,
      dungeon: {
        name: session.dungeonName,
        current_floor: session.currentFloor,
        max_floor: session.maxFloor,
        entered_at: session.enteredAt
      }
    });
  } catch (err) { next(err); }
});

// ===== POST /api/dungeon/exit - 退出副本 =====
router.post('/exit', authMiddleware, async (req, res, next) => {
  try {
    dungeonBattlesMap.delete(req.user.id);
    dungeonSessions.delete(req.user.id);
    res.json({ ok: 1, msg: '已退出副本' });
  } catch (err) { next(err); }
});

// Helper: Build battle response
function buildDungeonBattleResponse(battle, user, session) {
  return {
    floor: battle.floor,
    monster_id: battle.monster_id,
    monster_name: battle.monster_name,
    monster_hp: Math.max(0, battle.monster_hp),
    monster_hp_max: battle.monster_hp_max,
    monster_atk_min: battle.monster_atk_min,
    monster_atk_max: battle.monster_atk_max,
    monster_def: battle.monster_def,
    round: battle.round,
    finished: battle.finished,
    result: battle.result,
    log: battle.log,
    player_hp: battle.player_hp,
    player_hp_max: battle.player_hp_max,
    exp_gained: battle.exp_gained || 0,
    money_gained: battle.money_gained || 0,
    current_floor: session?.currentFloor || battle.floor,
    max_floor: session?.maxFloor || 0,
    dungeon_name: session?.dungeonName || ''
  };
}

module.exports = router;
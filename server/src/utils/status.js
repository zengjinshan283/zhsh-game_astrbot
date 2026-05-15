/**
 * 状态效果工具模块
 * 处理 Buff/Debuff 的查询、应用、清除、tick触发
 */
const db = require('../db');

const randInt = (min, max) => Math.floor(Math.random() * (Number(max) - Number(min) + 1)) + Number(min);

/**
 * 从 DB 加载玩家当前状态效果列表
 * @returns Array of {id, name, icon, type, stack, end_at, tick_at, ...definition_fields}
 */
async function getUserStatuses(userId) {
  const user = await db.getOne('SELECT status_effects FROM `user` WHERE `id` = ?', [userId]);
  if (!user || !user.status_effects) return [];
  try {
    const parsed = typeof user.status_effects === 'string' ? JSON.parse(user.status_effects) : user.status_effects;
    return parsed;
  } catch (e) { return []; }
}

/**
 * 保存玩家状态效果列表到 DB
 */
async function saveUserStatuses(userId, statuses) {
  const json = JSON.stringify(statuses);
  await db.query('UPDATE `user` SET status_effects = ? WHERE `id` = ?', [json, userId]);
}

/**
 * 清除已过期的状态，返回清理后的列表
 */
function pruneExpired(statuses, now) {
  return statuses.filter(s => !s.end_at || s.end_at > now);
}

/**
 * 从 status_effect 表获取所有定义
 */
let _statusDefCache = null;
let _statusDefCacheAt = 0;
async function getAllStatusDefs() {
  if (_statusDefCache && Date.now() - _statusDefCacheAt < 60000) return _statusDefCache;
  const rows = await db.getAll('SELECT * FROM `status_effect`');
  _statusDefCache = rows;
  _statusDefCacheAt = Date.now();
  return rows;
}

/**
 * 获取指定状态定义
 */
async function getStatusDef(id) {
  const defs = await getAllStatusDefs();
  return defs.find(d => d.id === id) || null;
}

/**
 * 计算战斗属性倍率（多状态合并）
 * 返回 { atkMult, defMult, expMult, moneyMult, dropMult, sailMult, fleePenalty, accuracyPenalty }
 */
function computeStatMultipliers(statuses) {
  let atkMult = 1.0, defMult = 1.0, expMult = 1.0, moneyMult = 1.0, dropMult = 1.0, sailMult = 1.0;
  let fleePenalty = 0, accuracyPenalty = 0;
  for (const s of statuses) {
    if (s.atk_multiplier != null && s.atk_multiplier > 1.0) atkMult = Math.max(atkMult, parseFloat(s.atk_multiplier));
    if (s.def_multiplier != null && s.def_multiplier > 1.0) defMult = Math.max(defMult, parseFloat(s.def_multiplier));
    if (s.exp_multiplier != null && s.exp_multiplier < 1.0) expMult = Math.min(expMult, parseFloat(s.exp_multiplier));
    if (s.money_multiplier != null && s.money_multiplier > 1.0) moneyMult = Math.max(moneyMult, parseFloat(s.money_multiplier));
    if (s.drop_multiplier != null && s.drop_multiplier > 1.0) dropMult = Math.max(dropMult, parseFloat(s.drop_multiplier));
    if (s.sail_multiplier != null && s.sail_multiplier < 1.0) sailMult = Math.min(sailMult, parseFloat(s.sail_multiplier));
    if (s.flee_penalty != null) fleePenalty = Math.min(fleePenalty, parseInt(s.flee_penalty));
    if (s.accuracy_penalty != null) accuracyPenalty = Math.min(accuracyPenalty, parseInt(s.accuracy_penalty));
  }
  return { atkMult, defMult, expMult, moneyMult, dropMult, sailMult, fleePenalty, accuracyPenalty };
}

/**
 * 触发 tick 型状态的周期性扣血（如中毒、灼烧）
 * 只在战斗中调用
 * 返回 log entries array
 */
async function processTickEffects(userId, statuses, user, battle) {
  const logs = [];
  const defs = await getAllStatusDefs();
  const now = Math.floor(Date.now() / 1000);
  let hpChanged = false;

  for (const s of statuses) {
    const def = defs.find(d => d.id === s.id);
    if (!def || !def.tick_seconds || def.tick_seconds <= 0) continue;

    // 检查是否到触发时间
    const lastTick = s.tick_at || s.start_at || now;
    if (now - lastTick < def.tick_seconds) continue;

    // 扣血
    if (def.tick_damage > 0) {
      const dmg = Math.max(1, Math.floor(user.hp_max * def.tick_damage / 100));
      const newHp = Math.max(0, user.hp - dmg);
      await db.query('UPDATE `user` SET hp = ? WHERE `id` = ?', [newHp, userId]);
      user.hp = newHp;
      hpChanged = true;
      const icon = def.icon || '';
      logs.push({ type: 'debuff', text: `${icon} ${def.name} 发作，造成 ${dmg} 点伤害！` });
    }

    // 更新 tick_at
    s.tick_at = now;
  }

  if (hpChanged && user.hp <= 0) {
    logs.push({ type: 'system', text: '你倒下了……' });
  }

  return logs;
}

/**
 * 为玩家添加一个状态
 * @param userId
 * @param statusId  状态ID（如 'poison'）
 * @param duration  持续秒数（默认用状态表定义）
 * @param stack     叠加层数（默认1）
 * @returns {applied: bool, message: string}
 */
async function applyStatus(userId, statusId, duration, stack) {
  const def = await getStatusDef(statusId);
  if (!def) return { applied: false, message: '无效的状态' };

  const now = Math.floor(Date.now() / 1000);
  const dur = duration || 300; // 默认5分钟
  const endAt = now + dur;

  const statuses = await getUserStatuses(userId);
  const existing = statuses.find(s => s.id === statusId);

  if (existing) {
    // 可叠加状态
    const maxStack = def.stackable || 1;
    const newStack = Math.min(maxStack, (existing.stack || 1) + (stack || 1));
    existing.stack = newStack;
    existing.end_at = endAt;
    existing.tick_at = now;
    existing.start_at = now;
  } else {
    statuses.push({
      id: statusId,
      name: def.name,
      icon: def.icon || '',
      type: def.type,
      stack: stack || 1,
      end_at: endAt,
      tick_at: now,
      start_at: now,
      ...def
    });
  }

  await saveUserStatuses(userId, statuses);
  return { applied: true, message: `${def.icon || ''} ${def.name} ${stack > 1 ? 'x' + (stack || 1) : ''}` };
}

/**
 * 清理过期状态并保存
 */
async function clearExpired(userId) {
  const statuses = await getUserStatuses(userId);
  const now = Math.floor(Date.now() / 1000);
  const pruned = pruneExpired(statuses, now);
  if (pruned.length !== statuses.length) {
    await saveUserStatuses(userId, pruned);
  }
  return pruned;
}

/**
 * 战斗开始前预处理：
 * 1. 清理过期
 * 2. 计算属性倍率
 * 3. 检查冰冻（无法行动）
 * 4. 检查混乱（攻击自己）
 */
async function preBattleProcess(userId, user, battle) {
  await clearExpired(userId);
  const statuses = await getUserStatuses(userId);
  const defs = await getAllStatusDefs();
  const now = Math.floor(Date.now() / 1000);
  const logs = [];
  const effects = computeStatMultipliers(statuses);

  // 检查冰冻
  const frozen = statuses.find(s => {
    const def = defs.find(d => d.id === s.id);
    return def && def.freeze && s.end_at > now;
  });
  if (frozen) {
    battle.frozen = true;
    battle.log.push({ type: 'debuff', text: `🧊 你被冰冻了，本回合无法行动！` });
  }

  // 检查沉默
  const silenced = statuses.find(s => {
    const def = defs.find(d => d.id === s.id);
    return def && def.silence && s.end_at > now;
  });
  if (silenced) {
    battle.silenced = true;
  }

  // 检查混乱
  const confused = statuses.find(s => {
    const def = defs.find(d => d.id === s.id);
    return def && def.confuse && s.end_at > now;
  });
  if (confused && Math.random() < 0.3) {
    battle.confused = true;
    battle.log.push({ type: 'debuff', text: `😵 你陷入混乱，攻击了自己！` });
  }

  // 附加属性倍率到 battle 对象，供后续计算使用
  battle.statusEffects = effects;
  battle.activeStatuses = statuses;

  return { logs, effects };
}

/**
 * 怪物施放 debuff（反击后调用）
 */
async function tryApplyMonsterDebuff(userId, user, battle, monsterLevel) {
  // 小怪10%，精英25%，BOSS40%
  const debuffChance = Math.min(40, Math.max(10, Math.floor(monsterLevel / 2)));
  if (Math.random() * 100 > debuffChance) return;

  const debuffPool = ['poison', 'weak', 'burn'];
  if (Math.random() < 0.3) debuffPool.push('blind');
  if (Math.random() < 0.2) debuffPool.push('fear');

  const chosen = debuffPool[randInt(0, debuffPool.length - 1)];
  const def = await getStatusDef(chosen);
  if (!def) return;

  const durMap = { poison: 300, burn: 180, weak: 300, blind: 180, fear: 180, freeze: 1, confuse: 2, silence: 2 };
  const dur = durMap[chosen] || 180;

  const result = await applyStatus(userId, chosen, dur, 1);
  if (result.applied) {
    battle.log.push({ type: 'debuff', text: `${def.icon || ''} 你被施加了 ${def.name}！` });
  }
}

/**
 * 战斗结束后清理 debuff（不清除 buff）
 */
async function clearDebuffsOnBattleEnd(userId) {
  const statuses = await getUserStatuses(userId);
  const now = Math.floor(Date.now() / 1000);
  const kept = statuses.filter(s => {
    if (s.type === 1) return true; // 保留 buff
    // debuff 全清？不，只清除 tick 型 debuff（中毒/灼烧），保留控制型
    const defMap = { poison: true, burn: true };
    return !defMap[s.id];
  });
  if (kept.length !== statuses.length) {
    await saveUserStatuses(userId, kept);
  }
}

module.exports = {
  getUserStatuses,
  saveUserStatuses,
  getStatusDef,
  getAllStatusDefs,
  computeStatMultipliers,
  processTickEffects,
  applyStatus,
  clearExpired,
  preBattleProcess,
  tryApplyMonsterDebuff,
  clearDebuffsOnBattleEnd
};
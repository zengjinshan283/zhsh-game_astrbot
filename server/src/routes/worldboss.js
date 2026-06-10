/**
 * 世界 BOSS（每日全服挑战）
 * 复用帮派 BOSS 模式，但无 guild_id 限制，全服共用 1 只
 * 高血量 + 全服排行榜 + 更丰厚奖励
 */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const WB_CONFIG = {
  hp_max: 5000000,           // 500 万血
  level: 20,                 // 等级 20
  daily_attack_limit: 8,     // 每人每天 8 次
  damage_base: 800,          // 基础伤害
  damage_per_power: 10,
  damage_jitter: 0.4,
  boss_name: '远古海皇',
  reward_last_hit: { money: 200000, silver: 100, label: '终结者' },
  reward_top3:    { money: 80000,  silver: 40,  label: '伤害TOP3' },
  reward_top10:   { money: 30000,  silver: 15,  label: '伤害TOP10' },
  reward_top50:   { money: 10000,  silver: 5,   label: '伤害TOP50' },
  reward_participate: { money: 3000, silver: 1, label: '参与奖' }
};

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// 模块加载时自动建表
(async () => {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS world_boss (
      id INT AUTO_INCREMENT PRIMARY KEY,
      boss_name VARCHAR(64) NOT NULL DEFAULT '远古海皇',
      boss_hp INT NOT NULL DEFAULT 5000000,
      boss_hp_max INT NOT NULL DEFAULT 5000000,
      boss_level INT NOT NULL DEFAULT 20,
      reset_date VARCHAR(16) NOT NULL,
      defeated_by INT NOT NULL DEFAULT 0,
      defeated_at INT NOT NULL DEFAULT 0,
      created_at INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
    await db.query(`CREATE TABLE IF NOT EXISTS world_boss_damage (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      damage INT NOT NULL DEFAULT 0,
      attack_count INT NOT NULL DEFAULT 0,
      reset_date VARCHAR(16) NOT NULL,
      reward_claimed TINYINT NOT NULL DEFAULT 0,
      updated_at INT NOT NULL DEFAULT 0,
      UNIQUE KEY uk_user_date (user_id, reset_date),
      INDEX idx_damage (reset_date, damage)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
  } catch(e) { console.error('[worldboss] init tables error:', e.message); }
})();

async function getOrCreateWorldBoss() {
  const today = getTodayStr();
  let boss = await db.getOne('SELECT * FROM `world_boss` ORDER BY id DESC LIMIT 1');
  if (!boss) {
    await db.insert('world_boss', {
      boss_name: WB_CONFIG.boss_name, boss_hp: WB_CONFIG.hp_max, boss_hp_max: WB_CONFIG.hp_max,
      boss_level: WB_CONFIG.level, reset_date: today, defeated_by: 0, defeated_at: 0,
      created_at: Math.floor(Date.now()/1000)
    });
    boss = await db.getOne('SELECT * FROM `world_boss` ORDER BY id DESC LIMIT 1');
  }
  if (boss.reset_date !== today) {
    await db.update('world_boss',
      { boss_hp: WB_CONFIG.hp_max, boss_hp_max: WB_CONFIG.hp_max, boss_level: WB_CONFIG.level,
        reset_date: today, defeated_by: 0, defeated_at: 0 },
      'id=?', [boss.id]);
    boss.boss_hp = WB_CONFIG.hp_max; boss.defeated_by = 0; boss.defeated_at = 0;
  }
  return boss;
}

// 状态 + 我的 + 全服 TOP50
router.get('/status', authMiddleware, async (req, res, next) => {
  try {
    const today = getTodayStr();
    const boss = await getOrCreateWorldBoss();
    const my = await db.getOne('SELECT * FROM `world_boss_damage` WHERE user_id=? AND reset_date=?', [req.user.id, today]);
    const rank = await db.getAll(
      `SELECT wbd.user_id, wbd.damage, wbd.attack_count, u.username, u.level
       FROM world_boss_damage wbd JOIN user u ON wbd.user_id=u.id
       WHERE wbd.reset_date=? ORDER BY wbd.damage DESC LIMIT 50`,
      [today]
    );
    // 总参与人数
    const total = await db.getVar('SELECT COUNT(*) FROM `world_boss_damage` WHERE reset_date=?', [today]);
    res.json({
      boss: {
        name: boss.boss_name, hp: boss.boss_hp, hp_max: boss.boss_hp_max, level: boss.boss_level,
        hp_pct: Math.round(boss.boss_hp / boss.boss_hp_max * 100),
        defeated: boss.defeated_by > 0, defeated_by: boss.defeated_by
      },
      my: my ? {
        damage: my.damage, attack_count: my.attack_count,
        remaining: WB_CONFIG.daily_attack_limit - my.attack_count,
        reward_claimed: my.reward_claimed
      } : { damage: 0, attack_count: 0, remaining: WB_CONFIG.daily_attack_limit, reward_claimed: 0 },
      rank, total_participants: total,
      config: { attack_limit: WB_CONFIG.daily_attack_limit }
    });
  } catch(e) { next(e); }
});

// 攻击
router.post('/attack', authMiddleware, async (req, res, next) => {
  try {
    const today = getTodayStr();
    const boss = await getOrCreateWorldBoss();
    if (boss.boss_hp <= 0) return res.status(400).json({ error: '世界 BOSS 已被击败，明日再来！' });

    let dmg = await db.getOne('SELECT * FROM `world_boss_damage` WHERE user_id=? AND reset_date=?', [req.user.id, today]);
    const used = dmg ? dmg.attack_count : 0;
    if (used >= WB_CONFIG.daily_attack_limit) return res.status(400).json({ error: `今日攻击次数已用完（${WB_CONFIG.daily_attack_limit}/${WB_CONFIG.daily_attack_limit}）` });

    const user = await db.getOne('SELECT level, money, silver FROM `user` WHERE `id`=?', [req.user.id]);
    const power = user.level * 100;
    const base = WB_CONFIG.damage_base + power * WB_CONFIG.damage_per_power;
    const jitter = 1 + (Math.random() * 2 - 1) * WB_CONFIG.damage_jitter;
    let damage = Math.max(100, Math.floor(base * jitter));
    let crit = false;
    if (Math.random() < 0.20) { damage = Math.floor(damage * 2.0); crit = true; }
    damage = Math.min(damage, boss.boss_hp);

    const now = Math.floor(Date.now()/1000);
    if (dmg) {
      await db.query('UPDATE `world_boss_damage` SET damage=damage+?, attack_count=attack_count+1, updated_at=? WHERE id=?',
        [damage, now, dmg.id]);
    } else {
      await db.insert('world_boss_damage',
        { user_id: req.user.id, damage, attack_count: 1, reset_date: today, updated_at: now });
    }

    const newHp = boss.boss_hp - damage;
    const defeatedNow = newHp <= 0;
    await db.update('world_boss', { boss_hp: Math.max(0, newHp), defeated_by: defeatedNow ? req.user.id : boss.defeated_by, defeated_at: defeatedNow ? now : boss.defeated_at },
      'id=?', [boss.id]);

    // 终结世界 BOSS：发系统广播（type=2）
    if (defeatedNow) {
      try {
        const userRow = await db.getOne('SELECT username, level FROM `user` WHERE `id`=?', [req.user.id]);
        await db.insert('chat', {
          user_id: 0, target_id: 0,
          message: `🌊【系统】${userRow?.username || '勇者'} 一击斩杀了远古海皇，拯救了整片海域！`,
          type: 2, created_at: now
        });
      } catch(e) {}
    }

    res.json({
      success: true, damage, crit, totalDamage: (dmg?.damage || 0) + damage,
      boss_hp: Math.max(0, newHp), boss_hp_max: boss.boss_hp_max,
      defeated: defeatedNow, defeated_by: defeatedNow ? req.user.id : boss.defeated_by,
      remaining: WB_CONFIG.daily_attack_limit - (used + 1)
    });
  } catch(e) { next(e); }
});

// 领奖
router.post('/claim', authMiddleware, async (req, res, next) => {
  try {
    const today = getTodayStr();
    const my = await db.getOne('SELECT * FROM `world_boss_damage` WHERE user_id=? AND reset_date=?', [req.user.id, today]);
    if (!my) return res.status(400).json({ error: '今日未参与世界 BOSS' });
    if (my.reward_claimed) return res.status(400).json({ error: '今日奖励已领取' });
    if (my.damage <= 0) return res.status(400).json({ error: '无伤害' });

    const boss = await db.getOne('SELECT * FROM `world_boss` ORDER BY id DESC LIMIT 1');

    // 排名查询（用于确定奖励档次）
    const better = await db.getVar(
      'SELECT COUNT(*) FROM `world_boss_damage` WHERE reset_date=? AND damage > ?',
      [today, my.damage]
    );
    const myRank = better + 1;

    let reward;
    if (boss && boss.defeated_by === req.user.id) reward = WB_CONFIG.reward_last_hit;
    else if (myRank <= 3) reward = WB_CONFIG.reward_top3;
    else if (myRank <= 10) reward = WB_CONFIG.reward_top10;
    else if (myRank <= 50) reward = WB_CONFIG.reward_top50;
    else reward = WB_CONFIG.reward_participate;

    await db.query('UPDATE `user` SET money = money + ?, silver = silver + ? WHERE `id`=?',
      [reward.money, reward.silver, req.user.id]);
    await db.update('world_boss_damage', { reward_claimed: 1 }, 'id=?', [my.id]);

    res.json({
      success: true, msg: `🎁 领取成功！${reward.label}：${reward.money}铜币 + ${reward.silver}银币`,
      reward, myRank
    });
  } catch(e) { next(e); }
});

module.exports = router;

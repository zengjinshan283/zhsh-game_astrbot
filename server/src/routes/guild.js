const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.get('/my', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const my = await db.getOne("SELECT gm.*, g.name AS guild_name, g.level AS guild_level, g.exp AS guild_exp, g.exp_max AS guild_exp_max, g.notice, g.member_max FROM `guild_member` gm JOIN `guild` g ON gm.guild_id = g.id WHERE gm.user_id = ?", [uid]);
    let members = [], guildList = null;
    if (my) {
      members = await db.getAll("SELECT gm.*, u.username, u.sex, u.level, u.lastdate FROM `guild_member` gm JOIN `user` u ON gm.user_id = u.id WHERE gm.guild_id = ? ORDER BY gm.role DESC, u.level DESC", [my.guild_id]);
    }
    guildList = await db.getAll("SELECT g.*, (SELECT COUNT(*) FROM `guild_member` gm WHERE gm.guild_id = g.id) AS member_count FROM `guild` g ORDER BY g.level DESC, g.id ASC");
    res.json({ myGuild: my, members, guildList });
  } catch(e){next(e);}
});

router.post('/create', authMiddleware, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || name.length < 2 || name.length > 12) return res.status(400).json({ error: '帮会名2-12字符' });
    const user = await db.getOne('SELECT level, money FROM `user` WHERE `id` = ?', [req.user.id]);
    if (user.level < 5) return res.status(400).json({ error: '需要等级≥5' });
    if (user.money < 5000) return res.status(400).json({ error: '铜币不足！需5000' });
    const exists = await db.getVar("SELECT COUNT(*) FROM `guild` WHERE `name` = ?", [name]);
    if (exists > 0) return res.status(400).json({ error: '名称已被使用' });
    await db.query('UPDATE `user` SET money = money - 5000 WHERE `id` = ?', [req.user.id]);
    const guildId = await db.insert('guild', { name, leader_id: req.user.id, notice: '欢迎加入！', created_at: Math.floor(Date.now()/1000) });
    await db.insert('guild_member', { guild_id: guildId, user_id: req.user.id, role: 3, joined_at: Math.floor(Date.now()/1000), contribution: 0 });
    res.json({ success: true, msg: `🎉 帮会「${name}」创建成功！` });
  } catch(e){next(e);}
});

router.post('/join', authMiddleware, async (req, res, next) => {
  try {
    const { name } = req.body;
    const guild = await db.getOne("SELECT * FROM `guild` WHERE `name` = ?", [name]);
    if (!guild) return res.status(400).json({ error: '帮会不存在' });
    const memberCount = await db.getVar("SELECT COUNT(*) FROM `guild_member` WHERE `guild_id` = ?", [guild.id]);
    if (memberCount >= guild.member_max) return res.status(400).json({ error: '人数已满' });
    await db.insert('guild_member', { guild_id: guild.id, user_id: req.user.id, role: 0, joined_at: Math.floor(Date.now()/1000), contribution: 0 });
    res.json({ success: true, msg: `🎉 成功加入「${guild.name}」` });
  } catch(e){next(e);}
});

router.post('/leave', authMiddleware, async (req, res, next) => {
  try {
    const my = await db.getOne("SELECT * FROM `guild_member` WHERE `user_id` = ?", [req.user.id]);
    if (!my) return res.status(400).json({ error: '未加入帮会' });
    if (my.role === 3) return res.status(400).json({ error: '会长请使用解散功能' });
    await db.delete('guild_member', 'user_id = ?', [req.user.id]);
    res.json({ success: true, msg: '已退出' });
  } catch(e){next(e);}
});

router.post('/disband', authMiddleware, async (req, res, next) => {
  try {
    const my = await db.getOne("SELECT * FROM `guild_member` WHERE `user_id` = ?", [req.user.id]);
    if (!my || my.role !== 3) return res.status(400).json({ error: '只有会长可以解散' });
    await db.delete('guild_member', 'guild_id = ?', [my.guild_id]);
    await db.delete('guild', 'id = ?', [my.guild_id]);
    res.json({ success: true, msg: '帮会已解散' });
  } catch(e){next(e);}
});

router.post('/notice', authMiddleware, async (req, res, next) => {
  try {
    const { notice } = req.body;
    const my = await db.getOne("SELECT guild_id, role FROM `guild_member` WHERE `user_id` = ?", [req.user.id]);
    if (!my || my.role < 2) return res.status(400).json({ error: '权限不足' });
    await db.update('guild', { notice: (notice||'').substring(0,200) }, 'id = ?', [my.guild_id]);
    res.json({ success: true, msg: '公告已更新' });
  } catch(e){next(e);}
});

router.post('/kick', authMiddleware, async (req, res, next) => {
  try {
    const { user_id } = req.body;
    const my = await db.getOne("SELECT guild_id, role FROM `guild_member` WHERE `user_id` = ?", [req.user.id]);
    if (!my || my.role !== 3) return res.status(400).json({ error: '只有会长可以踢人' });
    if (parseInt(user_id) === req.user.id) return res.status(400).json({ error: '不能踢自己' });
    await db.delete('guild_member', 'guild_id = ? AND user_id = ?', [my.guild_id, user_id]);
    res.json({ success: true });
  } catch(e){next(e);}
});

// ============================================================
// 帮会战系统
// ============================================================

// 获取领地列表
router.get('/territory', authMiddleware, async (req, res, next) => {
  try {
    const territories = await db.getAll('SELECT * FROM `guild_territory` ORDER BY level_req');
    res.json({ territories });
  } catch(e) { next(e); }
});

// 宣战
router.post('/declare-war', authMiddleware, async (req, res, next) => {
  try {
    const { target_guild_id } = req.body;
    const my = await db.getOne('SELECT guild_id, role FROM `guild_member` WHERE `user_id`=?', [req.user.id]);
    if (!my || my.role !== 3) return res.status(400).json({ error: '只有会长可以宣战' });

    const guild = await db.getOne('SELECT * FROM `guild` WHERE `id`=?', [my.guild_id]);
    if (!guild) return res.status(400).json({ error: '未加入帮会' });
    if (target_guild_id == my.guild_id) return res.status(400).json({ error: '不能对自己宣战' });

    const targetGuild = await db.getOne('SELECT * FROM `guild` WHERE `id`=?', [target_guild_id]);
    if (!targetGuild) return res.status(400).json({ error: '目标帮会不存在' });

    // 检查成员数
    const memberCount = await db.getVar('SELECT COUNT(*) FROM `guild_member` WHERE `guild_id`=?', [my.guild_id]);
    const minMembers = parseInt(await db.getVar("SELECT config_value FROM `game_config` WHERE config_key='guild_war_min_member'")) || 5;
    if (memberCount < minMembers) return res.status(400).json({ error: `需要至少${minMembers}名成员才能宣战` });

    // 检查是否有进行中的战争
    const existingWar = await db.getOne(
      "SELECT id FROM `guild_war` WHERE (attacker_id=? OR defender_id=?) AND status IN (0,1)",
      [my.guild_id, my.guild_id]);
    if (existingWar) return res.status(400).json({ error: '帮会已有进行中的战争' });

    // 检查冷却（上次战争结束后需等24小时）
    const lastWar = await db.getOne("SELECT ended_at FROM `guild_war` WHERE (attacker_id=? OR defender_id=?) AND status=2 ORDER BY ended_at DESC LIMIT 1", [my.guild_id, my.guild_id]);
    if (lastWar && lastWar.ended_at > 0 && Date.now()/1000 - lastWar.ended_at < 86400) return res.status(400).json({ error: '宣战冷却中，请24小时后再试' });

    // 宣战费用
    const cost = parseInt(await db.getVar("SELECT config_value FROM `game_config` WHERE config_key='guild_war_declare_cost'")) || 1000;
    const user = await db.getOne('SELECT money FROM `user` WHERE `id`=?', [req.user.id]);
    if (user.money < cost) return res.status(400).json({ error: `宣战需要${cost}铜币，你只有${user.money}铜币` });
    await db.query('UPDATE `user` SET money=money-? WHERE `id`=?', [cost, req.user.id]);

    // 创建宣战记录，status=0 表示宣战中
    const warId = await db.insert('guild_war', {
      attacker_id: my.guild_id,
      defender_id: target_guild_id,
      war_time: Math.floor(Date.now()/1000) + 3600, // 1小时后开始
      duration: 7200,
      status: 0,
      created_at: Math.floor(Date.now()/1000)
    });

    res.json({ success: true, msg: `⚔️ 宣战成功！战争将于1小时后开始，持续2小时。` });
  } catch(e) { next(e); }
});

// 获取帮会战列表
router.get('/war-list', authMiddleware, async (req, res, next) => {
  try {
    const my = await db.getOne('SELECT guild_id FROM `guild_member` WHERE `user_id`=?', [req.user.id]);
    if (!my) return res.status(400).json({ error: '未加入帮会' });

    const wars = await db.getAll(
      "SELECT w.*, a.name as attacker_name, d.name as defender_name FROM `guild_war` w JOIN `guild` a ON w.attacker_id=a.id JOIN `guild` d ON w.defender_id=d.id WHERE w.attacker_id=? OR w.defender_id=? ORDER BY w.created_at DESC LIMIT 20",
      [my.guild_id, my.guild_id]);

    const result = wars.map(w => ({
      id: w.id,
      attacker: { id: w.attacker_id, name: w.attacker_name },
      defender: { id: w.defender_id, name: w.defender_name },
      warTime: w.war_time,
      duration: w.duration,
      status: w.status,
      winnerId: w.winner_id,
      mySide: w.attacker_id === my.guild_id ? 'attacker' : 'defender'
    }));

    res.json({ wars: result });
  } catch(e) { next(e); }
});

// 帮会战状态（用于开战后的战斗界面）
router.get('/war-status/:warId', authMiddleware, async (req, res, next) => {
  try {
    const { warId } = req.params;
    const war = await db.getOne("SELECT w.*, a.name as attacker_name, d.name as defender_name FROM `guild_war` w JOIN `guild` a ON w.attacker_id=a.id JOIN `guild` d ON w.defender_id=d.id WHERE w.id=?", [warId]);
    if (!war) return res.status(404).json({ error: '战争不存在' });

    const participants = await db.getAll(
      "SELECT gwm.*, u.username, u.level FROM `guild_war_member` gwm JOIN `user` u ON gwm.user_id=u.id WHERE gwm.war_id=?",
      [warId]);

    res.json({ war, participants });
  } catch(e) { next(e); }
});

// 参加帮会战（成员点击参战）
router.post('/join-war/:warId', authMiddleware, async (req, res, next) => {
  try {
    const { warId } = req.params;
    const my = await db.getOne('SELECT guild_id FROM `guild_member` WHERE `user_id`=?', [req.user.id]);
    if (!my) return res.status(400).json({ error: '未加入帮会' });

    const war = await db.getOne('SELECT * FROM `guild_war` WHERE `id`=?', [warId]);
    if (!war) return res.status(404).json({ error: '战争不存在' });
    if (war.attacker_id !== my.guild_id && war.defender_id !== my.guild_id) return res.status(400).json({ error: '这不是你的帮会的战争' });
    if (war.status !== 1) return res.status(400).json({ error: '战争未进行中' });

    const now = Math.floor(Date.now()/1000);
    if (now < war.war_time || now > war.war_time + war.duration) return res.status(400).json({ error: '战争已结束或未开始' });

    const existing = await db.getOne('SELECT id FROM `guild_war_member` WHERE war_id=? AND user_id=?', [warId, req.user.id]);
    if (!existing) {
      await db.insert('guild_war_member', { war_id: warId, user_id: req.user.id, guild_id: my.guild_id, joined_at: now });
    }

    res.json({ success: true, msg: '你已加入帮会战！' });
  } catch(e) { next(e); }
});

// 领地奖励领取（每周一次）
router.post('/claim-territory', authMiddleware, async (req, res, next) => {
  try {
    const { territory_key } = req.body;
    const my = await db.getOne('SELECT guild_id FROM `guild_member` WHERE `user_id`=?', [req.user.id]);
    if (!my) return res.status(400).json({ error: '未加入帮会' });

    const territory = await db.getOne('SELECT * FROM `guild_territory` WHERE territory_key=?', [territory_key]);
    if (!territory) return res.status(400).json({ error: '领地不存在' });
    if (territory.guild_id !== my.guild_id) return res.status(400).json({ error: '该领地不属于你的帮会' });

    // 检查本周是否已领取（按周判断）
    const weekStart = Math.floor(Date.now()/1000) - (new Date().getDay() || 7) * 86400;
    const weekStartStr = new Date(weekStart * 1000).toISOString().slice(0,10);
    const existing = await db.getOne("SELECT id FROM `guild_territory_claim` WHERE territory_key=? AND guild_id=? AND claim_date>=?", [territory_key, my.guild_id, weekStartStr]);
    if (existing) return res.status(400).json({ error: '本周已领取过该领地奖励' });

    // 发放奖励
    await db.query('UPDATE `guild` SET money=IFNULL(money,0)+? WHERE `id`=?', [territory.weekly_gold, my.guild_id]);
    await db.query('UPDATE `user` SET silver=silver+? WHERE `id`=?', [territory.weekly_silver, req.user.id]);
    await db.insert('guild_territory_claim', { territory_key, guild_id: my.guild_id, user_id: req.user.id, claim_date: weekStartStr, created_at: Math.floor(Date.now()/1000) });

    res.json({ success: true, msg: `领取成功！帮会获得${territory.weekly_gold}铜币，你获得${territory.weekly_silver}银币` });
  } catch(e) { next(e); }
});

module.exports = router;

// 领地占领记录表初始化（模块加载时自动创建）
(async () => {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS guild_territory_claim (
      id INT AUTO_INCREMENT PRIMARY KEY,
      territory_key VARCHAR(32) NOT NULL,
      guild_id INT NOT NULL,
      user_id INT NOT NULL,
      claim_date DATE NOT NULL,
      created_at INT NOT NULL,
      UNIQUE KEY uk_claim (territory_key, guild_id, claim_date)
    )`);
  } catch(e) { console.error('[guild] init table error:', e.message); }
})();

// ============================================================
// 帮派 BOSS 系统（每日重置，全员协作击败拿奖励）
// ============================================================

const BOSS_CONFIG = {
  hp_max: 1000000,           // BOSS 总血量
  level: 10,                 // BOSS 等级（影响奖励）
  daily_attack_limit: 5,     // 每人每天攻击次数
  damage_base: 500,          // 基础伤害（战力 100 时）
  damage_per_power: 8,       // 每点战力系数
  damage_jitter: 0.3,        // 伤害浮动 ±30%
  // 3 档奖励
  reward_last_hit: { money: 50000, silver: 20, label: '终结者' },
  reward_top3:    { money: 20000, silver: 10, label: '伤害TOP3' },
  reward_top10:   { money: 8000,  silver: 5,  label: '伤害TOP10' },
  reward_participate: { money: 2000, silver: 1, label: '参与奖' }
};

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

async function getOrCreateBoss(guildId) {
  const today = getTodayStr();
  let boss = await db.getOne('SELECT * FROM `guild_boss` WHERE `guild_id`=?', [guildId]);
  if (!boss) {
    await db.insert('guild_boss', {
      guild_id: guildId, boss_hp: BOSS_CONFIG.hp_max, boss_hp_max: BOSS_CONFIG.hp_max,
      boss_level: BOSS_CONFIG.level, last_reset_date: today, defeated_by: 0, defeated_at: 0,
      created_at: Math.floor(Date.now()/1000)
    });
    boss = await db.getOne('SELECT * FROM `guild_boss` WHERE `guild_id`=?', [guildId]);
  }
  // 跨天重置
  if (boss.last_reset_date !== today) {
    await db.update('guild_boss',
      { boss_hp: BOSS_CONFIG.hp_max, boss_hp_max: BOSS_CONFIG.hp_max, boss_level: BOSS_CONFIG.level,
        last_reset_date: today, defeated_by: 0, defeated_at: 0 },
      'id=?', [boss.id]);
    boss.boss_hp = BOSS_CONFIG.hp_max; boss.defeated_by = 0; boss.defeated_at = 0;
  }
  return boss;
}

// 获取 BOSS 状态 + 我的今日伤害 + 排行
router.get('/boss/status', authMiddleware, async (req, res, next) => {
  try {
    const my = await db.getOne('SELECT guild_id FROM `guild_member` WHERE `user_id`=?', [req.user.id]);
    if (!my) return res.status(400).json({ error: '未加入帮会' });
    const today = getTodayStr();
    const boss = await getOrCreateBoss(my.guild_id);
    const myDamage = await db.getOne(
      'SELECT * FROM `guild_boss_damage` WHERE guild_id=? AND user_id=? AND reset_date=?',
      [my.guild_id, req.user.id, today]
    );
    const rank = await db.getAll(
      `SELECT gbd.user_id, gbd.damage, gbd.attack_count, u.username, u.level
       FROM guild_boss_damage gbd JOIN user u ON gbd.user_id=u.id
       WHERE gbd.guild_id=? AND gbd.reset_date=? ORDER BY gbd.damage DESC LIMIT 10`,
      [my.guild_id, today]
    );
    res.json({
      boss: {
        hp: boss.boss_hp, hp_max: boss.boss_hp_max, level: boss.boss_level,
        hp_pct: Math.round(boss.boss_hp / boss.boss_hp_max * 100),
        defeated: boss.defeated_by > 0,
        defeated_by: boss.defeated_by
      },
      my: myDamage ? {
        damage: myDamage.damage, attack_count: myDamage.attack_count,
        remaining: BOSS_CONFIG.daily_attack_limit - myDamage.attack_count,
        reward_claimed: myDamage.reward_claimed
      } : { damage: 0, attack_count: 0, remaining: BOSS_CONFIG.daily_attack_limit, reward_claimed: 0 },
      rank,
      config: { attack_limit: BOSS_CONFIG.daily_attack_limit }
    });
  } catch(e) { next(e); }
});

// 攻击 BOSS
router.post('/boss/attack', authMiddleware, async (req, res, next) => {
  try {
    const my = await db.getOne('SELECT guild_id FROM `guild_member` WHERE `user_id`=?', [req.user.id]);
    if (!my) return res.status(400).json({ error: '未加入帮会' });
    const boss = await getOrCreateBoss(my.guild_id);
    if (boss.boss_hp <= 0) return res.status(400).json({ error: 'BOSS 已被击败，明日再来！' });

    const today = getTodayStr();
    let dmg = await db.getOne(
      'SELECT * FROM `guild_boss_damage` WHERE guild_id=? AND user_id=? AND reset_date=?',
      [my.guild_id, req.user.id, today]
    );
    const used = dmg ? dmg.attack_count : 0;
    if (used >= BOSS_CONFIG.daily_attack_limit) return res.status(400).json({ error: `今日攻击次数已用完（${BOSS_CONFIG.daily_attack_limit}/${BOSS_CONFIG.daily_attack_limit}）` });

    // 计算伤害：基于玩家战力
    const user = await db.getOne('SELECT level, money, silver FROM `user` WHERE `id`=?', [req.user.id]);
    const power = user.level * 100;
    const base = BOSS_CONFIG.damage_base + power * BOSS_CONFIG.damage_per_power;
    const jitter = 1 + (Math.random() * 2 - 1) * BOSS_CONFIG.damage_jitter;
    let damage = Math.max(50, Math.floor(base * jitter));
    // 暴击 15% 概率 x1.8
    let crit = false;
    if (Math.random() < 0.15) { damage = Math.floor(damage * 1.8); crit = true; }
    // 不超过 BOSS 剩余 HP
    damage = Math.min(damage, boss.boss_hp);

    // 写入/累加
    const now = Math.floor(Date.now()/1000);
    if (dmg) {
      await db.query('UPDATE `guild_boss_damage` SET damage=damage+?, attack_count=attack_count+1, updated_at=? WHERE id=?',
        [damage, now, dmg.id]);
    } else {
      await db.insert('guild_boss_damage',
        { guild_id: my.guild_id, user_id: req.user.id, damage, attack_count: 1, reset_date: today, updated_at: now });
    }

    // 扣 BOSS HP
    const newHp = boss.boss_hp - damage;
    const defeatedNow = newHp <= 0;
    await db.update('guild_boss', { boss_hp: Math.max(0, newHp), defeated_by: defeatedNow ? req.user.id : boss.defeated_by, defeated_at: defeatedNow ? now : boss.defeated_at },
      'id=?', [boss.id]);

    // 终结 BOSS：发世界广播
    if (defeatedNow) {
      try {
        const userRow = await db.getOne('SELECT username, level FROM `user` WHERE `id`=?', [req.user.id]);
        const guildRow = await db.getOne('SELECT name FROM `guild` WHERE `id`=?', [my.guild_id]);
        const lastShare = await db.getOne('SELECT created_at FROM `chat` WHERE user_id=? AND type=3 ORDER BY id DESC LIMIT 1', [req.user.id]);
        if (!lastShare || now - lastShare.created_at >= 60) {
          await db.insert('chat', {
            user_id: req.user.id, target_id: 0,
            message: `🐲【${userRow?.username || '勇者'}】与帮会「${guildRow?.name || '?'}」联手击杀了深海龙龟！`,
            type: 3, created_at: now
          });
        }
      } catch(e) { console.error('[guild] boss share error:', e.message); }
    }

    res.json({
      success: true, damage, crit, totalDamage: (dmg?.damage || 0) + damage,
      boss_hp: Math.max(0, newHp), boss_hp_max: boss.boss_hp_max,
      defeated: defeatedNow, defeated_by: defeatedNow ? req.user.id : boss.defeated_by,
      remaining: BOSS_CONFIG.daily_attack_limit - (used + 1)
    });
  } catch(e) { next(e); }
});

// 领奖：参与奖 + TOP10/3/终结者（按排名一次领完）
router.post('/boss/claim', authMiddleware, async (req, res, next) => {
  try {
    const my = await db.getOne('SELECT guild_id FROM `guild_member` WHERE `user_id`=?', [req.user.id]);
    if (!my) return res.status(400).json({ error: '未加入帮会' });
    const today = getTodayStr();
    const dmg = await db.getOne(
      'SELECT * FROM `guild_boss_damage` WHERE guild_id=? AND user_id=? AND reset_date=?',
      [my.guild_id, req.user.id, today]
    );
    if (!dmg || dmg.damage <= 0) return res.status(400).json({ error: '今日未参与 BOSS 战' });
    if (dmg.reward_claimed) return res.status(400).json({ error: '今日奖励已领取' });

    // 查 TOP10 排名
    const rankRow = await db.getOne(
      `SELECT COUNT(*) AS rk FROM guild_boss_damage
       WHERE guild_id=? AND reset_date=? AND damage > ?`,
      [my.guild_id, today, dmg.damage]
    );
    const myRank = rankRow.rk + 1; // 我排第几（1=第一）

    const boss = await db.getOne('SELECT * FROM `guild_boss` WHERE `guild_id`=?', [my.guild_id]);
    let totalMoney = 0, totalSilver = 0, label = '参与奖';
    if (boss.defeated_by === req.user.id) {
      totalMoney += BOSS_CONFIG.reward_last_hit.money; totalSilver += BOSS_CONFIG.reward_last_hit.silver; label = '终结者';
    } else if (myRank <= 3) {
      totalMoney += BOSS_CONFIG.reward_top3.money; totalSilver += BOSS_CONFIG.reward_top3.silver; label = '伤害TOP3';
    } else if (myRank <= 10) {
      totalMoney += BOSS_CONFIG.reward_top10.money; totalSilver += BOSS_CONFIG.reward_top10.silver; label = '伤害TOP10';
    }
    totalMoney += BOSS_CONFIG.reward_participate.money; totalSilver += BOSS_CONFIG.reward_participate.silver;

    await db.query('UPDATE `user` SET money=money+?, silver=silver+? WHERE `id`=?', [totalMoney, totalSilver, req.user.id]);
    await db.query('UPDATE `guild_boss_damage` SET reward_claimed=1 WHERE id=?', [dmg.id]);
    // 同步发邮件留底
    try {
      const { sendMail } = require('./mail');
      await sendMail({
        to_user_id: req.user.id,
        from_name: '帮派 BOSS',
        title: `🐲 帮派 BOSS 战报 - ${label}`,
        content: `你在帮派 BOSS 战中获得 ${label} 奖励。\n\n伤害: ${myDamage.damage.toLocaleString()}\n奖励: +${totalMoney} 铜币 +${totalSilver} 银币`,
        rewards: [
          { type: 'money', amount: totalMoney },
          { type: 'silver', amount: totalSilver }
        ]
      });
    } catch(e) {}
    res.json({ success: true, msg: `🎁 ${label}奖励已领取：+${totalMoney}铜币 +${totalSilver}银币`, label, money: totalMoney, silver: totalSilver });
  } catch(e) { next(e); }
});

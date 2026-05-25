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

// 领地占领记录表（用于领地奖励领取记录）
await db.query(`CREATE TABLE IF NOT EXISTS guild_territory_claim (
  id INT AUTO_INCREMENT PRIMARY KEY,
  territory_key VARCHAR(32) NOT NULL,
  guild_id INT NOT NULL,
  user_id INT NOT NULL,
  claim_date DATE NOT NULL,
  created_at INT NOT NULL,
  UNIQUE KEY uk_claim (territory_key, guild_id, claim_date)
)`);

module.exports = router;

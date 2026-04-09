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

module.exports = router;

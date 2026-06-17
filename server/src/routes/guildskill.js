/**
 * 帮会技能 / 帮会BUFF系统
 * GET  /api/guildskill/list    - 帮会技能列表（全员生效）
 * POST /api/guildskill/upgrade - 升级技能（消耗帮会exp）
 * GET  /api/guildskill/bonus   - 当前用户享有的帮会BUFF（战斗注入用）
 * POST /api/guildskill/contribute - 帮会捐献（独立通道，与 /guild/donate 区别是这里直接走技能 exp）
 *
 * 帮会技能体系（4种）：
 * - war_cry:  战吼  攻击+5/级  (10级满)
 * - iron_wall:铁壁  防御+5/级  (10级满)
 * - vitality: 活力  生命+30/级 (10级满)
 * - swift:    疾风  速度+1/级  (10级满)
 *
 * 升级消耗：帮会exp 100/200/400/... 2倍递增
 */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

const SKILLS = {
  war_cry:    { name: '战吼', icon: '⚔️', desc: '全员攻击 +5/级', perLvl: { atk: 5 }, max: 10, baseExp: 100 },
  iron_wall:  { name: '铁壁', icon: '🛡️', desc: '全员防御 +5/级', perLvl: { def: 5 }, max: 10, baseExp: 100 },
  vitality:   { name: '活力', icon: '❤️', desc: '全员生命 +30/级', perLvl: { hp: 30 }, max: 10, baseExp: 100 },
  swift:      { name: '疾风', icon: '💨', desc: '全员速度 +1/级', perLvl: { speed: 1 }, max: 10, baseExp: 100 },
};

function expForLevel(lv) {
  return SKILLS.war_cry.baseExp * Math.pow(2, lv - 1);
}

// GET /api/guildskill/list
router.get('/list', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const my = await db.getOne('SELECT guild_id FROM guild_member WHERE user_id=?', [uid]);
    if (!my || !my.guild_id) return res.json({ inGuild: false, skills: [], guildLevel: 0, guildExp: 0 });

    const guild = await db.getOne('SELECT level, exp FROM `guild` WHERE id=?', [my.guild_id]);
    const rows = await db.query('SELECT * FROM guild_skill WHERE guild_id=?', [my.guild_id]);
    const map = {};
    for (const r of rows) map[r.skill_key] = r;
    const skills = Object.keys(SKILLS).map(k => {
      const cfg = SKILLS[k];
      const lv = map[k] ? map[k].level : 0;
      return {
        key: k,
        name: cfg.name,
        icon: cfg.icon,
        desc: cfg.desc,
        level: lv,
        maxLevel: cfg.max,
        exp: map[k] ? map[k].exp : 0,
        expToNext: lv < cfg.max ? expForLevel(lv + 1) : 0,
        bonus: lv > 0 ? { atk: (cfg.perLvl.atk || 0) * lv, def: (cfg.perLvl.def || 0) * lv, hp: (cfg.perLvl.hp || 0) * lv, speed: (cfg.perLvl.speed || 0) * lv } : { atk: 0, def: 0, hp: 0, speed: 0 },
      };
    });
    res.json({ inGuild: true, guildId: my.guild_id, guildLevel: guild.level, guildExp: guild.exp, skills });
  } catch (err) { next(err); }
});

// POST /api/guildskill/upgrade
router.post('/upgrade', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const { skill_key } = req.body;
    if (!SKILLS[skill_key]) return res.status(400).json({ error: '无效技能' });
    const my = await db.getOne('SELECT guild_id FROM guild_member WHERE user_id=?', [uid]);
    if (!my || !my.guild_id) return res.status(400).json({ error: '请先加入帮会' });

    // 检查权限（仅会长 role=3 可升级）
    const mem = await db.getOne('SELECT role FROM guild_member WHERE guild_id=? AND user_id=?', [my.guild_id, uid]);
    if (!mem || mem.role !== 3) return res.status(400).json({ error: '仅会长可升级' });

    const cfg = SKILLS[skill_key];
    const exist = await db.getOne('SELECT * FROM guild_skill WHERE guild_id=? AND skill_key=?', [my.guild_id, skill_key]);
    const curLv = exist ? exist.level : 0;
    if (curLv >= cfg.max) return res.status(400).json({ error: '已达最大等级' });

    const need = expForLevel(curLv + 1);
    const guild = await db.getOne('SELECT exp FROM `guild` WHERE id=?', [my.guild_id]);
    if (guild.exp < need) return res.status(400).json({ error: `帮会exp不足（需 ${need}，当前 ${guild.exp}）` });

    await db.query('UPDATE `guild` SET exp=exp-? WHERE id=?', [need, my.guild_id]);
    if (exist) {
      await db.query('UPDATE guild_skill SET level=level+1, updated_at=? WHERE id=?', [Math.floor(Date.now()/1000), exist.id]);
    } else {
      await db.query('INSERT INTO guild_skill (guild_id, skill_key, level, exp, updated_at) VALUES (?, ?, 1, 0, ?)',
        [my.guild_id, skill_key, Math.floor(Date.now()/1000)]);
    }
    res.json({ success: true, msg: `✨ ${cfg.name} 升级成功 → Lv.${curLv + 1}` });
  } catch (err) { next(err); }
});

// GET /api/guildskill/bonus - 当前用户享有的帮会BUFF
router.get('/bonus', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const my = await db.getOne('SELECT guild_id FROM guild_member WHERE user_id=?', [uid]);
    if (!my || !my.guild_id) return res.json({ atk: 0, def: 0, hp: 0, speed: 0 });
    const rows = await db.query('SELECT * FROM guild_skill WHERE guild_id=?', [my.guild_id]);
    let atk = 0, def = 0, hp = 0, speed = 0;
    for (const r of rows) {
      const cfg = SKILLS[r.skill_key];
      if (!cfg) continue;
      atk += (cfg.perLvl.atk || 0) * r.level;
      def += (cfg.perLvl.def || 0) * r.level;
      hp += (cfg.perLvl.hp || 0) * r.level;
      speed += (cfg.perLvl.speed || 0) * r.level;
    }
    res.json({ atk, def, hp, speed });
  } catch (err) { next(err); }
});

module.exports = router;
module.exports.SKILLS = SKILLS;
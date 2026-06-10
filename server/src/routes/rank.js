const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.get('/level', authMiddleware, async (req, res, next) => {
  try {
    const list = await db.getAll("SELECT id, username, sex, level, exp FROM `user` ORDER BY `level` DESC, `exp` DESC LIMIT 20");
    res.json({ list });
  } catch(e){next(e);}
});

// 藏宝图挖掘排行（按挖掘次数）
router.get('/treasure', authMiddleware, async (req, res, next) => {
  try {
    const list = await db.getAll(
      "SELECT id, username, sex, level, treasure_dig_count AS dig_count FROM `user` WHERE treasure_dig_count > 0 ORDER BY treasure_dig_count DESC, level DESC LIMIT 20"
    );
    res.json({ list });
  } catch(e){next(e);}
});

router.get('/wealth', authMiddleware, async (req, res, next) => {
  try {
    const list = await db.getAll("SELECT id, username, sex, money, bank_money FROM `user` ORDER BY (money + bank_money) DESC LIMIT 20");
    res.json({ list });
  } catch(e){next(e);}
});

router.get('/power', authMiddleware, async (req, res, next) => {
  try {
    // 战力 = (ATK+装备ATK+图鉴ATK)×3 + (DEF+装备DEF+图鉴DEF)×2 + AGI×1 + (HP+图鉴HP)÷10×2
    // 天赋 lifesteal/crit_damage/damage_reduce/counter/rage 等影响直接体现在属性表字段
    const list = await db.getAll(`
      SELECT u.id, u.username, u.sex, u.level,
             u.atk_max, u.def, u.agility, u.hp_max,
             COALESCE(SUM(CASE WHEN i.subtype IN('weapon','armor') THEN ROUND((i.atk+i.def_val)*(1+inv.enhance_level*0.03)) ELSE 0 END),0) AS equip_bonus,
             COALESCE(cx.bonus_atk,0) AS codex_atk,
             COALESCE(cx.bonus_def,0) AS codex_def,
             COALESCE(cx.bonus_hp,0) AS codex_hp,
             ( (u.atk_max + COALESCE(SUM(CASE WHEN i.subtype='weapon' THEN ROUND(i.atk*(1+inv.enhance_level*0.03)) ELSE 0 END),0) + COALESCE(cx.bonus_atk,0) ) * 3
           + ( (u.def    + COALESCE(SUM(CASE WHEN i.subtype='armor'  THEN ROUND(i.def_val*(1+inv.enhance_level*0.03)) ELSE 0 END),0) + COALESCE(cx.bonus_def,0) ) * 2
           + u.agility
           + FLOOR( (u.hp_max + COALESCE(cx.bonus_hp,0)) / 10 ) * 2
             AS power
      FROM \`user\` u
      LEFT JOIN \`inventory\` inv ON inv.user_id=u.id AND inv.equipped=1
      LEFT JOIN \`item\` i ON inv.item_id=i.id
      LEFT JOIN (
        SELECT uc.user_id,
               COALESCE(MAX(cr.bonus_atk),0) AS bonus_atk,
               COALESCE(MAX(cr.bonus_def),0) AS bonus_def,
               COALESCE(MAX(cr.bonus_hp),0) AS bonus_hp
        FROM user_codex uc
        JOIN codex_reward cr ON cr.require_count <= (SELECT COUNT(*) FROM user_codex uc2 WHERE uc2.user_id = uc.user_id)
        WHERE uc.user_id = u.id
        GROUP BY uc.user_id
      ) cx ON cx.user_id = u.id
      GROUP BY u.id
      ORDER BY power DESC
      LIMIT 20`);
    res.json({ list });
  } catch(e){next(e);}
});

router.get('/guild', authMiddleware, async (req, res, next) => {
  try {
    const list = await db.getAll("SELECT g.id, g.name, g.level, (SELECT COUNT(*) FROM `guild_member` gm WHERE gm.guild_id=g.id) AS member_count, (SELECT COALESCE(SUM(u.level),0) FROM `guild_member` gm JOIN `user` u ON gm.user_id=u.id WHERE gm.guild_id=g.id) AS total_level FROM `guild` g GROUP BY g.id HAVING member_count > 0 ORDER BY total_level DESC LIMIT 10");
    res.json({ list });
  } catch(e){next(e);}
});

module.exports = router;

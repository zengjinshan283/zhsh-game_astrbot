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

router.get('/wealth', authMiddleware, async (req, res, next) => {
  try {
    const list = await db.getAll("SELECT id, username, sex, money, bank_money FROM `user` ORDER BY (money + bank_money) DESC LIMIT 20");
    res.json({ list });
  } catch(e){next(e);}
});

router.get('/power', authMiddleware, async (req, res, next) => {
  try {
    // 战力 = ATK×3 + DEF×2 + AGI×1 + HP÷10×2（含装备加成）
    const list = await db.getAll(`
      SELECT u.id, u.username, u.sex, u.level, u.atk_max, u.def, u.agility, u.hp_max,
             COALESCE(SUM(CASE WHEN i.subtype IN('weapon','armor') THEN ROUND((i.atk+i.def_val)*(1+inv.enhance_level*0.03)) ELSE 0 END),0) AS equip_bonus,
             (u.atk_max*3 + u.def*2 + u.agility + FLOOR(u.hp_max/10)*2) AS power
      FROM \`user\` u
      LEFT JOIN \`inventory\` inv ON inv.user_id=u.id AND inv.equipped=1
      LEFT JOIN \`item\` i ON inv.item_id=i.id
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

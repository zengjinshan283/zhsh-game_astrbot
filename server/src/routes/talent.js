const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

// 计算天赋对属性的加成（异步，需 await）
async function calcTalentBonuses(talents) {
  const b = { atk_pct: 0, def_pct: 0, agi_pct: 0, hp_pct: 0, mp_pct: 0, crit_pct: 0, crit_damage: 0, lifesteal: 0, rage: 0, damage_reduce: 0, counter_pct: 0, sell_price: 0, buy_price: 0, tax_reduce: 0, trade_profit: 0, carry_capacity: 0, luxury_sell: 0, sail_speed: 0, treasure_rate: 0, pirate_avoid: 0, ocean_speed: 0, fish_rate: 0 };
  if (!talents || typeof talents !== 'object') return b;
  for (const [tid, level] of Object.entries(talents)) {
    const rows = await db.query('SELECT effect_type, effect_value, max_level FROM talent WHERE id = ?', [tid]);
    if (!rows || !rows.length) continue;
    const t = rows[0];
    const lv = Math.min(Number(level), Number(t.max_level));
    const key = t.effect_type;
    if (b[key] !== undefined) b[key] += Number(t.effect_value) * lv;
  }
  return b;
}

// 获取用户天赋信息
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const user = await db.getOne('SELECT talent_points, talents FROM user WHERE id = ?', [req.user.id]);
    const talents = (user && user.talents) ? (typeof user.talents === 'string' ? JSON.parse(user.talents) : user.talents) : {};
    const talents_with_level = {};
    for (const [tid, level] of Object.entries(talents)) {
      const rows = await db.getAll('SELECT id, name, description, category, max_level, effect_type, effect_value, cost_points, icon FROM talent WHERE id = ?', [tid]);
      if (rows && rows.length) talents_with_level[tid] = { ...rows[0], level };
    }
    res.json({ code: 0, data: { talent_points: user ? user.talent_points : 0, talents: talents_with_level, bonuses: await calcTalentBonuses(talents) } });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 天赋列表
router.get('/list', async (req, res) => {
  try {
    const talents = await db.getAll('SELECT id, name, description, category, max_level, effect_type, effect_value, cost_points, icon FROM talent ORDER BY category, id');
    res.json({ code: 0, data: talents });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 学习/升级天赋
router.post('/learn', authMiddleware, async (req, res) => {
  try {
    const user = await db.getOne('SELECT id, talent_points, talents, atk_min, atk_max, def, agility, hp_max, mp_max, level FROM user WHERE id = ?', [req.user.id]);
    if (!user) return res.json({ code: 401, msg: '用户不存在' });

    const { talent_id } = req.body;
    if (!talent_id) return res.json({ code: 400, msg: '缺少参数' });

    const talentRows = await db.getAll('SELECT * FROM talent WHERE id = ?', [talent_id]);
    if (!talentRows || !talentRows.length) return res.json({ code: 404, msg: '天赋不存在' });
    const t = talentRows[0];

    const talents = (user.talents && typeof user.talents === 'string') ? JSON.parse(user.talents) : (user.talents || {});
    const current = Number(talents[talent_id]) || 0;

    if (current >= Number(t.max_level)) return res.json({ code: 400, msg: '已达最高等级' });

    const cost = Number(t.cost_points);
    if (Number(user.talent_points) < cost) return res.json({ code: 400, msg: `天赋点不足，需要${cost}点，当前${user.talent_points}点` });

    const new_points = Number(user.talent_points) - cost;
    const new_level = current + 1;
    const new_talents = { ...talents, [talent_id]: new_level };

    // 重新计算属性加成
    const b = await calcTalentBonuses(new_talents);
    const rate = (pct) => 1 + pct / 100;
    const new_atk_min = Math.floor(Number(user.atk_min) * rate(b.atk_pct));
    const new_atk_max = Math.floor(Number(user.atk_max) * rate(b.atk_pct));
    const new_def = Math.floor(Number(user.def) * rate(b.def_pct));
    const new_agi = Math.floor(Number(user.agility) * rate(b.agi_pct));
    const new_hp_max = Math.floor(Number(user.hp_max) * rate(b.hp_pct));
    const new_mp_max = Math.floor(Number(user.mp_max) * rate(b.mp_pct));

    await db.query(
      'UPDATE user SET talent_points=?, talents=?, atk_min=?, atk_max=?, def=?, agility=?, hp_max=?, mp_max=? WHERE id=?',
      [new_points, JSON.stringify(new_talents), new_atk_min, new_atk_max, new_def, new_agi, new_hp_max, new_mp_max, user.id]
    );

    res.json({ code: 0, msg: `升级「${t.name}」至 Lv.${new_level}`, data: { talent_points: new_points, talent_id, new_level, bonuses: b } });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 重置天赋
router.post('/reset', authMiddleware, async (req, res) => {
  try {
    const user = await db.getOne('SELECT id, talent_points, talents, atk_min, atk_max, def, agility, hp_max, mp_max, gold FROM user WHERE id = ?', [req.user.id]);
    if (!user) return res.json({ code: 401, msg: '用户不存在' });

    const gold = 100;
    const talents = (user.talents && typeof user.talents === 'string') ? JSON.parse(user.talents) : (user.talents || {});
    if (Object.keys(talents).length === 0) return res.json({ code: 400, msg: '没有可重置的天赋' });
    if (Number(user.gold) < gold) return res.json({ code: 400, msg: `金币不足，需要${gold}，当前${user.gold}` });

    // 累加已消耗的天赋点
    let spent_points = 0;
    for (const [tid, level] of Object.entries(talents)) {
      const rows = await db.getAll('SELECT cost_points FROM talent WHERE id = ?', [tid]);
      if (rows && rows.length) spent_points += Number(rows[0].cost_points) * Number(level);
    }

    // 反推基础属性
    const b = await calcTalentBonuses(talents);
    const rate = (pct) => 1 + pct / 100;
    const base_atk_min = Math.floor(Number(user.atk_min) / rate(b.atk_pct));
    const base_atk_max = Math.floor(Number(user.atk_max) / rate(b.atk_pct));
    const base_def = Math.floor(Number(user.def) / rate(b.def_pct));
    const base_agi = Math.floor(Number(user.agility) / rate(b.agi_pct));
    const base_hp = Math.floor(Number(user.hp_max) / rate(b.hp_pct));
    const base_mp = Math.floor(Number(user.mp_max) / rate(b.mp_pct));

    await db.query(
      'UPDATE user SET talent_points=talent_points+?, talents=\'{}\', gold=gold-?, atk_min=?, atk_max=?, def=?, agility=?, hp_max=?, mp_max=? WHERE id=?',
      [spent_points, gold, base_atk_min, base_atk_max, base_def, base_agi, base_hp, base_mp, user.id]
    );

    res.json({ code: 0, msg: `重置成功，返还${spent_points}天赋点，消耗${gold}金币` });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

module.exports = { router, calcTalentBonuses };

/**
 * 技能系统 - 技能升级
 * POST /api/skill/upgrade  - 升级已学会的技能
 * GET  /api/skill/upgrade-info - 升级预览
 */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

const MAX_SKILL_LEVEL = 10;

// 升级费用：level_req * 500 * current_level
function getUpgradeCost(skill, currentLevel) {
  return skill.level_req * 500 * currentLevel;
}

// 升级后属性预览
function calcNextBonus(skill, currentLevel) {
  const next = currentLevel + 1;
  const base = skill.base_atk_multiplier || skill.atk_multiplier;
  const defb = skill.base_def_multiplier || skill.def_multiplier;
  return {
    atk_multiplier: skill.type === 1 ? +(base + next * 0.1).toFixed(2) : skill.atk_multiplier,
    def_multiplier: skill.type === 2 ? +(defb + next * 0.1).toFixed(2) : skill.def_multiplier,
    mp_cost: skill.type !== 2 ? Math.min((skill.base_mp_cost || skill.mp_cost) + 5 * currentLevel, 200) : skill.mp_cost,
    cooldown: skill.cooldown > 0 ? Math.max((skill.base_cooldown || skill.cooldown) - 1 * currentLevel, 1) : 0,
  };
}

function getCurrentBonus(skill) {
  return {
    atk_multiplier: skill.atk_multiplier,
    def_multiplier: skill.def_multiplier,
    mp_cost: skill.mp_cost,
    cooldown: skill.cooldown,
  };
}

// 升级技能
router.post('/upgrade', authMiddleware, async (req, res, next) => {
  try {
    const { skill_id } = req.body;
    if (!skill_id) return res.status(400).json({ error: '缺少技能ID' });
    const sid = parseInt(skill_id);
    const uid = req.user.id;

    const userSkill = await db.getOne(
      `SELECT us.*, s.name, s.type, s.atk_multiplier as base_atk_multiplier,
              s.def_multiplier as base_def_multiplier, s.mp_cost as base_mp_cost,
              s.cooldown as base_cooldown, s.level_req
       FROM user_skill us JOIN skill s ON us.skill_id = s.id
       WHERE us.user_id = ? AND us.skill_id = ?`,
      [uid, sid]
    );
    if (!userSkill) return res.status(400).json({ error: '你还未学会该技能' });
    if (userSkill.level >= MAX_SKILL_LEVEL) {
      return res.status(400).json({ error: `该技能已达最高级(${MAX_SKILL_LEVEL}级)` });
    }

    const cost = getUpgradeCost(userSkill, userSkill.level);
    const user = await db.getOne('SELECT money FROM user WHERE id = ?', [uid]);
    if (user.money < cost) {
      return res.status(400).json({ error: `铜币不足，需要${cost}铜币，您有${user.money}铜币` });
    }

    const newLevel = userSkill.level + 1;
    const bonus = calcNextBonus(userSkill, newLevel);

    await db.query('UPDATE user SET money = money - ? WHERE id = ?', [cost, uid]);
    await db.query(
      `UPDATE user_skill SET level = ?, atk_multiplier = ?, def_multiplier = ?,
       mp_cost = ?, cooldown = ? WHERE user_id = ? AND skill_id = ?`,
      [newLevel, bonus.atk_multiplier, bonus.def_multiplier, bonus.mp_cost, bonus.cooldown, uid, sid]
    );

    res.json({
      success: true,
      msg: `${userSkill.name} 升至 ${newLevel} 级，花费${cost}铜币`,
      skill: { id: sid, name: userSkill.name, level: newLevel, ...bonus },
      cost,
    });
  } catch (err) { next(err); }
});

// 升级预览
router.get('/upgrade-info', authMiddleware, async (req, res, next) => {
  try {
    const { skill_id } = req.query;
    if (!skill_id) return res.status(400).json({ error: '缺少技能ID' });
    const sid = parseInt(skill_id);
    const uid = req.user.id;

    const userSkill = await db.getOne(
      `SELECT us.*, s.name, s.type, s.atk_multiplier as base_atk_multiplier,
              s.def_multiplier as base_def_multiplier, s.mp_cost as base_mp_cost,
              s.cooldown as base_cooldown, s.level_req
       FROM user_skill us JOIN skill s ON us.skill_id = s.id
       WHERE us.user_id = ? AND us.skill_id = ?`,
      [uid, sid]
    );
    if (!userSkill) return res.status(400).json({ error: '你还未学会该技能' });
    if (userSkill.level >= MAX_SKILL_LEVEL) {
      return res.status(400).json({ error: `该技能已达最高级(${MAX_SKILL_LEVEL}级)` });
    }

    const nextLevel = userSkill.level + 1;
    const cost = getUpgradeCost(userSkill, userSkill.level);
    const current = getCurrentBonus(userSkill);
    const next = calcNextBonus(userSkill, nextLevel);

    res.json({ skill_id: sid, name: userSkill.name, current, next, cost, max_level: MAX_SKILL_LEVEL });
  } catch (err) { next(err); }
});

module.exports = router;
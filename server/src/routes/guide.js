/**
 * 新手引导路由 - 步骤推进/状态查询/跳过
 */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// 引导步骤定义
// place_id 1022 = 威尼斯码头
const GUIDE_STEPS = {
  1: { msg: '去找马可（威尼斯城中心）接任务', npc_id: 1 },
  2: { msg: '清理城郊野狗（出城战斗）', target: 'combat' },
  3: { msg: '回去向马可汇报任务', npc_id: 1 },
  4: { msg: '去码头（★威尼斯码头）了解如何出海', place_id: 1022 },
  5: { msg: '在码头购买一艘小帆船', target: 'buy_ship' },
  6: { msg: '从码头起航前往雅典，正式开始航海之旅！', target: 'sail' }
};

// 获取当前引导状态
router.get('/status', authMiddleware, async (req, res, next) => {
  try {
    const user = await db.getOne('SELECT guide_step FROM `user` WHERE `id` = ?', [req.user.id]);
    const step = user.guide_step;

    if (step === 0 || step === 99) {
      return res.json({ active: false, step, msg: '' });
    }

    const info = GUIDE_STEPS[step] || { msg: '引导步骤未知' };
    // 获取当前引导对应的任务信息
    let questName = '';
    if (step === 1 || step === 2) {
      const q = await db.getOne('SELECT name FROM quest WHERE id = 1');
      questName = q ? q.name : '清理城郊野狗';
    }
    res.json({ active: true, step, questName, ...info });
  } catch (err) { next(err); }
});

// NPC交互时调用，推进引导
router.post('/npc-interact', authMiddleware, async (req, res, next) => {
  try {
    const { npc_id } = req.body;
    const user = await db.getOne('SELECT guide_step FROM `user` WHERE `id` = ?', [req.user.id]);
    const step = user.guide_step;

    // 马可(id=1)：步骤1→2（接任务），步骤3→4（交任务）
    if (npc_id === 1) {
      if (step === 1) {
        await db.update('user', { guide_step: 2 }, '`id` = ?', [req.user.id]);
        return res.json({ advanced: true, next_step: 2, msg: '引导更新：出城清理城郊野狗吧！' });
      }
      if (step === 3) {
        await db.update('user', { guide_step: 4 }, '`id` = ?', [req.user.id]);
        return res.json({ advanced: true, next_step: 4, msg: '引导更新：去码头了解如何出海吧！' });
      }
    }

    res.json({ advanced: false });
  } catch (err) { next(err); }
});

// 进入地点时调用（用于步骤4：到达码头）
router.post('/place-enter', authMiddleware, async (req, res, next) => {
  try {
    const { place_id } = req.body;
    const user = await db.getOne('SELECT guide_step FROM `user` WHERE `id` = ?', [req.user.id]);
    const step = user.guide_step;

    // 到达威尼斯码头(1022) → 步骤4推进到5
    if (place_id === 1022 && step === 4) {
      await db.update('user', { guide_step: 5 }, '`id` = ?', [req.user.id]);
      return res.json({ advanced: true, next_step: 5, msg: '引导更新：去买一艘小帆船吧！' });
    }

    res.json({ advanced: false });
  } catch (err) { next(err); }
});

// 任务完成后调用，推进引导
router.post('/quest-complete', authMiddleware, async (req, res, next) => {
  try {
    const { quest_id } = req.body;
    const user = await db.getOne('SELECT guide_step FROM `user` WHERE `id` = ?', [req.user.id]);
    const step = user.guide_step;

    // 清理城郊野狗(id=1)完成 → 步骤2推进到3
    if (quest_id == 1 && step === 2) {
      await db.update('user', { guide_step: 3 }, '`id` = ?', [req.user.id]);
      return res.json({ advanced: true, next_step: 3, msg: '引导更新：回去向马可汇报！' });
    }

    res.json({ advanced: false });
  } catch (err) { next(err); }
});

// 购买船只后调用
router.post('/ship-bought', authMiddleware, async (req, res, next) => {
  try {
    const user = await db.getOne('SELECT guide_step FROM `user` WHERE `id` = ?', [req.user.id]);
    if (user.guide_step === 5) {
      await db.update('user', { guide_step: 6 }, '`id` = ?', [req.user.id]);
      return res.json({ advanced: true, next_step: 6, msg: '引导更新：起航前往雅典吧！' });
    }
    res.json({ advanced: false });
  } catch (err) { next(err); }
});

// 起航后调用
router.post('/sail-started', authMiddleware, async (req, res, next) => {
  try {
    const user = await db.getOne('SELECT guide_step FROM `user` WHERE `id` = ?', [req.user.id]);
    if (user.guide_step === 6) {
      await db.update('user', { guide_step: 99 }, '`id` = ?', [req.user.id]);
      return res.json({ advanced: true, next_step: 99, msg: '🎉 新手引导完成！祝您航海愉快！' });
    }
    res.json({ advanced: false });
  } catch (err) { next(err); }
});

// 跳过引导
router.post('/skip', authMiddleware, async (req, res, next) => {
  try {
    await db.update('user', { guide_step: 99 }, '`id` = ?', [req.user.id]);
    res.json({ success: true, msg: '新手引导已跳过' });
  } catch (err) { next(err); }
});

module.exports = router;
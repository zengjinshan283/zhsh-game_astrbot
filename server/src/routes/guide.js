/**
 * 新手引导路由 - 步骤推进/状态查询/跳过/开场剧情
 *
 * guide_step 状态机:
 *   0   = 需要看开场剧情（StoryView）
 *   1-6 = 引导步骤（GuideOverlay）
 *   99  = 引导完成
 */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// ========== 7步开场故事（与 PHP step.php 一致）==========
const INTRO_STORIES = [
  {
    title: '序章：威尼斯的黎明',
    text: '1453年的春天，威尼斯的清晨笼罩在一层薄薄的雾气中。圣马可广场的钟声在远处回荡，运河上已有船只开始忙碌起来。',
    bg: '你站在威尼斯酒店门口，海风带着咸味拂过你的面庞。昨夜，你做了一个决定——成为一名航海冒险者。'
  },
  {
    title: '第一幕：远方的消息',
    text: '"听说了吗？君士坦丁堡陷落了！"酒店里，一个水手激动地拍着桌子。',
    bg: '奥斯曼帝国的军队攻破了拜占庭帝国的首都，东西方贸易路线被彻底切断。从此，通往东方的香料、丝绸和瓷器变得无比珍贵……'
  },
  {
    title: '第二幕：航海家的号召',
    text: '威尼斯总督府发布了告示：招募勇敢的航海家，开辟新的贸易航线！丰厚报酬，荣耀加身！',
    bg: '你站在告示牌前，心跳加速。这就是你等待已久的机会。你决定从地中海出发，寻找通往东方的新航路。'
  },
  {
    title: '第三幕：启程准备',
    text: '你走进了威尼斯的铁匠铺，挑选了一把结实的木剑。又到商店买了几瓶回复药，为即将到来的冒险做好了准备。',
    bg: '"年轻人，大海是残酷的，但也是最公平的。"老铁匠看着你，眼中闪过一丝赞赏。"祝你好运，孩子。"'
  },
  {
    title: '第四幕：地中海的召唤',
    text: '你来到了威尼斯的码头，无数帆船停泊在海湾中。地中海的海水在阳光下闪耀着金色的光芒。',
    bg: '从这里出发，你可以前往里斯本、伦敦、北非的港口……也可以沿着古老的贸易路线，向东航行到亚历山大和伊斯坦布尔。'
  },
  {
    title: '第五幕：未知的旅途',
    text: '大海的深处隐藏着无数的宝藏和危险——海盗、风暴、神秘的岛屿……但同样也有无尽的荣耀和财富等待着你。',
    bg: '你深吸一口气，感受着海风的气息。纵横四海的冒险，从今天开始！'
  },
  {
    title: '尾声：新的开始',
    text: '你回到了威尼斯酒店，这里将是你的起点。走出酒店，去探索这个广阔的世界吧！',
    bg: '威尼斯城中有许多可以去的地方——广场、商店、铁匠铺、码头……城外还有森林、荒野等着你去冒险。祝你一路顺风，年轻的冒险者！'
  }
];

// ========== 引导步骤定义 ==========
// target: CSS selector for spotlight highlighting
// hint: contextual tip shown to user
const GUIDE_STEPS = {
  1: {
    msg: '去找马可（威尼斯城中心）接任务',
    npc_id: 1,
    hint: '在城中心找一个头顶有感叹号❗的马可对话'
  },
  2: {
    msg: '出城清理城郊野狗（击败3只）',
    target: '.battle-btn, [data-action="attack"]',
    hint: '在城外自动遭遇野狗，击败它们即可完成任务'
  },
  3: {
    msg: '回去向马可汇报任务',
    npc_id: 1,
    hint: '回去找马可对话，领取任务奖励'
  },
  4: {
    msg: '去威尼斯码头了解如何出海',
    place_id: 1022,
    hint: '点击底部导航"地图"→选择威尼斯码头（place_id=1022）'
  },
  5: {
    msg: '在码头购买一艘小帆船',
    target: '.buy-ship-btn',
    hint: '在码头找船只商人，购买一艘小帆船'
  },
  6: {
    msg: '从码头起航前往雅典，正式开始航海之旅！',
    target: '.sail-btn, .depart-btn',
    hint: '在码头起航，选择目的地为雅典'
  }
};

// ========== API ==========

// 获取开场故事
router.get('/intro-stories', authMiddleware, async (req, res, next) => {
  try {
    res.json({ stories: INTRO_STORIES });
  } catch (err) { next(err); }
});

// 开场剧情完成，进入 step=1
router.post('/intro-complete', authMiddleware, async (req, res, next) => {
  try {
    const user = await db.getOne('SELECT guide_step FROM `user` WHERE `id` = ?', [req.user.id]);
    if (user.guide_step === 0) {
      await db.update('user', { guide_step: 1 }, '`id` = ?', [req.user.id]);
    }
    res.json({ success: true });
  } catch (err) { next(err); }
});

// 获取引导状态
router.get('/status', authMiddleware, async (req, res, next) => {
  try {
    const user = await db.getOne('SELECT guide_step FROM `user` WHERE `id` = ?', [req.user.id]);
    const step = user.guide_step;

    // step=0：需要开场剧情
    if (step === 0) {
      return res.json({ active: true, step: 0, msg: '开场剧情', stories: INTRO_STORIES });
    }

    // step=99：引导完成
    if (step === 99) {
      return res.json({ active: false, step: 99, msg: '' });
    }

    // step=1-6：正常引导步骤
    const info = GUIDE_STEPS[step] || { msg: '引导步骤未知' };
    let questName = '';
    if (step === 1 || step === 2) {
      const q = await db.getOne('SELECT name FROM quest WHERE id = 1');
      questName = q ? q.name : '清理城郊野狗';
    }
    res.json({ active: true, step, questName, ...info });
  } catch (err) { next(err); }
});

// NPC 交互时推进引导
router.post('/npc-interact', authMiddleware, async (req, res, next) => {
  try {
    const { npc_id } = req.body;
    const user = await db.getOne('SELECT guide_step FROM `user` WHERE `id` = ?', [req.user.id]);
    const step = user.guide_step;

    // 马可(id=1)：步骤1接任务→2，步骤3交任务→4
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

// 进入地点时推进（步骤4：到达码头）
router.post('/place-enter', authMiddleware, async (req, res, next) => {
  try {
    const { place_id } = req.body;
    const user = await db.getOne('SELECT guide_step FROM `user` WHERE `id` = ?', [req.user.id]);
    const step = user.guide_step;

    if (place_id === 1022 && step === 4) {
      await db.update('user', { guide_step: 5 }, '`id` = ?', [req.user.id]);
      return res.json({ advanced: true, next_step: 5, msg: '引导更新：去买一艘小帆船吧！' });
    }

    res.json({ advanced: false });
  } catch (err) { next(err); }
});

// 任务完成后推进（步骤2→3）
router.post('/quest-complete', authMiddleware, async (req, res, next) => {
  try {
    const { quest_id } = req.body;
    const user = await db.getOne('SELECT guide_step FROM `user` WHERE `id` = ?', [req.user.id]);
    const step = user.guide_step;

    if (quest_id == 1 && step === 2) {
      await db.update('user', { guide_step: 3 }, '`id` = ?', [req.user.id]);
      return res.json({ advanced: true, next_step: 3, msg: '引导更新：回去向马可汇报！' });
    }

    res.json({ advanced: false });
  } catch (err) { next(err); }
});

// 购买船只后推进（步骤5→6）
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

// 起航后推进（步骤6→99）
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
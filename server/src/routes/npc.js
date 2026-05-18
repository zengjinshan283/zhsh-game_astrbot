/**
 * NPC路由 - 商店/银行/铁匠/赌场/对话/任务
 */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 获取NPC信息
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const npc = await db.getOne('SELECT n.*, p.name AS place_name, m.name AS city_name FROM `npc` n LEFT JOIN `place` p ON n.place_id = p.id LEFT JOIN `map` m ON p.city_id = m.id WHERE n.id = ?', [req.params.id]);
    if (!npc) return res.status(404).json({ error: 'NPC不存在' });
    // NPC对话
    const dialogs = await db.getAll('SELECT * FROM `npc_dialog` WHERE `npc_id` = ? ORDER BY `sort_order`', [npc.id]);
    res.json({ npc, dialogs });
  } catch (err) { next(err); }
});

// 商店 - 获取商品
router.get('/:id/shop', authMiddleware, async (req, res, next) => {
  try {
    const items = await db.getAll(
      'SELECT i.* FROM `item` i INNER JOIN `npc_shop_item` nsi ON i.id = nsi.item_id WHERE nsi.npc_id = ? ORDER BY i.type, i.id',
      [req.params.id]
    );
    res.json({ items });
  } catch (err) { next(err); }
});

// 商店 - 购买
router.post('/buy', authMiddleware, async (req, res, next) => {
  try {
    const { npc_id, item_id, quantity } = req.body;
    const qty = Math.max(1, parseInt(quantity) || 1);
    const item = await db.getOne('SELECT i.* FROM `item` i INNER JOIN `npc_shop_item` nsi ON i.id = nsi.item_id WHERE nsi.npc_id = ? AND i.id = ?', [npc_id, item_id]);
    if (!item || item.price_buy <= 0) return res.status(400).json({ error: '商品不存在' });

    const totalCost = item.price_buy * qty;
    const user = await db.getOne('SELECT id, money FROM `user` WHERE `id` = ?', [req.user.id]);
    if (user.money < totalCost) return res.status(400).json({ error: '铜币不足' });

    await db.query('UPDATE `user` SET `money` = `money` - ? WHERE `id` = ?', [totalCost, req.user.id]);

    // 查找已有物品
    const existing = await db.getOne('SELECT id, quantity FROM `inventory` WHERE `user_id` = ? AND `item_id` = ?', [req.user.id, item_id]);
    if (existing) {
      await db.update('inventory', { quantity: existing.quantity + qty }, '`id` = ?', [existing.id]);
    } else {
      await db.insert('inventory', { user_id: req.user.id, item_id, quantity: qty, equipped: 0, enhance_level: 0 });
    }

    res.json({ success: true, cost: totalCost, item_name: item.name, quantity: qty });
  } catch (err) { next(err); }
});

// 商店 - 出售
router.post('/sell', authMiddleware, async (req, res, next) => {
  try {
    const { inventory_id, quantity } = req.body;
    const qty = Math.max(1, parseInt(quantity) || 1);

    const inv = await db.getOne('SELECT inv.*, i.name, i.price_sell FROM `inventory` inv JOIN `item` i ON inv.item_id = i.id WHERE inv.id = ? AND inv.user_id = ?', [inventory_id, req.user.id]);
    if (!inv) return res.status(400).json({ error: '物品不存在' });
    if (inv.equipped) return res.status(400).json({ error: '请先卸下装备' });
    if (inv.quantity < qty) return res.status(400).json({ error: '数量不足' });

    const earn = inv.price_sell * qty;
    if (inv.quantity === qty) {
      await db.delete('inventory', '`id` = ?', [inventory_id]);
    } else {
      await db.update('inventory', { quantity: inv.quantity - qty }, '`id` = ?', [inventory_id]);
    }
    await db.query('UPDATE `user` SET `money` = `money` + ? WHERE `id` = ?', [earn, req.user.id]);

    res.json({ success: true, earn, item_name: inv.name, quantity: qty });
  } catch (err) { next(err); }
});

// 银行 - 查询
router.get('/:id/bank', authMiddleware, async (req, res, next) => {
  try {
    const user = await db.getOne('SELECT money, bank_money FROM `user` WHERE `id` = ?', [req.user.id]);
    const logs = await db.getAll('SELECT * FROM `bank_log` WHERE `user_id` = ? ORDER BY `id` DESC LIMIT 10', [req.user.id]);
    res.json({ money: user.money, bank_money: user.bank_money, total: user.money + user.bank_money, logs });
  } catch (err) { next(err); }
});

// 银行 - 存款
router.post('/deposit', authMiddleware, async (req, res, next) => {
  try {
    const { amount } = req.body;
    const amt = parseInt(amount);
    if (!amt || amt <= 0) return res.status(400).json({ error: '请输入有效金额' });
    const user = await db.getOne('SELECT money, bank_money FROM `user` WHERE `id` = ?', [req.user.id]);
    if (user.money < amt) return res.status(400).json({ error: '铜币不足' });
    await db.query('UPDATE `user` SET `money` = `money` - ?, `bank_money` = `bank_money` + ? WHERE `id` = ?', [amt, amt, req.user.id]);
    await db.insert('bank_log', { user_id: req.user.id, type: 1, amount: amt, balance: user.bank_money + amt, created_at: Math.floor(Date.now() / 1000) });
    res.json({ success: true, money: user.money - amt, bank_money: user.bank_money + amt });
  } catch (err) { next(err); }
});

// 银行 - 取款
router.post('/withdraw', authMiddleware, async (req, res, next) => {
  try {
    const { amount } = req.body;
    const amt = parseInt(amount);
    if (!amt || amt <= 0) return res.status(400).json({ error: '请输入有效金额' });
    const user = await db.getOne('SELECT money, bank_money FROM `user` WHERE `id` = ?', [req.user.id]);
    if (user.bank_money < amt) return res.status(400).json({ error: '存款不足' });
    await db.query('UPDATE `user` SET `money` = `money` + ?, `bank_money` = `bank_money` - ? WHERE `id` = ?', [amt, amt, req.user.id]);
    await db.insert('bank_log', { user_id: req.user.id, type: 0, amount: amt, balance: user.bank_money - amt, created_at: Math.floor(Date.now() / 1000) });
    res.json({ success: true, money: user.money + amt, bank_money: user.bank_money - amt });
  } catch (err) { next(err); }
});

// 学习技能
router.post('/learn-skill', authMiddleware, async (req, res, next) => {
  try {
    const { npc_id, skill_id } = req.body;
    if (!npc_id || !skill_id) return res.status(400).json({ error: '参数不完整' });

    const npc = await db.getOne('SELECT * FROM `npc` WHERE `id` = ?', [npc_id]);
    if (!npc) return res.status(404).json({ error: 'NPC不存在' });

    const skill = await db.getOne('SELECT * FROM `skill` WHERE `id` = ?', [skill_id]);
    if (!skill) return res.status(404).json({ error: '技能不存在' });

    // Check if already learned
    const existing = await db.getOne('SELECT * FROM `user_skill` WHERE `user_id` = ? AND `skill_id` = ?', [req.user.id, skill_id]);
    if (existing) return res.status(400).json({ error: '已学会该技能' });

    // Cost: skill level * 1000 copper
    const cost = skill.level_req * 1000;
    const user = await db.getOne('SELECT money, level FROM `user` WHERE `id` = ?', [req.user.id]);
    if (user.money < cost) return res.status(400).json({ error: '铜币不足（需要' + cost + '）' });
    if (user.level < skill.level_req) return res.status(400).json({ error: '等级不足（需要Lv.' + skill.level_req + '）' });

    await db.query('UPDATE `user` SET `money` = `money` - ? WHERE `id` = ?', [cost, req.user.id]);
    await db.insert('user_skill', { user_id: req.user.id, skill_id, level: 1, cooldown_end: 0 });

    res.json({ success: true, skill_name: skill.name, cost });
  } catch (err) { next(err); }
});

// 获取所有技能列表
router.get('/skills/all', authMiddleware, async (req, res, next) => {
  try {
    const skills = await db.getAll('SELECT * FROM `skill` ORDER BY `level_req`, `id`');
    res.json({ skills });
  } catch (err) { next(err); }
});

// 获取用户已学会的技能
router.get('/skills/my', authMiddleware, async (req, res, next) => {
  try {
    const now = Math.floor(Date.now() / 1000);
    const skills = await db.getAll(
      `SELECT us.*, s.name, s.description, s.type, s.atk_multiplier, s.def_multiplier, s.mp_cost, s.cooldown, s.level_req,
       (CASE WHEN us.cooldown_end > ? THEN us.cooldown_end - ? ELSE 0 END) as cooldown_remaining
       FROM user_skill us JOIN skill s ON us.skill_id = s.id WHERE us.user_id = ? ORDER BY s.type, s.level_req`,
      [now, now, req.user.id]
    );
    res.json({ skills });
  } catch (err) { next(err); }
});

// NPC对话API - 复刻npc_chat.php
router.get('/:id/chat', authMiddleware, async (req, res, next) => {
  try {
    const npcId = parseInt(req.params.id);
    if (!npcId) return res.status(400).json({ ok: false, msg: '无效NPC' });

    const npc = await db.getOne('SELECT * FROM `npc` WHERE `id` = ?', [npcId]);
    if (!npc) return res.status(400).json({ ok: false, msg: 'NPC不存在' });

    // 硬编码对话数据
    const npcDialogs = {
      1: { greet: '欢迎来到马可酒馆！外面风大浪急，进来喝杯朗姆酒暖暖身子吧。你要是闲得慌，我有些事情需要人帮忙……',
        chat1: '最近城外的野狗闹得凶，好几个旅客被咬伤了。你要是有空，帮我料理几只？报酬不会少的！',
        chat2: '听说码头那边的海盗越来越猖狂了，你要小心啊。不过打败他们能拿到不少铜币！',
        chat3: '威尼斯是一座伟大的城市，王宫就在城的北边。你应该去见识一下！也许能发现什么秘密……',
        chat4: '铁匠安芬尼奥的手艺不错，就是脾气有点怪。找他强化装备准没错。他在商业街的铁匠铺。' },
      2: { greet: '叮叮当当……哦，有客人！想让我帮你强化装备？我的手艺在整个威尼斯可是一绝！就是费用嘛……嘿嘿。',
        chat1: '想强化装备？到铁匠铺来找我。虽然偶尔会失败，但成功了装备会更强！+7以上失败了会降级哦！',
        chat2: '我最近需要一些小回复药做辅助材料，你能帮我收集一些吗？我可以送你一把铁剑！',
        chat3: '码头那帮海盗越来越嚣张了……哼，要是他们敢来我的铁匠铺闹事，有他们好看的！',
        chat4: '好的武器能让你的攻击力翻倍。记得多来升级装备！打铁的声音就是胜利的号角！' },
      3: { greet: '金币放在身上可不太安全，海上的海盗可不长眼。存到我这里，我保证分文不少。当然，取款也不收手续费。',
        chat1: '把多余的铜币存起来吧！在外面战斗被击败会损失5%的铜币，存在银行就安全了。',
        chat2: '我们提供存取款服务，不收取任何手续费。这可是威尼斯最安全的金库！',
        chat3: '理财有方，财源广进。存钱是一种好习惯，冒险者！稳健才是长久之道。' },
      4: { greet: '嘿嘿嘿，来试试手气吧！今天运气不错哦~输了可别赖账，赌场有赌场的规矩！',
        chat1: '猜大小是最经典的游戏！两个骰子，猜总和是大还是小。赢了翻倍，输了别哭鼻子！',
        chat2: '每天有下注限额，等级越高限额越高。别想靠赌发财哦！不过嘛……万一呢？',
        chat3: '小赌怡情，大赌伤身。记住，这只是娱乐！不过今天那位客人赢了不少呢……' },
      5: { greet: '客官里面请！我这有从东方运来的上好药材和武器防具，价格公道，童叟无欺！',
        chat1: '武器能增加攻击力，防具能减少伤害。出门冒险一定要装备好！贫僧这里有上等好货。',
        chat2: '回复药是野外冒险的必备品。小回复药便宜，大回复药效果更好。多备几瓶！',
        chat3: '我也可以收购你不需要的物品，虽然回收价只有卖价的一半……没办法，生意嘛。' },
      6: { greet: '星座的排列告诉我……你今天将有一场奇遇。命运的丝线已经编好了，你只需要……打开你的钱包。开玩笑的，进来坐坐吧。',
        chat1: '我看到了你的未来……你将成为纵横四海的传奇航海家！星辰为你指引方向。',
        chat2: '星象显示，今天对你来说是个冒险的好日子。去挑战一些强大的怪物吧！',
        chat3: '命运掌握在你自己手中。我的占卜只是参考，真正的力量来自你的勇气和智慧。' },
    };

    // 判断触发类型
    const hasReady = await db.getVar(
      "SELECT COUNT(*) FROM user_quest uq JOIN quest q ON uq.quest_id=q.id WHERE uq.user_id=? AND q.npc_id=? AND uq.status=1",
      [req.user.id, npcId]
    ) || 0;
    const hasActive = await db.getVar(
      "SELECT COUNT(*) FROM user_quest uq JOIN quest q ON uq.quest_id=q.id WHERE uq.user_id=? AND q.npc_id=? AND uq.status=0",
      [req.user.id, npcId]
    ) || 0;
    const totalQuests = await db.getVar("SELECT COUNT(*) FROM quest WHERE npc_id=?", [npcId]) || 0;
    const doneQuests = await db.getVar(
      "SELECT COUNT(*) FROM user_quest uq JOIN quest q ON uq.quest_id=q.id WHERE uq.user_id=? AND q.npc_id=? AND uq.status=2",
      [req.user.id, npcId]
    ) || 0;

    let triggerType = 'idle';
    if (hasReady > 0) triggerType = 'quest_ready';
    else if (hasActive > 0) triggerType = 'quest_active';
    else if (totalQuests > 0 && doneQuests >= totalQuests) triggerType = 'all_done';

    // 获取NPC对话：优先从npc_dialog表取动态对话
    const npcChat = npcDialogs[npcId] || {};
    let dialog = npcChat.greet || npc.dialog;

    const nd = await db.getOne(
      "SELECT content FROM npc_dialog WHERE npc_id=? AND trigger_type=? ORDER BY sort_order LIMIT 1",
      [npcId, triggerType]
    );
    if (nd) dialog = nd.content;

    // 收集闲聊话题（chat1~chatN）
    const chatTopics = [];
    if (Object.keys(npcChat).length > 0) {
      for (const [key, val] of Object.entries(npcChat)) {
        if (key.startsWith('chat')) {
          chatTopics.push({ key, text: val });
        }
      }
    }

    // 随机选一个作为默认展示
    let defaultChat = null;
    if (chatTopics.length > 0) {
      defaultChat = chatTopics[Math.floor(Math.random() * chatTopics.length)];
    }

    // 获取用户等级
    const user = await db.getOne('SELECT level FROM `user` WHERE `id` = ?', [req.user.id]);

    // 获取可用任务
    const availableQuests = await db.getAll(
      `SELECT q.* FROM quest q WHERE q.npc_id=? AND q.level_req<=? 
       AND q.id NOT IN (SELECT quest_id FROM user_quest WHERE user_id=?) 
       AND (q.pre_quest_id=0 OR q.pre_quest_id IN (SELECT quest_id FROM user_quest WHERE user_id=? AND status>=1)) 
       ORDER BY q.sort_order, q.id`,
      [npcId, user.level, req.user.id, req.user.id]
    );

    const availList = [];
    for (const q of availableQuests) {
      let rt = '经验+' + q.reward_exp + ' 铜币+' + q.reward_money;
      if (q.reward_item_id > 0) {
        const ri = await db.getOne('SELECT name FROM item WHERE id = ?', [q.reward_item_id]);
        if (ri) rt += ' ' + ri.name + '×' + q.reward_item_qty;
      }
      availList.push({
        id: q.id, name: q.name, desc: q.description,
        level_req: q.level_req, reward: rt
      });
    }

    // 获取进行中任务
    const activeQuests = await db.getAll(
      `SELECT q.*, uq.progress, uq.status FROM quest q JOIN user_quest uq ON q.id=uq.quest_id
       WHERE uq.user_id=? AND q.npc_id=? AND uq.status<2 ORDER BY q.sort_order, q.id`,
      [req.user.id, npcId]
    );

    // 自动触发 type=2 对话任务（与该NPC对话1次即完成）
    const completedTalkQuests = [];
    for (const q of activeQuests) {
      if (q.type === 2 && q.target_id === 1) {
        await db.update('user_quest', { progress: 1, status: 1 }, '`user_id` = ? AND `quest_id` = ?', [req.user.id, q.id]);
        completedTalkQuests.push({ id: q.id, name: q.name });
      }
    }

    res.json({
      ok: true,
      trigger_type: triggerType,
      dialog,
      default_chat: defaultChat,
      chat_topics: chatTopics,
      available_quests: availList,
      active_quests: activeQuests,
      completed_talk_quests: completedTalkQuests
    });

    // 触发新手引导：NPC交互后推进（异步，不阻塞响应）
    (async () => {
      try {
        const guideUser = await db.getOne('SELECT guide_step FROM `user` WHERE `id` = ?', [req.user.id]);
        const step = guideUser.guide_step;
        // 马可(id=1)：步骤0(开场后→接任务)→1，步骤2(做任务中→交任务)→3
        if (npcId === 1) {
          if (step === 0) {
            await db.update('user', { guide_step: 1 }, '`id` = ?', [req.user.id]);
          } else if (step === 2) {
            await db.update('user', { guide_step: 3 }, '`id` = ?', [req.user.id]);
          }
        }
      } catch (e) {}
    })();
  } catch (err) { next(err); }
});


module.exports = router;

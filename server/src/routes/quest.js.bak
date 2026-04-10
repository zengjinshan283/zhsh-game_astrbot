const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.get('/list', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const active = await db.getAll("SELECT q.*, uq.progress, uq.status, uq.accepted_at, n.name AS npc_name FROM `quest` q JOIN `user_quest` uq ON q.id = uq.quest_id LEFT JOIN `npc` n ON q.npc_id = n.id WHERE uq.user_id = ? AND uq.status IN (0, 1) ORDER BY uq.status DESC, q.sort_order", [uid]);
    const completed = await db.getAll("SELECT q.*, uq.completed_at, n.name AS npc_name FROM `quest` q JOIN `user_quest` uq ON q.id = uq.quest_id LEFT JOIN `npc` n ON q.npc_id = n.id WHERE uq.user_id = ? AND uq.status = 2 ORDER BY uq.completed_at DESC LIMIT 10", [uid]);
    const user = await db.getOne('SELECT level FROM `user` WHERE `id` = ?', [uid]);
    const available = await db.getAll("SELECT q.*, n.name AS npc_name FROM `quest` q LEFT JOIN `npc` n ON q.npc_id = n.id WHERE q.level_req <= ? ORDER BY q.sort_order", [user.level]);
    const doneIds = new Set([...active.map(q=>q.id), ...completed.map(q=>q.id)]);
    const completedIds = new Set(completed.map(q=>q.id));
    const filtered = available.filter(q => !doneIds.has(q.id) && (q.pre_quest_id <= 0 || completedIds.has(q.pre_quest_id)));
    res.json({ active, completed, available: filtered });
  } catch(e){next(e);}
});

router.post('/accept', authMiddleware, async (req, res, next) => {
  try {
    const { quest_id } = req.body;
    const uid = req.user.id;
    const user = await db.getOne('SELECT level FROM `user` WHERE `id` = ?', [uid]);
    const quest = await db.getOne("SELECT * FROM `quest` WHERE `id` = ? AND `level_req` <= ?", [quest_id, user.level]);
    if (!quest) return res.status(400).json({ error: '任务不存在或等级不足' });
    const exists = await db.getVar("SELECT COUNT(*) FROM `user_quest` WHERE `user_id` = ? AND `quest_id` = ?", [uid, quest_id]);
    if (exists > 0) return res.status(400).json({ error: '你已经接了' });
    if (quest.pre_quest_id > 0) {
      const preDone = await db.getVar("SELECT COUNT(*) FROM `user_quest` WHERE `user_id` = ? AND `quest_id` = ? AND `status` >= 1", [uid, quest.pre_quest_id]);
      if (preDone == 0) return res.status(400).json({ error: '需要先完成前置任务' });
    }
    await db.insert('user_quest', { user_id: uid, quest_id, status: 0, progress: 0, accepted_at: Math.floor(Date.now()/1000) });
    res.json({ success: true, msg: `接取：${quest.name}` });
  } catch(e){next(e);}
});

router.post('/claim', authMiddleware, async (req, res, next) => {
  try {
    const { quest_id } = req.body;
    const uid = req.user.id;
    const uq = await db.getOne("SELECT * FROM `user_quest` WHERE `user_id` = ? AND `quest_id` = ? AND `status` = 1", [uid, quest_id]);
    if (!uq) return res.status(400).json({ error: '任务未完成' });
    const quest = await db.getOne("SELECT * FROM `quest` WHERE `id` = ?", [quest_id]);
    const rewards = [];
    if (quest.reward_exp > 0) {
      const user = await db.getOne('SELECT exp, exp_max, level FROM `user` WHERE `id` = ?', [uid]);
      let newExp = user.exp + quest.reward_exp;
      let newLevel = user.level;
      let newExpMax = user.exp_max || 500;
      let leveled = false;
      while (newExp >= newExpMax) {
        newExp -= newExpMax; newLevel++; newExpMax = 500 + 300*(newLevel-1); leveled = true;
      }
      await db.query('UPDATE `user` SET level=?, exp=?, exp_max=? WHERE `id` = ?', [newLevel, newExp, newExpMax, uid]);
      rewards.push(`经验+${quest.reward_exp}`);
      if (leveled) rewards.push('🎉升级！');
    }
    if (quest.reward_money > 0) {
      await db.query('UPDATE `user` SET money = money + ? WHERE `id` = ?', [quest.reward_money, uid]);
      rewards.push(`铜币+${quest.reward_money}`);
    }
    if (quest.reward_gold > 0) {
      await db.query('UPDATE `user` SET gold = gold + ? WHERE `id` = ?', [quest.reward_gold, uid]);
      rewards.push(`金币+${quest.reward_gold}`);
    }
    if (quest.reward_item_id > 0 && quest.reward_item_qty > 0) {
      const existing = await db.getOne("SELECT * FROM `inventory` WHERE `user_id` = ? AND `item_id` = ? AND `equipped` = 0", [uid, quest.reward_item_id]);
      if (existing) await db.update('inventory', { quantity: existing.quantity + quest.reward_item_qty }, '`id` = ?', [existing.id]);
      else await db.insert('inventory', { user_id: uid, item_id: quest.reward_item_id, quantity: quest.reward_item_qty, equipped: 0 });
      const item = await db.getOne("SELECT name FROM `item` WHERE `id` = ?", [quest.reward_item_id]);
      rewards.push(`${item?item.name:'物品'} x${quest.reward_item_qty}`);
    }
    await db.update('user_quest', { status: 2, completed_at: Math.floor(Date.now()/1000) }, '`id` = ?', [uq.id]);
    res.json({ success: true, msg: `🎉 任务完成！${rewards.join('，')}` });
  } catch(e){next(e);}
});

router.post('/abandon', authMiddleware, async (req, res, next) => {
  try {
    await db.delete('user_quest', '`user_id` = ? AND `quest_id` = ? AND `status` = 0', [req.user.id, req.body.quest_id]);
    res.json({ success: true });
  } catch(e){next(e);}
});

module.exports = router;

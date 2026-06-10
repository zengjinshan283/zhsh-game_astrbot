const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { triggerAchievements } = require('./achievement');
const router = express.Router();

// ============================================================
// 藏宝图系统
// POST /api/treasure/use - 使用藏宝图开始挖掘
// POST /api/treasure/assemble - 合成碎片（3块碎片→完整藏宝图）
// GET  /api/treasure/status - 查看碎片收集进度
// ============================================================

// 使用藏宝图
router.post('/use', authMiddleware, async (req, res, next) => {
  try {
    const { item_id, location_id } = req.body;
    const inv = await db.getOne('SELECT * FROM `inventory` WHERE `user_id`=? AND `item_id`=? AND `equipped`=0 LIMIT 1',
      [req.user.id, item_id]);
    if (!inv) return res.status(400).json({ error: '背包中没有此藏宝图' });

    const item = await db.getOne('SELECT * FROM `item` WHERE `id`=?', [item_id]);
    if (!item || (item.subtype !== 'treasure_map' && item.subtype !== 'treasure_map_elite')) {
      return res.status(400).json({ error: '这不是藏宝图' });
    }

    // 等级检查
    const user = await db.getOne('SELECT level FROM `user` WHERE `id`=?', [req.user.id]);
    if (user.level < item.level_req) return res.status(400).json({ error: `需要 ${item.level_req} 级才能使用` });

    // 如果指定了地点，直接挖
    if (location_id) {
      const loc = await db.getOne('SELECT * FROM `treasure_location` WHERE `id`=?', [location_id]);
      if (!loc) return res.status(400).json({ error: '无效的挖掘地点' });
      if (user.level < loc.min_level) return res.status(400).json({ error: `需要等级 ${loc.min_level} 才能在此挖掘` });
      if (user.level > loc.max_level) return res.status(400).json({ error: '你的等级已超过此地点推荐等级' });
      await doDig(req.user.id, loc, item, inv, res);
      return;
    }

    // 否则随机分配一个可用地点
    const locs = await db.getAll('SELECT * FROM `treasure_location` WHERE min_level <= ? AND max_level >= ? ORDER BY RAND() LIMIT 1',
      [user.level, user.level]);
    if (!locs.length) return res.status(500).json({ error: '没有可用的挖掘地点' });

    await doDig(req.user.id, locs[0], item, inv, res);
  } catch(e) { next(e); }
});

// 执行挖掘
/**
 * 宝图分享/世界广播
 * @param {string} text 分享文本（不含用户名）
 */
async function shareToWorld(userId, mapItem, loc, text) {
  try {
    // 防刷：每用户每 60 秒最多 1 条世界广播
    const now = Math.floor(Date.now() / 1000);
    const last = await db.getOne('SELECT created_at FROM `chat` WHERE user_id=? AND type IN (1,3) ORDER BY id DESC LIMIT 1', [userId]);
    if (last && now - last.created_at < 60) return;

    const user = await db.getOne('SELECT username, level FROM `user` WHERE `id`=?', [userId]);
    if (!user) return;
    // type=3 表示宝图分享（带特殊前缀方便前端识别）
    const msgText = `🗺️【${user.username}】在「${loc.name}」${text}`;
    await db.insert('chat', {
      user_id: userId,
      target_id: 0,
      message: msgText,
      type: 3, // 0=普通聊天 1=世界广播 2=系统 3=宝图分享
      created_at: now
    });
  } catch(e) {
    console.error('[treasure] shareToWorld error:', e.message);
  }
}

async function doDig(userId, loc, item, inv, res) {
  const quality = item.quality || 0;
  const user = await db.getOne('SELECT level FROM `user` WHERE `id`=?', [userId]);

  // 消耗藏宝图
  if (inv.quantity > 1) {
    await db.query('UPDATE `inventory` SET quantity = quantity - 1 WHERE `id`=?', [inv.id]);
  } else {
    await db.delete('inventory', '`id`=?', [inv.id]);
  }

  // 基础成功率：普通60%，精致50%，古老40%
  const baseRate = [60, 50, 40][quality] || 60;
  // 等级差惩罚：每差5级-5%（loc推荐等级 vs user level）
  const avgLocLevel = Math.floor((loc.min_level + loc.max_level) / 2);
  const levelDiff = Math.abs(avgLocLevel - user.level);
  const rate = Math.max(10, baseRate - Math.floor(levelDiff / 5) * 5);
  const roll = Math.random() * 100;

  let msg = '';
  let rewards = [];

  if (roll < rate) {
    // 挖掘成功：从奖励池抽取
    const rewardPool = await db.getAll('SELECT * FROM `treasure_reward` WHERE quality<=? AND min_level<=? ORDER BY RAND() LIMIT 10',
      [quality, user.level]);
    // 加权随机抽取1个
    const totalWeight = rewardPool.reduce((s, r) => s + r.weight, 0);
    let pick = Math.random() * totalWeight;
    let selected = rewardPool[0];
    for (const r of rewardPool) {
      pick -= r.weight;
      if (pick <= 0) { selected = r; break; }
    }
    // 发放奖励
    if (selected.type === 'money') {
      const amt = parseInt(selected.value);
      await db.query('UPDATE `user` SET money = money + ? WHERE `id`=?', [amt, userId]);
      msg = `🎉 挖掘成功！在你眼前出现了一个宝箱，内有 ${amt} 铜币！`;
      rewards.push({ type: 'money', value: selected.value });
      // ≥100 铜币发世界广播（防止 spam）
      if (amt >= 100) await shareToWorld(userId, item, loc, `挖到了 ${amt} 铜币`);
    } else if (selected.type === 'silver') {
      const amt = parseInt(selected.value);
      await db.query('UPDATE `user` SET silver = silver + ? WHERE `id`=?', [amt, userId]);
      msg = `🎉 挖掘成功！在地点「${loc.name}」挖出了一个古代钱币窖藏，获得 ${amt} 银币！`;
      rewards.push({ type: 'silver', value: selected.value });
      // 银币必分享（数量稀少）
      await shareToWorld(userId, item, loc, `挖到了 ${amt} 银币！`);
    } else if (selected.type === 'item') {
      const itemRow = await db.getOne('SELECT * FROM `item` WHERE `id`=?', [selected.value]);
      if (itemRow) {
        await addItem(userId, itemRow.id, 1);
        const qualLabel = ['', '精致', '古老'][itemRow.quality] || '';
        msg = `🎉 挖掘成功！发现了一个 ${qualLabel}${itemRow.name}！`;
        rewards.push({ type: 'item', value: itemRow.name });
        // 道具必分享 + 邮件
        await shareToWorld(userId, item, loc, `发现${qualLabel}【${itemRow.name}】`);
        try {
          const { sendMail } = require('./mail');
          await sendMail({ to: userId, from: 0, title: `🗺️ 宝图发掘：${itemRow.name}`, content: `你在「${loc.name}」挖掘【${item.name}】，获得了 ${qualLabel}·${itemRow.name}。愿你在纵横四海的旅程中继续收获惊喜！`, rewards: [{ type: 'item', value: itemRow.name, item_id: itemRow.id, quantity: 1 }] });
        } catch(e) {}
      }
    } else if (selected.type === 'goods') {
      await db.query('INSERT INTO `cargo` (user_id, goods_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity=quantity+?',
        [userId, selected.value, 1, 1]);
      const g = await db.getOne('SELECT name FROM `goods` WHERE `id`=?', [selected.value]);
      msg = `🎉 挖掘成功！发现了大量${g?.name || '货物'}！`;
      rewards.push({ type: 'goods', value: selected.value });
      await shareToWorld(userId, item, loc, `发现大量【${g?.name || '货物'}】`);
    }

    // 触发每日活跃
    try {
      const today = new Date().toISOString().slice(0,10);
      await db.query('INSERT IGNORE INTO `user_daily_activity` (user_id, date, activity_key, progress, claimed, updated_at) VALUES (?, ?, ?, 1, 0, ?)',
        [userId, today, 'daily_treasure', Math.floor(Date.now()/1000)]);
      await db.query('UPDATE `user_daily_activity` SET progress = LEAST(progress + 1, 100), updated_at = ? WHERE user_id =? AND date=? AND activity_key=?',
        [Math.floor(Date.now()/1000), userId, today, 'daily_treasure']);
    } catch(e) {}

  } else {
    // 挖掘失败
    const failMsgs = [
      '🪨 你挖了半天，只找到一堆碎石和一只受惊的螃蟹。',
      '🪨 挖掘中碰到了坚硬岩石，只能放弃。什么都没找到…',
      '🪨 这个地点被人挖过了，只剩下空空的坑。',
    ];
    msg = failMsgs[Math.floor(Math.random() * failMsgs.length)];
  }

  const updatedUser = await db.getOne('SELECT money, silver FROM `user` WHERE `id`=?', [userId]);

  // 触发宝图成就（成功失败都计数，累加统计后按阶梯解锁）
  let achievements = [];
  try {
    const newCount = (user.treasure_dig_count || 0) + 1;
    await db.query('UPDATE `user` SET treasure_dig_count = ? WHERE id = ?', [newCount, userId]);
    achievements = await triggerAchievements(userId, 'treasure_dig', newCount);
  } catch(e) { /* 非关键 */ }

  res.json({ success: true, msg, location: loc.name, rewards, money: updatedUser.money, silver: updatedUser.silver, achievements });
}

// 合成碎片：3块碎片（左右中）→ 古老藏宝图
router.post('/assemble', authMiddleware, async (req, res, next) => {
  try {
    // 检查3种碎片各至少1个
    const fL = await db.getOne('SELECT inv.id as inv_id FROM `inventory` inv JOIN `item` i ON inv.item_id=i.id WHERE inv.user_id=? AND i.subtype=? AND inv.equipped=0 LIMIT 1',
      [req.user.id, 'treasure_fragment']);
    if (!fL) return res.status(400).json({ error: '背包中没有藏宝图碎片' });

    const frags = await db.getAll(
      `SELECT inv.id as inv_id, i.subtype FROM inventory inv
       JOIN item i ON inv.item_id=i.id
       WHERE inv.user_id=? AND i.subtype='treasure_fragment' AND inv.equipped=0`,
      [req.user.id]);
    if (frags.length < 3) return res.status(400).json({ error: `碎片不足，还需要 ${3 - frags.length} 块碎片` });

    // 删除3个碎片
    const idsToDelete = frags.slice(0, 3).map(f => f.inv_id);
    for (const id of idsToDelete) await db.delete('inventory', '`id`=?', [id]);

    // 给予古老藏宝图
    await addItem(req.user.id, 90005, 1);

    res.json({ success: true, msg: '🗺️ 三块碎片成功拼合为「古老的藏宝图」！可用于挖掘更珍贵的宝藏。' });
  } catch(e) { next(e); }
});

// 查看碎片收集进度
router.get('/fragments', authMiddleware, async (req, res, next) => {
  try {
    const frags = await db.getAll(
      `SELECT i.name, i.subtype, inv.quantity, inv.id as inv_id
       FROM inventory inv JOIN item i ON inv.item_id=i.id
       WHERE inv.user_id=? AND i.subtype='treasure_fragment' AND inv.equipped=0`,
      [req.user.id]);

    const count = frags.reduce((s, f) => s + f.quantity, 0);
    const canAssemble = count >= 3;

    res.json({ fragments: count, canAssemble, items: frags });
  } catch(e) { next(e); }
});

// 获取可用挖掘地点列表
router.get('/locations', authMiddleware, async (req, res, next) => {
  try {
    const user = await db.getOne('SELECT level FROM `user` WHERE `id`=?', [req.user.id]);
    const locs = await db.getAll(
      'SELECT * FROM `treasure_location` WHERE min_level<=? AND max_level>=? ORDER BY min_level',
      [user.level, user.level]);
    res.json({ locations: locs });
  } catch(e) { next(e); }
});

// 添加道具给用户（内部函数）
async function addItem(userId, itemId, quantity) {
  const existing = await db.getOne('SELECT id, quantity FROM `inventory` WHERE `user_id`=? AND `item_id`=? AND `equipped`=0', [userId, itemId]);
  if (existing) {
    await db.query('UPDATE `inventory` SET quantity=quantity+? WHERE `id`=?', [quantity, existing.id]);
  } else {
    await db.insert('inventory', { user_id: userId, item_id: itemId, quantity, equipped: 0, identify_affixes: '' });
  }
}

module.exports = router;
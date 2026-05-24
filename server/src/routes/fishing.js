/**
 * 钓鱼路由
 * GET  /api/fishing/spots      - 可钓鱼的地点列表
 * POST /api/fishing/cast       - 抛竿（开始钓鱼）
 * POST /api/fishing/reel       - 收竿（获得鱼获）
 * DELETE /api/fishing/cancel   - 取消钓鱼
 */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 钓鱼地点配置（地点id -> 钓鱼点信息）
const FISHING_SPOTS = [
  { place_id: 10107, name: '威尼斯东部渔村', min_level: 1, fish_types: [1, 2, 3] },
  { place_id: 10401, name: '拉古扎北部渔港', min_level: 5, fish_types: [2, 3, 4] },
  { place_id: 20106, name: '北大西洋渔场', min_level: 10, fish_types: [3, 4, 5] },
  { place_id: 20308, name: '苏格兰东北海岸', min_level: 8, fish_types: [2, 3, 4] },
  { place_id: 20403, name: '北海渔场', min_level: 12, fish_types: [4, 5, 6] },
];

// 鱼类配置（fish_type -> goods_id, name, value）
const FISH_TYPES = {
  1: { goods_id: 23, name: '沙丁鱼', value_min: 8, value_max: 15, weight: 1 },     // 鱼肉
  2: { goods_id: 23, name: '鲭鱼', value_min: 12, value_max: 22, weight: 1 },
  3: { goods_id: 23, name: '鳕鱼', value_min: 18, value_max: 30, weight: 1 },
  4: { goods_id: 23, name: '金枪鱼', value_min: 25, value_max: 45, weight: 1 },
  5: { goods_id: 23, name: '剑鱼', value_min: 35, value_max: 60, weight: 1 },
  6: { goods_id: 23, name: '鲨鱼', value_min: 50, value_max: 90, weight: 1 },
};

// 钓鱼会话（userId -> { cast_at, spot, wait_seconds }）
const fishingSessions = new Map();

function randInt(min, max) {
  return Math.floor(Math.random() * (Number(max) - Number(min) + 1)) + Number(min);
}

// 获取用户当前装备的鱼竿
async function getEquippedRod(userId) {
  const rod = await db.getOne(
    `SELECT inv.id, inv.durability, inv.durability_max, i.name, i.atk as rod_power
     FROM inventory inv JOIN item i ON inv.item_id = i.id
     WHERE inv.user_id = ? AND inv.equipped = 1 AND i.subtype = 'fishing'`,
    [userId]
  );
  return rod;
}

// 获取用户背包中的鱼竿（未装备）
async function getOwnedRods(userId) {
  return await db.getAll(
    `SELECT inv.id, inv.durability, inv.durability_max, inv.quantity, i.name, i.atk as rod_power
     FROM inventory inv JOIN item i ON inv.item_id = i.id
     WHERE inv.user_id = ? AND inv.equipped = 0 AND i.subtype = 'fishing'`,
    [userId]
  );
}

// ===== GET /api/fishing/spots - 可钓鱼地点列表 =====
router.get('/spots', authMiddleware, async (req, res, next) => {
  try {
    const user = await db.getOne('SELECT id, level, place_id FROM `user` WHERE `id` = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: '角色不存在' });

    const equippedRod = await getEquippedRod(req.user.id);
    const spots = FISHING_SPOTS.map(s => {
      const dist = Math.abs(s.place_id - user.place_id);
      const reachable = dist <= 2 || s.place_id === user.place_id;
      return {
        place_id: s.place_id,
        name: s.name,
        min_level: s.min_level,
        can_fish: reachable && user.level >= s.min_level,
        reason: !reachable ? '距离太远' : (user.level < s.min_level ? `需要 Lv.${s.min_level}` : '可钓鱼')
      };
    });

    // 当前是否在钓鱼中
    const session = fishingSessions.get(req.user.id);
    const casting = !!session;

    res.json({ spots, equipped_rod: equippedRod ? { id: equippedRod.id, name: equippedRod.name, durability: equippedRod.durability, durability_max: equippedRod.durability_max } : null, casting, session: casting ? { spot_name: session.spot_name, remaining_sec: Math.max(0, session.cast_at + session.wait_seconds * 1000 - Date.now()) } : null });
  } catch (err) { next(err); }
});

// ===== POST /api/fishing/cast - 抛竿 =====
router.post('/cast', authMiddleware, async (req, res, next) => {
  try {
    const { place_id } = req.body;
    const user = await db.getOne('SELECT id, level, place_id, money FROM `user` WHERE `id` = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: '角色不存在' });

    // 检查鱼竿
    const rod = await getEquippedRod(req.user.id);
    if (!rod) return res.status(400).json({ error: '请先装备鱼竿（背包中找fishing类型的装备）' });

    // 检查耐久
    if (rod.durability <= 0) return res.status(400).json({ error: '鱼竿耐久为0，请修理后使用' });

    // 检查钓鱼地点
    const spot = FISHING_SPOTS.find(s => s.place_id === Number(place_id));
    if (!spot) return res.status(404).json({ error: '无效钓鱼点' });

    // 检查等级
    if (user.level < spot.min_level) return res.status(400).json({ error: `需要 Lv.${spot.min_level} 才能在此钓鱼` });

    // 检查距离（必须在附近或同地点）
    const dist = Math.abs(spot.place_id - user.place_id);
    if (dist > 2 && spot.place_id !== user.place_id) return res.status(400).json({ error: '距离太远，无法前往该钓鱼点' });

    // 检查是否已经在钓鱼
    if (fishingSessions.has(req.user.id)) {
      return res.status(400).json({ error: '正在钓鱼中，请先收竿或取消' });
    }

    // 根据鱼竿品质决定等待时间（3-8秒）
    const rodPower = rod.rod_power || 1;
    const waitSeconds = Math.max(3, Math.min(8, 5 - Math.floor(rodPower / 10)));
    const castAt = Date.now();

    fishingSessions.set(req.user.id, {
      cast_at: castAt,
      wait_seconds: waitSeconds,
      spot_name: spot.name,
      place_id: spot.place_id,
      fish_types: spot.fish_types,
      rod_id: rod.id,
      rod_power: rodPower
    });

    res.json({
      casting: true,
      msg: `🎣 在「${spot.name}」抛竿成功！等待 ${waitSeconds} 秒后收竿…`,
      remaining_sec: waitSeconds
    });
  } catch (err) { next(err); }
});

// ===== POST /api/fishing/reel - 收竿 =====
router.post('/reel', authMiddleware, async (req, res, next) => {
  try {
    const session = fishingSessions.get(req.user.id);
    if (!session) return res.status(400).json({ error: '没有正在进行的钓鱼' });

    const elapsed = (Date.now() - session.cast_at) / 1000;
    if (elapsed < session.wait_seconds) {
      const remain = Math.ceil(session.wait_seconds - elapsed);
      return res.status(400).json({ error: `还需要等待 ${remain} 秒`, remaining_sec: remain });
    }

    // 扣鱼竿耐久
    const newDur = Math.max(0, session.rod_id ? await db.getOne('SELECT durability FROM inventory WHERE id = ?', [session.rod_id])?.durability - 1 : 0);
    if (session.rod_id) {
      await db.query('UPDATE inventory SET durability = ? WHERE id = ?', [newDur, session.rod_id]);
      if (newDur <= 0) {
        await db.query('UPDATE inventory SET equipped = 0 WHERE id = ?', [session.rod_id]);
      }
    }

    // 随机鱼种（根据地点的fish_types）
    const fishPool = session.fish_types;
    const fishType = fishPool[Math.floor(Math.random() * fishPool.length)];
    const fishConfig = FISH_TYPES[fishType];
    if (!fishConfig) return res.status(500).json({ error: '鱼种配置错误' });

    // 计算钓获数量（1-3条，品质越高数量越多）
    const rodPower = session.rod_power || 1;
    const qty = Math.floor(Math.random() * Math.min(rodPower, 5)) + 1;
    const totalValue = randInt(fishConfig.value_min, fishConfig.value_max) * qty;

    // 添加到货物背包（cargo）
    const existing = await db.getOne(
      'SELECT id, quantity FROM cargo WHERE user_id = ? AND goods_id = ?',
      [req.user.id, fishConfig.goods_id]
    );
    if (existing) {
      await db.query('UPDATE cargo SET quantity = quantity + ? WHERE id = ?', [qty, existing.id]);
    } else {
      await db.insert('cargo', { user_id: req.user.id, goods_id: fishConfig.goods_id, quantity: qty });
    }

    // 给少量铜币（卖鱼所得的期望值）
    await db.query('UPDATE `user` SET money = money + ? WHERE `id` = ?', [totalValue, req.user.id]);

    // 触发每日活跃
    try {
      const today = new Date().toISOString().slice(0, 10);
      await db.query(
        'INSERT IGNORE INTO `user_daily_activity` (user_id, date, activity_key, progress, claimed, updated_at) VALUES (?, ?, ?, 1, 0, ?)',
        [req.user.id, today, 'daily_fishing', Math.floor(Date.now() / 1000)]
      );
      await db.query(
        'UPDATE `user_daily_activity` SET progress = LEAST(progress + 1, 3), updated_at = ? WHERE user_id = ? AND date = ? AND activity_key = ?',
        [Math.floor(Date.now() / 1000), req.user.id, today, 'daily_fishing']
      );
    } catch (e) { console.error('[daily] daily_fishing error:', e.message); }

    // 记录钓鱼日志
    await db.insert('fishing_log', {
      user_id: req.user.id,
      goods_id: fishConfig.goods_id,
      quantity: qty,
      fish_type: fishType,
      value: totalValue,
      created_at: Math.floor(Date.now() / 1000)
    });

    fishingSessions.delete(req.user.id);

    res.json({
      success: true,
      msg: `🎣 收竿成功！钓获「${fishConfig.name}」×${qty}！卖出得 ${totalValue} 铜币`,
      fish_name: fishConfig.name,
      quantity: qty,
      money_earned: totalValue,
      new_durability: newDur
    });
  } catch (err) { next(err); }
});

// ===== DELETE /api/fishing/cancel - 取消钓鱼 =====
router.delete('/cancel', authMiddleware, (req, res) => {
  if (fishingSessions.has(req.user.id)) {
    fishingSessions.delete(req.user.id);
    res.json({ success: true, msg: '取消钓鱼' });
  } else {
    res.status(400).json({ error: '没有正在进行的钓鱼' });
  }
});

// ===== POST /api/fishing/repair - 修理鱼竿 =====
router.post('/repair', authMiddleware, async (req, res, next) => {
  try {
    const user = await db.getOne('SELECT id, money FROM `user` WHERE `id` = ?', [req.user.id]);

    // 找背包里耐久<最大耐久的鱼竿
    const rods = await db.getAll(
      `SELECT inv.id, inv.durability, inv.durability_max, i.name, i.price_buy
       FROM inventory inv JOIN item i ON inv.item_id = i.id
       WHERE inv.user_id = ? AND inv.equipped = 0 AND i.subtype = 'fishing' AND inv.durability < inv.durability_max`,
      [req.user.id]
    );
    if (rods.length === 0) return res.status(400).json({ error: '没有需要修理的鱼竿' });

    // 修理第一把（通常只有一把）
    const rod = rods[0];
    const repairCost = Math.floor((rod.price_buy * 0.1) * (1 - rod.durability / rod.durability_max));
    if (user.money < repairCost) return res.status(400).json({ error: `修理费 ${repairCost} 铜币不足` });

    await db.query('UPDATE `user` SET money = money - ? WHERE `id` = ?', [repairCost, req.user.id]);
    await db.query('UPDATE inventory SET durability = durability_max WHERE id = ?', [rod.id]);

    res.json({ success: true, msg: `✅ 「${rod.name}」修复完成，消耗 ${repairCost} 铜币` });
  } catch (err) { next(err); }
});

// ===== GET /api/fishing/log - 钓鱼记录 =====
router.get('/log', authMiddleware, async (req, res, next) => {
  try {
    const logs = await db.getAll(
      'SELECT fl.*, g.name as goods_name FROM fishing_log fl LEFT JOIN goods g ON fl.goods_id = g.id WHERE fl.user_id = ? ORDER BY fl.created_at DESC LIMIT 20',
      [req.user.id]
    );
    res.json({ logs });
  } catch (err) { next(err); }
});

module.exports = router;
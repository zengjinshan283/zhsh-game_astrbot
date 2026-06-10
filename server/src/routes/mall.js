/**
 * 商城系统 - 每日轮换商城
 * GET  /api/mall          - 获取商城商品列表
 * POST /api/mall/buy      - 购买商品
 * POST /api/mall/refresh  - 刷新商品
 *
 * 货币说明：铜币(money)为通用货币
 * 刷新规则：每天免费刷新1次，之后每次消耗100铜币
 */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 商品分类
const CATEGORIES = [
  { key: 'weapon',    label: '武器' },
  { key: 'armor',     label: '防具' },
  { key: 'accessory', label: '饰品' },
  { key: 'consumable',label: '消耗品' },
  { key: 'material',  label: '材料' },
];

// 基础价格表（item_id → base_price）
const BASE_PRICE = {
  201:500, 202:480, 203:520,
  301:400, 302:380,
  401:200, 402:200,
  501:50, 502:50, 503:100,
  601:150, 602:120, 603:80,
  90001:500,
  90002:50, 90004:50, 90005:2000,
  91001:200, 91002:500, 91003:1200,
  91004:200, 91005:500, 91006:1200,
  91007:200, 91008:500,
};

const MALL_SIZE = 12;      // 每日商品数
const REFRESH_COST = 100;  // 额外刷新铜币消耗
const FREE_REFRESH = 1;    // 每日免费刷新次数

// 获取今日 CST 日期字符串
function getCSTDate() {
  const now = new Date();
  const cst = new Date(now.getTime() + 8 * 3600000);
  return cst.toISOString().slice(0, 10);
}

// 获取用户今日日期的商城商品，没有则生成
async function getTodayMall(uid) {
  const today = getCSTDate();

  // 查今日已有商品
  const rows = await db.getAll(
    `SELECT um.*, i.name, mp.category
     FROM user_mall um
     JOIN item i ON i.id = um.item_id
     JOIN mall_item_pool mp ON mp.item_id = um.item_id
     WHERE um.user_id = ? AND um.mall_date = ?`,
    [uid, today]
  );

  if (rows.length > 0) return rows;

  // 生成今日商品
  await generateDailyMall(uid, today);

  return db.getAll(
    `SELECT um.*, i.name, mp.category
     FROM user_mall um
     JOIN item i ON i.id = um.item_id
     JOIN mall_item_pool mp ON mp.item_id = um.item_id
     WHERE um.user_id = ? AND um.mall_date = ?`,
    [uid, today]
  );
}

// 生成每日商品（加权随机抽取）
async function generateDailyMall(uid, date) {
  const user = await db.getOne('SELECT level FROM user WHERE id = ?', [uid]);
  const level = user?.level || 1;

  // 按等级和权重随机抽取
  const pool = await db.getAll(
    `SELECT item_id, category, weight FROM mall_item_pool
     WHERE min_level <= ? AND max_level >= ? AND is_special = 0
     ORDER BY RAND()`,
    [level, level]
  );

  // 加权随机算法
  const totalWeight = pool.reduce((s, r) => s + r.weight, 0);
  const selected = [];
  const rest = [...pool];

  while (selected.length < MALL_SIZE && rest.length > 0) {
    let r = Math.random() * totalWeight;
    let acc = 0;
    for (let i = 0; i < rest.length; i++) {
      acc += rest[i].weight;
      if (r <= acc) {
        selected.push(rest[i]);
        rest.splice(i, 1);
        break;
      }
    }
  }

  // 插入数据库
  for (const item of selected) {
    const base = BASE_PRICE[item.item_id] || 100;
    // 价格浮动 ±20%
    const price = Math.max(1, Math.round(base * (0.8 + Math.random() * 0.4)));
    await db.query(
      `INSERT IGNORE INTO user_mall (user_id, item_id, price, refresh_cnt, mall_date)
       VALUES (?, ?, ?, 0, ?)`,
      [uid, item.item_id, price, date]
    );
  }
}

// 获取商城商品列表
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const today = getCSTDate();

    const user = await db.getOne('SELECT money, level FROM user WHERE id = ?', [uid]);
    const mallItems = await getTodayMall(uid);

    // 检查今日刷新次数
    const refreshInfo = await db.getOne(
      'SELECT COUNT(*) as cnt FROM user_mall WHERE user_id = ? AND mall_date = ? AND refresh_cnt > 0',
      [uid, today]
    );
    const refreshUsed = refreshInfo.cnt > 0 ? 1 : 0; // 免费刷新已用？

    // 取任意一条记录的 refresh_cnt 来判断额外刷新次数
    const anyItem = mallItems[0] || {};
    const extraRefreshes = Math.max(0, (anyItem.refresh_cnt || 0) - 1);

    res.json({
      categories: CATEGORIES,
      items: mallItems.map(r => ({
        item_id: r.item_id,
        name: r.name,
        category: r.category,
        price: r.price,
      })),
      userMoney: user.money,
      level: user.level,
      refreshUsed,     // 免费刷新是否已用
      extraRefreshes,  // 已花费铜币的额外刷新次数
      refreshCost: REFRESH_COST,
      date: today,
    });
  } catch (err) { next(err); }
});

// 刷新商品
router.post('/refresh', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const today = getCSTDate();

    // 检查今日刷新次数
    const anyItem = await db.getOne(
      'SELECT refresh_cnt FROM user_mall WHERE user_id = ? AND mall_date = ? LIMIT 1',
      [uid, today]
    );

    let refreshCnt = anyItem ? anyItem.refresh_cnt : 0;
    let needCost = 0;

    if (refreshCnt >= FREE_REFRESH + 10) {
      // 安全上限：最多额外刷新10次
      return res.status(400).json({ error: '今日刷新次数已达上限' });
    }

    if (refreshCnt >= FREE_REFRESH) {
      // 需要铜币
      const user = await db.getOne('SELECT money FROM user WHERE id = ?', [uid]);
      if (user.money < REFRESH_COST) {
        return res.status(400).json({ error: `铜币不足，需要${REFRESH_COST}铜币` });
      }
      await db.query('UPDATE user SET money = money - ? WHERE id = ?', [REFRESH_COST, uid]);
      needCost = REFRESH_COST;
    }

    // 删除旧商品，重新生成
    await db.query('DELETE FROM user_mall WHERE user_id = ? AND mall_date = ?', [uid, today]);
    await generateDailyMall(uid, today);

    const items = await db.getAll(
      `SELECT um.item_id, um.price, i.name, mp.category
       FROM user_mall um JOIN item i ON i.id = um.item_id
       JOIN mall_item_pool mp ON mp.item_id = um.item_id
       WHERE um.user_id = ? AND um.mall_date = ?`,
      [uid, today]
    );

    // 更新 refresh_cnt（因为免费刷新也产生了记录，这里记录刷新次数）
    // 实际刷新次数 = 原refresh_cnt + 1
    const newRefreshCnt = refreshCnt + 1;
    await db.query(
      'UPDATE user_mall SET refresh_cnt = ? WHERE user_id = ? AND mall_date = ?',
      [newRefreshCnt, uid, today]
    );

    const msg = needCost > 0
      ? `商品已刷新，花费${needCost}铜币`
      : `商品已刷新（今日免费次数已用完）`;

    res.json({ success: true, msg, cost: needCost, items });
  } catch (err) { next(err); }
});

// 购买商品
router.post('/buy', authMiddleware, async (req, res, next) => {
  try {
    const { item_id, quantity = 1 } = req.body;
    const qty = Math.max(1, parseInt(quantity) || 1);
    const uid = req.user.id;
    const today = getCSTDate();

    // 从今日商城查商品
    const mallItem = await db.getOne(
      'SELECT * FROM user_mall WHERE user_id = ? AND item_id = ? AND mall_date = ?',
      [uid, parseInt(item_id), today]
    );

    if (!mallItem) return res.status(400).json({ error: '商品不存在或已下架' });

    const totalCost = mallItem.price * qty;
    const user = await db.getOne('SELECT id, money, level FROM user WHERE id = ?', [uid]);

    if (user.money < totalCost) {
      return res.status(400).json({ error: `铜币不足，需要${totalCost}铜币，您有${user.money}铜币` });
    }

    await db.query('UPDATE user SET money = money - ? WHERE id = ?', [totalCost, uid]);

    // 写死消耗品处理（参考原mall.js）
    const consumables = { 501: 'heal_hp', 502: 'heal_mp', 503: 'gain_exp' };
    let applied = false;
    let msg = '';

    if (consumables[item_id]) {
      if (item_id == 501) {
        await db.query('UPDATE user SET hp = LEAST(hp + 500 * ?, hp_max) WHERE id = ?', [qty, uid]);
        applied = true; msg = `使用高级生命药水×${qty}，HP恢复${500*qty}`;
      } else if (item_id == 502) {
        await db.query('UPDATE user SET mp = LEAST(mp + 300 * ?, mp_max) WHERE id = ?', [qty, uid]);
        applied = true; msg = `使用魔法泉水×${qty}，MP恢复${300*qty}`;
      } else if (item_id == 503) {
        const u = await db.getOne('SELECT exp, exp_max, level FROM user WHERE id = ?', [uid]);
        let newExp = u.exp + 5000 * qty, newLevel = u.level, newExpMax = u.exp_max || 500, leveled = false;
        while (newExp >= newExpMax) { newExp -= newExpMax; newLevel++; newExpMax = 500 + 300 * (newLevel - 1); leveled = true; }
        await db.query('UPDATE user SET exp = ?, level = ?, exp_max = ? WHERE id = ?', [newExp, newLevel, newExpMax, uid]);
        applied = true; msg = `使用经验丹×${qty}，获得${5000*qty}经验${leveled ? '，升级！' : ''}`;
      }
      if (applied) {
        return res.json({ success: true, msg, cost: totalCost, remainingMoney: user.money - totalCost });
      }
    }

    // 非消耗品：加入背包
    const existing = await db.getOne(
      'SELECT id, quantity FROM inventory WHERE user_id = ? AND item_id = ? AND equipped = 0',
      [uid, item_id]
    );
    if (existing) {
      await db.query('UPDATE inventory SET quantity = quantity + ? WHERE id = ?', [qty, existing.id]);
    } else {
      await db.insert('inventory', { user_id: uid, item_id, quantity: qty, equipped: 0, enhance_level: 0 });
    }

    const item = await db.getOne('SELECT name FROM item WHERE id = ?', [item_id]);
    res.json({
      success: true,
      msg: `购买 ${item?.name || '物品'}×${qty} 成功，花费${totalCost}铜币`,
      item: { id: item_id, name: item?.name, quantity: qty },
      cost: totalCost,
      remainingMoney: user.money - totalCost,
    });
  } catch (err) { next(err); }
});

module.exports = router;
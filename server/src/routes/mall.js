/**
 * 商城系统路由 - 用铜币购买物品
 * GET  /api/mall      - 获取商城商品列表
 * POST /api/mall/buy  - 购买商品
 * 货币说明：铜币(money)为通用货币，通过打怪/任务/贸易获得
 */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 商城商品分类
const CATEGORIES = [
  { key: 'weapon',   label: '武器' },
  { key: 'armor',    label: '防具' },
  { key: 'accessory',label: '饰品' },
  { key: 'consumable', label: '消耗品' },
  { key: 'material', label: '材料' },
];

// 静态商城商品配置（可在数据库或配置文件扩展）
const MALL_ITEMS = [
  // 武器
  { id: 201, category: 'weapon',   name: '玄铁剑',     price: 500,  description: '稀有武器，攻击力+50',    atk_min: 50, atk_max: 80 },
  { id: 202, category: 'weapon',   name: '烈焰刀',     price: 480,  description: '稀有武器，攻击力+45',    atk_min: 45, atk_max: 75 },
  { id: 203, category: 'weapon',   name: '寒冰杖',     price: 520,  description: '稀有武器，攻击力+55',    atk_min: 55, atk_max: 85 },
  // 防具
  { id: 301, category: 'armor',    name: '钢铁护甲',   price: 400,  description: '稀有防具，防御+40',      def: 40 },
  { id: 302, category: 'armor',    name: '鳞甲',       price: 380,  description: '稀有防具，防御+35',      def: 35 },
  // 饰品
  { id: 401, category: 'accessory',name: '生命戒指',   price: 200,  description: '生命值上限+100',         hp_max: 100 },
  { id: 402, category: 'accessory',name: '敏捷护符',   price: 200,  description: '敏捷+20',                agility: 20 },
  // 消耗品
  { id: 501, category: 'consumable',name: '高级生命药水', price: 50, description: '恢复500HP',              heal_hp: 500 },
  { id: 502, category: 'consumable',name: '魔法泉水',  price: 50,  description: '恢复300MP',              heal_mp: 300 },
  { id: 503, category: 'consumable',name: '经验丹',    price: 100, description: '获得5000经验',           gain_exp: 5000 },
  // 材料
  { id: 601, category: 'material', name: '陨铁',       price: 150,  description: '稀有锻造材料',            },
  { id: 602, category: 'material', name: '魔兽结晶',   price: 120,  description: '可用于强化装备',        },
  { id: 603, category: 'material', name: '神秘碎片',   price: 80,   description: '合成稀有道具的材料',     },
];

// 获取商城商品列表
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const user = await db.getOne('SELECT money, level FROM `user` WHERE `id` = ?', [req.user.id]);
    res.json({
      categories: CATEGORIES,
      items: MALL_ITEMS,
      userMoney: user.money,
      level: user.level,
    });
  } catch (err) {
    next(err);
  }
});

// 购买商品
router.post('/buy', authMiddleware, async (req, res, next) => {
  try {
    const { item_id, quantity = 1 } = req.body;
    const qty = Math.max(1, parseInt(quantity) || 1);

    // 查找商品
    const item = MALL_ITEMS.find(i => i.id === parseInt(item_id));
    if (!item) {
      return res.status(400).json({ error: '商品不存在' });
    }

    const totalCost = item.price * qty;
    const user = await db.getOne('SELECT id, money, level FROM `user` WHERE `id` = ?', [req.user.id]);

    if (user.money < totalCost) {
      return res.status(400).json({ error: `铜币不足，需要${totalCost}铜币，您有${user.money}铜币` });
    }

    // 扣铜币
    await db.query('UPDATE `user` SET `money` = `money` - ? WHERE `id` = ?', [totalCost, req.user.id]);

    // 根据物品类型处理
    const stats = {};
    let applied = false;

    // 消耗品直接使用
    if (item.category === 'consumable') {
      if (item.heal_hp) {
        await db.query('UPDATE `user` SET `hp` = LEAST(`hp` + ?, `hp_max`) WHERE `id` = ?', [item.heal_hp * qty, req.user.id]);
        applied = true;
      }
      if (item.heal_mp) {
        await db.query('UPDATE `user` SET `mp` = LEAST(`mp` + ?, `mp_max`) WHERE `id` = ?', [item.heal_mp * qty, req.user.id]);
        applied = true;
      }
      if (item.gain_exp) {
        // 经验处理参考 sign.js 的升级逻辑
        const u = await db.getOne('SELECT exp, exp_max, level FROM `user` WHERE `id` = ?', [req.user.id]);
        let newExp = u.exp + item.gain_exp * qty;
        let newLevel = u.level;
        let newExpMax = u.exp_max || 500;
        let leveled = false;
        while (newExp >= newExpMax) {
          newExp -= newExpMax;
          newLevel++;
          newExpMax = 500 + 300 * (newLevel - 1);
          leveled = true;
        }
        await db.query('UPDATE `user` SET `exp` = ?, `level` = ?, `exp_max` = ? WHERE `id` = ?', [newExp, newLevel, newExpMax, req.user.id]);
        applied = true;
      }
      if (applied) {
        return res.json({
          success: true,
          msg: `使用${item.name}×${qty}成功！`,
          item: { id: item.id, name: item.name, quantity: qty },
          cost: totalCost,
        });
      }
    }

    // 非消耗品：添加物品到背包
    // 查找是否已有同类未装备物品
    const existing = await db.getOne(
      'SELECT id, quantity FROM `inventory` WHERE `user_id` = ? AND `item_id` = ? AND `equipped` = 0',
      [req.user.id, item.id]
    );

    if (existing) {
      await db.query('UPDATE `inventory` SET `quantity` = `quantity` + ? WHERE `id` = ?', [qty, existing.id]);
    } else {
      // 构建插入数据
      const invData = {
        user_id: req.user.id,
        item_id: item.id,
        quantity: qty,
        equipped: 0,
        enhance_level: 0,
      };
      // 装备属性存储在 item 表，inventory 只存储基础数据
      await db.insert('inventory', invData);
    }

    res.json({
      success: true,
      msg: `购买 ${item.name}×${qty} 成功，花费${totalCost}铜币`,
      item: { id: item.id, name: item.name, quantity: qty },
      cost: totalCost,
      remainingMoney: user.money - totalCost,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
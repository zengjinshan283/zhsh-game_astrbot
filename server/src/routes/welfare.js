/**
 * 福利系统路由 - 新手福利/7日登录/成长里程碑
 */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// 统一发物品帮助函数
async function addItems(uid, items) {
  for (const item of items) {
    const existing = await db.getOne(
      "SELECT id, quantity FROM `inventory` WHERE `user_id` = ? AND `item_id` = ? AND `equipped` = 0",
      [uid, item.id]
    );
    if (existing) {
      await db.update('inventory', { quantity: existing.quantity + item.qty }, '`id` = ?', [existing.id]);
    } else {
      await db.insert('inventory', { user_id: uid, item_id: item.id, quantity: item.qty, equipped: 0 });
    }
  }
}

// 获取福利状态（新手礼包/7日登录/里程碑）
router.get('/status', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const user = await db.getOne(
      'SELECT guide_step, login_days, milestone_claimed, starter_claimed, level FROM `user` WHERE `id` = ?',
      [uid]
    );

    // 7日登录状态
    const loginRecords = await db.getAll(
      'SELECT day_index, claimed FROM `welfare_login` WHERE `user_id` = ?',
      [uid]
    );
    const loginMap = {};
    for (const r of loginRecords) loginMap[r.day_index] = r.claimed;

    // 里程碑状态（从用户字段+表双重判断）
    const milestones = await db.getAll(
      'SELECT milestone_id FROM `welfare_milestone` WHERE `user_id` = ?',
      [uid]
    );
    const claimedSet = new Set(milestones.map(m => m.milestone_id));

    // 可领取的里程碑（当前等级 >= 里程碑等级 且 未领取）
    const milestoneRewards = {
      lv10: { level: 10, money: 2000, exp: 500, items: [{ id: 22, qty: 1 }, { id: 3, qty: 5 }] },
      lv20: { level: 20, money: 5000, exp: 1500, items: [{ id: 24, qty: 1 }, { id: 3, qty: 10 }] },
      lv30: { level: 30, money: 10000, exp: 3000, items: [{ id: 28, qty: 1 }, { id: 4, qty: 5 }] },
      lv40: { level: 40, money: 20000, exp: 5000, items: [{ id: 115, qty: 1 }, { id: 127, qty: 2 }] },
      lv50: { level: 50, money: 30000, exp: 8000, items: [] }
    };

    res.json({
      starter_claimed: user.starter_claimed === 1,
      login_days: user.login_days,
      login_map: loginMap,   // { dayIndex: 0/1 } 0未领 1已领
      guide_step: user.guide_step,
      milestones: Object.entries(milestoneRewards).map(([id, r]) => ({
        id,
        level: r.level,
        can_claim: user.level >= r.level && !claimedSet.has(id),
        claimed: claimedSet.has(id)
      }))
    });
  } catch (err) { next(err); }
});

// 领取注册礼包
router.post('/claim-starter', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const user = await db.getOne('SELECT starter_claimed FROM `user` WHERE `id` = ?', [uid]);
    if (user.starter_claimed === 1) return res.status(400).json({ error: '注册礼包已领取' });

    // 5000铜 + 铁剑 + 小HP药×3 + 港口地图
    await db.update('user', { money: user.money + 5000, starter_claimed: 1 }, '`id` = ?', [uid]);
    await addItems(uid, [
      { id: 2, qty: 1 },   // 铁剑
      { id: 1, qty: 3 },   // 小回复药
      { id: 115, qty: 1 }  // 港口地图
    ]);

    res.json({ success: true, msg: '🎁 注册礼包已发放！铜币+5000，铁剑×1，小HP药×3，港口地图×1' });
  } catch (err) { next(err); }
});

// 领取每日登录奖励
router.post('/claim-login', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const user = await db.getOne('SELECT login_days FROM `user` WHERE `id` = ?', [uid]);
    const dayIndex = user.login_days; // 1-7

    if (dayIndex > 7) return res.status(400).json({ error: '7日奖励已全部领取完毕' });

    // 检查是否已领取
    const existing = await db.getOne(
      'SELECT id FROM `welfare_login` WHERE `user_id` = ? AND `day_index` = ? AND `claimed` = 1',
      [uid, dayIndex]
    );
    if (existing) return res.status(400).json({ error: `第${dayIndex}日奖励已领取` });

    // 奖励配置
    const rewards = {
      1: { money: 500,  items: [{ id: 1, qty: 2 }] },
      2: { money: 1000, items: [{ id: 3, qty: 1 }] },
      3: { money: 1500, items: [{ id: 22, qty: 1 }] },
      4: { money: 2000, items: [{ id: 3, qty: 2 }] },
      5: { money: 3000, items: [{ id: 4, qty: 1 }] },
      6: { money: 5000, items: [{ id: 127, qty: 1 }] },
      7: { money: 10000, items: [{ id: 22, qty: 1 }, { id: 3, qty: 3 }] }
    };

    const reward = rewards[dayIndex];
    if (!reward) return res.status(400).json({ error: '奖励配置错误' });

    await db.query('UPDATE `user` SET money = money + ? WHERE `id` = ?', [reward.money, uid]);
    if (reward.items.length > 0) await addItems(uid, reward.items);
    await db.insert('welfare_login', { user_id: uid, day_index: dayIndex, claimed: 1, claimed_at: Math.floor(Date.now() / 1000) });

    const itemNames = reward.items.map(i => `物品×${i.qty}`).join('、');
    res.json({ success: true, msg: `🎁 第${dayIndex}日奖励：铜币+${reward.money}${itemNames ? '，' + itemNames : ''}` });
  } catch (err) { next(err); }
});

// 领取成长里程碑奖励
router.post('/claim-milestone', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const { milestone_id } = req.body; // 'lv10' 'lv20' 等

    const user = await db.getOne('SELECT level, exp, exp_max FROM `user` WHERE `id` = ?', [uid]);

    const rewards = {
      lv10: { money: 2000, exp: 500,  items: [{ id: 22, qty: 1 }, { id: 3, qty: 5 }] },
      lv20: { money: 5000, exp: 1500, items: [{ id: 24, qty: 1 }, { id: 3, qty: 10 }] },
      lv30: { money: 10000, exp: 3000, items: [{ id: 28, qty: 1 }, { id: 4, qty: 5 }] },
      lv40: { money: 20000, exp: 5000, items: [{ id: 115, qty: 1 }, { id: 127, qty: 2 }] },
      lv50: { money: 30000, exp: 8000, items: [] }
    };

    const reward = rewards[milestone_id];
    if (!reward) return res.status(400).json({ error: '无效的里程碑' });

    const milestoneLevels = { lv10: 10, lv20: 20, lv30: 30, lv40: 40, lv50: 50 };
    if (user.level < milestoneLevels[milestone_id]) {
      return res.status(400).json({ error: `需要达到${milestoneLevels[milestone_id]}级才能领取` });
    }

    // 检查是否已领取（表+用户字段双重检查）
    const exists = await db.getOne(
      'SELECT id FROM `welfare_milestone` WHERE `user_id` = ? AND `milestone_id` = ?',
      [uid, milestone_id]
    );
    if (exists) return res.status(400).json({ error: '该里程碑奖励已领取' });

    // 发铜币和经验
    await db.query('UPDATE `user` SET money = money + ?, exp = exp + ? WHERE `id` = ?', [reward.money, reward.exp, uid]);
    if (reward.items.length > 0) await addItems(uid, reward.items);
    await db.insert('welfare_milestone', { user_id: uid, milestone_id, level: user.level, claimed_at: Math.floor(Date.now() / 1000) });

    const itemNames = reward.items.map(i => `物品×${i.qty}`).join('、');
    res.json({ success: true, msg: `🏆 里程碑奖励：铜币+${reward.money}，经验+${reward.exp}${itemNames ? '，' + itemNames : ''}` });
  } catch (err) { next(err); }
});

module.exports = router;
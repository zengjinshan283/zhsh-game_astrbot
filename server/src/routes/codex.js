/**
 * 装备图鉴路由 - 展示玩家已收集的装备图鉴
 * GET  /api/codex/list      - 获取图鉴列表（含解锁状态）
 * POST /api/codex/unlock/:itemId - 解锁图鉴（获得装备时调用）
 */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 获取装备图鉴列表
router.get('/list', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const { category } = req.query; // weapon/armor/accessory/consumable/material

    // 物品类型映射：1=武器,2=防具,3=饰品,4=消耗品,5=材料
    const typeMap = { weapon: 1, armor: 2, accessory: 3, consumable: 4, material: 5 };
    const typeFilter = category && typeMap[category] ? `AND type = ${typeMap[category]}` : '';

    // 获取所有物品（分页）
    const items = await db.getAll(
      `SELECT id, name, type, subtype, description, atk, def_val, quality FROM item WHERE type IN (1,2,3,4,5) ${typeFilter} ORDER BY type, id`
    );

    // 获取已解锁记录
    const unlocked = await db.getAll('SELECT item_id, unlocked_at FROM user_codex WHERE user_id = ?', [uid]);
    const unlockedMap = {};
    unlocked.forEach(r => { unlockedMap[r.item_id] = r.unlocked_at; });

    // 统计
    const total = items.length;
    const unlockedCount = items.filter(i => !!unlockedMap[i.id]).length;

    // 分类标签
    const categories = [
      { key: 'all', label: '全部', count: items.length },
      { key: 'weapon', label: '武器', count: items.filter(i => i.type === 1).length },
      { key: 'armor', label: '防具', count: items.filter(i => i.type === 2).length },
      { key: 'accessory', label: '饰品', count: items.filter(i => i.type === 3).length },
      { key: 'consumable', label: '消耗品', count: items.filter(i => i.type === 4).length },
      { key: 'material', label: '材料', count: items.filter(i => i.type === 5).length },
    ];

    res.json({
      categories,
      total,
      unlocked_count: unlockedCount,
      items: items.map(i => ({
        ...i,
        unlocked: !!unlockedMap[i.id],
        unlocked_at: unlockedMap[i.id] || null,
        // 品质颜色：0白/1绿/2蓝/3紫/4橙
        quality_color: ['', '#4caf50', '#2196f3', '#9c27b0', '#ff9800'][i.quality] || '#999',
        type_name: ['', '武器', '防具', '饰品', '消耗品', '材料'][i.type] || '其他'
      }))
    });
  } catch (err) { next(err); }
});

// 解锁图鉴（获得装备时自动调用，或首次获得时）
router.post('/unlock/:itemId', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const itemId = parseInt(req.params.itemId);

    const existing = await db.getOne(
      'SELECT id FROM user_codex WHERE user_id = ? AND item_id = ?',
      [uid, itemId]
    );
    if (existing) {
      return res.json({ success: true, msg: '已解锁' });
    }

    await db.insert('user_codex', {
      user_id: uid,
      item_id: itemId,
      unlocked_at: Math.floor(Date.now() / 1000)
    });

    const item = await db.getOne('SELECT name FROM item WHERE id = ?', [itemId]);
    res.json({ success: true, msg: `图鉴解锁：${item?.name || '未知物品'}` });
  } catch (err) { next(err); }
});

// ===== 收集奖励 =====
router.get('/rewards', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;

    // 当前收集数量
    const row = await db.getOne('SELECT COUNT(*) as cnt FROM user_codex WHERE user_id = ?', [uid]);
    const currentCount = row?.cnt || 0;

    // 所有奖励档位
    const rewards = await db.getAll('SELECT * FROM codex_reward ORDER BY require_count ASC');

    // 已领取记录
    const claimed = await db.getAll('SELECT reward_id, claimed_at FROM user_codex_reward WHERE user_id = ?', [uid]);
    const claimedMap = {};
    claimed.forEach(r => { claimedMap[r.reward_id] = r.claimed_at; });

    // 判断每个档位状态
    const result = rewards.map(r => {
      const isClaimed = claimedMap[r.reward_id] > 0;
      const canClaim = currentCount >= r.require_count && !isClaimed;
      return {
        ...r,
        is_claimed: isClaimed,
        can_claim: canClaim,
        claimed_at: claimedMap[r.reward_id] || null,
        current_count: currentCount
      };
    });

    res.json({
      current_count: currentCount,
      rewards: result
    });
  } catch (err) { next(err); }
});

// ===== 领取奖励 =====
router.post('/rewards/:id/claim', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const rewardId = parseInt(req.params.id);

    const reward = await db.getOne('SELECT * FROM codex_reward WHERE id = ?', [rewardId]);
    if (!reward) return res.status(404).json({ error: '奖励不存在' });

    // 检查是否已领取
    const existing = await db.getOne(
      'SELECT id FROM user_codex_reward WHERE user_id = ? AND reward_id = ?',
      [uid, rewardId]
    );
    if (existing) return res.status(400).json({ error: '已领取过该奖励' });

    // 检查是否满足条件
    const countRow = await db.getOne('SELECT COUNT(*) as cnt FROM user_codex WHERE user_id = ?', [uid]);
    if ((countRow?.cnt || 0) < reward.require_count) {
      return res.status(400).json({ error: `需要收集${reward.require_count}件装备才能领取` });
    }

    // 发放奖励
    if (reward.reward_money > 0) {
      await db.query('UPDATE `user` SET money = money + ? WHERE id = ?', [reward.reward_money, uid]);
    }
    if (reward.reward_exp > 0) {
      await db.query('UPDATE `user` SET exp = exp + ? WHERE id = ?', [reward.reward_exp, uid]);
    }
    if (reward.reward_item_id > 0 && reward.reward_item_qty > 0) {
      // 给物品（背包或直接发放）
      const inv = await db.getOne(
        'SELECT id, quantity FROM inventory WHERE user_id = ? AND item_id = ? AND durability = -1',
        [uid, reward.reward_item_id]
      );
      if (inv) {
        await db.query('UPDATE inventory SET quantity = quantity + ? WHERE id = ?', [reward.reward_item_qty, inv.id]);
      } else {
        await db.insert('inventory', {
          user_id: uid,
          item_id: reward.reward_item_id,
          quantity: reward.reward_item_qty,
          durability: -1
        });
      }
      // 解锁物品图鉴
      await db.query(
        'INSERT IGNORE INTO user_codex (user_id, item_id, unlocked_at) VALUES (?, ?, ?)',
        [uid, reward.reward_item_id, Math.floor(Date.now() / 1000)]
      );
    }

    // 记录领取
    await db.insert('user_codex_reward', {
      user_id: uid,
      reward_id: rewardId,
      claimed_at: Math.floor(Date.now() / 1000)
    });

    res.json({ success: true, msg: `领取成功：${reward.title}`, money: reward.reward_money, exp: reward.reward_exp });
  } catch (err) { next(err); }
});

module.exports = router;
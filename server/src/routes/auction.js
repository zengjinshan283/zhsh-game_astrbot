/**
 * 拍卖行系统
 * GET  /api/auction              - 拍卖列表(分页/筛选)
 * GET  /api/auction/:id          - 拍卖详情(含出价记录)
 * GET  /api/auction/my/selling   - 我的正在拍卖
 * GET  /api/auction/my/bidding   - 我正在竞价的
 * GET  /api/auction/my/won       - 我成交的
 * POST /api/auction              - 发布拍卖
 * POST /api/auction/:id/bid      - 出价
 * POST /api/auction/:id/buyout   - 一口价直接拿下
 * POST /api/auction/:id/cancel  - 取消拍卖(仅卖家且无出价)
 * POST /api/auction/watch/:id    - 关注/取消关注
 * GET  /api/auction/watch/list   - 我关注的列表
 * POST /api/auction/settle      - 结算到期拍卖(可由定时任务触发)
 */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// CST时区日期工具
function getCSTDate() {
  const now = new Date();
  const cst = new Date(now.getTime() + 8 * 3600000);
  return cst;
}
function getCSTDateStr() {
  return getCSTDate().toISOString().slice(0, 19).replace('T', ' ');
}
function addHours(hours) {
  const d = getCSTDate();
  d.setHours(d.getHours() + hours);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

// 结算所有到期的拍卖(后台定时调用)
async function settleExpiredAuctions() {
  const now = getCSTDateStr();
  // 找出状态为进行中但已到期的
  const expired = await db.getAll(
    `SELECT a.*, i.name as item_name FROM auction a
     JOIN item i ON a.item_id = i.id
     WHERE a.status = 0 AND a.end_time <= ?`,
    [now]
  );
  for (const a of expired) {
    if (a.highest_bidder_id) {
      // 有出价 → 成交
      await db.query(
        `UPDATE auction SET status=1, winner_id=?, final_price=current_price, updated_at=? WHERE id=?`,
        [a.highest_bidder_id, getCSTDateStr(), a.id]
      );
      // 扣买家钱
      await db.query('UPDATE user SET money=money-? WHERE id=?', [a.current_price, a.highest_bidder_id]);
      // 给卖家打款
      await db.query('UPDATE user SET money=money+? WHERE id=?', [a.current_price, a.seller_id]);
      // 物品给买家(从卖家inventory转移到买家inventory)
      await db.query(
        `UPDATE inventory SET user_id=? WHERE user_id=? AND item_id=? AND equipped=0 LIMIT 1`,
        [a.highest_bidder_id, a.seller_id, a.item_id]
      );
      // 生成一条bid记录为is_winning
      await db.query(
        `UPDATE auction_bid SET is_winning=1 WHERE auction_id=? AND bidder_id=? ORDER BY id DESC LIMIT 1`,
        [a.id, a.highest_bidder_id]
      );
    } else {
      // 无出价 → 流拍
      await db.query(
        `UPDATE auction SET status=2, updated_at=? WHERE id=?`,
        [getCSTDateStr(), a.id]
      );
    }
  }
}

// GET /api/auction/settle 手动触发结算
router.post('/settle', authMiddleware, async (req, res, next) => {
  try {
    await settleExpiredAuctions();
    res.json({ success: true });
  } catch (err) { next(err); }
});

// GET /api/auction - 列表
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, category_id, status, keyword, my } = req.query;
    let where = 'WHERE 1=1';
    const params = [];

    if (my === '1') {
      where += ' AND a.seller_id = ?';
      params.push(req.user.id);
    }

    if (category_id) {
      where += ' AND a.category_id = ?';
      params.push(parseInt(category_id));
    }

    if (status !== undefined && status !== '') {
      where += ' AND a.status = ?';
      params.push(parseInt(status));
    } else {
      // 默认只展示进行中的
      where += ' AND a.status = 0';
    }

    if (keyword) {
      where += ' AND (a.title LIKE ? OR a.description LIKE ?)';
      params.push('%' + keyword + '%', '%' + keyword + '%');
    }

    const total = await db.getVar(`SELECT COUNT(*) FROM auction a ${where}`, params);
    const list = await db.getAll(
      `SELECT a.id, a.item_id, a.seller_id, a.category_id, a.title, a.starting_price,
              a.current_price, a.buyout_price, a.highest_bidder_id, a.bid_count,
              a.start_time, a.end_time, a.status,
              i.name as item_name, i.type as item_type,
              u.nickname as seller_name
       FROM auction a
       JOIN item i ON a.item_id = i.id
       JOIN user u ON a.seller_id = u.id
       ${where}
       ORDER BY a.end_time ASC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize)]
    );

    // 补充我是否在关注
    const watchMap = {};
    if (req.user) {
      const watches = await db.getAll(
        'SELECT auction_id FROM auction_watch WHERE user_id = ?',
        [req.user.id]
      );
      watches.forEach(w => { watchMap[w.auction_id] = 1; });
    }
    list.forEach(a => { a.is_watching = watchMap[a.id] ? 1 : 0; });

    // 分类信息
    const cats = await db.getAll('SELECT id, name, icon FROM auction_category WHERE is_active=1 ORDER BY sort_order');

    res.json({ list, total, categories: cats, page: parseInt(page), pageSize: parseInt(pageSize) });
  } catch (err) { next(err); }
});

// GET /api/auction/my/selling - 我正在拍卖的
router.get('/my/selling', authMiddleware, async (req, res, next) => {
  try {
    const now = getCSTDateStr();
    const list = await db.getAll(
      `SELECT a.*, i.name as item_name,
              (SELECT COUNT(*) FROM auction_bid ab WHERE ab.auction_id=a.id) as bid_count
       FROM auction a
       JOIN item i ON a.item_id = i.id
       WHERE a.seller_id = ? AND a.status = 0
       ORDER BY a.end_time ASC`,
      [req.user.id]
    );
    res.json({ list });
  } catch (err) { next(err); }
});

// GET /api/auction/my/bidding - 我正在竞价的
router.get('/my/bidding', authMiddleware, async (req, res, next) => {
  try {
    const now = getCSTDateStr();
    const list = await db.getAll(
      `SELECT DISTINCT a.*, i.name as item_name, ab.bid_price as my_last_bid
       FROM auction a
       JOIN item i ON a.item_id = i.id
       JOIN auction_bid ab ON ab.auction_id = a.id
       WHERE ab.bidder_id = ? AND a.status = 0
       ORDER BY a.end_time ASC`,
      [req.user.id]
    );
    res.json({ list });
  } catch (err) { next(err); }
});

// GET /api/auction/my/won - 我成交的
router.get('/my/won', authMiddleware, async (req, res, next) => {
  try {
    const list = await db.getAll(
      `SELECT a.*, i.name as item_name, u.nickname as seller_name, a.final_price
       FROM auction a
       JOIN item i ON a.item_id = i.id
       JOIN user u ON a.seller_id = u.id
       WHERE a.winner_id = ? AND a.status = 1
       ORDER BY a.updated_at DESC`,
      [req.user.id]
    );
    res.json({ list });
  } catch (err) { next(err); }
});

// GET /api/auction/:id - 详情
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const a = await db.getOne(
      `SELECT a.*, i.name as item_name, i.type as item_type,
              i.atk_min as item_atk, i.def as item_def, i.hp_max as item_hp,
              u.nickname as seller_name
       FROM auction a
       JOIN item i ON a.item_id = i.id
       JOIN user u ON a.seller_id = u.id
       WHERE a.id = ?`,
      [req.params.id]
    );
    if (!a) return res.status(404).json({ error: '拍卖不存在' });

    // 出价记录
    const bids = await db.getAll(
      `SELECT ab.*, u.nickname as bidder_name, u.level as bidder_level
       FROM auction_bid ab
       JOIN user u ON ab.bidder_id = u.id
       WHERE ab.auction_id = ?
       ORDER BY ab.bid_price DESC, ab.created_at ASC`,
      [a.id]
    );

    // 分类
    const cat = await db.getOne('SELECT * FROM auction_category WHERE id = ?', [a.category_id]);

    // 我是否在关注
    const watch = await db.getOne(
      'SELECT id FROM auction_watch WHERE user_id=? AND auction_id=?',
      [req.user.id, a.id]
    );
    a.is_watching = watch ? 1 : 0;

    res.json({ auction: a, bids, category: cat });
  } catch (err) { next(err); }
});

// POST /api/auction - 发布拍卖
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { item_id, category_id, title, description, starting_price, buyout_price, duration_hours } = req.body;

    if (!item_id || !title || !starting_price) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 检查物品是否在用户背包中且未装备
    const inv = await db.getOne(
      'SELECT * FROM inventory WHERE user_id=? AND item_id=? AND equipped=0',
      [req.user.id, item_id]
    );
    if (!inv) return res.status(400).json({ error: '物品不存在或已装备' });

    // 检查物品是否已在其他进行中的拍卖
    const existing = await db.getOne(
      'SELECT id FROM auction WHERE seller_id=? AND item_id=? AND status=0',
      [req.user.id, item_id]
    );
    if (existing) return res.status(400).json({ error: '该物品已在拍卖中' });

    const duration = Math.max(1, Math.min(parseInt(duration_hours) || 24, 168));
    const startTime = getCSTDateStr();
    const endTime = addHours(duration);
    const sp = Math.max(1, parseInt(starting_price));
    const bp = parseInt(buyout_price) || 0;

    const id = await db.insert('auction', {
      item_id, seller_id: req.user.id,
      category_id: parseInt(category_id) || 7,
      title: title.trim().slice(0, 100),
      description: (description || '').trim().slice(0, 500),
      starting_price: sp, current_price: sp,
      buyout_price: bp,
      highest_bidder_id: null,
      bid_count: 0,
      start_time: startTime, end_time: endTime,
      status: 0,
    });

    res.json({ success: true, auction_id: id });
  } catch (err) { next(err); }
});

// POST /api/auction/:id/bid - 出价
router.post('/:id/bid', authMiddleware, async (req, res, next) => {
  try {
    const { bid_price } = req.body;
    const auctionId = parseInt(req.params.id);
    const price = Math.max(1, parseInt(bid_price) || 0);

    const a = await db.getOne('SELECT * FROM auction WHERE id = ?', [auctionId]);
    if (!a) return res.status(404).json({ error: '拍卖不存在' });
    if (a.status !== 0) return res.status(400).json({ error: '拍卖已结束' });
    if (a.seller_id === req.user.id) return res.status(400).json({ error: '不能竞拍自己的物品' });

    const now = getCSTDateStr();
    if (a.end_time <= now) return res.status(400).json({ error: '拍卖已到期' });

    // 最低出价 = 当前最高+最低增幅(当前价的5%，最低100)
    const minIncrement = Math.max(100, Math.ceil(a.current_price * 0.05));
    const minBid = a.highest_bidder_id ? a.current_price + minIncrement : a.starting_price;
    if (price < minBid) return res.status(400).json({ error: `最低出价${minBid}铜币` });

    // 检查用户铜币
    const user = await db.getOne('SELECT money FROM user WHERE id = ?', [req.user.id]);
    if (user.money < price) return res.status(400).json({ error: '铜币不足' });

    // 如果有人最高出价，退还其铜币
    if (a.highest_bidder_id) {
      await db.query('UPDATE user SET money = money + ? WHERE id = ?', [a.current_price, a.highest_bidder_id]);
    }

    // 扣除出价者铜币
    await db.query('UPDATE user SET money = money - ? WHERE id = ?', [price, req.user.id]);

    // 新增出价记录
    const bidId = await db.insert('auction_bid', {
      auction_id: auctionId,
      bidder_id: req.user.id,
      bid_price: price,
      is_winning: 1,
    });

    // 将之前的最高出价标记为非胜出
    await db.query('UPDATE auction_bid SET is_winning=0 WHERE auction_id=? AND id!=?', [auctionId, bidId]);

    // 更新拍卖当前价和最高出价者
    await db.query(
      'UPDATE auction SET current_price=?, highest_bidder_id=?, bid_count=bid_count+1, updated_at=? WHERE id=?',
      [price, req.user.id, getCSTDateStr(), auctionId]
    );

    res.json({ success: true, current_price: price, bid_count: a.bid_count + 1 });
  } catch (err) { next(err); }
});

// POST /api/auction/:id/buyout - 一口价拿下
router.post('/:id/buyout', authMiddleware, async (req, res, next) => {
  try {
    const auctionId = parseInt(req.params.id);
    const a = await db.getOne('SELECT * FROM auction WHERE id = ?', [auctionId]);
    if (!a) return res.status(404).json({ error: '拍卖不存在' });
    if (a.status !== 0) return res.status(400).json({ error: '拍卖已结束' });
    if (a.seller_id === req.user.id) return res.status(400).json({ error: '不能购买自己的物品' });
    if (!a.buyout_price) return res.status(400).json({ error: '此拍卖无一口价' });

    const user = await db.getOne('SELECT money FROM user WHERE id = ?', [req.user.id]);
    if (user.money < a.buyout_price) return res.status(400).json({ error: '铜币不足' });

    // 退还之前最高出价者的钱
    if (a.highest_bidder_id) {
      await db.query('UPDATE user SET money=money+? WHERE id=?', [a.current_price, a.highest_bidder_id]);
    }

    // 扣买家钱
    await db.query('UPDATE user SET money=money-? WHERE id=?', [a.buyout_price, req.user.id]);
    // 给卖家打款
    await db.query('UPDATE user SET money=money+? WHERE id=?', [a.buyout_price, a.seller_id]);
    // 物品转移
    await db.query(
      'UPDATE inventory SET user_id=? WHERE user_id=? AND item_id=? AND equipped=0 LIMIT 1',
      [req.user.id, a.seller_id, a.item_id]
    );

    // 更新拍卖状态
    await db.query(
      'UPDATE auction SET status=1, winner_id=?, final_price=?, highest_bidder_id=?, updated_at=? WHERE id=?',
      [req.user.id, a.buyout_price, req.user.id, getCSTDateStr(), auctionId]
    );

    res.json({ success: true, final_price: a.buyout_price });
  } catch (err) { next(err); }
});

// POST /api/auction/:id/cancel - 取消拍卖(仅卖家且无出价)
router.post('/:id/cancel', authMiddleware, async (req, res, next) => {
  try {
    const a = await db.getOne('SELECT * FROM auction WHERE id = ?', [req.params.id]);
    if (!a) return res.status(404).json({ error: '拍卖不存在' });
    if (a.seller_id !== req.user.id) return res.status(403).json({ error: '无权取消' });
    if (a.bid_count > 0) return res.status(400).json({ error: '已有出价，无法取消' });
    if (a.status !== 0) return res.status(400).json({ error: '拍卖已结束' });

    await db.query('UPDATE auction SET status=3, updated_at=? WHERE id=?', [getCSTDateStr(), a.id]);

    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/auction/watch/:id - 关注/取消关注
router.post('/watch/:id', authMiddleware, async (req, res, next) => {
  try {
    const auctionId = parseInt(req.params.id);
    const existing = await db.getOne(
      'SELECT id FROM auction_watch WHERE user_id=? AND auction_id=?',
      [req.user.id, auctionId]
    );
    if (existing) {
      await db.delete('auction_watch', 'id=?', [existing.id]);
      res.json({ success: true, watching: false });
    } else {
      await db.insert('auction_watch', { user_id: req.user.id, auction_id: auctionId });
      res.json({ success: true, watching: true });
    }
  } catch (err) { next(err); }
});

// GET /api/auction/watch/list - 我关注的列表
router.get('/watch/list', authMiddleware, async (req, res, next) => {
  try {
    const list = await db.getAll(
      `SELECT a.*, i.name as item_name, u.nickname as seller_name
       FROM auction_watch aw
       JOIN auction a ON aw.auction_id = a.id
       JOIN item i ON a.item_id = i.id
       JOIN user u ON a.seller_id = u.id
       WHERE aw.user_id = ?
       ORDER BY a.end_time ASC`,
      [req.user.id]
    );
    res.json({ list });
  } catch (err) { next(err); }
});

module.exports = router;
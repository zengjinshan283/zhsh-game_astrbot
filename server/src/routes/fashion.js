/**
 * 坐骑 / 时装系统
 * GET  /api/fashion/mounts      - 坐骑图鉴 + 我的坐骑
 * POST /api/fashion/mount/buy   - 购买坐骑
 * POST /api/fashion/mount/equip - 装备坐骑
 * GET  /api/fashion/outfits     - 时装图鉴 + 我的时装
 * POST /api/fashion/outfit/buy  - 购买时装
 * POST /api/fashion/outfit/equip - 装备/卸下时装（按slot单件）
 * GET  /api/fashion/bonus       - 装备中的总属性加成（战斗注入用）
 */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

const RARITY_COLOR = { common: '#aaa', rare: '#3a8de0', epic: '#a64ac9', legend: '#ff8c00' };

// 计算用户当前装备总加成
async function calcUserBonus(uid) {
  const user = await db.getOne('SELECT mount_id, equipped_outfits FROM `user` WHERE id=?', [uid]);
  if (!user) return { atk: 0, def: 0, hp: 0, speed: 0, mount: null, outfits: [] };

  let atk = 0, def = 0, hp = 0, speed = 0;
  let mount = null, outfits = [];

  if (user.mount_id > 0) {
    mount = await db.getOne('SELECT * FROM mount WHERE id=?', [user.mount_id]);
    if (mount) { atk += mount.atk_bonus; def += mount.def_bonus; hp += mount.hp_bonus; speed += mount.speed_bonus; }
  }

  if (user.equipped_outfits) {
    const ids = user.equipped_outfits.split(',').map(s => parseInt(s)).filter(n => n > 0);
    if (ids.length) {
      const placeholders = ids.map(() => '?').join(',');
      const rows = await db.query(`SELECT * FROM outfit WHERE id IN (${placeholders})`, ids);
      for (const o of rows) {
        atk += o.atk_bonus; def += o.def_bonus; hp += o.hp_bonus;
        outfits.push(o);
      }
    }
  }
  return { atk, def, hp, speed, mount, outfits };
}

// GET /api/fashion/mounts
router.get('/mounts', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const all = await db.query('SELECT * FROM mount ORDER BY level_req ASC, id ASC');
    const mine = await db.query('SELECT m.*, um.level, um.exp, um.obtained_at FROM user_mount um JOIN mount m ON m.id=um.mount_id WHERE um.user_id=?', [uid]);
    res.json({ all, mine });
  } catch (err) { next(err); }
});

// POST /api/fashion/mount/buy
router.post('/mount/buy', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const { mountId } = req.body;
    if (!mountId) return res.status(400).json({ error: '参数错误' });
    const m = await db.getOne('SELECT * FROM mount WHERE id=?', [mountId]);
    if (!m) return res.status(404).json({ error: '坐骑不存在' });
    if (m.is_default) return res.status(400).json({ error: '默认坐骑不可购买' });
    const user = await db.getOne('SELECT level, silver, money FROM `user` WHERE id=?', [uid]);
    if (user.level < m.level_req) return res.status(400).json({ error: `需要 ${m.level_req} 级` });
    if (user.silver < m.price_silver) return res.status(400).json({ error: `银币不足（需 ${m.price_silver}）` });
    if (user.money < m.price_money) return res.status(400).json({ error: `铜币不足（需 ${m.price_money}）` });

    const owned = await db.getOne('SELECT id FROM user_mount WHERE user_id=? AND mount_id=?', [uid, mountId]);
    if (owned) return res.status(400).json({ error: '已拥有此坐骑' });

    await db.query('UPDATE `user` SET silver=silver-?, money=money-? WHERE id=?', [m.price_silver, m.price_money, uid]);
    await db.query('INSERT INTO user_mount (user_id, mount_id, obtained_at) VALUES (?, ?, ?)', [uid, mountId, Math.floor(Date.now()/1000)]);
    res.json({ success: true, msg: `🎉 获得坐骑【${m.name}】` });
  } catch (err) { next(err); }
});

// POST /api/fashion/mount/equip
router.post('/mount/equip', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const { mountId } = req.body;
    if (mountId === 0 || mountId === null) {
      // 卸下坐骑
      await db.query('UPDATE `user` SET mount_id=0 WHERE id=?', [uid]);
      return res.json({ success: true, msg: '已卸下坐骑' });
    }
    if (!mountId) return res.status(400).json({ error: '参数错误' });
    const owned = await db.getOne('SELECT id FROM user_mount WHERE user_id=? AND mount_id=?', [uid, mountId]);
    if (!owned) return res.status(400).json({ error: '尚未拥有此坐骑' });
    await db.query('UPDATE `user` SET mount_id=? WHERE id=?', [mountId, uid]);
    const m = await db.getOne('SELECT * FROM mount WHERE id=?', [mountId]);
    res.json({ success: true, msg: `🐎 已装备【${m.name}】` });
  } catch (err) { next(err); }
});

// GET /api/fashion/outfits
router.get('/outfits', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const all = await db.query('SELECT * FROM outfit ORDER BY slot, level_req ASC, id ASC');
    const mine = await db.query('SELECT o.*, uo.obtained_at FROM user_outfit uo JOIN outfit o ON o.id=uo.outfit_id WHERE uo.user_id=?', [uid]);
    res.json({ all, mine });
  } catch (err) { next(err); }
});

// POST /api/fashion/outfit/buy
router.post('/outfit/buy', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const { outfitId } = req.body;
    if (!outfitId) return res.status(400).json({ error: '参数错误' });
    const o = await db.getOne('SELECT * FROM outfit WHERE id=?', [outfitId]);
    if (!o) return res.status(404).json({ error: '时装不存在' });
    if (o.is_default) return res.status(400).json({ error: '默认时装不可购买' });
    const user = await db.getOne('SELECT level, silver, money FROM `user` WHERE id=?', [uid]);
    if (user.level < o.level_req) return res.status(400).json({ error: `需要 ${o.level_req} 级` });
    if (user.silver < o.price_silver) return res.status(400).json({ error: `银币不足（需 ${o.price_silver}）` });
    if (user.money < o.price_money) return res.status(400).json({ error: `铜币不足（需 ${o.price_money}）` });
    const owned = await db.getOne('SELECT id FROM user_outfit WHERE user_id=? AND outfit_id=?', [uid, outfitId]);
    if (owned) return res.status(400).json({ error: '已拥有此时装' });

    await db.query('UPDATE `user` SET silver=silver-?, money=money-? WHERE id=?', [o.price_silver, o.price_money, uid]);
    await db.query('INSERT INTO user_outfit (user_id, outfit_id, obtained_at) VALUES (?, ?, ?)', [uid, outfitId, Math.floor(Date.now()/1000)]);
    res.json({ success: true, msg: `🎉 获得时装【${o.name}】` });
  } catch (err) { next(err); }
});

// POST /api/fashion/outfit/equip  {outfitId, equip:true/false}
router.post('/outfit/equip', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const { outfitId, equip } = req.body;
    if (!outfitId) return res.status(400).json({ error: '参数错误' });
    const o = await db.getOne('SELECT * FROM outfit WHERE id=?', [outfitId]);
    if (!o) return res.status(404).json({ error: '时装不存在' });
    const owned = await db.getOne('SELECT id FROM user_outfit WHERE user_id=? AND outfit_id=?', [uid, outfitId]);
    if (!owned) return res.status(400).json({ error: '尚未拥有此时装' });

    const user = await db.getOne('SELECT equipped_outfits FROM `user` WHERE id=?', [uid]);
    const equipped = (user.equipped_outfits || '').split(',').map(s => parseInt(s)).filter(n => n > 0);
    const idx = equipped.indexOf(outfitId);

    if (equip) {
      if (idx >= 0) return res.json({ success: true, msg: '已装备', noChange: true });
      // 同 slot 只能装备一件
      const slotEquipped = equipped.length
        ? await db.query(`SELECT * FROM outfit WHERE id IN (${equipped.map(()=>'?').join(',')})`, equipped)
        : [];
      // 卸下同 slot 的
      for (const cur of slotEquipped) {
        if (cur.slot === o.slot) {
          const i = equipped.indexOf(cur.id);
          if (i >= 0) equipped.splice(i, 1);
        }
      }
      equipped.push(outfitId);
      await db.query('UPDATE `user` SET equipped_outfits=? WHERE id=?', [equipped.join(','), uid]);
      res.json({ success: true, msg: `✨ 已装备【${o.name}】` });
    } else {
      if (idx < 0) return res.json({ success: true, msg: '未装备', noChange: true });
      equipped.splice(idx, 1);
      await db.query('UPDATE `user` SET equipped_outfits=? WHERE id=?', [equipped.join(','), uid]);
      res.json({ success: true, msg: '已卸下' });
    }
  } catch (err) { next(err); }
});

// GET /api/fashion/bonus 战斗注入用
router.get('/bonus', authMiddleware, async (req, res, next) => {
  try {
    const bonus = await calcUserBonus(req.user.id);
    res.json(bonus);
  } catch (err) { next(err); }
});

module.exports = router;
module.exports.calcUserBonus = calcUserBonus;
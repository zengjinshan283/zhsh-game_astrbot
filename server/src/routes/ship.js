/**
 * 船只HP和维修路由
 */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 获取船只HP状态
router.get('/status', authMiddleware, async (req, res, next) => {
  try {
    const user = await db.getOne(
      'SELECT ship_id FROM `user` WHERE `id` = ?',
      [req.user.id]
    );

    if (!user || !user.ship_id) {
      return res.json({ error: '没有船只' });
    }

    // 获取船只基础信息
    const ship = await db.getOne('SELECT * FROM `ship` WHERE `id` = ?', [user.ship_id]);
    if (!ship) {
      return res.json({ error: '船只不存在' });
    }

    // 获取用户的船只HP记录
    const userShip = await db.getOne(
      'SELECT hp, hp_max FROM `user_ship` WHERE `user_id` = ? AND `ship_id` = ?',
      [req.user.id, user.ship_id]
    );

    const hp = userShip ? userShip.hp : ship.hp_max;
    const hpMax = userShip ? userShip.hp_max : ship.hp_max;

    res.json({
      ship_id: ship.id,
      ship_name: ship.name,
      hp,
      hp_max: hpMax,
      hp_percent: hpMax > 0 ? Math.round(hp / hpMax * 100) : 0,
      needs_repair: hp < hpMax
    });
  } catch (err) {
    next(err);
  }
});

// 维修船只
router.post('/repair', authMiddleware, async (req, res, next) => {
  try {
    const user = await db.getOne(
      'SELECT ship_id, place_id, money FROM `user` WHERE `id` = ?',
      [req.user.id]
    );

    if (!user || !user.ship_id) {
      return res.status(400).json({ error: '没有船只' });
    }

    // 检查是否在码头
    const place = await db.getOne(
      "SELECT * FROM `place` WHERE `id` = ? AND `type` = 1",
      [user.place_id]
    );
    if (!place) {
      return res.status(400).json({ error: '需要在码头才能维修船只' });
    }

    // 获取船只基础信息
    const ship = await db.getOne('SELECT * FROM `ship` WHERE `id` = ?', [user.ship_id]);
    if (!ship) {
      return res.status(400).json({ error: '船只不存在' });
    }

    // 获取用户的船只HP记录
    let userShip = await db.getOne(
      'SELECT hp, hp_max FROM `user_ship` WHERE `user_id` = ? AND `ship_id` = ?',
      [req.user.id, user.ship_id]
    );

    const currentHp = userShip ? userShip.hp : ship.hp_max;
    const maxHp = ship.hp_max;

    if (currentHp >= maxHp) {
      return res.status(400).json({ error: '船只不需要维修' });
    }

    // 计算维修费用：每1点HP需要10铜币
    const hpNeeded = maxHp - currentHp;
    const repairCost = hpNeeded * 10;

    if (user.money < repairCost) {
      return res.status(400).json({ error: `铜钱不足！需要 ${repairCost} 铜钱` });
    }

    // 执行维修
    await db.query('UPDATE `user` SET money = money - ? WHERE `id` = ?', [repairCost, req.user.id]);

    if (userShip) {
      await db.query(
        'UPDATE `user_ship` SET hp = ?, hp_max = ? WHERE `user_id` = ? AND `ship_id` = ?',
        [maxHp, maxHp, req.user.id, user.ship_id]
      );
    } else {
      await db.query(
        'INSERT INTO `user_ship` (user_id, ship_id, hp, hp_max) VALUES (?, ?, ?, ?)',
        [req.user.id, user.ship_id, maxHp, maxHp]
      );
    }

    res.json({
      success: true,
      msg: `⛵ 维修完成！花费 ${repairCost} 铜币，船只HP恢复至 ${maxHp}/${maxHp}`,
      hp: maxHp,
      hp_max: maxHp,
      cost: repairCost
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

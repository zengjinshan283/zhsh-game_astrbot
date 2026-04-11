/**
 * 管理后台 - 仪表盘
 */
const express = require('express');
const db = require('../../db');
const { adminAuth } = require('../../middleware/adminAuth');

const router = express.Router();
router.use(adminAuth);

// 仪表盘统计
router.get('/stats', async (req, res) => {
  try {
    const [totalPlayers, totalItems, totalMonsters, totalNpcs, totalMaps, totalPlaces] = await Promise.all([
      db.getVar('SELECT COUNT(*) FROM user'),
      db.getVar('SELECT COUNT(*) FROM item'),
      db.getVar('SELECT COUNT(*) FROM monster'),
      db.getVar('SELECT COUNT(*) FROM npc'),
      db.getVar('SELECT COUNT(*) FROM map'),
      db.getVar('SELECT COUNT(*) FROM place')
    ]);

    const timeout = 900;
    const onlinePlayers = await db.getVar(
      `SELECT COUNT(*) FROM user WHERE lastdate > ?`,
      [Math.floor(Date.now() / 1000) - timeout]
    );

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTimestamp = Math.floor(todayStart.getTime() / 1000);
    const todayReg = await db.getVar(
      `SELECT COUNT(*) FROM user WHERE regdate >= ?`,
      [todayTimestamp]
    );

    res.json({
      code: 0,
      data: {
        totalPlayers: totalPlayers || 0,
        onlinePlayers: onlinePlayers || 0,
        todayReg: todayReg || 0,
        totalItems: totalItems || 0,
        totalMonsters: totalMonsters || 0,
        totalNpcs: totalNpcs || 0,
        totalMaps: totalMaps || 0,
        totalPlaces: totalPlaces || 0
      },
      message: 'success'
    });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 扩展统计（场景、任务、宠物、船舶、经济）
router.get('/extra-stats', async (req, res) => {
  try {
    const [totalQuests, totalPets, totalShips] = await Promise.all([
      db.getVar('SELECT COUNT(*) FROM quest'),
      db.getVar('SELECT COUNT(*) FROM pet'),
      db.getVar('SELECT COUNT(*) FROM ship')
    ]);

    // Economy stats
    const economy = await db.getOne(
      `SELECT
        COALESCE(SUM(money), 0) AS total_money,
        COALESCE(SUM(gold), 0) AS total_gold,
        COALESCE(SUM(bank_money), 0) AS total_bank
       FROM user`
    );

    // Yesterday comparison
    const yesterdayStart = new Date();
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date();
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
    yesterdayEnd.setHours(23, 59, 59, 999);
    const yStartTs = Math.floor(yesterdayStart.getTime() / 1000);
    const yEndTs = Math.floor(yesterdayEnd.getTime() / 1000);

    const yesterdayReg = await db.getVar(
      'SELECT COUNT(*) FROM user WHERE regdate >= ? AND regdate <= ?',
      [yStartTs, yEndTs]
    );

    res.json({
      code: 0,
      data: {
        totalQuests: totalQuests || 0,
        totalPets: totalPets || 0,
        totalShips: totalShips || 0,
        economy: {
          total_money: economy?.total_money || 0,
          total_gold: economy?.total_gold || 0,
          total_bank: economy?.total_bank || 0
        },
        yesterdayReg: yesterdayReg || 0
      },
      message: 'success'
    });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 最近操作日志
router.get('/recent-logs', async (req, res) => {
  try {
    const list = await db.getAll(
      `SELECT al.*, au.username, au.nickname
       FROM admin_log al
       LEFT JOIN admin_user au ON al.admin_id = au.id
       ORDER BY al.id DESC LIMIT 5`
    );
    res.json({ code: 0, data: list, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 最近7天玩家增长趋势
router.get('/playerTrend', async (req, res) => {
  try {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const start = Math.floor(d.getTime() / 1000);
      d.setHours(23, 59, 59, 999);
      const end = Math.floor(d.getTime() / 1000);
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      const count = await db.getVar(
        'SELECT COUNT(*) FROM user WHERE regdate >= ? AND regdate <= ?',
        [start, end]
      );
      days.push({ date: label, count: count || 0 });
    }
    res.json({ code: 0, data: days, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 最近注册玩家
router.get('/recentPlayers', async (req, res) => {
  try {
    const list = await db.getAll(
      'SELECT id, username, sex, level, money, regdate, lastdate, regip FROM user ORDER BY regdate DESC LIMIT 10'
    );
    res.json({ code: 0, data: list, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;

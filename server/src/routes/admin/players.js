/**
 * 管理后台 - 玩家管理
 */
const express = require('express');
const crypto = require('crypto');
const db = require('../../db');
const { adminAuth, logAction, logChangelog } = require('../../middleware/adminAuth');

const router = express.Router();
router.use(adminAuth);

// 玩家列表（支持等级范围、金币范围搜索）
router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword, online, levelMin, levelMax, moneyMin, moneyMax } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (u.username LIKE ?)'; params.push(`%${keyword}%`); }
    if (online === '1') { where += ' AND u.lastdate > ?'; params.push(Math.floor(Date.now() / 1000) - 900); }
    if (levelMin !== undefined && levelMin !== '') { where += ' AND u.level >= ?'; params.push(parseInt(levelMin)); }
    if (levelMax !== undefined && levelMax !== '') { where += ' AND u.level <= ?'; params.push(parseInt(levelMax)); }
    if (moneyMin !== undefined && moneyMin !== '') { where += ' AND u.money >= ?'; params.push(parseInt(moneyMin)); }
    if (moneyMax !== undefined && moneyMax !== '') { where += ' AND u.money <= ?'; params.push(parseInt(moneyMax)); }
    const total = await db.getVar(`SELECT COUNT(*) FROM user u WHERE ${where}`, params);
    const list = await db.getAll(
      `SELECT u.id, u.username, u.sex, u.avatar, u.level, u.exp, u.exp_max, u.hp, u.hp_max,
              u.atk_min, u.atk_max, u.def, u.agility, u.money, u.gold, u.bank_money,
              u.place_id, u.pet_id, u.pet_name, u.pet_level, u.ship_id,
              u.regdate, u.lastdate, u.regip,
              p.name AS place_name
       FROM user u
       LEFT JOIN place p ON u.place_id = p.id
       WHERE ${where}
       ORDER BY u.id DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize)]
    );
    res.json({ code: 0, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) }, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 玩家详情（增强：宠物、好友、航海状态）
router.get('/:id', async (req, res) => {
  try {
    const uid = req.params.id;
    const user = await db.getOne(
      `SELECT u.*, p.name AS place_name FROM user u LEFT JOIN place p ON u.place_id = p.id WHERE u.id = ?`,
      [uid]
    );
    if (!user) return res.json({ code: 1, message: '玩家不存在' });
    // Inventory
    const inventory = await db.getAll(
      'SELECT inv.*, i.name AS item_name, i.type AS item_type FROM inventory inv LEFT JOIN item i ON inv.item_id = i.id WHERE inv.user_id = ?',
      [uid]
    );
    // Active quests
    const quests = await db.getAll(
      'SELECT uq.*, q.name AS quest_name FROM user_quest uq LEFT JOIN quest q ON uq.quest_id = q.id WHERE uq.user_id = ?',
      [uid]
    );
    // Battle logs
    const battleLogs = await db.getAll(
      `SELECT bl.id, bl.user_id, bl.monster_id, bl.enemy_user_id,
        CASE WHEN result = 1 THEN 'win' ELSE 'lose' END AS result,
        CONCAT(m.name, CASE WHEN enemy_user_id > 0 THEN CONCAT(' (', u2.username, ')') ELSE '' END) AS enemy_name,
        exp_gained, money_gained, log_text,
        FROM_UNIXTIME(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
      FROM battle_log bl
      LEFT JOIN monster m ON bl.monster_id = m.id
      LEFT JOIN user u2 ON bl.enemy_user_id = u2.id
      WHERE bl.user_id = ? ORDER BY bl.id DESC LIMIT 20`,
      [uid]
    );
    // Pet info
    let petInfo = null;
    if (user.pet_id) {
      petInfo = await db.getOne(
        'SELECT p.* FROM pet p WHERE p.id = ?',
        [user.pet_id]
      );
    }
    // Friends
    const friends = await db.getAll(
      `SELECT f.friend_id, u.username, u.level, u.lastdate
       FROM friend f
       LEFT JOIN user u ON f.friend_id = u.id
       WHERE f.user_id = ?
       ORDER BY f.id`,
      [uid]
    );
    // Sail status (from user table fields)
    let sailStatus = null;
    const u = await db.getOne(
      'SELECT sail_time, sail_from, sail_to, sail_remaining_sec, sail_paused FROM `user` WHERE id = ?',
      [uid]
    );
    if (u && u.sail_time && u.sail_time > 0) {
      let remain = 0;
      let fromCity = '???';
      let toCity = '???';
      if (u.sail_from > 0) {
        const fc = await db.getOne('SELECT name FROM `map` WHERE id = ?', [u.sail_from]);
        fromCity = fc ? fc.name : '???';
      }
      if (u.sail_to > 0) {
        const tc = await db.getOne('SELECT name FROM `map` WHERE id = ?', [u.sail_to]);
        toCity = tc ? tc.name : '???';
      }
      if (u.sail_paused) {
        remain = Number(u.sail_remaining_sec || 0);
        sailStatus = { is_sailing: true, paused: true, from_place_name: fromCity, to_place_name: toCity, remaining_seconds: remain, remaining_text: formatSeconds(remain) };
      } else {
        const elapsed = Math.floor(Date.now() / 1000) - u.sail_time;
        const total = Number(u.sail_remaining_sec || 0) + elapsed;
        remain = Math.max(0, total - elapsed);
        sailStatus = { is_sailing: true, from_place_name: fromCity, to_place_name: toCity, remaining_seconds: remain, remaining_text: formatSeconds(remain) };
      }
    }

    res.json({ code: 0, data: { user, inventory, quests, battleLogs, petInfo, friends, sailStatus }, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

function formatSeconds(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}小时${m}分${s}秒`;
  if (m > 0) return `${m}分${s}秒`;
  return `${s}秒`;
}

// 编辑玩家
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const old = await db.getOne('SELECT * FROM user WHERE id = ?', [id]);
    if (!old) return res.json({ code: 1, message: '玩家不存在' });
    const allowed = ['level','exp','exp_max','hp','hp_max','atk_min','atk_max','def','agility',
                     'money','gold','bank_money','place_id','sex','avatar'];
    const data = {};
    for (const k of allowed) { if (req.body[k] !== undefined) data[k] = req.body[k]; }
    if (Object.keys(data).length === 0) return res.json({ code: 1, message: '没有需要更新的字段' });
    await db.update('user', data, 'id = ?', [id]);
    await logAction(req.admin.id, 'update', 'user', `编辑玩家: ${old.username}`, req);
    await logChangelog(req.admin.id, 'user', id, 'update', old, { ...old, ...data }, req);
    res.json({ code: 0, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 重置密码
router.post('/:id/reset-password', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const user = await db.getOne('SELECT username FROM user WHERE id = ?', [id]);
    if (!user) return res.json({ code: 1, message: '玩家不存在' });
    // md5('123456')
    const newPwd = crypto.createHash('md5').update('123456').digest('hex');
    await db.update('user', { password: newPwd }, 'id = ?', [id]);
    await logAction(req.admin.id, 'update', 'user', `重置玩家密码: ${user.username}`, req);
    res.json({ code: 0, message: '密码已重置为 123456' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 发送系统消息
router.post('/:id/message', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { message } = req.body;
    if (!message || !message.trim()) return res.json({ code: 1, message: '消息内容不能为空' });
    const user = await db.getOne('SELECT username FROM user WHERE id = ?', [id]);
    if (!user) return res.json({ code: 1, message: '玩家不存在' });
    // Write to chat table as system message
    await db.insert('chat', {
      from_id: 0,
      to_id: id,
      content: message.trim(),
      type: 1,
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
    });
    await logAction(req.admin.id, 'update', 'user', `发送系统消息给 ${user.username}: ${message.trim()}`, req);
    res.json({ code: 0, message: '消息已发送' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 玩家操作 - 封禁/解封 (设置sid为空)
router.post('/:id/ban', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const old = await db.getOne('SELECT * FROM user WHERE id = ?', [id]);
    if (!old) return res.json({ code: 1, message: '玩家不存在' });
    await db.update('user', { sid: 'banned_' + Date.now() }, 'id = ?', [id]);
    await logAction(req.admin.id, 'ban', 'user', `封禁玩家: ${old.username}`, req);
    res.json({ code: 0, message: '已封禁' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.post('/:id/unban', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const old = await db.getOne('SELECT * FROM user WHERE id = ?', [id]);
    if (!old) return res.json({ code: 1, message: '玩家不存在' });
    const newSid = crypto.randomBytes(16).toString('hex');
    await db.update('user', { sid: newSid }, 'id = ?', [id]);
    await logAction(req.admin.id, 'unban', 'user', `解封玩家: ${old.username}`, req);
    res.json({ code: 0, message: '已解封' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 踢下线
router.post('/:id/kick', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const old = await db.getOne('SELECT * FROM user WHERE id = ?', [id]);
    if (!old) return res.json({ code: 1, message: '玩家不存在' });
    await db.update('user', { sid: '' }, 'id = ?', [id]);
    await logAction(req.admin.id, 'kick', 'user', `踢下线: ${old.username}`, req);
    res.json({ code: 0, message: '已踢下线' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;

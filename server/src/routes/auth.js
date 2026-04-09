/**
 * 认证路由 - 注册/登录/刷新Token
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const config = require('../config');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 注册
router.post('/register', async (req, res, next) => {
  try {
    const { username, password, password2, sex } = req.body;

    if (!username || !password) return res.status(400).json({ error: '请填写角色名和密码' });
    if (username.length < 2 || username.length > 10) return res.status(400).json({ error: '角色名需要2-10个字符' });
    if (!/^[\u4e00-\u9fa5a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: '角色名只能包含中文、英文、数字和下划线' });
    if (password.length < 4 || password.length > 20) return res.status(400).json({ error: '密码需要4-20个字符' });
    if (password !== password2) return res.status(400).json({ error: '两次输入的密码不一致' });
    const sexVal = parseInt(sex) || 1;
    if (sexVal !== 1 && sexVal !== 2) return res.status(400).json({ error: '请选择正确的性别' });

    const exists = await db.getVar('SELECT COUNT(*) FROM `user` WHERE `username` = ?', [username]);
    if (exists > 0) return res.status(400).json({ error: '该角色名已被使用' });

    const now = Math.floor(Date.now() / 1000);
    const sid = crypto.randomBytes(16).toString('hex');
    const hashedPw = await bcrypt.hash(password, 10);

    const userId = await db.insert('user', {
      username,
      password: hashedPw,
      sex: sexVal,
      avatar: sexVal,
      sid,
      regdate: now,
      lastdate: now,
      regip: req.ip || '0.0.0.0',
      money: 10000,
      gold: 0,
      level: 1,
      exp: 0,
      exp_max: 500,
      hp: 100,
      hp_max: 100,
      atk_min: 1,
      atk_max: 28,
      def: 0,
      agility: 0,
      place_id: config.game.startPlaceId
    });

    const token = jwt.sign({ id: userId, username }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
    res.json({ token, user: { id: userId, username, sex: sexVal } });
  } catch (err) { next(err); }
});

// 登录
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '请输入角色名和密码' });

    const user = await db.getOne('SELECT * FROM `user` WHERE `username` = ?', [username]);
    if (!user) return res.status(400).json({ error: '角色名不存在' });
    if (!await bcrypt.compare(password, user.password)) return res.status(400).json({ error: '密码错误' });

    const sid = crypto.randomBytes(16).toString('hex');
    await db.update('user', { sid, lastdate: Math.floor(Date.now() / 1000) }, '`id` = ?', [user.id]);

    const token = jwt.sign({ id: user.id, username: user.username }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
    res.json({ token, user: { id: user.id, username: user.username, sex: user.sex } });
  } catch (err) { next(err); }
});

// 获取当前用户信息（需登录）
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await db.getOne(
      'SELECT id, username, sex, avatar, level, exp, exp_max, hp, hp_max, atk_min, atk_max, def, agility, money, gold, place_id, bank_money, pet_id, pet_name, pet_level, pet_exp, ship_id, sail_time, sail_from, sail_to, shortcut_slot_1, shortcut_slot_2, shortcut_slot_3 FROM `user` WHERE `id` = ?',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: '角色不存在' });
    user.exp_max = user.exp_max || 500;
    res.json({ user });
  } catch (err) { next(err); }
});

module.exports = router;

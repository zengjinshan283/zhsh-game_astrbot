const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.get('/list', authMiddleware, async (req, res, next) => {
  try {
    const now = Math.floor(Date.now()/1000);
    const friends = await db.getAll("SELECT f.id AS friend_row_id, f.created_at, u.id AS uid, u.username, u.sex, u.level, u.place_id, u.lastdate FROM `friend` f JOIN `user` u ON f.friend_id = u.id WHERE f.user_id = ? AND f.status = 1 ORDER BY u.lastdate DESC", [req.user.id]);
    const requests = await db.getAll("SELECT f.id, f.created_at, u.id AS uid, u.username, u.sex, u.level FROM `friend` f JOIN `user` u ON f.user_id = u.id WHERE f.friend_id = ? AND f.status = 0 ORDER BY f.created_at DESC", [req.user.id]);
    res.json({ friends, requests });
  } catch(e){next(e);}
});

router.post('/add', authMiddleware, async (req, res, next) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: '请输入角色名' });
    const target = await db.getOne("SELECT id, username FROM `user` WHERE `username` = ?", [username]);
    if (!target) return res.status(400).json({ error: '该角色不存在' });
    if (target.id === req.user.id) return res.status(400).json({ error: '不能添加自己' });
    const exists = await db.getVar("SELECT COUNT(*) FROM `friend` WHERE `user_id` = ? AND `friend_id` = ?", [req.user.id, target.id]);
    if (exists > 0) return res.status(400).json({ error: '已发送或已是好友' });
    await db.insert('friend', { user_id: req.user.id, friend_id: target.id, status: 0, created_at: Math.floor(Date.now()/1000) });
    res.json({ success: true, msg: `已向 ${target.username} 发送请求` });
  } catch(e){next(e);}
});

router.post('/accept', authMiddleware, async (req, res, next) => {
  try {
    const { friend_row_id } = req.body;
    const req2 = await db.getOne("SELECT * FROM `friend` WHERE `id` = ? AND `friend_id` = ? AND `status` = 0", [friend_row_id, req.user.id]);
    if (!req2) return res.status(400).json({ error: '请求不存在' });
    await db.update('friend', { status: 1 }, '`id` = ?', [friend_row_id]);
    const reverse = await db.getVar("SELECT COUNT(*) FROM `friend` WHERE `user_id` = ? AND `friend_id` = ?", [req.user.id, req2.user_id]);
    if (reverse == 0) await db.insert('friend', { user_id: req.user.id, friend_id: req2.user_id, status: 1, created_at: Math.floor(Date.now()/1000) });
    res.json({ success: true });
  } catch(e){next(e);}
});

router.post('/reject', authMiddleware, async (req, res, next) => {
  try {
    await db.delete('friend', '`id` = ?', [req.body.friend_row_id]);
    res.json({ success: true });
  } catch(e){next(e);}
});

router.post('/delete', authMiddleware, async (req, res, next) => {
  try {
    const fid = req.body.friend_id;
    await db.delete('friend', '`user_id` = ? AND `friend_id` = ? AND `status` = 1', [req.user.id, fid]);
    await db.delete('friend', '`user_id` = ? AND `friend_id` = ? AND `status` = 1', [fid, req.user.id]);
    res.json({ success: true });
  } catch(e){next(e);}
});

module.exports = router;

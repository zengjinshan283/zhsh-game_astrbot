/**
 * 管理后台 - 认证路由
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../db');
const config = require('../../config');
const { adminAuth, logAction } = require('../../middleware/adminAuth');

const router = express.Router();

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.json({ code: 1, message: '请输入用户名和密码' });
    }
    const admin = await db.getOne(
      'SELECT * FROM admin_user WHERE username = ? AND is_active = 1',
      [username]
    );
    if (!admin) {
      return res.json({ code: 1, message: '用户名或密码错误' });
    }
    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      return res.json({ code: 1, message: '用户名或密码错误' });
    }
    const token = jwt.sign(
      { adminId: admin.id, username: admin.username, role: admin.role },
      config.admin.jwtSecret,
      { expiresIn: config.admin.jwtExpiresIn }
    );
    await db.update('admin_user',
      { last_login_at: new Date(), last_login_ip: req.ip || req.connection.remoteAddress },
      'id = ?', [admin.id]
    );
    await logAction(admin.id, 'login', '系统', '管理员登录', req);
    res.json({
      code: 0,
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          nickname: admin.nickname,
          role: admin.role
        }
      },
      message: 'success'
    });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 获取当前管理员信息
router.get('/info', adminAuth, async (req, res) => {
  try {
    res.json({ code: 0, data: req.admin, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 修改密码
router.post('/changePassword', adminAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const admin = await db.getOne('SELECT password FROM admin_user WHERE id = ?', [req.admin.id]);
    const match = await bcrypt.compare(oldPassword, admin.password);
    if (!match) return res.json({ code: 1, message: '原密码错误' });
    const hash = await bcrypt.hash(newPassword, 10);
    await db.update('admin_user', { password: hash }, 'id = ?', [req.admin.id]);
    await logAction(req.admin.id, 'changePassword', '系统', '修改密码', req);
    res.json({ code: 0, message: '密码修改成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;

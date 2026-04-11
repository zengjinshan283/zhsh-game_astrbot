/**
 * 管理后台认证中间件 - 独立JWT
 */
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');

module.exports = {
  /**
   * 验证Admin JWT Token
   */
  async adminAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ code: 401, message: '未登录' });
    }
    try {
      const decoded = jwt.verify(token, config.admin.jwtSecret);
      const admin = await db.getOne(
        'SELECT id, username, nickname, role, is_active FROM admin_user WHERE id = ? AND is_active = 1',
        [decoded.adminId]
      );
      if (!admin) {
        return res.status(401).json({ code: 401, message: '管理员不存在或已禁用' });
      }
      req.admin = admin;
      next();
    } catch (err) {
      return res.status(401).json({ code: 401, message: 'Token无效或已过期' });
    }
  },

  /**
   * 记录管理员操作日志
   */
  async logAction(adminId, action, target, detail, req) {
    try {
      await db.insert('admin_log', {
        admin_id: adminId,
        action,
        target: target || null,
        detail: detail || null,
        ip: req?.ip || req?.connection?.remoteAddress || null,
        user_agent: req?.headers?.['user-agent'] || null
      });
    } catch (e) {
      console.error('[AdminLog] Failed to log:', e.message);
    }
  },

  /**
   * 记录数据变更日志
   */
  async logChangelog(adminId, tableName, recordId, action, oldData, newData, req) {
    try {
      await db.insert('data_changelog', {
        admin_id: adminId || 0,
        table_name: tableName,
        record_id: recordId || 0,
        action,
        old_data: oldData ? JSON.stringify(oldData) : null,
        new_data: newData ? JSON.stringify(newData) : null,
        ip: req?.ip || req?.connection?.remoteAddress || null
      });
    } catch (e) {
      console.error('[Changelog] Failed to log:', e.message);
    }
  }
};

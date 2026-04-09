/**
 * 纵横四海 - 数据库连接池
 */
const mysql = require('mysql2/promise');
const config = require('./config');

const pool = mysql.createPool(config.db);

// 快捷方法
const db = {
  async getOne(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows[0] || null;
  },
  async getAll(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
  },
  async getVar(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    const row = rows[0];
    if (!row) return null;
    return Object.values(row)[0];
  },
  async insert(table, data) {
    const fields = Object.keys(data);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(data);
    const [result] = await pool.execute(
      `INSERT INTO \`${table}\` (${fields.map(f => '`' + f + '`').join(', ')}) VALUES (${placeholders})`,
      values
    );
    return result.insertId;
  },
  async update(table, data, where, whereParams = []) {
    const setClause = Object.keys(data).map(f => `\`${f}\` = ?`).join(', ');
    const values = [...Object.values(data), ...whereParams];
    const [result] = await pool.execute(
      `UPDATE \`${table}\` SET ${setClause} WHERE ${where}`,
      values
    );
    return result.affectedRows;
  },
  async delete(table, where, params = []) {
    const [result] = await pool.execute(
      `DELETE FROM \`${table}\` WHERE ${where}`,
      params
    );
    return result.affectedRows;
  },
  async query(sql, params = []) {
    const [result] = await pool.execute(sql, params);
    return result;
  },
  pool
};

module.exports = db;

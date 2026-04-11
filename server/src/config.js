/**
 * 纵横四海 - 全局配置
 * 敏感值从 .env 读取，仅保留安全默认值
 */
module.exports = {
  // 服务端口
  port: process.env.PORT || 3000,
  // WebSocket 端口
  wsPort: process.env.WS_PORT || 8282,

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'change_me_jwt_secret',
  jwtExpiresIn: '7d',
  jwtRefreshExpiresIn: '30d',

  // 管理后台 JWT
  admin: {
    jwtSecret: process.env.ADMIN_JWT_SECRET || 'change_me_admin_jwt_secret',
    jwtExpiresIn: '24h'
  },

  // 数据库
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'zhsh_game',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  },

  // 游戏常量
  game: {
    siteName: '纵横四海',
    version: '2.0.0',
    onlineTimeout: 900,
    startPlaceId: 1011,
    shopPlaceId: 1029,
    maxChatMessages: 50,
    sidLength: 32,
    levelHpBonus: 20,
    levelAtkMinBonus: 2,
    levelAtkMaxBonus: 5,
    levelDefBonus: 1,
    baseExpMax: 500,
    expGrowth: 300,
    chatWorld: 0,
    chatPrivate: 1
  }
};

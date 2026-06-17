require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const GameWsServer = require('./ws/WsServer');
const errorHandler = require('./middleware/errorHandler');
const db = require('./db');

const app = express();
app.set("trust proxy", 1);
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../../client/dist')));
app.use('/admin', express.static(path.join(__dirname, '../../admin/dist')));

// ========== 游戏API路由 ==========
app.use('/api/auth', require('./routes/auth'));
app.use('/api/map', require('./routes/map'));
app.use('/api/battle', require('./routes/battle'));
app.use('/api/npc', require('./routes/npc'));
app.use('/api/bank', require('./routes/bank'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/user', require('./routes/user'));
app.use('/api/user', require('./routes/user2'));
app.use('/api/smith', require('./routes/smith'));
app.use('/api/quest', require('./routes/quest'));
app.use('/api/mentor', require('./routes/mentor'));
app.use('/api/pet', require('./routes/pet'));
app.use('/api/guild', require('./routes/guild'));
app.use('/api/market', require('./routes/market'));
app.use('/api/sail', require('./routes/sail'));
app.use('/api/ship', require('./routes/ship'));
app.use('/api/casino', require('./routes/casino'));
app.use('/api/rank', require('./routes/rank'));
app.use('/api/talent', require('./routes/talent').router);
app.use('/api/friend', require('./routes/friend'));
app.use('/api/sign', require('./routes/sign'));
app.use('/api/daily', require('./routes/daily'));
app.use('/api/cdkey', require('./routes/cdkey'));
app.use('/api/welfare', require('./routes/welfare'));
app.use('/api/guide', require('./routes/guide'));
app.use('/api/mall', require('./routes/mall'));
app.use('/api/mail', require('./routes/mail'));
app.use('/api/skill', require('./routes/skill'));
app.use('/api/dungeon', require('./routes/dungeon'));
app.use('/api/arena', require('./routes/arena'));
app.use('/api/achievement', require('./routes/achievement'));
app.use('/api/vip', require('./routes/vip'));
app.use('/api/invite', require('./routes/invite'));
app.use('/api/codex', require('./routes/codex'));
app.use('/api/wild', require('./routes/wild'));
app.use('/api/gate', require('./routes/gate'));
app.use('/api/fishing', require('./routes/fishing'));
app.use('/api/treasure', require('./routes/treasure'));
app.use('/api/auction', require('./routes/auction'));
app.use('/api/quiz', require('./routes/quiz'));
app.use('/api/worldboss', require('./routes/worldboss'));
app.use('/api/offline', require('./routes/offline'));
app.use('/api/fashion', require('./routes/fashion'));
app.use('/api/guildskill', require('./routes/guildskill'));

// ========== 管理后台API路由 ==========
app.use('/api/admin/auth', require('./routes/admin/auth'));
app.use('/api/admin/dashboard', require('./routes/admin/dashboard'));
app.use('/api/admin/enums', require('./routes/admin/enums'));
app.use('/api/admin/configs', require('./routes/admin/configs'));
app.use('/api/admin/maps', require('./routes/admin/maps'));
app.use('/api/admin/places', require('./routes/admin/places'));
app.use('/api/admin/npcs', require('./routes/admin/npcs'));
app.use('/api/admin/monsters', require('./routes/admin/monsters'));
app.use('/api/admin/items', require('./routes/admin/items'));
app.use('/api/admin/quests', require('./routes/admin/quests'));
app.use('/api/admin/pets', require('./routes/admin/pets'));
app.use('/api/admin/ships', require('./routes/admin/ships'));
app.use('/api/admin/players', require('./routes/admin/players'));
app.use('/api/admin/logs', require('./routes/admin/logs'));
app.use('/api/admin/changelogs', require('./routes/admin/changelogs'));
app.use('/api/admin/cdkey', require('./routes/admin/cdkey'));

// ========== 全局错误处理 ==========
app.use(errorHandler);

// ========== 错误处理 & 兜底路由 ==========
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  } else {
    res.status(404).json({ error: 'Not Found' });
  }
});

const server = app.listen(config.port, () => {
  console.log(`[HTTP] Server running on port ${config.port}`);
});

const wsServer = new GameWsServer();
wsServer.start(config.wsPort);

process.on('SIGTERM', () => { server.close(); db.pool.end(); process.exit(0); });
process.on('SIGINT', () => { server.close(); db.pool.end(); process.exit(0); });

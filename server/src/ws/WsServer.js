/**
 * WebSocket 服务 - 实时通信
 */
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');

class GameWsServer {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // fd -> { ws, user, lastPing }
    this.userMap = new Map(); // userId -> fd
  }

  start(port) {
    this.wss = new WebSocketServer({ port }, () => {
      console.log(`[WS] WebSocket server listening on port ${port}`);
    });

    this.wss.on('connection', (ws) => {
      const fd = Date.now() + Math.random();
      const client = { ws, user: null, lastPing: Date.now() };
      this.clients.set(fd, client);

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          this.onMessage(fd, msg);
        } catch (e) { /* ignore */ }
      });

      ws.on('close', () => this.onDisconnect(fd));
      ws.on('error', () => this.onDisconnect(fd));
    });

    // 心跳检测
    setInterval(() => this.pingCheck(), 30000);
    // 在线同步
    setInterval(() => this.syncOnline(), 60000);
  }

  async onMessage(fd, msg) {
    const client = this.clients.get(fd);
    if (!client) return;
    client.lastPing = Date.now();

    if (msg.type === 'auth') {
      await this.handleAuth(fd, msg.token);
      return;
    }

    if (!client.user) return; // 未认证忽略

    switch (msg.type) {
      case 'chat_send':
        await this.handleChat(fd, msg);
        break;
      case 'move':
        await this.handleMove(fd, msg);
        break;
      case 'ping':
        client.ws.send(JSON.stringify({ type: 'pong' }));
        break;
      default:
        break;
    }
  }

  async handleAuth(fd, token) {
    const client = this.clients.get(fd);
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      const user = await db.getOne(
        'SELECT id, username, sex, level, hp, hp_max, exp, exp_max, money, gold, place_id, sail_time FROM `user` WHERE `id` = ?',
        [decoded.id]
      );
      if (!user) { this.send(fd, { type: 'auth_fail', data: { text: '用户不存在' } }); return; }

      // 踢掉旧连接
      const oldFd = this.userMap.get(user.id);
      if (oldFd && oldFd !== fd) {
        this.send(oldFd, { type: 'kicked', data: { text: '你在其他地方登录了' } });
        const old = this.clients.get(oldFd);
        if (old) old.ws.close();
        this.clients.delete(oldFd);
      }

      client.user = user;
      this.userMap.set(user.id, fd);
      this.send(fd, { type: 'auth_ok', data: user });
      console.log(`[WS] User ${user.username} connected`);
    } catch (e) {
      this.send(fd, { type: 'auth_fail', data: { text: '认证失败' } });
    }
  }

  async handleChat(fd, msg) {
    const client = this.clients.get(fd);
    if (!client.user) return;
    const message = (msg.message || '').trim();
    if (message.length < 1 || message.length > 200) return;

    const id = await db.insert('chat', {
      user_id: client.user.id, target_id: 0, message,
      created_at: Math.floor(Date.now() / 1000)
    });

    const chatMsg = {
      type: 'chat_new', data: {
        id, user_id: client.user.id, username: client.user.username,
        sex: client.user.sex, level: client.user.level, message,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      }
    };
    this.broadcast(chatMsg);
  }

  async handleMove(fd, msg) {
    // 简化：通知同场景玩家
    this.send(fd, { type: 'move_ok', data: {} });
  }

  onDisconnect(fd) {
    const client = this.clients.get(fd);
    if (client && client.user) {
      this.userMap.delete(client.user.id);
      console.log(`[WS] User ${client.user.username} disconnected`);
    }
    this.clients.delete(fd);
  }

  send(fd, data) {
    const client = this.clients.get(fd);
    if (client && client.ws.readyState === 1) {
      client.ws.send(JSON.stringify(data));
    }
  }

  broadcast(data, excludeFd = null) {
    for (const [fd] of this.clients) {
      if (fd !== excludeFd) this.send(fd, data);
    }
  }

  sendToUser(userId, data) {
    const fd = this.userMap.get(userId);
    if (fd) this.send(fd, data);
  }

  getOnlineCount() { return this.userMap.size; }

  pingCheck() {
    const now = Date.now();
    for (const [fd, client] of this.clients) {
      if (now - client.lastPing > 90000) {
        client.ws.close();
        this.onDisconnect(fd);
      }
    }
  }

  async syncOnline() {
    for (const [userId] of this.userMap) {
      await db.update('user', { lastdate: Math.floor(Date.now() / 1000) }, '`id` = ?', [userId]);
    }
    this.broadcast({ type: 'online_update', data: { online_count: this.getOnlineCount() } });
  }
}

module.exports = GameWsServer;

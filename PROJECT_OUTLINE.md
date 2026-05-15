# 🏴‍☠️ 纵横四海 (zhsh-game) — 项目大纲

> 文字航海冒险网页游戏 · Web-based text nautical adventure game

---

## 一、项目概览

| 项目信息 | 详情 |
|---------|------|
| **名称** | 纵横四海 |
| **技术栈** | Node.js + Express + MySQL + WebSocket + Vue 3 |
| **端口** | Server: 3000 (HTTP) + 8282 (WS) / Admin: 5174 / Client: 5173 |
| **仓库** | https://github.com/975269528/zhsh-game_astrbot.git |

---

## 二、项目架构

```
zhsh-game_astrbot/
├── server/          # Node.js 服务端（API + WebSocket）
├── admin/           # Vue 3 管理后台（SPA）
├── client/          # Vue 3 游戏客户端（SPA）
├── DB_CHANGES.md    # 数据库变更记录
└── README.md
```

---

## 三、服务端 (server/)

### 3.1 入口与配置

| 文件 | 说明 |
|------|------|
| `src/app.js` | 入口文件，同时启动 HTTP 服务（Express）和 WebSocket 服务 |
| `src/config.js` | 全局配置，从 `.env` 读取敏感信息（JWT密钥、数据库连接等） |
| `src/db.js` | MySQL 连接池 |

### 3.2 中间件 (src/middleware/)

| 文件 | 说明 |
|------|------|
| `errorHandler.js` | 全局错误处理 |
| `auth.js` | JWT 用户认证 |
| `adminAuth.js` | 管理员 JWT 认证 |

### 3.3 API 路由 (src/routes/)

| 路由文件 | 说明 |
|----------|------|
| `auth.js` | 注册 / 登录 |
| `user.js` | 玩家角色（背包、属性、装备） |
| `user2.js` | 玩家扩展（待分类） |
| `battle.js` | 战斗系统 |
| `chat.js` | 聊天系统 |
| `map.js` | 地图探索 |
| `npc.js` | NPC 交互 |
| `quest.js` | 任务系统 |
| `pet.js` | 宠物系统 |
| `guild.js` | 公会系统 |
| `market.js` | 市场交易 |
| `sail.js` | 航海系统 |
| `casino.js` | 赌场系统 |
| `rank.js` | 排行榜 |
| `friend.js` | 好友系统 |
| `smith.js` | 铁匠铺 |
| `admin/` | 管理后台 API（含 15 个子模块） |

### 3.4 WebSocket (src/ws/)

| 文件 | 说明 |
|------|------|
| `WsServer.js` | WebSocket 实时通信服务（聊天、战斗等） |

---

## 四、管理后台 (admin/)

### 4.1 布局组件

| 文件 | 说明 |
|------|------|
| `layout/AdminLayout.vue` | 整体布局框架 |
| `layout/Header.vue` | 顶部栏 |
| `layout/Sidebar.vue` | 侧边导航栏 |
| `layout/TagsView.vue` | 标签页（多页签切换） |

### 4.2 通用组件

| 文件 | 说明 |
|------|------|
| `components/ProTable.vue` | 通用表格（搜索/分页/操作） |
| `components/PageHeader.vue` | 页面头部 |

### 4.3 API 层 (src/api/)

| 文件 | 说明 |
|------|------|
| `index.js` | Axios 实例封装 |
| `auth.js` | 登录 |
| `configs.js` | 游戏配置 |
| `dashboard.js` | 仪表盘 |
| `enums.js` | 枚举管理 |
| `items.js` | 物品管理 |
| `logs.js` | 日志（操作日志/数据日志） |
| `maps.js` | 地图管理 |
| `monsters.js` | 怪物管理 |
| `npcs.js` | NPC 管理 |
| `pets.js` | 宠物管理 |
| `players.js` | 玩家管理 |
| `quests.js` | 任务管理 |
| `places.js` | 场景管理 |
| `ships.js` | 船舶管理 |

### 4.4 管理页面 (src/views/)

| 页面 | 说明 |
|------|------|
| `Login.vue` | 登录页 |
| `Dashboard.vue` | 仪表盘（在线人数/注册趋势/资源统计） |

---

## 五、游戏客户端 (client/)

### 5.1 公共组件 (src/components/)

| 组件 | 说明 |
|------|------|
| `TopBar.vue` | 顶部状态栏 |
| `BottomNav.vue` | 底部导航栏 |
| `StatusBar.vue` | 角色状态栏 |
| `BattleOverlay.vue` | 战斗覆盖层 |

### 5.2 组合式函数 (src/composables/)

| 文件 | 说明 |
|------|------|
| `useApi.js` | API 请求封装 |
| `useConfirm.js` | 确认对话框 |
| `useGameWS.js` | 游戏 WebSocket 连接管理 |

### 5.3 状态管理 (src/stores/)

| 文件 | 说明 |
|------|------|
| `user.js` | 用户状态（Token/角色信息） |
| `game.js` | 游戏状态（当前地图/场景等） |

### 5.4 游戏页面 (src/views/)

| 页面 | 说明 |
|------|------|
| `LoginView.vue` | 登录 |
| `RegisterView.vue` | 注册 |
| `HomeView.vue` | 首页 |
| `MapView.vue` | 大地图（世界导航） |
| `CityMapView.vue` | 城市内地图 |
| `ShopView.vue` | 商店 |
| `BankView.vue` | 银行 |
| `SmithView.vue` | 铁匠铺 |
| `MarketView.vue` | 市场交易 |
| `PetView.vue` | 宠物系统 |
| `QuestView.vue` | 任务系统 |
| `SailView.vue` | 航海 |
| `CasinoView.vue` | 赌场 |
| `ChatView.vue` | 聊天系统 |
| `GuildView.vue` | 公会 |
| `RankView.vue` | 排行榜 |
| `FriendView.vue` | 好友系统 |
| `InventoryView.vue` | 背包 |
| `EquipmentView.vue` | 装备 |
| `StatusView.vue` | 角色状态 |
| `PlayerView.vue` | 玩家主页 |
| `StoryView.vue` | 剧情 |

---

## 六、游戏核心系统

| 系统 | 说明 |
|------|------|
| **地图探索** | 7 个城市，场景导航（n/s/e/w 方向） |
| **战斗系统** | 回合制战斗，怪物掉落 |
| **宠物系统** | 驯兽师、口粮、进化、技能 |
| **航海系统** | 船只属性（速度 1-5），出海冒险 |
| **交易市场** | 威尼斯市场合并，口粮 NPC |
| **任务系统** | 主线/支线/日常任务 |
| **公会系统** | 玩家公会，社交功能 |
| **聊天系统** | 实时聊天，WebSocket 驱动 |
| **铁匠铺** | 装备强化/修理 |
| **赌场** | 概率玩法 |
| **排行榜** | 多维度排行 |

---

## 七、数据库

- **MySQL 5.7+**
- 字符集：`utf8mb4_unicode_ci`
- 主要表：玩家、物品、NPC、地点、任务、宠物、战斗日志、聊天记录等

### 关键变更记录（DB_CHANGES.md）

- **2026-04-10**：驯兽师 NPC 合并（36个新建，NPC:44~79），威尼斯市场合并

---

## 八、部署架构

```
                    Nginx (80/443)
                        │
            ┌───────────┼───────────┐
            ▼           ▼           ▼
       / (Client)   /admin/    /api/  →  Server:3000
   游戏客户端      管理后台      API
                       │
                    /ws → WebSocket:8282
```

- **反向代理**：Nginx
- **进程管理**：nohup（建议后续改 PM2）
- **进程数量**：Server ×1 / Admin ×1 / Client ×1

---

## 九、环境要求

| 依赖 | 版本 |
|------|------|
| Node.js | 18+ |
| MySQL | 5.7+ |
| npm | 9+ |
| Nginx | 推荐 |

---

## 十、已知问题 & 状态

| 问题 | 说明 | 状态 |
|------|------|------|
| 进程管理 | nohup 启动，服务器重启后需手动拉起 | 待优化 |
| 战斗日志 | `result` 字段 0/1，前端期望 win/lose | 已兼容 |
| 注册 IP | Nginx 反向代理下需 `trust proxy` | 已修复 |
| GitHub 推送 | 需 noreply 格式邮箱 | 已修复 |
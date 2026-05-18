# 纵横四海 - 项目大纲 (Project Outline)

> v4.0 | 2026-05-18 | 分支: future

---

## 1. 项目概述

- **名称**: 纵横四海 (zhsh-game)
- **类型**: 航海RPG + 社交竞技
- **技术栈**: Node.js(后端) + Vue3(前端) + MySQL + WebSocket
- **端口**: 后端 3000, WebSocket 8282, 前端Dev 5173
- **工作目录**: `/home/ubuntu/work/zhsh-game_astrbot`
- **分支**: `future` (已push到origin)

---

## 2. 目录结构

```
zhsh-game_astrbot/
├── server/               # Node.js/Express 后端
│   └── src/
│       ├── app.js        # 入口 (不是index.js)
│       ├── routes/       # 路由模块
│       │   ├── auth.js       # 登录/注册/角色
│       │   ├── user.js       # 用户状态/装备/背包
│       │   ├── battle.js     # 战斗系统
│       │   ├── quest.js      # 任务系统
│       │   ├── map.js        # 地图移动
│       │   ├── npc.js        # NPC对话
│       │   ├── dungeon.js    # 副本系统
│       │   ├── mall.js       # 商城
│       │   ├── market.js     # 市场
│       │   ├── bank.js       # 银行
│       │   ├── casino.js     # 赌场
│       │   ├── sign.js       # 签到
│       │   ├── welfare.js    # 福利中心
│       │   ├── sail.js       # 航海系统
│       │   ├── arena.js      # 竞技场
│       │   ├── vip.js        # VIP
│       │   ├── daily.js      # 每日任务
│       │   ├── rank.js       # 排行榜
│       │   ├── codex.js      # 图鉴
│       │   ├── invite.js     # 邀请系统
│       │   ├── chat.js       # 聊天
│       │   ├── cdkey.js      # CDKEY
│       │   ├── pet.js        # 宠物
│       │   ├── ship.js       # 船只
│       │   ├── guild.js      # 公会
│       │   ├── mentor.js     # 师徒
│       │   ├── guide.js      # 新手引导
│       │   └── smith.js      # 铁匠铺
│       ├── db.js             # MySQL封装 (getOne/getAll/query/update)
│       └── middleware/auth.js
├── client/               # Vue3 前端
│   └── src/
│       ├── views/            # 30+ 页面
│       ├── components/       # 通用组件
│       ├── composables/      # 组合式函数
│       ├── stores/           # Pinia状态
│       └── router/           # 路由配置
├── docs/                 # 设计文档
│   ├── GAME_DESIGN.md
│   ├── QUEST_DESIGN.md
│   └── ITEM_MONSTER_DESIGN.md
└── sql/
    └── init-db.sql          # 初始化SQL
```

---

## 3. 货币体系 (已确定)

| 货币 | 字段 | 用途 | 获取途径 |
|------|------|------|----------|
| 铜币 | `money` | 基础货币：装备/修船/航海/强化 | 打怪/任务/贸易 |
| 银币 | `silver` | 高级：技能/藏宝图/副本次数重置 | 每日任务/竞技场/公会战 |
| 金币 | `gold` | 珍稀：商城珍稀道具/VIP/快速恢复 | 充值/活动 |

> **重要**: `mall.js` 曾用 `gold` 定价，需改为 `money`（铜币购买）

---

## 4. 已验证 API 路由 (全部通过)

### 核心战斗
- `POST /api/auth/login` / `POST /api/auth/register`
- `GET /api/user/status` / `GET /api/user/inventory` / `GET /api/user/equipment`
- `POST /api/user/equip` / `POST /api/user/unequip`
- `POST /api/battle/start` / `POST /api/battle/action`

### 任务与探索
- `GET /api/quest/list` / `POST /api/quest/accept` / `POST /api/quest/claim`
- `POST /api/map/move?dir=` / `GET /api/map/scene`
- `POST /api/npc/chat?npc_id=`
- `GET /api/dungeon/list` / `POST /api/dungeon/:name/enter`
- `GET /api/dungeon/status` / `POST /api/dungeon/floor/attack` / `POST /api/dungeon/exit`

### 航海
- `GET /api/sail/status` / `POST /api/sail/depart` / `GET /api/sail/ports`
- `GET /api/sail/ship/list` / `GET /api/ship/status`

### 交易与福利
- `GET /api/mall` / `POST /api/mall/buy`
- `GET /api/market/info` / `POST /api/market/buy`
- `GET /api/bank/info` / `GET /api/sign/status` / `POST /api/sign/in`
- `GET /api/welfare/status` / `POST /api/welfare/claim-login` / `POST /api/welfare/claim-starter`

### 社交竞技
- `GET /api/arena/status` / `GET /api/arena/opponents` / `POST /api/arena/challenge`
- `GET /api/daily/status` / `POST /api/daily/claim`
- `GET /api/rank/level` / `GET /api/rank/power`
- `GET /api/guild/my` / `GET /api/pet/info`

### 其他
- `GET /api/codex/list` / `GET /api/invite/status`
- `GET /api/chat/messages` / `GET /api/cdkey/query/:code`
- `GET /api/guide/status` / `POST /api/guide/step`
- `GET /api/smith/items` / `POST /api/smith/enhance`
- `GET /api/vip/status` / `GET /api/mentor/ranking`

---

## 5. 已知 Bug 修复记录

### 已修复 (commit 3741f15)
| 文件 | Bug | 修复 |
|------|-----|------|
| `battle.js` | 海盗战 `pirate.exp` → undefined | → `pirate.exp_reward` |
| `InviteView.vue` | `/user/info` 路由不存在 | → `/auth/me` + `me.user.id` |
| `MapView.vue` | casino bet参数 `bet` → 后端读`amount` | → `amount: amount` |
| `useGameWS.js` | `globalAlert` 未导入崩溃 | → 导入 `globalAlert` |
| `HomeView.vue` | 4处原生 `alert()` | → `globalAlert()` |
| `GuideOverlay.vue` | 原生 `alert()` | → `globalAlert()` |
| `CdkeyView.vue` | 硬编码 `'QUERY'` 占位符 | → 删除无效调用 |
| `useApi.js` | 导入未使用的 `useRouter` | → 删除 |
| `quest.js` | `quest_id ==` 松散比较 | → `===` |
| `battle.js` | `skill_id ==` 松散比较 | → `===` |
| `mentor.js` | 5处 `nickname` → user表无此字段 | → `username` (commit 2ec0435) |

---

## 6. 启动命令

```bash
# 后端
cd /home/ubuntu/work/zhsh-game_astrbot
node server/src/app.js > /tmp/server.log 2>&1

# 前端dev
cd /home/ubuntu/work/zhsh-game_astrbot/client
npm run dev -- --host 0.0.0.0 --port 5173

# 前端构建
npm run build
```

---

## 7. 数据库

- **MySQL**: 本机, root无密码, 库名 `zhsh_game`
- **关键表**: user, user_ship, inventory, item, monster, quest, place, npc
- **注意**: init-db.sql 与实际DB常有字段不一致；每次报错先对比SQL文件，缺字段用 `ALTER TABLE` 补

---

## 8. 测试账号

- `tester1` / `test123456` (ID=26, Lv1, 铜币约19300)
- 当前所在: 雅典码头 (place_id=1021)

---

## 9. 待完成 / 已知问题

1. **雅典城只有码头+酒馆且无连接** - 玩家到码头后困住
2. **game_config 表缺数据** - 导致部分查询间歇性超时
3. **无负面状态(debuff)系统** - 解毒剂/清醒草等为占位符
4. **mall.js 定价问题** - 仍使用 gold 定价，需改为 money

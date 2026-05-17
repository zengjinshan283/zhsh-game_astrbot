# 纵横四海（zhsh-game）项目大纲

> 版本: v4.0 | 更新: 2026-05-17 | 分支: future

---

## 一、项目概述

**纵横四海** 是一款基于 Web 的大航海时代 RPG 游戏，采用 Node.js 后端 + Vue3 前端架构，支持移动端优先的现代 2D 风格界面（非纯文字游戏）。

### 1.1 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | Vue 3 + Vite | 响应式，移动端优先 |
| UI 风格 | 暗黑奇幻 + 航海主题 | #080c08 深色背景，金铜色点缀 (#cfc19e/#ffd700) |
| 后端框架 | Node.js + Express | 入口: `node src/app.js`，端口 3000 |
| 数据库 | MySQL | 库名 `zhsh_game`，root 无密码 |
| 实时通信 | WebSocket | WsServer.js，战斗/聊天/航行事件 |
| 部署工具 | PM2 | `pm2-runtime ecosystem.config.js` |
| 管理后台 | Vue 3 + Element Plus | admin/ 目录，独立部署 |

### 1.2 项目目录结构

```
zhsh-game_astrbot/
├── server/                    # Node.js 后端
│   ├── src/
│   │   ├── app.js            # 入口（端口 3000）
│   │   ├── config.js         # 数据库/密钥配置
│   │   ├── db.js             # MySQL 连接池
│   │   ├── middleware/       # 认证/错误处理
│   │   ├── routes/           # 路由（40+ 个 API 模块）
│   │   ├── utils/            # 工具（status.js 状态效果）
│   │   └── ws/               # WebSocket 服务器
│   ├── init-db.sql           # 数据库初始化（40 表，744KB）
│   └── ecosystem.config.js   # PM2 配置
├── client/                    # Vue3 前端（移动端优先）
│   └── src/
│       ├── views/            # 28 个页面视图
│       ├── components/       # 6 个全局组件
│       ├── composables/      # API/WebSocket 封装
│       ├── stores/           # Pinia 状态管理
│       └── assets/styles/    # 全局样式（game.css 1200+ 行）
├── admin/                     # 管理后台
│   └── src/views/            # 10+ 管理模块
├── DB_CHANGES.md             # 数据库变更记录
├── PROJECT_OUTLINE.md        # 本文件
└── FUTURE_PLAN.md           # 长期功能规划
```

---

## 二、数据规模（当前）

| 类别 | 数量 | 状态 |
|------|------|------|
| 海域/城市 | 6 海域 40+ 城市 | ✅ |
| 地点（place） | 4,956 | ✅ |
| 物品（item） | 3,826+ | ✅ |
| 武器 | 876+ | ✅ |
| 防具 | 11+ | ✅ |
| 怪物（monster） | 285 | ✅ |
| NPC | 208 | ✅ |
| 任务（quest） | 270+ | ✅ |
| 技能（skill） | 5 | ✅ |
| 状态效果（status） | 17 | ✅ |
| 船只（ship） | 15 | ✅ |
| 贸易商品（goods） | 49 | ✅ |
| 数据库表 | 40 表 | ✅ 已同步 |

---

## 三、已实现功能 ✅

### 核心系统
- [x] **用户系统** — 注册/登录/JWT、体力、铜币/银币/金币、MP/mp_max
- [x] **地图系统** — 6大海域、37+城市、4956地点、N/S/E/W 导航
- [x] **战斗系统** — 回合制、攻击/技能/逃跑/掉落/耐久消耗
- [x] **航海系统** — 买船/卖船/航行/遇海盗/船只HP/修理
- [x] **任务系统** — 接任务/进度/交任务/奖励发放（8环主线链）
- [x] **商店系统** — 买/卖装备、NPC商店（360+条商品）
- [x] **铁匠系统** — 强化+1～+15、失败降级/返还材料
- [x] **装备耐久** — 战斗消耗/铁匠修理
- [x] **技能系统** — 5个主动技能、MP消耗+冷却
- [x] **消耗品** — 26种（HP/MP回复/Buff/导航/状态解除）
- [x] **Buff/Debuff** — 17种状态、战斗tick、怪物反击施加
- [x] **银行系统** — 存款/取款
- [x] **赌场系统** — 骰子猜大小
- [x] **市场贸易** — 城市间低买高卖（49商品×37城市）
- [x] **签到系统** — 7天循环签到
- [x] **CDKEY礼包**
- [x] **商城系统**（铜币购买）
- [x] **装备品级+词缀** — 5品级（白/绿/蓝/紫/橙）+ 随机词缀
- [x] **装备稀有度** — quality 0-4 + item_affix 词缀表
- [x] **每日活跃奖励** — 7档（铜币/道具/经验）
- [x] **在线奖励** — 30分钟倒计时，12档60分钟循环
- [x] **每日礼包** — 3档（铜币/经验/装备）
- [x] **主线任务奖励** — 任务完成后领取

### 社交系统
- [x] **师徒系统** — 拜师/收徒/出师
- [x] **好友系统** — 加好友/私聊
- [x] **邮件系统** — 发送/接收附件
- [x] **公会系统** — 创建/加入/捐献（基础）

### 新手引导系统 🆕
- [x] **GuideOverlay.vue** — 全屏遮罩+聚光灯+任务卡片
- [x] **开场故事**（5段落）— 创建角色后自动触发，step=0
- [x] **7步引导链** — 0开场→1找马可→2清理野狗→3汇报→4去码头→5买船→6起航→7到达→99完成
- [x] **QuestGuideView.vue** — 主线任务专属引导面板（进度/目标/一键导航）
- [x] **guide.js 新接口** — /intro-stories、/intro-complete、/place-enter、/quest-complete
- [x] **后端联动** — npc.js、map.js、sail.js、quest.js 联动推进 guide_step

---

## 四、前端页面一览（28个视图）

### 主功能区
| 页面 | 路由 | 说明 |
|------|------|------|
| HomeView | / | 主页：在线奖励、签到、入口按钮 |
| LoginView | /login | 登录 |
| RegisterView | /register | 注册 |
| MapView | /map | 城市地图（地点导航） |
| CityMapView | /city-map | 城内导航 |
| QuestView | /quest | 任务面板 |
| QuestGuideView | /quest-guide | 新手引导任务面板 |
| StatusView | /status | 角色状态（属性/Buff） |

### 战斗与探险
| 页面 | 路由 | 说明 |
|------|------|------|
| BattleOverlay | (overlay) | 战斗界面 |
| SailView | /sail | 航海（出发/航行/事件） |
| StoryView | /story | 开场故事 |

### 装备与强化
| 页面 | 路由 | 说明 |
|------|------|------|
| EquipmentView | /equipment | 装备穿戴 |
| InventoryView | /inventory | 背包 |
| SmithView | /smith | 铁匠强化 |

### 社交与交易
| 页面 | 路由 | 说明 |
|------|------|------|
| ShopView | /shop | NPC商店 |
| MarketView | /market | 市场贸易 |
| MallView | /mall | 商城购买 |
| BankView | /bank | 银行存取 |
| FriendView | /friend | 好友列表 |
| ChatView | /chat | 私聊/世界频道 |
| GuildView | /guild | 公会 |
| CasinoView | /casino | 赌场 |

### 宠物
| 页面 | 路由 | 说明 |
|------|------|------|
| PetView | /pet | 宠物界面 |

### 其他
| 页面 | 路由 | 说明 |
|------|------|------|
| RankView | /rank | 排行榜 |
| PlayerView | /player | 角色信息 |
| CdkeyView | /cdkey | CDKEY兑换 |
| WelfareView | /welfare | 福利中心 |
| DailyView | /daily | 每日挑战 |

---

## 五、后端 API 路由（40+ 模块）

### 核心路由 `server/src/routes/`
```
auth.js          # 注册/登录
user.js          # 玩家信息/属性
user2.js         # 扩展用户接口
battle.js        # 战斗
sail.js          # 航海/船只
map.js           # 地图/地点移动
quest.js         # 任务
npc.js           # NPC对话/商店
shop.js          # NPC商店
market.js        # 市场贸易
bank.js          # 银行
sign.js          # 签到
welfare.js       # 福利（活跃/在线/每日礼包）
daily.js         # 每日挑战
guild.js         # 公会
friend.js        # 好友
chat.js          # 聊天
rank.js          # 排行榜
pet.js           # 宠物
ship.js          # 船只
smith.js         # 铁匠强化
mall.js          # 商城
casino.js        # 赌场
cdkey.js         # CDKEY兑换
guide.js         # 新手引导
mentor.js        # 师徒
```

### 管理后台路由 `server/src/routes/admin/`
```
auth.js          # 管理员登录
configs.js       # 游戏配置
dashboard.js     # 仪表盘
players.js       # 玩家管理
items.js         # 物品管理
monsters.js      # 怪物管理
npcs.js          # NPC管理
maps.js          # 地图管理
places.js        # 地点管理
quests.js        # 任务管理
ships.js         # 船只管理
pets.js          # 宠物管理
enums.js         # 枚举管理
logs.js          # 操作日志
changelogs.js    # 数据变更日志
cdkey.js         # CDKEY管理
```

---

## 六、核心数据库表（40表）

### 用户与角色
```
user              # 玩家主表（guide_step/money/gold/level/exp/mp/hp/buff_flags/status_effects）
welfare_login     # 7日连续登录
welfare_milestone # 成长里程碑
user_online_reward # 在线奖励记录
```

### 地图与导航
```
map               # 海域+城市（6海域40城市）
place             # 地点（4956条，含 N/S/E/W 导航）
npc               # NPC（208条）
npc_dialog        # NPC对话
```

### 战斗与物品
```
monster           # 怪物（285条）
item              # 物品定义（3826+条）
item_affix        # 装备词缀
inventory_affix   # 背包物品词缀
inventory         # 背包
npc_shop_item     # NPC商店商品
skill             # 技能
user_skill        # 用户技能
```

### 任务与经济
```
quest             # 任务（270+条）
user_quest        # 用户任务进度
battle_log        # 战斗记录
bank_log          # 银行日志
```

### 航海与贸易
```
ship              # 船只（15条）
user_ship         # 用户船只
goods             # 贸易商品（49条）
market_price      # 城市物价（1831条）
cargo             # 货物
```

### 社交
```
friend            # 好友
guild             # 公会
guild_member       # 公会成员
chat              # 聊天记录
pet               # 宠物定义
user_pet          # 用户宠物
```

### 系统
```
admin_user        # 管理员
admin_log         # 管理员操作日志
operation_log     # 数据操作日志
data_changelog    # 数据变更日志
game_config       # 游戏配置
enum_definition   # 枚举定义
online_reward     # 在线奖励配置
```

---

## 七、进行中 / 待完善

### 引导与任务
- [ ] 引导完成后解锁完整任务面板（目前 QuestGuideView 只显示引导内任务）
- [ ] NPC 头顶感叹号/问号 UI（引导触发点标记）
- [ ] guide.js skip 接口（允许用户跳过引导直接进入游戏）
- [ ] 支线任务链扩展（当前只有零散入口，需串联成3条以上支线）

### 战斗与副本
- [ ] **副本系统** — 牛头山（12层/30级/10银）、四象圣殿（16层/100级）
- [ ] 宠物系统前端完善（当前只有数据，无完整 UI）

### 社交与竞技
- [ ] **竞技场** UI + 匹配
- [ ] **公会战** UI + 宣战/攻城逻辑

### 经济系统
- [ ] **银币体系** — 每日任务/竞技场/公会战获取，用于高级功能
- [ ] **月卡 + VIP特权** 系统
- [ ] mall.js 定价改为铜币（当前用 gold）

### 推广与增长
- [ ] **推广中心**（invite.js）— 邀请奖励

### 其他
- [ ] 开服7日/成长指南
- [ ] 装备图鉴（codex.js + CodexView）

---

## 八、参考游戏功能对照（沧澜四海）

| 功能 | 沧澜四海 | 纵横四海 | 状态 |
|------|---------|---------|------|
| 新手引导遮罩 | ✅ | ✅ GuideOverlay | ✅ |
| 开场故事 | ✅ | ✅ INTRO_STORIES | ✅ |
| 7日签到 | ✅ | ✅ | ✅ |
| 每日活跃 | ✅ | ✅ | ✅ |
| 主线任务链 | ✅ 完整链 | ✅ 1-8环 | ✅ |
| 支线任务链 | ✅ | ⚠️ 零散 | 待完善 |
| 装备强化 | ✅ | ✅ | ✅ |
| 炼金系统 | ✅ | ❌ 无 | 待开发 |
| 宠物捕捉 | ✅ | ⚠️ 数据有 | 待UI |
| 航海贸易 | ✅ | ✅ 基础 | 待完善 |
| 公会系统 | ✅ | ⚠️ 基础 | 待完善 |
| 竞技场 | ✅ | ❌ 无 | 待开发 |
| 副本（牛头山/四象） | ✅ | ❌ 无 | 待开发 |
| 宝石系统 | ✅ | ❌ 无 | 待开发 |
| 婚姻系统 | ✅ | ❌ 无 | 待开发 |
| 坐骑/羽翼 | ✅ | ❌ 无 | 待开发 |

---

## 九、货币体系（已确定）

```
铜币 (money)   — 打怪/任务/贸易获得，用于基础功能（装备/修船/航海/强化）
银币 (silver)  — 每日任务/竞技场/公会战获得，用于高级技能/藏宝图/副本次数重置
金币 (gold)    — 充值/活动获得，用于商城珍稀道具/VIP/快速恢复

（可选）兑换比例：铜币 10000 → 银币 1，银币 100 → 金币 1
```

---

## 十、关键配置

- 后端入口：`node src/app.js`（不是 index.js）
- 工作目录：`/home/ubuntu/work/zhsh-game_astrbot`
- MySQL：root 无密码，库名 `zhsh_game`
- 服务进程：使用 `background=true` 启动（nohup/& 会报错）
- init-db.sql 与实际 DB 存在字段不一致，每次报错先查 init-db.sql 对比

---

## 十一、近期变更记录（2026-05-17）

- 批量修复 6 张表字段缺失
- 完成每日活跃触发点、在线奖励 Tab、城内建筑交互面板
- git commit d375a93
# 纵横四海（zhsh-game）项目大纲

> 版本: v5.0 | 更新: 2026-05-17 | 分支: future

---

## 一、项目概述

**纵横四海** 是一款大航海时代 RPG，采用 Node.js 后端 + Vue3 前端，支持移动端优先的 2D 风格界面。

### 1.1 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | Vue 3 + Vite | 响应式，移动端优先 |
| UI 风格 | 暗黑奇幻 + 航海主题 | #080c08 深色背景，金铜色点缀 |
| 后端框架 | Node.js + Express | 入口: `node server/src/app.js`，端口 3000 |
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
│   │   ├── routes/           # 54 个 API 模块
│   │   ├── utils/            # 工具（status.js 状态效果）
│   │   └── ws/               # WebSocket 服务器
│   ├── init-db.sql           # 数据库初始化
│   └── ecosystem.config.js   # PM2 配置
├── client/                    # Vue3 前端（移动端优先）
│   └── src/
│       ├── views/            # 38 个页面视图
│       ├── components/       # 全局组件（BattleOverlay/GuideOverlay/StatusBar等）
│       ├── composables/      # API/WebSocket 封装
│       ├── stores/           # Pinia 状态管理
│       └── assets/styles/    # 全局样式
├── admin/                     # 管理后台（Element Plus）
├── docs/                      # 百科等文档
├── DB_CHANGES.md             # 数据库变更记录
├── PROJECT_OUTLINE.md        # 本文件
└── FUTURE_PLAN.md           # 长期功能规划
```

---

## 二、数据规模（当前）

| 类别 | 数量 | 说明 |
|------|------|------|
| 海域/城市 | 6 海域 / 44 城市 | ✅ |
| 地点（place） | 4,956 | 含 N/S/E/W 导航 |
| NPC | 208 | 含对话/商店 |
| 物品（item） | 3,826 | 含装备/消耗品 |
| 怪物（monster） | 285 | 含掉落表 |
| 任务（quest） | 270+ | 主线/支线 |
| 技能（skill） | 5 | 主动技能 |
| 状态效果（status） | 17 | Buff/Debuff |
| 船只（ship） | 15 | 5级船只 |
| 贸易商品（goods） | 49 | × 44 城市物价 |
| 副本（dungeon） | 56 条记录 | 含牛头山/四象圣殿 |
| 宠物 | 4 种 | 可捕捉 |
| 数据库表 | 46 表 | ✅ 已同步 |

---

## 三、已实现功能 ✅

### 核心战斗与成长
- [x] **用户系统** — 注册/登录/JWT、体力、铜币/银币/金币、MP/mp_max
- [x] **战斗系统** — 回合制、攻击/技能/逃跑/掉落/耐久消耗/怪物反击
- [x] **技能系统** — 5个主动技能、MP消耗+冷却、战斗tick触发
- [x] **Buff/Debuff** — 17种状态效果，战斗tick/怪物反击施加
- [x] **装备品级+词缀** — 5品级（白/绿/蓝/紫/橙）+ 随机词缀（item_affix）
- [x] **装备耐久** — 战斗消耗/铁匠修理
- [x] **铁匠系统** — 强化+1～+15、失败降级/返还材料
- [x] **消耗品** — 26种（HP/MP回复/Buff/导航/状态解除/解毒/清醒等）

### 地图与航海
- [x] **地图系统** — 6大海域 44城市、4956地点、N/S/E/W 导航
- [x] **城内导航** — CityMapView，建筑交互面板（酒馆/市场/码头等）
- [x] **航海系统** — 买船/卖船/起航/遇海盗/船只HP/修理

### 经济系统
- [x] **货币体系** — 铜币(money)/银币(silver)/金币(gold) 三元体系
- [x] **商店系统** — 买/卖装备、NPC商店（360+条商品）
- [x] **铁匠系统** — 强化+1～+15
- [x] **市场贸易** — 城市间低买高卖（49商品×44城市）
- [x] **银行系统** — 存款/取款
- [x] **赌场系统** — 骰子猜大小

### 任务与福利
- [x] **任务系统** — 接任务/进度/交任务/奖励（8环主线链）
- [x] **签到系统** — 7天循环签到
- [x] **CDKEY礼包**
- [x] **商城系统** — 铜币购买消耗品/道具
- [x] **每日活跃奖励** — 7档（铜币/道具/经验），触发点：战斗/任务/市场/副本/竞技场
- [x] **每日礼包** — 3档（铜币/经验/装备）
- [x] **每日挑战** — daily.js + DailyView
- [x] **在线奖励** — 30分钟倒计时，12档60分钟循环

### 社交系统
- [x] **好友系统** — 加好友/私聊
- [x] **邮件系统** — 发送/接收附件
- [x] **师徒系统** — 拜师/收徒/出师
- [x] **公会系统** — 创建/加入/捐献

### 宠物、竞技、探索
- [x] **宠物系统** — 捕捉/喂食/改名/出战（4种宠物）
- [x] **竞技场** — arena.js + ArenaView，挑战对手+排名
- [x] **副本系统** — dungeon.js + DungeonView，牛头山/四象圣殿

### 新手引导系统
- [x] **GuideOverlay.vue** — 全屏遮罩+聚光灯+任务卡片
- [x] **开场故事** — 5段落，创建角色后自动触发
- [x] **7步引导链** — 0开场→1找马可→2清理野狗→3汇报→4去码头→5买船→6起航→7到达→99完成
- [x] **QuestGuideView.vue** — 主线任务专属引导面板（进度/目标/一键导航）
- [x] **guide.js 接口** — /intro-stories、/intro-complete、/place-enter、/quest-complete、/skip
- [x] **后端联动** — npc.js、map.js、sail.js、quest.js 联动推进 guide_step

### 其他功能
- [x] **VIP月卡** — vip.js + VipView，月卡专属礼包/经验加成
- [x] **装备图鉴** — codex.js + CodexView，已完成/未完成装备展示
- [x] **推广中心** — invite.js + InviteView，邀请码/邀请奖励
- [x] **排行榜** — rank.js，按等级/财富/声望排名
- [x] **聊天系统** — 世界/私聊频道
- [x] ** WelfareView** — 福利中心整合入口

---

## 四、前端页面一览（38个视图）

### 主功能
| 页面 | 路由 | 说明 |
|------|------|------|
| HomeView | / | 主页入口 |
| LoginView | /login | 登录 |
| RegisterView | /register | 注册 |
| MapView | /map | 城市地图（地点导航） |
| CityMapView | /city-map | 城内导航+建筑交互 |
| StoryView | /story | 开场故事 |

### 任务与引导
| 页面 | 路由 | 说明 |
|------|------|------|
| QuestView | /quest | 任务面板（完成引导后解锁） |
| QuestGuideView | /quest-guide | 新手引导任务面板 |

### 角色状态
| 页面 | 路由 | 说明 |
|------|------|------|
| StatusView | /status | 角色状态/属性/Buff |
| PlayerView | /player | 角色信息 |
| EquipmentView | /equipment | 装备穿戴 |
| InventoryView | /inventory | 背包 |

### 战斗与探险
| 页面 | 路由 | 说明 |
|------|------|------|
| BattleOverlay | (overlay) | 战斗界面（全局覆盖） |
| SailView | /sail | 航海 |
| DungeonView | /dungeon | 副本挑战 |
| ArenaView | /arena | 竞技场 |

### 装备与强化
| 页面 | 路由 | 说明 |
|------|------|------|
| SmithView | /smith | 铁匠强化 |
| CodexView | /codex | 装备图鉴 |

### 社交
| 页面 | 路由 | 说明 |
|------|------|------|
| FriendView | /friend | 好友 |
| ChatView | /chat | 聊天 |
| GuildView | /guild | 公会 |
| MentorView | /mentor | 师徒 |

### 交易与商城
| 页面 | 路由 | 说明 |
|------|------|------|
| ShopView | /shop | NPC商店 |
| MarketView | /market | 市场贸易 |
| MallView | /mall | 商城购买 |
| BankView | /bank | 银行 |
| CasinoView | /casino | 赌场 |

### 其他
| 页面 | 路由 | 说明 |
|------|------|------|
| PetView | /pet | 宠物 |
| RankView | /rank | 排行榜 |
| CdkeyView | /cdkey | CDKEY兑换 |
| WelfareView | /welfare | 福利中心 |
| DailyView | /daily | 每日挑战 |
| VipView | /vip | 月卡VIP |
| InviteView | /invite | 推广中心 |

---

## 五、后端 API 路由（54 个模块）

### 核心路由 `server/src/routes/`

```
auth.js          # 注册/登录/JWT
user.js          # 玩家信息/属性
user2.js         # 扩展用户接口
battle.js        # 战斗（33KB，核心）
sail.js          # 航海/船只
map.js           # 地图/地点移动
quest.js         # 任务
npc.js           # NPC对话/商店
shop.js          # NPC商店
market.js        # 市场贸易
bank.js          # 银行
sign.js          # 签到
welfare.js       # 福利（活跃/在线/每日礼包/银币）
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
arena.js         # 竞技场
dungeon.js       # 副本
vip.js           # 月卡VIP
codex.js         # 装备图鉴
invite.js        # 推广中心
status.js        # 状态效果（17种Buff/Debuff）
```

### 管理后台 `server/src/routes/admin/`

```
adminAuth.js     # 管理员登录
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

## 六、核心数据库表（46表）

### 用户与角色
```
user              # 玩家主表（guide_step/money/silver/gold/level/exp/mp/hp/buff_flags）
user_daily_activity # 每日活跃度
user_activity_reward  # 活跃奖励领取状态
```

### 地图与导航
```
map               # 海域+城市（6海域44城市）
place             # 地点（4956条，含 N/S/E/W 导航，place_type 区分建筑类型）
npc               # NPC（208条），place_id 指 NPC 所在地点
npc_dialog        # NPC对话
npc_shop_item     # NPC商店商品
```

### 战斗与物品
```
monster           # 怪物（285条）
monster_drop      # 怪物掉落
item              # 物品定义（3826+条）
item_affix        # 装备词缀表（蓝/紫/橙装随机词缀）
inventory_affix   # 背包物品词缀
inventory         # 背包（durability/durability_max）
skill             # 技能
user_skill        # 用户技能
```

### 状态效果
```
status_effect     # 17种状态效果定义
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
ship              # 船只（15条，5级）
user_ship         # 用户船只（hp/hp_max）
goods             # 贸易商品（49条）
market_price      # 城市物价（49商品×44城市）
cargo             # 货物
```

### 社交
```
friend            # 好友
guild             # 公会
guild_member      # 公会成员
chat              # 聊天记录
pet               # 宠物定义
user_pet          # 用户宠物
mentor            # 师徒关系
```

### 福利与活动
```
sign_in           # 签到配置
sign_reward       # 签到奖励
welfare_milestone # 活跃里程碑配置
welfare_login     # 7日连续登录
online_reward     # 在线奖励配置
arena             # 竞技场
user_arena        # 用户竞技场数据
dungeon           # 副本配置
user_codex        # 装备图鉴进度
invite_reward     # 邀请奖励
vip               # VIP配置
cdkey             # CDKEY
cdkey_log         # CDKEY兑换记录
cdkey_reward      # CDKEY奖励
activity_reward   # 活动奖励
```

### 系统
```
admin_user        # 管理员
admin_log         # 管理员操作日志
operation_log     # 数据操作日志
data_changelog    # 数据变更日志
game_config       # 游戏配置
enum_definition   # 枚举定义
```

---

## 七、待完善功能

| 类别 | 功能 | 说明 |
|------|------|------|
| 引导 | 引导完成后解锁完整任务面板 | 目前 QuestGuideView 只显示引导内任务 |
| 引导 | NPC 感叹号/问号 UI 标记 | 引导触发点可视化 |
| 任务 | 支线任务链扩展 | 当前只有零散入口，需串联成3条以上支线 |
| 战斗 | 炼金系统 | 参考沧澜四海 |
| 经济 | 藏宝图系统 | 银币购买/挖掘 |
| 经济 | 宝石镶嵌系统 | 装备打孔+宝石 |
| 社交 | 婚姻系统 | 参考沧澜四海 |
| 社交 | 公会战 UI + 宣战/攻城逻辑 | 已有基础数据 |
| 社交 | 坐骑/羽翼系统 | 参考沧澜四海 |
| 福利 | 开服7日/成长指南 | welfare.js 扩展 |

---

## 八、货币体系

```
铜币 (money)   — 打怪/任务/贸易获得，用于基础功能（装备/修船/强化/购买）
银币 (silver)  — 每日活跃/竞技场/公会战获得，用于高级技能/藏宝图/副本次数重置
金币 (gold)    — 充值/活动获得，用于月卡VIP/商城珍稀道具/快速恢复

（可选）兑换比例：铜币 10000 → 银币 1，银币 100 → 金币 1
```

---

## 九、关键配置

- 后端入口：`node server/src/app.js`（不是 index.js）
- 工作目录：`/home/ubuntu/work/zhsh-game_astrbot`
- MySQL：root 无密码，库名 `zhsh_game`
- 服务进程：使用 `background=true` 启动
- init-db.sql 与实际 DB 存在字段不一致，每次报错先查 init-db.sql 对比

---

## 十、近期变更记录（2026-05-17）

| 变更 | 详情 |
|------|------|
| 批量修复 6 张表字段缺失 | inventory(durability/durability_max)、user_ship(hp/hp_max) 等 |
| 每日活跃触发点 | battle/quest/market/dungeon/arena 全部实现 |
| 在线奖励 Tab | WelfareView 整合 |
| 城内建筑交互面板 | CityMapView 建筑点击交互 |
| 银币体系 | welfare.js 已含 silver 逻辑 |
| git commit | d375a93（字段修复）、3707ae2（功能实现） |
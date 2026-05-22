# 纵横四海 - 项目大纲 (Project Outline)

> v10.1 | 2026-05-22 | 分支: future
> 对标：沧澜四海（参考游戏调研完成）

---

## 1. 项目概述

| 项目 | 内容 |
|------|------|
| **名称** | 纵横四海 (zhsh-game) |
| **类型** | 航海RPG + 社交竞技 |
| **技术栈** | Node.js(后端) + Vue3(前端) + MySQL + WebSocket |
| **后端入口** | `node server/src/app.js`（不是index.js） |
| **端口** | 后端 3000, WebSocket 8282, 前端Dev 5173 |
| **工作目录** | `/home/ubuntu/work/zhsh-game_astrbot` |
| **分支** | `future` |

**数据库**: MySQL 本机, root无密码, 库名 `zhsh_game`
**杀进程**: `fuser -k 3000/tcp`
**重启**: `node server/src/app.js`（后台运行）

---

## 2. 目录结构

```
zhsh-game_astrbot/
├── server/src/
│   ├── app.js              # 后端入口
│   ├── db.js               # MySQL封装 (execute→query修复 LIMIT bug)
│   ├── config.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── adminAuth.js
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── auth.js          # 登录/注册/角色
│   │   ├── user.js          # 用户状态/装备/背包
│   │   ├── user2.js
│   │   ├── battle.js        # 战斗系统 (752行)
│   │   ├── quest.js         # 任务系统
│   │   ├── map.js           # 地图移动
│   │   ├── npc.js           # NPC对话
│   │   ├── dungeon.js       # 副本系统
│   │   ├── mall.js          # 商城 (✅已改用money铜币定价)
│   │   ├── market.js        # 市场(玩家间交易)
│   │   ├── bank.js          # 银行(存钱取钱)
│   │   ├── casino.js        # 赌场
│   │   ├── sign.js          # 签到
│   │   ├── welfare.js       # 福利中心
│   │   ├── sail.js          # 航海系统
│   │   ├── ship.js          # 船只状态/维修
│   │   ├── arena.js         # 竞技场
│   │   ├── vip.js
│   │   ├── daily.js         # 每日任务/活跃
│   │   ├── rank.js          # 排行榜
│   │   ├── codex.js         # 图鉴
│   │   ├── invite.js        # 邀请系统
│   │   ├── cdkey.js         # CDKEY兑换
│   │   ├── pet.js           # 宠物
│   │   ├── guild.js         # 公会
│   │   ├── mentor.js        # 师徒
│   │   ├── guide.js         # 新手引导
│   │   ├── smith.js         # 铁匠铺/强化
│   │   ├── friend.js
│   │   └── admin/           # 管理端 15个路由
│   └── ws/
│       └── WsServer.js
├── client/src/
│   ├── views/               # 32个Vue页面
│   ├── components/
│   ├── composables/         # useApi, useGameWS...
│   ├── stores/              # Pinia状态
│   └── router/
├── admin/                   # 管理后台（Vue）
├── docs/                    # 设计文档
│   ├── GAME_DESIGN.md       # 游戏设计总览 (GDD)
│   ├── QUEST_DESIGN.md     # 任务设计
│   ├── ITEM_MONSTER_DESIGN.md  # 道具与怪物设计参考
│   ├── CANGLAN_RESEARCH_2026-05-20.md  # 沧澜四海调研 (18个系统)
│   └── CANGLAN_MAP_NPC_2026-05-20.md   # 沧澜四海城市地图+NPC
├── sql/
│   └── init-db.sql          # 初始化SQL（与实际DB有差异）
├── DB_CHANGES.md            # 数据库变更记录
├── FUTURE_PLAN.md           # 未来计划
└── MAIN_QUEST_STORYLINE.md  # 主线剧情大纲
```

---

## 3. 货币体系（三元制，已确定）

| 货币 | 字段 | 用途 | 获取途径 |
|------|------|------|----------|
| 铜币 | `money` | 基础：装备/修船/航海/强化/商店 | 打怪/任务/贸易 |
| 银币 | `silver` | 高级：技能/藏宝图/副本次数重置 | 每日任务/竞技场/公会战 |
| 金币 | `gold` | 珍稀：商城珍稀道具/VIP/快速恢复 | 充值/活动 |

> ✅ mall.js 已改用 `money` 铜币定价

---

## 4. 系统现状（逐项对照沧澜四海）

### 4.1 战斗系统 ✅ 基础完成，细节待完善
- 回合制遇怪战斗，HP/ATK/DEF/AGI/CRIT
- 装备耐久度（攻击后下降，0时无效）
- 技能系统（5个：重击/防御姿态/连击/战吼/强力一击）
- 战斗后少量回复HP/SP
- 航海海盗中途遭遇战
- **待完善**：debuff回合扣血（见4.4）

### 4.2 装备系统 ✅ 基础完成
- 武器/衣服/饰品分类，品级：白/绿/蓝/紫/橙
- 词缀系统（装备后附加属性）
- 强化系统（铁匠铺 /smith/enhance）
- 耐久度：inventory.durability / durability_max
- **新增**：套装属性系统（item_set表 + 后端计算 + 前端展示）✅
- **新增**：套装属性详情面板（EquipmentView弹窗 + `/api/user/set-detail/:name`）✅

### 4.3 航海系统 ✅ 基础完成
- 船只购买/切换（/sail/buy-ship）
- 航线速度：speed 1=3分 / 2=2分 / 3=1分 / 5=0.5分
- 航海轮询：2秒一次，progress + remain 分钟
- 随机事件：海盗战(30%每轮)/ 宝箱
- 船只HP管理：hp/hp_max，HP0时强制回航
- 码头交互流程：从城内向码头teleport后可在MapView里点航海按钮 ✅
- 航海立即完成：消耗道具"航海令"可跳过等待时间 ✅

### 4.4 负面状态(debuff)系统 ✅ 已完善
- `user_buff` 表已创建（buff_type/source/value/remaining_rounds）
- `item.effect_key / effect_value` 字段已添加
- 消耗品效果：heal/mp_heal/buff_str/buff_dex/buff_int/cure_poison 等
- battle.js debuff回合扣血 + 前端状态图标展示 ✅
- 消耗品驱散实际调用 ✅
- **待完善**：状态叠加规则 / 战斗外debuff

### 4.5 消耗品系统 ✅ 已完成 (26种)
生命药剂(小/中/大)、魔法药剂(小/中/大)、力量/敏捷/智力药剂、驱魔/解毒/清醒/退烧/解冻/麻痹解除/驱病药剂、神圣祝福药水、圣水、生命/魔法结晶、活力药剂、凤凰羽毛、体力宝

### 4.6 任务系统 ✅ 基础完成
- 主线/支线/日常任务
- 每日活跃宝箱（累计点数领取）
- 每日航海/战斗/交易计数触发
- **待完善**：支线任务内容填充（目前247个支线多为占位符）

### 4.7 地图系统 ✅ 基础完成
- 城市内移动（酒馆/码头/商店/铁匠等建筑）
- 城市间航海（必须先到码头）
- 野外遇怪
- 城内不再显示怪物（place.type=2城市内/室内不显示place_id=0全局怪物）✅
- **待完善**：地图视觉优化

### 4.8 NPC系统 ✅ 基础完成
- NPC对话 `/npc/:id`
- 城内建筑交互弹窗（铁匠/银行/酒馆/商店/广场添加实际功能按钮）✅
- **待完善**：NPC交互面板功能选项完善

### 4.9 商城系统 ✅ 已修复
- mall.js 已改用 `money` 铜币定价 ✅

### 4.10 每日活跃宝箱 ✅ 已完成
- daily.js 活跃点数累计触发
- WelfareView.vue 8处 alert → globalAlert 已修复

### 4.11 签到系统 ✅ 基础完成
- sign.js 7天签到循环
- 断签重新计算

### 4.12 福利中心 ✅ 基础完成
- 欢迎礼包 / 每日首次分享 / 等级礼包
- claim-starter debug代码已清除 ✅

### 4.13 竞技场 ✅ 赛季完成
- /arena 排名挑战
- 14天赛季 + 5级段位（青铜/白银/黄金/钻石/王者）✅
- 赛季结束按段位发放铜币排名奖励 ✅
- /api/arena/season 接口返回赛季信息

### 4.14 公会系统 🟡 框架完成
- guild.js / guild/:id
- **待完善**：公会战/领地生产/成员管理

### 4.15 宠物系统 ✅ 自动成长完成
- pet.js 宠物列表/装备/出战
- 4种宠物：狸花猫/海鹰/赤狐/棕熊
- 宠物参战获得50%怪物经验 ✅
- 升级属性成长：HP+12/级、ATK×1.15/级、DEF+1.5/级 ✅
- **待完善**：宠物技能

### 4.16 图鉴系统 🟡 框架完成
- codex.js 怪物图鉴/道具图鉴
- **待完善**：图鉴详情面板/收集奖励

### 4.17 管理后台 ✅ 15个路由全部通过测试
详见第8节

---

## 5. 对标沧澜四海 - 待完善功能（优先级排序）

### 🟠 高优先级（影响核心体验）

|| # | 功能 | 现状 | 目标 |
||---|------|------|------|------------|
||| 1 | **套装属性UI** | ✅ 已完成（EquipmentView弹窗 + `/api/user/set-detail/:name`） | — |
||| 2 | **支线任务内容** | ✅ 已完成（29城市232个支线target_id+description填充） | — |
||| 3 | **副本次数限制** | ✅ 已完成（牛头山每日3次/每周15次，四象每日1次/每周7次，银币重置） | — |
|| 4 | **航海立即完成** | ✅ 已完成（消耗道具航海令跳过等待） | — |

### 🟡 中优先级（提升深度）

|| # | 功能 | 现状 | 目标 |
||---|------|------|------|
|| 5 | **特性天赋系统** | ✅ 已完成（19种天赋，战斗/航海/贸易三系） | — |
|| 6 | **宠物自动成长** | ✅ 已完成（HP+12/级，ATK×1.15/级，DEF+1.5/级） | — |
|| 7 | **新手装备设计** | ✅ 已完成（航海者套装6件） | — |
|| 8 | **竞技场赛季/奖励** | ✅ 已完成（14天赛季，5级段位，排名奖励） | — |

### 🟢 低优先级（长期）

| # | 功能 | 参考 |
|---|------|------|
| 9 | 帮会攻城战 | 沧澜四海 |
| 10 | 领地生产系统 | 沧澜四海 |
| 11 | 实时竞技场 | 沧澜四海 |
| 12 | 藏宝图系统 | 沧澜四海（用银币购买） |

---

## 6. 主线任务设计（实测数据）

### 沧澜四海实测主线（2026-05-20）

| # | 任务名 | 目标 | 地点 | 奖励 |
|---|--------|------|------|------|
| 1 | 清理矿山 | 偷矿者×6 | 农场(矿山) | 经验×1250, 铜币×560 |
| 2 | 禽流感爆发 | 病鸡×5 | 农场 | 经验×1275, 铜币×1332 |
| 3 | 待探索 | ... | ... | ... |

### 沧澜四海实测怪物数据

| 怪物 | 等级 | HP | 我方造成伤害 | 地点 |
|------|------|----|-----------|------|
| 病鸡 | Lv1 | 80 | 19-29/次 | 农场 |
| 疯牛 | Lv6 | - | - | 农场 |
| 偷矿者 | - | - | - | 矿山 |
| 山地虎 | - | - | - | 矿山 |
| 野狼 | - | - | - | 矿山 |
| 白虎王 | - | - | - | 矿山(BOSS) |

> 我方角色Lv4（老曾）：攻击力约20-29，防御减免后怪物反击伤害1点

### 纵横四海设计主线（已有大纲）

详见 `MAIN_QUEST_STORYLINE.md`

| 章节 | 任务 | 等级 |
|------|------|------|
| 序章 | 清理城郊野狗 | Lv1 |
| 序章 | 初识航海 | Lv5 |
| 第一章 | 雅典之行 | Lv10 |
| ... | ... | ... |

---

## 7. 数据库变更记录

**已补字段历史**（init-db.sql 有但DB没有）：
- `inventory(durability/durability_max)`
- `user_ship(hp/hp_max)`
- `item(level_req/quality)`
- `npc(level/sex)`
- `pet(level)`
- `user(mp/mp_max)`
- `user_buff` 表（新建）
- `item(effect_key/effect_value)`（新建）
- `item_set` 表（套装属性系统新建）

**索引**：
- `user.regdate` → `idx_regdate`
- `cdkey_log.cdkey_id` → `idx_cdkey_id`

---

## 8. 管理后台路由（15个，全部通过）

| 路由 | 状态 |
|------|------|
| `/api/admin/auth` (login/info/changePassword) | ✅ |
| `/api/admin/dashboard` (stats/extra-stats/recent-logs/playerTrend/recentPlayers) | ✅ |
| `/api/admin/enums` (groups/group/:name) | ✅ |
| `/api/admin/configs` (/all) | ✅ |
| `/api/admin/maps` CRUD | ✅ |
| `/api/admin/places` CRUD | ✅ |
| `/api/admin/npcs` CRUD | ✅ |
| `/api/admin/monsters` CRUD | ✅ |
| `/api/admin/items` CRUD | ✅ |
| `/api/admin/quests` CRUD | ✅ |
| `/api/admin/pets` CRUD | ✅ |
| `/api/admin/ships` CRUD | ✅ |
| `/api/admin/players` (resetPwd/recharge/ban) | ✅ |
| `/api/admin/logs` | ✅ |
| `/api/admin/changelogs` | ✅ |
| `/api/admin/cdkey` (list/generate/delete/logs/:id) | ✅ |

---

## 9. 前端页面 (32个)

```
ArenaView      CasinoView      CdkeyView       ChatView
CityMapView    CodexView       DailyView       DungeonView
EquipmentView  FriendView      GuildView       HomeView
InventoryView  InviteView      LoginView       MallView
MapView        MarketView      PetView         PlayerView
QuestGuideView QuestView       RankView        RegisterView
SailView       ShopView        SmithView       StatusView
StoryView      VipView         WelfareView
```

---

## 10. 测试账号

| 账号 | 密码 | 说明 |
|------|------|------|
| tester1 | test123456 | ID=26, Lv1, 铜币约39400 |
| admin | admin123 | 管理后台 |

**沧澜四海（参考游戏）**：
- 地址：http://175.178.163.210:10086
- 账号：z7666675853 / 55323283js

---

## 11. Bug修复记录

### v10.1 (2026-05-22)
- 支线任务内容填充：29城市232个支线任务（打怪/收集/探索/护送/悬赏/送信/跑商/对话）target_id+description填充完毕，`quest_branch_fill_17cities.sql`
- 更新 PROJECT_OUTLINE v10.1

### v10.0 (2026-05-22)
- 副本次数限制：牛头山（每日3次/每周15次）、四象圣殿（每日1次/每周7次），银币重置次数，`user_dungeon_count`表，`/api/dungeon/:id/reset` 接口
- 套装属性UI：EquipmentView弹窗 + `/api/user/set-detail/:name` 接口（已完整实现）
- 更新 PROJECT_OUTLINE v10.0

### v9.0 (2026-05-22)
- 特性天赋系统：19种天赋（战斗8/航海5/贸易6），每级+1点天赋点，天赋API（/api/talent/list/my/learn/reset）
- 宠物自动成长：user_pet新增hp/hp_max/atk/def_val字段，升级属性成长（HP+12/级，ATK×1.15/级，DEF+1.5/级）
- 任务物品奖励补全：292个任务全部有物品奖励
- 航海者套装：6件套（id 1152-1157），注册/新手礼包发放
- 航海立即完成：item_id=4046"航海令"，效果key=complete_sail
- 竞技场赛季系统：14天赛季，5级段位（青铜/白银/黄金/钻石/王者），赛季结束按段位发铜币奖励
- 更新 PROJECT_OUTLINE v9.0

### v8.0 (2026-05-21)
- 套装属性系统：item_set表 + 后端计算 + 前端展示
- debuff系统完善：消耗品驱散 + 前端状态图标展示
- 城内建筑交互弹窗：铁匠/银行/酒馆/商店/广场添加实际功能按钮
- 码头交互流程：从城内teleport到码头后在MapView里点航海按钮
- StatusView.vue 模板修复：补充缺失的div闭合标签
- 城市内不再显示怪物：fallback逻辑 isOutdoor=place.type>=3 && place.type!==4
- mall.js 已改用 money 铜币定价（之前误用 gold）
- 更新 PROJECT_OUTLINE v8.0

### v7.0 (2026-05-20)
- 完成沧澜四海完整调研（18个系统）
- 城市地图+NPC摸排（29个地点，commit 6349ba3）
- 病鸡怪物数据实测（HP=80, Lv1, 我方19-29伤害/次）
- 更新PROJECT_OUTLINE v7.0（系统现状+对标路线图）

### v6.0 (2026-05-20)
- 病鸡/疯牛怪物数据实测记录
- 新手装备调研（沧澜四海8件1级套装）
- 重写PROJECT_OUTLINE v6.0

### v5.2 (2026-05-20)
- 沧澜四海调研完成（18个系统，货币对比，宠物/特性/副本/帮会亮点）

### v5.1 (2026-05-19)
- `db.js`: `pool.execute()` → `pool.query()`，修复 LIMIT ? 参数报错
- `dashboard.js`: playerTrend 7次COUNT → 1次GROUP BY
- `cdkey.js`: 循环单条INSERT → 批量INSERT

### v5.0 (2026-05-17)
- 批量修复6张表字段缺失
- daily.js 每日活跃触发点修复
- WelfareView.vue 在线奖励Tab和建筑交互面板

---

## 12. 开发约定

- **分支策略**：`future` 分支开发，`main` 稳定分支
- **提交粒度**：每个功能独立commit，commit message格式 `[功能名] 描述`
- **先跑通后完善**：新功能先实现核心逻辑，细节迭代
- **显著决策前确认**：涉及架构变更/表结构变更需用户确认
- **用户回复极简**：`在吗`/`好的`/`做完了` — 不要过度解释

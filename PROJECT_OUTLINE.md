# 纵横四海 - 项目大纲 (Project Outline)

> v6.0 | 2026-05-20 | 分支: future

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
│   │   ├── auth.js         # 登录/注册/角色
│   │   ├── user.js        # 用户状态/装备/背包
│   │   ├── user2.js
│   │   ├── battle.js       # 战斗系统
│   │   ├── quest.js       # 任务系统
│   │   ├── map.js         # 地图移动
│   │   ├── npc.js         # NPC对话
│   │   ├── dungeon.js     # 副本系统
│   │   ├── mall.js        # 商城 (⚠️定价用gold而非money)
│   │   ├── market.js      # 市场
│   │   ├── bank.js        # 银行
│   │   ├── casino.js      # 赌场
│   │   ├── sign.js        # 签到
│   │   ├── welfare.js     # 福利中心
│   │   ├── sail.js        # 航海系统
│   │   ├── ship.js        # 船只状态/维修
│   │   ├── arena.js       # 竞技场
│   │   ├── vip.js
│   │   ├── daily.js       # 每日任务
│   │   ├── rank.js        # 排行榜
│   │   ├── codex.js       # 图鉴
│   │   ├── invite.js      # 邀请系统
│   │   ├── chat.js
│   │   ├── cdkey.js       # CDKEY
│   │   ├── pet.js         # 宠物
│   │   ├── guild.js       # 公会
│   │   ├── mentor.js      # 师徒
│   │   ├── guide.js       # 新手引导
│   │   ├── smith.js       # 铁匠铺/强化
│   │   ├── friend.js
│   │   └── admin/         # 管理端 15个路由
│   └── ws/
│       └── WsServer.js
├── client/src/
│   ├── views/              # 32个页面
│   ├── components/
│   ├── composables/        # useApi, useGameWS...
│   ├── stores/             # Pinia状态
│   └── router/
├── admin/                  # 管理后台（Vue）
├── docs/                   # 设计文档
│   ├── GAME_DESIGN.md      # 游戏设计总览
│   ├── QUEST_DESIGN.md     # 任务设计
│   ├── ITEM_MONSTER_DESIGN.md  # 道具与怪物设计
│   ├── CANGLAN_RESEARCH_2026-05-20.md  # 沧澜四海调研
│   └── BAIKE_EXTRACT.md    # 百科数据
├── sql/
│   └── init-db.sql         # 初始化SQL（与实际DB有差异）
├── DB_CHANGES.md           # 数据库变更记录
├── FUTURE_PLAN.md          # 未来计划
└── MAIN_QUEST_STORYLINE.md # 主线剧情大纲
```

---

## 3. 货币体系（已确定三元制）

| 货币 | 字段 | 用途 | 获取途径 |
|------|------|------|----------|
| 铜币 | `money` | 基础：装备/修船/航海/强化 | 打怪/任务/贸易 |
| 银币 | `silver` | 高级：技能/藏宝图/副本次数重置 | 每日任务/竞技场/公会战 |
| 金币 | `gold` | 珍稀：商城珍稀道具/VIP/快速恢复 | 充值/活动 |

> ⚠️ `mall.js` 仍用 `gold` 定价，玩家 gold=0 导致无法购买，需改 `money`

---

## 4. 核心系统现状

### 4.1 战斗系统 ✅ 已完成
- 回合制遇怪战斗，HP/攻击力/防御/暴击
- 装备耐久度（攻击后下降，0时无效）
- 技能系统（近战/物理/魔法技能，读 monster_skill 表）
- 战斗后 HP/SP 少量回复
- 海盗中途遭遇战（触发 /battle/start-pirate）

### 4.2 装备系统 ✅ 已完成
- 武器/衣服/饰品分类，品级：白/绿/蓝/紫/橙
- 词缀系统（装备后附加属性）
- 强化系统（铁匠铺 /smith/enhance）
- 耐久度：inventory.durability / durability_max

### 4.3 航海系统 ✅ 已完成
- 船只购买/切换（/sail/buy-ship）
- 航线速度：speed 1=3分 / 2=2分 / 3=1分 / 5=0.5分
- 航海轮询：2秒一次，progress + remain 分钟
- 随机事件：海盗战（pirate_midway）/ 宝箱
- 船只HP管理：hp/hp_max，HP0时强制回航

### 4.4 负面状态(debuff)系统 🔧 进行中
- `user_buff` 表已创建（buff_type/source/value/remaining_rounds）
- `item.effect_key / effect_value` 字段已添加
- 消耗品效果：heal/mp_heal/buff_str/buff_dex/buff_int/cure_poison 等
- 战斗触发：怪物名含"毒/火/冰"触发对应 debuff
- 回合扣血：每轮战斗前根据 active debuff 扣 HP
- **未完成**：驱散道具实际调用 clearBuff() / 状态叠加 / 状态图标UI

### 4.5 消耗品系统 ✅ 已完成 (26种)
生命药剂(小/中/大)、魔法药剂(小/中/大)、力量/敏捷/智力药剂、驱魔/解毒/清醒/退烧/解冻/麻痹解除/驱病药剂、神圣祝福药水、圣水、生命/魔法结晶、活力药剂、凤凰羽毛、体力宝

### 4.6 任务系统 ✅ 已完成
- 主线/支线/日常任务
- 每日活跃宝箱（daily_active_points 累计）
- 每日航海/战斗/交易计数触发

### 4.7 地图系统 ✅ 已完成
- 城市内移动（酒馆/码头/商店/铁匠等建筑）
- 城市间航海（必须先到码头）
- 野外遇怪
- 雅典城：广场/银行/铁匠铺/杂货铺/码头/酒馆

---

## 5. 数据库信息

| 项目 | 内容 |
|------|------|
| MySQL | 本机, root无密码, 库名 `zhsh_game` |
| 杀进程 | `fuser -k 3000/tcp` |
| 重启 | `node server/src/app.js`（后台）|

**已补字段历史**（init-db.sql 有但DB没有的）：
- `inventory(durability/durability_max)`
- `user_ship(hp/hp_max)`
- `item(level_req/quality)`
- `npc(level/sex)`
- `pet(level)`
- `user(mp/mp_max)`
- `user_buff` 表（新建）
- `item(effect_key/effect_value)`（新建）

**索引**：
- `user.regdate` → `idx_regdate`
- `cdkey_log.cdkey_id` → `idx_cdkey_id`

---

## 6. 主线任务设计（参考沧澜四海调研）

> 详细怪物数据见 `docs/ITEM_MONSTER_DESIGN.md`

### 当前设计主线（纵横四海）

| # | 任务名 | 类型 | 目标 | 奖励 |
|---|--------|------|------|------|
| 1 | 清理城郊野狗 | 杀怪 | 野狗×3 | HP药×2 |
| 2 | 海盗的威胁 | 杀怪 | 海盗头目×1 | 短剑 |
| 3 | 沙漠中的巨兽 | 杀怪 | 森林巨兽×5 | 银矿石×3 |
| 4 | 长安城外的华南虎 | 杀怪 | 华南虎×8 | 虎皮×2 |
| 5 | 银龙的踪迹 | BOSS | 虚弱银龙×1 | 龙鳞碎片 |
| ... | ... | ... | ... | ... |

详见 `MAIN_QUEST_STORYLINE.md`

### 沧澜四海实测主线流程（2026-05-20）

| # | 任务名 | 目标 | 地点 | 奖励 |
|---|--------|------|------|------|
| 1 | 清理矿山 | 杀偷矿者×6 | 农场(矿山) | 经验×1250, 铜币×560 |
| 2 | 禽流感爆发 | 杀病鸡×5 | 农场 | 经验×1275, 铜币×1332 |

### 沧澜四海实测怪物数据

| 怪物 | 等级 | HP | 攻击力 | 防御 | 伤害(我方) | 地点 |
|------|------|----|-------|------|-----------|------|
| 病鸡 | Lv1 | 80 | - | - | 1点/次 | 农场 |
| 疯牛 | Lv6 | - | - | - | - | 农场 |
| 偷矿者 | - | - | - | - | - | 矿山 |
| 山地虎 | - | - | - | - | - | 矿山 |
| 野狼 | - | - | - | - | - | 矿山 |
| 白虎王 | - | - | - | - | - | 矿山 |

> 我方角色Lv4（老曾）：攻击力约20-29，防御减免后怪物造成1点伤害

---

## 7. 测试账号

| 账号 | 密码 | 说明 |
|------|------|------|
| tester1 | test123456 | ID=26, Lv1, 铜币约39400 |
| admin | admin123 | 管理后台 |

---

## 8. 管理后台路由（15个全部通过）

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

## 9. 已知问题 / 待办

| 优先级 | 问题 | 状态 |
|--------|------|------|
| 🔴 高 | mall.js 用 gold 定价 | 待改 money |
| 🔴 高 | debuff 完整系统 | 状态图标/驱散/回合效果未完成 |
| 🟡 中 | 雅典城shop/bank交互 | 杂货铺/银行/铁匠铺无法点击交互 |
| 🟡 中 | game_config 表缺数据 | 部分查询可能异常 |
| 🟢 低 | 航海最快0.5分钟 | 可加"立即完成"功能 |

---

## 10. Bug 修复记录

### v5.2 (2026-05-20)
- 沧澜四海调研完成（18个系统，货币对比，宠物/特性/副本/帮会亮点）
- 病鸡/疯牛怪物数据实测记录
- 新手装备调研（沧澜四海：破碎の斗魂5件套 + 破碎の曙光饰品3件）

### v5.1 (2026-05-19)
- `db.js`: `pool.execute()` → `pool.query()`，修复 LIMIT ? 参数报错
- `dashboard.js`: playerTrend 7次COUNT → 1次GROUP BY
- `cdkey.js`: 循环单条INSERT → 批量INSERT
- `user.regdate` 新增 `idx_regdate` 索引
- `cdkey_log.cdkey_id` 新增 `idx_cdkey_id` 索引
- admin 密码重置为 `admin123`

### v5.0 (2026-05-17)
- 批量修复6张表字段缺失
- daily.js 每日活跃触发点修复
- WelfareView.vue 在线奖励Tab和建筑交互面板

---

## 11. 前端页面 (32个)

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

### 近期前端改动
- SailView.vue：船只商店可滚动、购买前铜币检查、2秒轮询
- WelfareView.vue：8处 alert → globalAlert
- CityMapView.vue：placeIcon 支持 4🍺 5🏪
- MapView.vue：城市地图加"进入城市"按钮
- 雅典城：新增4个建筑（广场/银行/铁匠铺/杂货铺）

---

## 12. 参考游戏调研摘要（沧澜四海）

> 详细文档：`docs/CANGLAN_RESEARCH_2026-05-20.md`
> 账号：z7666675853 / 55323283js

### 货币体系对比
| 沧澜四海 | 纵横四海 |
|---------|---------|
| 金元（充值）| 金币 |
| 金贝（赞助）| — |
| 银币 | 银币 |
| 铜币 | 铜币 |

### 沧澜四海可借鉴功能优先级
1. **立即借鉴**：套装属性 + 图鉴系统 + 每日活跃宝箱 + 特性天赋
2. **中期借鉴**：宠物自动成长 + 副本次数限制 + 银币买船
3. **长期借鉴**：帮会攻城 + 领地生产 + 实时竞技场

### 新手装备亮点（沧澜四海）
- **8件1级装备**：破碎の斗魂5件套（武器+4防具）+ 破碎の曙光3件饰品
- **命名规律**：`{前缀}の{系列}{类型}`（前缀=品级，系列=套装名）
- **套装属性**：多件装备触发额外特性加成
- **战力**：140（1级角色）

# 纵横四海 - 项目大纲 v3.0

## 一、项目概述

- **名称**：纵横四海（zhsh-game）
- **类型**：航海RPG / H5文字冒险游戏（重制版）
- **架构**：Node.js后端 + Vue3前端 SPA + WebSocket实时通信
- **工作目录**：`/home/ubuntu/work/zhsh-game_astrbot`
- **分支**：`future`
- **端口**：HTTP 3000，WebSocket 8282
- **核心玩法**：大航海时代背景，玩家扮演航海冒险者，完成任务、出海航行、贸易战斗、收集装备宠物

---

## 二、目录结构

```
/home/ubuntu/work/zhsh-game_astrbot/
├── client/                    # Vue3 前端（H5）
│   ├── src/
│   │   ├── App.vue                # 根组件（全局挂载 GuideOverlay / BattleOverlay）
│   │   ├── main.js
│   │   ├── router/index.js        # 路由定义
│   │   ├── stores/
│   │   │   ├── user.js            # 用户状态（Pinia）
│   │   │   └── game.js            # 游戏状态（Pinia）
│   │   ├── composables/
│   │   │   ├── useApi.js          # REST API封装
│   │   │   ├── useConfirm.js      # 全局确认/提示弹窗
│   │   │   └── useGameWS.js       # WebSocket连接管理
│   │   ├── components/
│   │   │   ├── BattleOverlay.vue  # 战斗遮罩（全局，战斗中显示）
│   │   │   ├── GuideOverlay.vue   # 新手引导遮罩（全局，guide_step≠99时显示）⚠️待优化
│   │   │   ├── BottomNav.vue      # 底部导航栏
│   │   │   ├── ItemCard.vue       # 物品卡片
│   │   │   ├── QuestCard.vue      # 任务卡片
│   │   │   └── ...
│   │   └── views/
│   │       ├── HomeView.vue       # 首页
│   │       ├── UserView.vue       # 角色面板
│   │       ├── BattleView.vue     # 战斗场景
│   │       ├── MapView.vue        # 地图/航行
│   │       ├── CityView.vue       # 城市内探索
│   │       ├── QuestView.vue      # 任务面板（引导未完成时跳/quest-guide）⚠️待优化
│   │       ├── QuestGuideView.vue # 独立引导页面（待删除）⚠️待优化
│   │       ├── ShopView.vue       # 商店
│   │       ├── MarketView.vue     # 集市（玩家间交易）
│   │       ├── AuctionView.vue    # 拍卖行
│   │       ├── InventoryView.vue  # 背包
│   │       ├── EquipView.vue      # 装备强化
│   │       ├── SkillView.vue      # 技能学习
│   │       ├── PetView.vue        # 宠物界面
│   │       ├── DungeonView.vue    # 副本
│   │       ├── WelfareView.vue    # 福利/开服活动
│   │       ├── ArenaView.vue      # 竞技场（1v1）
│   │       ├── GuildView.vue      # 公会
│   │       └── ...
│   └── public/
│       └── icons/                 # 游戏图标
├── server/                    # Node.js 后端
│   ├── src/
│   │   ├── app.js                 # 后端入口（node src/app.js）
│   │   ├── routes/                # 路由模块
│   │   │   ├── user.js            # 用户/注册/登录
│   │   │   ├── quest.js           # 任务系统
│   │   │   ├── guide.js           # 引导状态机 ⚠️待优化
│   │   │   ├── battle.js          # 战斗
│   │   │   ├── ship.js            # 船只
│   │   │   ├── map.js             # 地图/航行
│   │   │   ├── city.js            # 城市
│   │   │   ├── trade.js           # 跑商
│   │   │   ├── market.js          # 集市
│   │   │   ├── auction.js         # 拍卖行
│   │   │   ├── equip.js           # 装备
│   │   │   ├── skill.js           # 技能
│   │   │   ├── pet.js             # 宠物
│   │   │   ├── dungeon.js         # 副本
│   │   │   ├── welfare.js         # 福利 ⚠️待扩展
│   │   │   ├── welfare_new.js     # 新版福利（2026-05-16）
│   │   │   ├── arena.js           # 竞技场
│   │   │   ├── guild.js           # 公会
│   │   │   ├── mentor.js          # 师徒
│   │   │   ├── mail.js            # 邮件系统
│   │   │   ├── login_reward.js    # 登录奖励
│   │   │   ├── daily_activity.js  # 每日活跃
│   │   │   └── card/              # 卡牌系统（部分）
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   └── db/
│   │       └── index.js           # MySQL连接池
│   ├── init-db.sql               # 完整建库脚本（11,274行）
│   └── package.json
└── package.json               # 顶层工程配置
```

---

## 三、数据库（MySQL）

**库名**：`zhsh_game`

### 主要数据表

| 表名 | 用途 |
|------|------|
| `user` | 玩家角色（等级/HP/MP/金钱/仓库/快捷栏/师徒） |
| `user_ship` | 玩家船只（HP/载重/速度/经验） |
| `quest` | 任务（270条：主线17+支线247+日常6） |
| `quest_progress` | 任务进度 |
| `npc` | NPC（17个，含NPC商店） |
| `map` | 地图（6大海域 + 42城市） |
| `place` | 地点（城市内场景，如酒馆/城门/码头等） |
| `monster` | 怪物定义 |
| `monster_drop` | 怪物掉落表 |
| `item` | 物品（装备/消耗品/任务道具） |
| `item_affix` | 装备词缀 |
| `user_item` | 玩家背包 |
| `user_equip` | 玩家装备栏 |
| `skill` | 技能定义 |
| `user_skill` | 玩家技能 |
| `pet` | 宠物定义 |
| `user_pet` | 玩家宠物 |
| `dungeon` | 副本（牛头山12层/四象圣殿） |
| `guild` | 公会 |
| `guild_member` | 公会成员 |
| `mail` | 邮件 |
| `market_item` | 集市上架物品 |
| `auction_item` | 拍卖行物品 |
| `arena_match` | 竞技场记录 |
| `welfare` | 福利领取状态 |
| `guide` | 引导状态（guide_step） |
| `daily_activity` | 每日活跃数据 |
| `login_reward` | 登录奖励状态 |
| `online_reward` | 在线奖励状态 |
| `mentor` | 师徒关系 |

### init-db.sql 关键数据

- **任务**：270条
  - 主线17条（id 1-17，Lv1-Lv50，威尼斯→雅典→亚历山大→南特→伦敦→爱丁堡→阿姆斯特丹→汉堡→奥斯陆→威尼斯→卢旺达→亚特兰蒂斯→长安）
  - 支线247条（id 20-45 + 1000-1231，15个独立支线+29城市×8种任务类型）
  - 日常6条（id 40-45，各城市日常）
- **地图**：6片海域（地中海/北海/非洲/东亚/印度洋/新大陆）+ 42座城市
- **地点**：城市内场景（酒馆/码头/城门/赌场/银行/铁匠铺/旅馆/商店等）
- **NPC**：17个（含新手引导马可）
- **怪物**：按海域/城市分布，有等级和掉落
- **副本**：牛头山12层（Lv30-60），四象圣殿（白虎/玄武/青龙/朱雀4宫×4层，Lv100）
- **装备**：按品质（白/绿/蓝/紫/橙）+ 词缀系统
- **技能**：被动+主动，分职业/等级
- **宠物**：按等级/资质

---

## 四、路由（client/src/router/index.js）

共36个路由页面，核心页面：

| 路由 | 视图 | 说明 |
|------|------|------|
| `/` | HomeView | 首页 |
| `/user` | UserView | 角色面板 |
| `/battle/:monsterId` | BattleView | 战斗场景 |
| `/map` | MapView | 世界地图/航行 |
| `/city/:cityId` | CityView | 城市内探索 |
| `/quest` | QuestView | 任务面板 |
| `/quest-guide` | QuestGuideView | **待删除** ⚠️ |
| `/shop/:npcId` | ShopView | NPC商店 |
| `/market` | MarketView | 集市 |
| `/auction` | AuctionView | 拍卖行 |
| `/inventory` | InventoryView | 背包 |
| `/equip` | EquipView | 装备强化 |
| `/skill` | SkillView | 技能 |
| `/pet` | PetView | 宠物 |
| `/dungeon/:dungeonId` | DungeonView | 副本 |
| `/welfare` | WelfareView | 福利活动 |
| `/arena` | ArenaView | 竞技场 |
| `/guild` | GuildView | 公会 |

---

## 五、引导系统 ⚠️ 待合并

**现状**：存在两套引导实现，需要合并

### 方案：保留 GuideOverlay，去掉 QuestGuideView

| 组件 | 文件 | 状态 |
|------|------|------|
| 遮罩引导 | `GuideOverlay.vue` | ✅ 保留 |
| 独立引导页 | `QuestGuideView.vue` | ❌ 删除 |
| 引导状态后端 | `routes/guide.js` | ✅ 保留 |

### GuideOverlay 逻辑

- `guide_step` = 0：INTRO 剧情（7步，马可讲述背景）
- `guide_step` = 1-6：引导步骤（创建角色→进城→接任务→打怪→强化→出海）
- `guide_step` = 99：引导完成
- 全局挂载于 `App.vue`，登录后自动弹出

### 待执行合并

1. 删除 `client/src/views/QuestGuideView.vue`
2. 删除 `/quest-guide` 路由
3. 修改 `QuestView.vue`：引导未完成时不再跳转，而是触发 GuideOverlay
4. 调整 `BottomNav.vue`：引导中隐藏部分导航入口
5. 提交 git

---

## 六、货币体系

**三元体系**（2026-05-16 确定）：

| 货币 | 字段 | 用途 |
|------|------|------|
| 铜币 | `money` | 打怪/任务/贸易获得，基础功能（装备/修船/航海/强化） |
| 银币 | `silver` | 每日任务/竞技场/公会战获得，高级技能/藏宝图/副本次数重置 |
| 金币 | `gold` | 充值/活动获得，商城珍稀道具/VIP/快速恢复 |

**当前问题**：`mall.js` 用 `gold` 定价，但玩家 `gold` 均为0，需改为 `money`（铜币购买）。

**可选兑换**：铜币10000→银币1，银币100→金币1

---

## 七、战斗系统

- 回合制自动战斗
- 船只 HP：战损，修船费用
- 技能：主动技能（战斗中使用）/ 被动技能（永久生效）
- 装备耐久：战斗后降低，耐久为0时效果消失
- 装备品级：白/绿/蓝/紫/橙 + 词缀系统

---

## 八、技能系统

- 分为主动技能（战斗中施放）和被动技能（永久加成）
- 按等级解锁
- 战斗脚本见 `server/src/routes/battle.js`

---

## 九、装备系统

- **品级**：白/绿/蓝/紫/橙（白→橙，品质递增）
- **词缀**：`item_affix` 表，随机生成额外属性
- **耐久度**：`inventory.durability` / `inventory.durability_max`
- **强化**：`equip.js` 路线

---

## 十、宠物系统

- `pet` + `user_pet` 表
- 宠物等级/资质影响战斗

---

## 十一、副本系统

| 副本 | 地点 | 层数 | 等级 |
|------|------|------|------|
| 牛头山 | place_id=9001 | 12层 | Lv30-60 |
| 四象圣殿-白虎宫 | place_id=9002 | 4层 | Lv100 |
| 四象圣殿-玄武宫 | place_id=9002 | 4层 | Lv100 |
| 四象圣殿-青龙宫 | place_id=9002 | 4层 | Lv100 |
| 四象圣殿-朱雀宫 | place_id=9002 | 4层 | Lv100 |

---

## 十二、福利系统 ⚠️ 待完善

**当前状态**：
- `welfare.js`：claim-starter 有 debug 代码残留，重复领取返回200而非400
- `welfare_new.js`：新版福利（2026-05-16）
- 每日活跃/在线奖励/登录奖励 均已实现

**待做**：`todo_11` - 开服7日/成长指南 welfare.js 扩展

---

## 十三、社交系统

- **公会**：`guild.js` + `guild_member`
- **师徒**：`mentor.js`（mentor_id/contribution/apprentice_count）
- **邮件**：`mail.js`
- **竞技场**：`arena.js`（1v1）

---

## 十四、摆摊/交易系统

| 系统 | 路由 | 说明 |
|------|------|------|
| 集市 | `market.js` | 玩家间一对一交易 |
| 拍卖行 | `auction.js` | 竞价拍卖 |

---

## 十五、世界地图与城市

### 6片海域

| 海域 | 城市 |
|------|------|
| 地中海 | 威尼斯/里斯本/亚历山大/拉古扎/雅典/伊斯坦布尔/突尼斯/阿尔及尔/马塞 |
| 北海 | 南特/伦敦/爱丁堡/阿姆斯特丹/汉堡/奥斯陆/哥本哈根 |
| 非洲 | 达喀尔/圣乔治/卢旺达/开普敦/亚特兰蒂斯/莫桑比克/马达加斯加/蒙巴萨 |
| 东亚 | 马六甲/广州/泉州/杭州/扬州/长安/大阪/京都 |
| 印度洋 | 亚丁/荷姆兹/锡兰/孟买 |
| 新大陆 | 新大陆港 |

### 城市内地点类型

酒馆/码头/城门/赌场/银行/铁匠铺/旅馆/商店/医院/码头办公室/交易所

---

## 十六、已知问题与待办

| 优先级 | 问题 | 状态 |
|--------|------|------|
| 🔴 高 | 引导系统合并（两套并一套） | 待执行 |
| 🔴 高 | mall.js gold定价 → 改为 money | 待修复 |
| 🟡 中 | welfare.js debug残留 + 重复领取返回200 | 待修复 |
| 🟡 中 | `todo_11` 开服7日/成长指南扩展 | 未实现 |
| 🟢 低 | 负面状态(debuff)系统 | 占位符待完善 |

---

## 十七、git 提交记录（近期）

| 提交 | 内容 |
|------|------|
| `d375a93` | 批量修复6张表字段缺失、每日活跃触发点、在线奖励Tab、城内建筑交互面板 |
| `3707ae2` | （早期） |

---

## 十八、开发规范

- **风格**：先简洁后繁，先跑通后完善
- **服务启动**：`node src/app.js`（后台运行 `background=true`）
- **数据库**：MySQL 本机，root 无密码，库名 `zhsh_game`
- **建库参考**：`init-db.sql` 与实际 DB 可能有字段不一致，每次报错先对比 SQL 文件

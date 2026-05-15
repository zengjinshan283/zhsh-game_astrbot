# 🏴‍☠️ 纵横四海 (zhsh-game) — 项目大纲

> 文字航海冒险网页游戏 · Web-based text nautical adventure game
> 分支：future（最新功能开发分支）

---

## 一、项目概览

| 项目信息 | 详情 |
|---------|------|
| **名称** | 纵横四海 |
| **技术栈** | Node.js + Express + MySQL + WebSocket + Vue 3 |
| **仓库** | https://github.com/975269528/zhsh-game_astrbot.git |
| **当前分支** | future |
| **服务端口** | Server: 3000 (HTTP) + 8282 (WS) / Admin: 5174 / Client: 5173 |
| **最新 commit** | `9a9cf6d` (fix: MySQL 8 compatibility) |
| **外部访问** | http://123.206.126.164:3000 |

### 项目目录结构

```
zhsh-game_astrbot/
├── server/                    # Node.js 服务端
│   └── src/
│       ├── app.js            # HTTP + WebSocket 入口
│       ├── config.js         # 环境配置
│       ├── db.js             # MySQL 连接池
│       ├── middleware/       # 中间件（auth / adminAuth / errorHandler）
│       ├── routes/           # API 路由（18 个）
│       └── ws/              # WebSocket 服务
├── admin/                    # Vue 3 管理后台（SPA，端口 5174）
├── client/                   # Vue 3 游戏客户端（SPA，端口 5173）
├── docs/                     # 参考资料
│   ├── baike_zhsh.html      # 百度百科原文（250KB）
│   └── BAIKE_EXTRACT.md     # 百科数据摘要
├── DB_CHANGES.md             # 数据库变更记录
├── FUTURE_PLAN.md            # 完整完善计划（Phase 1/2/3）
└── README.md
```

---

## 二、服务端 (server/src/routes/)

| 路由文件 | 功能 | 状态 |
|----------|------|------|
| `auth.js` | 注册 / 登录 | ✅ |
| `user.js` | 玩家角色（背包、属性、装备） | ✅ |
| `user2.js` | 玩家扩展（待分类） | ✅ |
| `battle.js` | 战斗系统（回合制 / 掉落） | ✅ |
| `chat.js` | 聊天系统（WebSocket） | ✅ |
| `map.js` | 地图探索（世界地图 / 场景导航） | ✅ |
| `npc.js` | NPC 交互（对话 / 交易 / 任务） | ✅ |
| `quest.js` | 任务系统（领取 / 进度 / 奖励） | ✅ |
| `pet.js` | 宠物系统（驯兽 / 口粮 / 进化） | ✅ |
| `guild.js` | 公会系统（创建 / 成员 / 捐献） | ✅ |
| `market.js` | 市场交易（商品 / 价格浮动） | ✅ |
| `sail.js` | 航海系统（出港 / 航行 / 事件） | ✅ |
| `casino.js` | 赌场系统 | ✅ |
| `rank.js` | 排行榜 | ✅ |
| `friend.js` | 好友系统 | ✅ |
| `smith.js` | 铁匠铺（强化 / 修理，含 game_config 驱动） | ✅ 已重写 |
| `mentor.js` | 师徒系统（拜师 / 收徒 / 出师 / 排行） | ✅ 新建 |
| `admin/` | 管理后台 API（15 个子模块） | ✅ |

---

## 三、数据库 (init-db.sql)

共 **25 张表**，当前数据量：

| 表名 | 数据量 | 说明 |
|------|--------|------|
| `user` | — | 玩家账号 |
| `map` | 6 海域 + 40 城市 | 世界地图（地中海/北海/非洲/东亚/印度洋/新大陆） |
| `place` | 100+ | 城市场景 + 导航（n/s/e/w） |
| `npc` | 44~79 | NPC（酒馆/铁匠/银行/商人/副本入口等） |
| `npc_dialog` | 25+ | NPC 对话（idle/trade/deposit/gamble 多触发类型） |
| `npc_shop_item` | — | NPC 商品关联 |
| `monster` | **37 种** | 各场景怪物（1-100+ 级） |
| `monster_drop` | **50+** | 怪物掉落表 |
| `item` | **63 种** | 武器9 / 防具8 / 盾牌3 / 消耗品8 / 材料32 / 任务道具3 |
| `dungeon` | **56 条** | 牛头山12层 + 四象圣殿4宫各4层 |
| `game_config` | 强化配置已就绪 | 成功率/返还比例/降级规则 |
| `quest` | **45 条** | 主线17 / 支线15 / 日常6 / 副本入口 |
| `user_quest` | — | 玩家任务进度 |
| `pet` | 5 种宠物 | 海鹰/海豚/猩猩/老虎/狮子 |
| `user_pet` | — | 玩家宠物 |
| `ship` | 3 种船只 | 小帆船 / 轻快帆船 / 商用大船 |
| `user_ship` | — | 玩家船只 |
| `goods` | — | 贸易商品（葡萄酒/丝绸/香料等） |
| `market_price` | — | 各城市市场价格 |
| `guild` | — | 公会 |
| `guild_member` | — | 公会成员 |
| `battle_log` | — | 战斗日志 |
| `bank_log` | — | 银行日志 |
| `chat` | — | 聊天记录 |
| `admin_user` | — | 管理员账号 |
| `enum_definition` | — | 枚举定义 |

### 关键表结构

**quest 表**（任务）：
```
id / name / description / category(0=主线 1=支线 2=日常 3=副本)
type(0=杀怪 1=收集 2=对话NPC 3=探索 4=杀BOSS)
target_id / require_value / npc_id / pre_quest_id / level_req
reward_exp / reward_money / reward_item_id / reward_item_qty
```

**dungeon 表**（副本）：
```
name / place_id / floor(层数) / level_req / entry_fee(银币) / monster_id
```

---

## 四、游戏核心系统

| 系统 | 说明 |
|------|------|
| **地图探索** | 6 海域 40 城市，场景导航（n/s/e/w） |
| **战斗系统** | 回合制，monster_drop 掉落，battle.js 处理 |
| **宠物系统** | 5 种宠物，口粮驯兽进化，8 种技能 |
| **航海系统** | 船只属性（速度 1-5），出海事件（海盗/宝藏/暴风雨） |
| **交易市场** | goods + market_price，多城市价差套利 |
| **任务系统** | 主线/支线/日常，支持长链任务（ring/step 扩展字段待加） |
| **公会系统** | 创建/加入/捐献/攻城（Phase 3） |
| **聊天系统** | WebSocket 实时聊天（个人/帮会/世界） |
| **铁匠铺** | 强化（15 级，颜色标识）+7 降级，读取 game_config |
| **师徒系统** | 拜师/收徒/出师奖励（mentor.js），30 级出师 |
| **副本系统** | 牛头山（30 级，10 银，12 层）/ 四象圣殿（100 级，4 宫各 4 层） |
| **赌场系统** | 概率玩法 |
| **排行榜** | 多维度排行 |

---

## 五、管理后台 (admin/)

**技术栈**：Vue 3 + Vite + Element Plus + Axios

**页面**：登录 / 仪表盘 / 玩家 / 地图 / 场景 / NPC / 物品 / 怪物 / 任务 / 宠物 / 船舶 / 配置 / 枚举 / 日志

**API 子模块**（`server/src/routes/admin/`）：
```
configs · dashboard · enums · items · logs · maps · monsters
npcs · pets · players · quests · places · ships · configs
```

---

## 六、游戏客户端 (client/)

**技术栈**：Vue 3 + Vite + Pinia + Axios

**页面**（21 个）：
```
登录/注册 → 首页 → 大地图 → 城市地图 → 商店 → 银行 → 铁匠铺
→ 市场 → 宠物 → 任务 → 航海 → 赌场 → 聊天 → 公会 → 排行
→ 好友 → 背包 → 装备 → 状态 → 玩家主页 → 剧情
```

---

## 七、部署架构

```
Nginx (80/443)
    │
    ├── /        → Client:5173
    ├── /admin/  → Admin:5174
    ├── /api/    → Server:3000
    └── /ws      → WebSocket:8282
```

进程管理：nohup（建议后续改 PM2）

---

## 八、数据来源

| 来源 | 内容 |
|------|------|
| `app_zhsh_v1/v2.sql` | PHP 版数据库（40 城市 map、city_map 导航） |
| PHP 版源码 | route_role.php 等逻辑参考 |
| 百度百科 baike.baidu.com | 完整游戏设定（17 条长链主线、15 级强化、副本规则、货币体系） |
| `docs/baike_zhsh.html` | 百科原文本地缓存（250KB） |
| `docs/BAIKE_EXTRACT.md` | 百科数据摘要（任务链/强化规则/系统列表） |

---

## 九、当前进度

### ✅ Phase 1 已完成

- [x] 6 海域 40 城市 map 数据
- [x] 100+ place 场景数据（含导航）
- [x] 物品 63 种（武器/防具/盾牌/消耗品/材料/任务道具）
- [x] 怪物 37 种 + monster_drop 掉落表
- [x] 副本 56 条（牛头山 12 层 + 四象圣殿 16 层）
- [x] 强化系统重写（game_config 驱动，+7 降级规则）
- [x] 师徒系统（mentor.js）
- [x] NPC 对话数据库化（npc_dialog 表）
- [x] 任务 45 条（主线 17 / 支线 15 / 日常 6 / 副本入口）
- [x] 百度百科数据提取保存

### 📋 Phase 2 待办（见 FUTURE_PLAN.md）

- [ ] 成就系统（achievement + user_achievement 表）
- [ ] 宝石系统（打孔/镶嵌/合成）
- [ ] 婚姻系统
- [ ] 管理后台增强（副本配置/强化配置/师徒界面）

### 🔮 Phase 3 未来扩展（见 FUTURE_PLAN.md）

- [ ] 攻城系统
- [ ] 坐骑/羽翼/随从/随从精灵
- [ ] 卡片/圣痕系统
- [ ] 花灯任务（节日活动）
- [ ] 贸易系统扩展

---

## 十、已知问题 & 状态

| 问题 | 说明 | 状态 |
|------|------|------|
| 进程管理 | nohup 启动，服务器重启后需手动拉起 | ⚠️ 待 PM2 |
| MySQL 8 | `ADD COLUMN IF NOT EXISTS` 不支持 | ✅ 已用注释手动处理 |
| 攻城系统 | 复杂度高，Phase 3 再做 | 🔮 未来 |
| 长链任务 | 百科 550 环任务，当前 quest 表不支持 ring/step | 📋 待扩展 quest 表 |

# 纵横四海 - 项目开发大纲

> 版本: v2.0 | 更新: 2026-05-16 | 分支: future

---

## 一、数据家底（当前）

| 类别 | 数量 | 说明 |
|------|------|------|
| 地点 | 4,956 | 港口/城市/海域/遗迹 |
| 物品 | 3,826 | 武器/防具/消耗品/材料 |
| 武器 | （含在物品中） | 1-300级，涵盖所有海域 |
| 防具 | （含在物品中） | 护甲/头盔/护腿/鞋子/盾牌 |
| 怪物 | 285 | 31个地图区域，6大海域 |
| NPC | 208 | 商人/铁匠/酒馆/旅店/银行/赏金猎人等 |
| 任务 | 270+ | 主线+支线+日常，1-105级引导 |
| 掉落 | 282 | 怪物掉落配置 |
| 商店 | 360 | NPC商品列表 |
| 商品 | 49 | 贸易货物 |
| 物价 | 1,831 | 37城市 x 49商品 |
| 船只 | 15 | 5级速度/容量/价格 |
| 副本 | 56 | 牛头山/四象圣殿等 |
| 地图 | 44 | 6大海域，37+城市 |
| 技能 | 5（硬编码） | 重击/防御姿态/连击/战吼/强力一击 |
| 状态效果 | 17 | 8种Buff + 9种Debuff |
| 玩家 | 3 | 测试账号 |

> ⚠️ `item_affix` 表不存在，词缀系统在代码层实现（`inventory` 表 `affix` JSON 字段）。

---

## 二、技术架构

```
客户端:  Vue3 + Vite + Pinia + VueRouter
服务端:  Node.js + Express + MySQL2 + WebSocket + JWT
管理后台: Vue3 + Vue Router + Pinia + Element Plus + ECharts + Axios + Vite
数据库:  MySQL (38张表)
部署:    Nginx 反向代理
```

### 服务地址（本地开发）
| 服务 | 地址 |
|------|------|
| HTTP API | http://localhost:3000 |
| 游戏前端 | http://localhost:5173 |
| 管理后台 | http://localhost:5174 |
| WebSocket | ws://localhost:8282 |

### 关键表结构
```
user           玩家数据 (含 ship_id, mp/mp_max, sail_* 航海状态, guide_step, login_days 等)
place          地点(4956)
item           装备/物品 (含 quality 品质字段)
inventory      背包物品 (含 durability/durability_max 耐久度, affix JSON 词缀)
skill          技能定义表（硬编码，5个技能）
status_effect  状态效果定义表（17种状态）
monster        怪物
quest          任务 (含 pre_quest_id 前置任务链)
user_quest     玩家任务进度
npc            NPC
npc_dialog     NPC对话（33条）
npc_shop_item  商店商品（360条）
ship           船只 (含 hp/hp_max)
user_ship      用户船只 (含 hp/hp_max 船只状态)
cdkey/cdkey_log/cdkey_reward  CDKEY系统
goods/market_price/cargo     贸易系统
monster_drop   掉落表（282条）
dungeon        副本配置（56条）
map            地图/城市（44条）
sign_in/sign_reward 签到系统
welfare_login  （部分实现）7日连续登录
game_config    游戏配置（19条）
enum_definition 枚举定义（12类）
guild/guild_member  公会
pet/user_pet       宠物
```

### 服务端路由（22个）
```
auth.js     注册/登录/JWT
user.js     玩家属性/装备/背包
user2.js    扩展玩家接口
battle.js   战斗系统（最大 853行）
npc.js      NPC交互/商店
quest.js    任务系统
sail.js     航海系统
ship.js     船只管理
smith.js    铁匠强化
market.js   贸易市场
bank.js     银行
casino.js   赌场骰子
chat.js     聊天系统
friend.js   好友
guild.js    公会
rank.js     排行榜
mentor.js   师徒
sign.js     签到
welfare.js  福利系统
guide.js    新手引导（部分实现）
pet.js      宠物
map.js      地图
```

### 客户端页面（23个游戏页面 + 5个组件）
```
HomeView      主页（顶部状态条+底部导航+主内容）
MapView       大地图探索
CityMapView   城市内导航
StatusView    角色状态
InventoryView 背包
EquipmentView 装备栏
ShopView      商店
BankView      银行
SmithView     铁匠铺
MarketView    市场贸易
SailView      航海
PetView       宠物
QuestView     任务
WelfareView   福利中心（182行）
CdkeyView     CDKEY兑换
RankView      排行榜
GuildView     公会
FriendView    好友
ChatView      聊天
CasinoView    赌场
PlayerView    玩家主页
StoryView     剧情

BattleOverlay  战斗覆盖层
GuideOverlay   新手引导遮罩（142行）
StatusBar      状态条
TopBar         顶栏
BottomNav      底部导航
```

---

## 三、已实现功能

### 3.1 核心游戏系统
- [x] **用户系统** - 注册/登录/JWT认证/体力/金币/魔法值(MP)
- [x] **地图系统** - 6大海域，37+城市，4956个地点
- [x] **战斗系统** - 回合制，攻击/技能/逃跑/宝物掉落/装备耐久消耗
- [x] **航海系统** - 买船/卖船/航行/航行事件(海盗20%/宝藏)
- [x] **航海遇怪** - 航行中20%概率遇海盗，船只HP可受损/沉没
- [x] **船舶修理** - 码头修理船只，按HP消耗铜币
- [x] **任务系统** - 接任务/交任务/奖励发放
- [x] **商店系统** - 买装备/卖装备/商店NPC
- [x] **强化系统** - 铁匠装备强化(+1~+15，失败降级/返还材料)
- [x] **装备耐久** - 武器/防具有耐久度，战斗消耗，损坏自动卸下
- [x] **装备修理** - 铁匠修理装备，按耐久度消耗铜币
- [x] **技能系统** - 5个主动技能(重击/防御/连击/战吼/强力一击)，冷却/魔法消耗
- [x] **消耗品系统** - 26种消耗品：HP/MP回复、Buff增益、导航传送、状态解除、船舶修理
- [x] **Buff/Debuff系统** - 17种状态效果（8Buff+9Debuff），战斗中tick触发，怪物反击概率施加
- [x] **银行系统** - 存款/取款/防盗
- [x] **赌场系统** - 骰子猜大小
- [x] **贸易系统** - 城市间低买高卖（49种商品，37城市物价1831条）
- [x] **签到系统** - 每日签到/补签
- [x] **CDKEY礼包** - 兑换码系统（14个CDKEY，29个奖励配置）
- [x] **公会系统** - 创建/加入/捐献/公会战

### 3.2 装备品级与词缀系统
- [x] **装备品级** - 白(60%)/绿(25%)/蓝(10%)/紫(4%)/橙(1%) 五档
- [x] **随机词缀** - 绿装1条，蓝装1-2条，紫装2-3条，橙装3-4条
- [x] **词缀类型** - 攻击+/防御+/生命+/敏捷+/暴击率/吸血/金币加成
- [x] **掉落展示** - 战斗结束显示装备颜色品质

### 3.3 社交/增值系统
- [x] **师徒系统** - 拜师/收徒/收益分成
- [x] **好友系统** - 添加/删除/私聊
- [x] **聊天系统** - 世界/公会/私人频道
- [x] **排行榜** - 等级/财富/公会战力
- [x] **宠物系统** - 捕捉/培养/参战

### 3.4 管理后台（14个模块）
- [x] 仪表盘（在线人数、注册趋势、资源分布、货币统计）
- [x] 地图/地点管理
- [x] NPC/商店管理
- [x] 怪物/掉落管理
- [x] 装备/物品管理
- [x] **任务管理**（含任务链可视化）
- [x] 玩家管理(封禁/改属性)
- [x] 船只/宠物管理
- [x] CDKEY管理
- [x] 配置管理/枚举管理
- [x] 操作日志/数据日志

---

## 四、新手体验（当前缺口）

### 4.1 主线任务自动触发 ❌
**现状**：新玩家注册后落在威尼斯，看不到任何引导提示，必须自己打开任务面板。

**任务链结构（17步主线）**：
```
1  清理城郊野狗(Lv1)   → 2 初识航海(Lv5)
2  初识航海(Lv5)        → 3 雅典之行(Lv10)
3  雅典之行(Lv10)       → 4 雅典商人(Lv12)
4  雅典商人(Lv12)       → 5 海盗的威胁(Lv15)
5  海盗的威胁(Lv15)     → 6 亚历山大之行(Lv18)
6  亚历山大之行(Lv18)   → 7 沙漠中的巨兽(Lv20)
7  沙漠中的巨兽(Lv20)   → 8 重返威尼斯(Lv22)
8  重返威尼斯(Lv22)     → 9 长安的召唤(Lv25)
9  长安的召唤(Lv25)     → 10 银矿石的请求(Lv28)
10 银矿石的请求(Lv28)   → 11 华南虎(Lv30)
11 华南虎(Lv30)         → 12 前往牛头山(Lv32)
12 前往牛头山(Lv32)     → 13 牛头山探秘(Lv35)
13 牛头山探秘(Lv35)     → 14 牛头山深处(Lv40)
14 牛头山深处(Lv40)     → 15 银龙的踪迹(Lv45)
15 银龙的踪迹(Lv45)     → 16 四象圣殿的传说(Lv98)
16 四象圣殿(Lv98)       → 17 四象试炼(Lv100)
```
**待实现**：注册时自动推送第一条主线任务到玩家任务列表。

### 4.2 新手引导系统 ⚠️ 部分实现
**现状**：`GuideOverlay.vue` 组件已存在（142行），`guide.js` 路由已存在，但触发逻辑和步骤数据未完全接通。
**已新增字段**：`user.guide_step`(0未开始) / `login_days` / `login_map` / `last_login` / `claimed_rewards`

**待实现**：注册后弹出遮罩引导步骤（找NPC马可→接任务→打怪→交任务→买船→起航）

### 4.3 新手福利 ❌ 部分实现
**现状**：`welfare.js`/`WelfareView.vue` 已搭建框架，`sign_in`/`sign_reward` 表存在，`welfare_login` 表已规划但字段名与文档不一致（DB是 `login_days`/`login_map`，文档写的 `welfare_login` 表）
**已新增字段**：`login_days`/`login_map`/`last_login`/`claimed_rewards`

**待实现**：
- 注册礼包（10,000铜币+新手剑+HP药水+新手地图）
- 7日连续登录礼包
- 成长里程碑（10级/20级/30级奖励）

---

## 五、已上线功能进度总览

| 优先级 | 功能 | 状态 |
|--------|------|------|
| 🔴 高 | 航海遇怪 | ✅ 完成 |
| 🔴 高 | 装备耐久 | ✅ 完成 |
| 🟡 中 | 技能系统 | ✅ 完成 |
| 🟡 中 | 装备品级+词缀 | ✅ 完成 |
| 🟡 中 | 状态系统(Buff/Debuff) | ✅ 完成 |
| 🟡 中 | 副本(牛头山/四象圣殿) | ✅ 数据已导入(56条dungeon) |
| 🔴 高 | **主线自动触发** | ❌ 待实现 |
| 🔴 高 | **新手引导遮罩** | ⚠️ 框架存在，未接通 |
| 🔴 高 | **新手礼包/7日登录/里程碑** | ❌ 部分实现框架 |

---

## 六、待完善功能（按优先级）

### 高优先级
- [ ] **海域BOSS** - 世界boss，公会挑战
- [ ] **航海日志** - 记录玩家航海历程
- [ ] **装备套装效果** - 同套装多件激活额外属性
- [ ] **宠物进化/变异** - 宠物升级/进化路径

### 中优先级
- [ ] 邮件系统 - 系统邮件/玩家邮件
- [ ] 称号系统 - 成就称号
- [ ] 交易所(玩家间交易)
- [ ] 航海图鉴 - 记录发现的城市/地点
- [ ] 船舶强化/改造 - 升级船只属性
- [ ] NPC对话扩展 - `npc_dialog` 仅33条，需大量补充

### 低优先级
- [ ] 多人航海(组队)
- [ ] 港口争夺战
- [ ] 商会跑商任务
- [ ] 声望系统
- [ ] 星座/命运系统
- [ ] 宝石系统（打孔/镶嵌）
- [ ] 婚姻系统
- [ ] 卡片/圣痕系统
- [ ] 坐骑/羽翼/随从/随从精灵

---

## 七、数据库现状

### 38张表一览
```
admin_log, admin_user, bank_log, battle_log, cargo,
cdkey, cdkey_log, cdkey_reward, chat,
data_changelog,
dungeon,
enum_definition,
friend,
game_config, goods, guild, guild_member,
inventory, item,
market_price, monster, monster_drop,
npc, npc_dialog, npc_shop_item,
operation_log,
pet,
place,
quest,
rank,
ship, sign_in, sign_reward, status_effect,
user, user_pet, user_quest, user_ship
```

### 需补充的表（文档规划但未建）
- `item_affix` - 词缀定义表（当前词缀存在 inventory.affix JSON 中）
- `welfare_login` - 7日连续登录记录（当前用 user.login_days 代替）
- `welfare_milestone` - 成长里程碑（当前用 user.claimed_rewards 代替）
- `user_achievement` / `achievement` - 成就系统

---

## 八、快速验证清单

- [x] 新账号注册 → 正常登录
- [x] 滚动条渲染正常（2026-05-16 修复 `.main-content overflow`）
- [x] 数据库字段完整（guide_step/login_days/login_map/last_login/claimed_rewards 已添加）
- [ ] 威尼斯城内NPC对话 → 接任务 → 战斗
- [ ] 购买船只 → 航海到雅典 → 遇海盗 → 船只受损
- [ ] 码头修理船只 → 验证HP恢复
- [ ] 买入葡萄酒 → 航行到雅典 → 卖出
- [ ] 兑换CDKEY → 获得装备/铜币
- [ ] 铁匠强化装备 → 成功/失败效果
- [ ] 战斗中使用技能 → 验证MP消耗和冷却
- [ ] 打怪掉落装备 → 验证品级/词缀随机
- [ ] 装备耐久到0 → 验证自动卸下
- [ ] 管理后台 → 生成CDKEY → 验证兑换
- [ ] **注册后自动触发第一条主线**（待实现）
- [ ] **新手引导遮罩流程**（待实现）
- [ ] **7日登录礼包领取**（待实现）
- [ ] **成长里程碑礼包**（待实现）
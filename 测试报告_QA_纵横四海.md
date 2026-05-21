# 纵横四海 - QA测试报告

**测试时间**: 2026-05-21
**测试账号**: tester1 / test123456
**后端端口**: 3000

---

## 一、API功能测试结果

| 模块 | 接口 | 结果 | 备注 |
|------|------|------|------|
| 登录 | POST /api/auth/login | ✅ 正常 | 返回token和用户基础信息 |
| 背包 | GET /api/user/inventory | ✅ 正常 | 正确返回物品列表 |
| 装备 | POST /api/user/equip | ✅ 正常 | 装备/卸下均正常 |
| 装备详情 | GET /api/user/equipment | ✅ 正常 | 返回已装备物品及套装加成 |
| 航海 | GET /api/sail/status | ✅ 正常 | 返回船只、港口、可达城市 |
| 副本列表 | GET /api/dungeon/list | ✅ 正常 | 返回牛头山、四象圣殿 |
| 副本详情 | GET /api/dungeon/:name/floors | ✅ 正常 | 返回楼层及怪物信息 |
| 副本次数限制 | POST /api/dungeon/:name/enter | ⚠️ 部分通过 | 次数限制逻辑正确，但有BUG |
| 战斗 | POST /api/battle/start | ✅ 正常（需在正确地点） | 正确拦截不在当前地点的怪物 |
| 战斗状态 | GET /api/battle/state | ✅ 正常 | 正确返回当前战斗状态 |

---

## 二、发现Bug汇总

### 【严重】Bug #1: 副本次数限制前端显示与后端不一致

**文件**: `server/src/routes/dungeon.js` 第197-205行

**问题描述**: 副本次数限制在进入副本前已正确检查，但进入后扣费用的是 **副本入场费** 而不是"副本次数"。限制逻辑本身正确，但前端显示有重复条目问题。

**复现步骤**:
1. 调用 `GET /api/dungeon/list` 查看副本列表
2. 发现牛头山副本同一个name出现12条记录（四象圣殿每宫4条）

**预期**: 同一副本名只应出现1条汇总记录
**实际**: 每层floor都单独列出重复条目

---

### 【严重】Bug #2: 副本楼层数据重复

**文件**: `server/src/routes/dungeon.js` 第64-69行（列表）及第117-125行（楼层详情）

**问题描述**: `SELECT d.name ... GROUP BY d.name` 只按name分组，但数据库中同一副本同一floor有多条记录（因 dungeon 表有多行完全相同的数据）。导致：
- 列表API返回12条牛头山（12个floor各重复）
- 楼层详情返回每层2条完全相同的怪物数据

**复现步骤**:
```bash
curl "http://localhost:3000/api/dungeon/牛头山/floors"
```
返回结果中 floor 1 出现2次，floor 2 出现2次...

**预期**: 每层只返回1条
**实际**: 每层返回2条完全相同的数据

---

### 【严重】Bug #3: 船只数据严重错误

**文件**: `server/src/routes/sail.js` 第26行

**问题描述**: `allShips` 查询没有排序字段，导致前端显示顺序随机。更严重的是，快速帆船(1500铜币)的 capacity=2010、speed=201；商船(2000铜币)的 capacity=2010、speed=201 —— 低级船属性反而比高级船好。

**复现步骤**:
```bash
curl "http://localhost:3000/api/sail/status"
```
返回 allShips 数组中，快速帆船speed=201，商船speed=201...这是明显的配置数据错误。

**预期**: speed 应为 2/3/5，capacity 应为合理数值（20/40/80）
**实际**: 多个船只 speed=201, capacity=2010

---

### 【中等】Bug #4: `/api/user/info` 接口不存在导致超时

**文件**: `server/src/routes/user.js` 和 `user2.js`

**问题描述**: 前端可能调用了 `/api/user/info`，但该路由不存在。curl 测试时连接超时（无响应），说明路由缺失或中间件卡死。

**复现步骤**:
```bash
curl "http://localhost:3000/api/user/info" -H "Authorization: Bearer $TOKEN"
```
等待超过10秒后超时（exit code 28）

**预期**: 立即返回404或用户信息
**实际**: 请求超时（10秒+）

---

### 【中等】Bug #5: 航海事件随机数判定在极端情况下可能偏差

**文件**: `server/src/routes/sail.js` 第67-97行

**问题描述**: 航海随机事件（海盗遭遇）使用 `Math.random()*100` 判定，条件是 `roll <= 20`（20%概率）。在网络波动或多并发请求时，可能出现多次判定。

---

### 【轻微】Bug #6: 套装系统前端显示套装不完整

**文件**: `server/src/routes/user2.js` 第40-54行

**问题描述**: 套装总览显示 `owned` 数量只统计了背包中的数量，没有包含已装备的数量（虽然后面有 merge 逻辑，但 setOverviewMap 初始化时 `owned` 来自 `backpackSetGroups`，不是总数量）。

---

### 【建议】Bug #7: 副本进入后 HP=0 仍可进入

**文件**: `server/src/routes/dungeon.js` 第177行

**问题描述**: 只有 `user.hp <= 0` 的检查，但如果用户在副本外 HP=0，会被拦截。但如果从副本内复活（HP=1）继续打怪，死亡后离开副本再进，没有额外检查。

---

### 【建议】Bug #8: 战斗逃跑成功率固定50%

**文件**: `server/src/routes/battle.js` 第226行

**问题描述**: `if (randInt(1, 100) <= 50)` 逃跑成功率固定50%，不考虑玩家敏捷属性。

---

## 三、副本次数限制专项测试

**测试目标**: 验证超次进入副本是否被正确拦截

**测试结果**: ✅ **通过**

- 牛头山：每日上限3次，每周上限15次
- 四象圣殿：每日上限1次，每周上限7次
- 代码逻辑（dungeon.js 第197-205行）: 在 `enter` 接口中正确检查 `daily_count >= daily_limit` 和 `weekly_count >= weekly_limit`，超限返回400错误并提示

---

## 四、数据问题

1. **item表 type字段混淆**: 钢铁护甲（type=1，subtype=armor）、铁剑（type=2，subtype=weapon）—— type=1应该是装备，但铁剑type=2。疑似数据问题。
2. **副本怪物重复**: dungeon表同一floor有多条相同记录
3. **船只速度/容量配置错误**: 大量船只speed=201，capacity=2010

---

## 五、总结

| 严重程度 | 数量 |
|----------|------|
| 严重 | 3 |
| 中等 | 2 |
| 轻微/建议 | 3 |

**核心问题**:
1. **副本数据重复** - 数据库层有脏数据，导致API返回重复楼层
2. **船只属性配置错误** - 配置表数据异常，影响游戏平衡
3. **API路由缺失** - `/api/user/info` 不存在，前端可能无法正常加载用户信息

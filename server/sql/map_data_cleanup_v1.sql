-- ============================================================
-- 纵横四海地图数据清理 v1.0
-- 目标：修复 map 表重复城市 + place 表脏数据
-- ============================================================

-- ============================================================
-- 阶段一：修复 map 表
-- 删除重复城市：105(雅典重复), 107(伊斯坦布尔重复), 拉古扎104保留
-- 保留 id: 101,102,103,104,106,108,109,110 (地中海)
-- ============================================================

-- Step 1: 删除重复城市 map 记录
DELETE FROM map WHERE id IN (105, 107);
-- 105是重复雅典(id=102)，107是重复伊斯坦布尔(id=106)

-- Step 2: 确认海域记录正确
-- id: 1=地中海, 2=北海, 3=非洲, 4=东亚, 5=印度洋, 6=新大陆 (都已正确)

-- ============================================================
-- 阶段二：修复 place 表的 city_id 映射
-- 策略：map_id 在正确城市范围内的，直接 city_id = map_id
-- 对于 map_id=2 等混乱的，通过 name 前缀判断归属
-- ============================================================

-- 2a: 正确映射的 city_id（map_id 在 100-999 范围且 map.type=1 的）
UPDATE place p
JOIN map m ON m.id = p.map_id
SET p.city_id = p.map_id
WHERE p.map_id BETWEEN 100 AND 999
  AND m.type = 1
  AND p.city_id != p.map_id;

-- 2b: 修复 map_id=2 中通过 name 前缀可识别的数据
-- 先批量 UPDATE
UPDATE place SET city_id = 203 WHERE map_id = 2 AND name LIKE '爱丁堡%';
UPDATE place SET city_id = 308 WHERE map_id = 2 AND name LIKE '蒙巴萨%';
UPDATE place SET city_id = 405 WHERE map_id = 2 AND name LIKE '扬州%';
UPDATE place SET city_id = 205 WHERE map_id = 2 AND name LIKE '汉堡%';
UPDATE place SET city_id = 402 WHERE map_id = 2 AND name LIKE '广州%';
UPDATE place SET city_id = 305 WHERE map_id = 2 AND name LIKE '亚特兰蒂斯%';
UPDATE place SET city_id = 406 WHERE map_id = 2 AND name LIKE '长安%';
UPDATE place SET city_id = 408 WHERE map_id = 2 AND name LIKE '京都%';
UPDATE place SET city_id = 407 WHERE map_id = 2 AND name LIKE '大阪%';
UPDATE place SET city_id = 404 WHERE map_id = 2 AND name LIKE '杭州%';
UPDATE place SET city_id = 403 WHERE map_id = 2 AND name LIKE '泉州%';
UPDATE place SET city_id = 401 WHERE map_id = 2 AND name LIKE '马六甲%';
UPDATE place SET city_id = 501 WHERE map_id = 2 AND name LIKE '亚丁%';
UPDATE place SET city_id = 502 WHERE map_id = 2 AND name LIKE '荷姆兹%';
UPDATE place SET city_id = 503 WHERE map_id = 2 AND name LIKE '锡兰%';
UPDATE place SET city_id = 302 WHERE map_id = 2 AND name LIKE '圣乔治%';
UPDATE place SET city_id = 303 WHERE map_id = 2 AND name LIKE '卢旺达%';
UPDATE place SET city_id = 304 WHERE map_id = 2 AND name LIKE '开普敦%';
UPDATE place SET city_id = 307 WHERE map_id = 2 AND name LIKE '马达加斯加%';
UPDATE place SET city_id = 306 WHERE map_id = 2 AND name LIKE '莫桑比克%';
UPDATE place SET city_id = 301 WHERE map_id = 2 AND name LIKE '达喀尔%';
UPDATE place SET city_id = 202 WHERE map_id = 2 AND name LIKE '伦敦%';

-- 2c: 修复 403,404 内的 name 包含城市前缀但未匹配的
UPDATE place SET city_id = 403 WHERE map_id = 2 AND name LIKE '%泉州%';
UPDATE place SET city_id = 404 WHERE map_id = 2 AND name LIKE '%杭州%';

-- 2d: 修复 map_id=2 中的其他模糊归属
-- 蓬莱仙岛 -> 威尼斯(101)
UPDATE place SET city_id = 101 WHERE map_id = 2 AND name LIKE '%蓬莱仙岛%';
-- 幽蓝海域 -> 爱丁堡(203)
UPDATE place SET city_id = 203 WHERE map_id = 2 AND name LIKE '幽蓝海域%';
-- 泰晤士河 -> 伦敦(202)
UPDATE place SET city_id = 202 WHERE map_id = 2 AND name LIKE '泰晤士河%';
-- 特布尔山 -> 阿姆斯特丹(204)
UPDATE place SET city_id = 204 WHERE map_id = 2 AND name LIKE '特布尔山%';
-- 南天池村 -> 泉州(403)
UPDATE place SET city_id = 403 WHERE map_id = 2 AND name LIKE '南天池村%';
-- 山峦绝壁 -> 扬州(405)
UPDATE place SET city_id = 405 WHERE map_id = 2 AND name LIKE '山峦绝壁%';
-- 落日平原 -> 长安(406)
UPDATE place SET city_id = 406 WHERE map_id = 2 AND name LIKE '落日平原%';
-- 失落之城 -> 亚丁(501)
UPDATE place SET city_id = 501 WHERE map_id = 2 AND name LIKE '失落之城%';
-- 哈帕拉山 -> 圣乔治(302)
UPDATE place SET city_id = 302 WHERE map_id = 2 AND name LIKE '哈帕拉山%';

-- ============================================================
-- 阶段三：修正 dungeon 表的 place_id
-- 9001 牛头山 -> 荷姆兹(502)城墙外的野外
-- 9002 四象圣殿 -> 长安(406)
-- ============================================================
-- 先检查这些副本入口是否已在 place 表中
-- SELECT * FROM place WHERE name LIKE '%牛头山%' OR name LIKE '%四象%';
-- 9001=牛头山入口在 place 表中存在(type=6)，暂不改动 dungeon.place_id
-- 9002=四象圣殿入口在 place 表中存在(type=6)，暂不改动

-- ============================================================
-- 阶段四：清理 place 的 map_id 映射
-- 城市内地点 map_id 应等于 city_id
-- 野外地点的 map_id 也应等于所属城市 id
-- ============================================================
UPDATE place SET map_id = city_id WHERE city_id BETWEEN 100 AND 999;

-- ============================================================
-- 阶段五：验证
-- ============================================================
-- SELECT m.id, m.name, m.parent_id, COUNT(p.id) as place_count
-- FROM map m LEFT JOIN place p ON p.city_id = m.id
-- WHERE m.type = 1 GROUP BY m.id ORDER BY m.id;

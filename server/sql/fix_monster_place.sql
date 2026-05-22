-- 修复 monster.place_id 关联
-- 原则：陆上怪物→城外野外地点(type=0)，海上怪物→码头(type=1)
-- 全局怪物(place_id=0)不受影响

-- ══════════════════════════════════════
-- 陆地主要怪物
-- ══════════════════════════════════════
UPDATE monster SET place_id = 1025 WHERE id = 1;  -- 野狗 Lv1 → 威尼斯农场
UPDATE monster SET place_id = 1037 WHERE id = 3;   -- 山贼喽啰 Lv3 → 威尼斯矿山
UPDATE monster SET place_id = 1025 WHERE id = 4;   -- 流浪汉 Lv2 → 威尼斯农场
UPDATE monster SET place_id = 620  WHERE id = 40;  -- 华南虎 Lv20 → 杭州黄龙山
UPDATE monster SET place_id = 586  WHERE id = 41;  -- 巨蟒 Lv25 → 白云山
UPDATE monster SET place_id = 591  WHERE id = 42;  -- 山魈 Lv30 → 梧桐山
UPDATE monster SET place_id = 15138 WHERE id = 50; -- 森林巨兽 Lv40 → 非洲草原
UPDATE monster SET place_id = 15138 WHERE id = 51; -- 草原狮 Lv35 → 非洲草原
UPDATE monster SET place_id = 15138 WHERE id = 52; -- 鳄鱼 Lv38 → 非洲草原

-- ══════════════════════════════════════
-- 海上怪物 → 各城市码头
-- 威尼斯码头=1011, 雅典码头=1021, 亚历山大码头=3043
-- 拉古扎码头=10003, 雅典(新城市)码头=1051
-- ══════════════════════════════════════
-- 威尼斯海域怪物 (id 1000-1007)
UPDATE monster SET place_id = 1011 WHERE id BETWEEN 1000 AND 1007;

-- 雅典海域怪物 (id 1008-1015)
UPDATE monster SET place_id = 1021 WHERE id BETWEEN 1008 AND 1015;

-- 亚历山大海域怪物 (id 1016-1023)
UPDATE monster SET place_id = 3043 WHERE id BETWEEN 1016 AND 1023;

-- 拉古扎海域怪物 (id 1024-1031) → 拉古扎★码头=10003
UPDATE monster SET place_id = 10003 WHERE id BETWEEN 1024 AND 1031;

-- 新城市(105)海域怪物 (id 1032-1039) → 雅典码头=1051
UPDATE monster SET place_id = 1051 WHERE id BETWEEN 1032 AND 1039;

-- 其余place_id=0的全局怪物保持不变（地图上type>=3时显示）

SELECT CONCAT('修复完成：', COUNT(*), '条 monster 记录更新') as result FROM monster WHERE id <= 1040;

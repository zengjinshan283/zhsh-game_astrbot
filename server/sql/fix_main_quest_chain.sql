-- 修复主线任务链：确保所有17个主线任务 type=0，pre_quest_id连续
-- 按 QUEST_DESIGN.md 设计

-- 任务2: 初识航海 (type=2→0, pre=1→1)
UPDATE quest SET type=0, pre_quest_id=1 WHERE id=2;

-- 任务3: 雅典之行 (type=3→0, pre=2→2)
UPDATE quest SET type=0, pre_quest_id=2 WHERE id=3;

-- 任务4: 雅典商人 (type=2→0, pre=3→3)
UPDATE quest SET type=0, pre_quest_id=3 WHERE id=4;

-- 任务6: 亚历山大之行 (type=3→0, pre=5→5)
UPDATE quest SET type=0, pre_quest_id=5 WHERE id=6;

-- 任务8: 重返威尼斯 (type=2→0, pre=7→7)
UPDATE quest SET type=0, pre_quest_id=7 WHERE id=8;

-- 任务9: 长安的召唤 (type=3→0, pre=8→8)
UPDATE quest SET type=0, pre_quest_id=8 WHERE id=9;

-- 任务10: 银矿石的请求 (type=1→0, pre=9→9)
UPDATE quest SET type=0, pre_quest_id=9 WHERE id=10;

-- 任务12: 前往牛头山 (type=3→0, pre=11→11)
UPDATE quest SET type=0, pre_quest_id=11 WHERE id=12;

-- 任务13: 牛头山探秘 (type=3→0, pre=12→12)
UPDATE quest SET type=0, pre_quest_id=12 WHERE id=13;

-- 任务16: 四象圣殿的传说 (type=3→0, pre=15→15)
UPDATE quest SET type=0, pre_quest_id=15 WHERE id=16;

SELECT '主线任务链修复完成' as result;
SELECT id, name, type, level_req, pre_quest_id FROM quest WHERE id BETWEEN 1 AND 17 ORDER BY id;

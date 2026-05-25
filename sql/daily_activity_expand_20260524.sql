-- 日常任务扩展至12个 + 活跃度宝箱重制
-- Run: mysql -u root zhsh_game < sql/daily_activity_expand_20260524.sql

-- 1. 新增日常任务（插入到 daily_activity）
--    原有5个保留，新增7个，达到共12个
INSERT IGNORE INTO `daily_activity` (`id`, `key`, `name`, `description`, `target`, `active_point`) VALUES
(9,  'daily_sail',       '航海冒险',    '进行1次航海（出发港口）',       1, 25),
(10, 'daily_dungeon',    '副本探索',    '通关任意副本任意楼层',          1, 25),
(11, 'daily_enhance',    '装备强化',    '强化任意装备成功（+1或更高）',   1, 15),
(12, 'daily_identify',   '装备鉴定',    '鉴定任意装备',                  1, 15),
(13, 'daily_feed_pet',   '宠物喂食',    '给宠物喂食1次',                  1, 10),
(14, 'daily_guild_donate','帮会捐献',   '向帮会捐献任意资源',             1, 20),
(15, 'daily_use_item',   '道具使用',    '使用任意道具/消耗品',            3, 10);

-- 2. 活跃度宝箱奖励重制（铜币+银币+道具）
DELETE FROM `activity_reward`;
INSERT INTO `activity_reward` (`id`, `active_point`, `reward_type`, `reward_value`, `quantity`) VALUES
(1,  20,  'money',   'money',   1000),   -- 20点：1000铜币
(2,  40,  'money',   'money',   3000),   -- 40点：3000铜币
(3,  60,  'money',   'money',   6000),   -- 60点：6000铜币
(4,  60,  'item',    96,        1),       -- 60点：体力宝×1（龙泉水材料）
(5,  80,  'silver',  'silver',  5),       -- 80点：5银币
(6,  80,  'item',    94,        2),       -- 80点：龙泉水×2
(7,  100, 'silver', 'silver',  15),       -- 100点：15银币
(8,  100, 'item',    3001,      1);       -- 100点：隐身戒指（或随机紫装）
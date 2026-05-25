-- ============================================================
-- 藏宝图系统 v1.0 (2026-05-25)
-- 银币购买藏宝图 → 野外坐标挖掘 → 奖励（稀有装备/玄铁石/银币）
-- ============================================================

-- 藏宝图道具定义（type=9 为 special 类别）
INSERT INTO `item` (`id`, `name`, `type`, `subtype`, `description`, `price_buy`, `price_sell`, `level_req`, `quality`)
VALUES 
(90001, '藏宝图', 9, 'treasure_map', '标注着神秘宝藏位置的古老地图，在野外使用可开始挖掘。', 50, 20, 1, 0),
(90002, '藏宝图碎片·左', 9, 'treasure_fragment', '藏宝图的左半部分，上面画着海岸线和奇怪的符号。', 0, 5, 1, 0),
(90003, '藏宝图碎片·中', 9, 'treasure_fragment', '藏宝图的中段部分，记载着危险的警告。', 0, 5, 1, 0),
(90004, '藏宝图碎片·右', 9, 'treasure_fragment', '藏宝图的右半部分，标注着终点的 X 标记。', 0, 5, 1, 0),
(90005, '古老的藏宝图', 9, 'treasure_map_elite', '由三块碎片拼合而成的古老藏宝图，闪烁着神秘的光芒。', 0, 100, 10, 2);

-- 藏宝图奖励池（按 quality 分类）
CREATE TABLE IF NOT EXISTS `treasure_reward` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `type` VARCHAR(20) NOT NULL COMMENT 'money/silver/item/goods',
  `value` VARCHAR(64) NOT NULL COMMENT '数量或物品ID',
  `weight` INT NOT NULL DEFAULT 1 COMMENT '权重',
  `min_level` INT DEFAULT 1 COMMENT '最低玩家等级要求',
  `quality` TINYINT DEFAULT 0 COMMENT '0=普通藏宝图奖励, 1=精致, 2=古老'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 普通藏宝图奖励（50银币）
INSERT INTO `treasure_reward` (`type`, `value`, `weight`, `min_level`, `quality`) VALUES
('money', '300', 30, 1, 0),
('money', '500', 25, 1, 0),
('money', '800', 15, 1, 0),
('silver', '1', 8, 1, 0),
('silver', '2', 4, 5, 0),
('item', '20011', 5, 5, 0),  -- 玄铁石
('item', '20012', 3, 8, 0);  -- 精炼玄铁

-- 精致藏宝图奖励（150银币）
INSERT INTO `treasure_reward` (`type`, `value`, `weight`, `min_level`, `quality`) VALUES
('money', '1000', 20, 5, 1),
('money', '2000', 15, 5, 1),
('silver', '3', 15, 5, 1),
('silver', '5', 10, 5, 1),
('item', '20011', 10, 5, 1),
('item', '20012', 8, 8, 1),
('item', '20013', 4, 12, 1);  -- 传说玄铁

-- 古老藏宝图奖励（500银币/特殊碎片合成）
INSERT INTO `treasure_reward` (`type`, `value`, `weight`, `min_level`, `quality`) VALUES
('silver', '10', 15, 10, 2),
('silver', '20', 10, 10, 2),
('item', '20012', 15, 8, 2),
('item', '20013', 12, 12, 2),
('item', '30001', 8, 15, 2),  -- 蓝装
('item', '30002', 5, 18, 2);  -- 紫装

-- 野外地点表（藏宝图坐标生成范围）
CREATE TABLE IF NOT EXISTS `treasure_location` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `map_id` INT NOT NULL COMMENT '所属海域/地图ID',
  `name` VARCHAR(64) NOT NULL COMMENT '地点名称',
  `x` INT NOT NULL COMMENT 'X坐标',
  `y` INT NOT NULL COMMENT 'Y坐标',
  `min_level` INT DEFAULT 1 COMMENT '最低等级要求',
  `max_level` INT DEFAULT 99 COMMENT '最高等级要求',
  `quality` TINYINT DEFAULT 0 COMMENT '0=普通,1=精致,2=古老'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 插入野外挖掘地点（各海域代表性野外点）
INSERT INTO `treasure_location` (`map_id`, `name`, `x`, `y`, `min_level`, `max_level`, `quality`) VALUES
-- 东海群岛
(2, '荒废渔村废墟', 10, 20, 1, 15, 0),
(2, '珊瑚礁浅滩', 35, 15, 1, 10, 0),
(2, '沉船遗骸', 50, 40, 5, 20, 1),
-- 南海深处
(3, '密林深处', 15, 30, 8, 25, 1),
(3, '古代神庙遗迹', 45, 25, 12, 30, 1),
(3, '蛇岛礁石', 60, 50, 15, 35, 1),
-- 西海海峡
(4, '海蚀洞穴', 20, 35, 10, 28, 1),
(4, '漂流者墓地', 55, 20, 18, 38, 2),
-- 北海冰原
(5, '沉没商船', 25, 45, 20, 40, 1),
(5, '冰封海湾', 40, 30, 25, 45, 2),
-- 东海西湖交界
(6, '迷雾海峡', 30, 25, 5, 18, 0),
(6, '海寇藏身处', 55, 45, 15, 30, 2);
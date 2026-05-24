-- 装备鉴定系统 + 随机词缀表
-- Run against zhsh_game database

-- 1. 词缀表（随机属性池）
CREATE TABLE IF NOT EXISTS `item_affix` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `affix_name` VARCHAR(50) NOT NULL COMMENT '词缀名称',
  `stat_key` VARCHAR(30) NOT NULL COMMENT '属性字段：atk/def/hp/mp/agility/crit',
  `stat_min` INT NOT NULL DEFAULT 0 COMMENT '最小值',
  `stat_max` INT NOT NULL DEFAULT 0 COMMENT '最大值',
  `rarity` TINYINT NOT NULL DEFAULT 1 COMMENT '稀有度：1普通/2稀有/3传说',
  `tier` VARCHAR(20) NOT NULL DEFAULT 'normal' COMMENT '词缀等阶：normal/elite/boss',
  `level_req` INT NOT NULL DEFAULT 1 COMMENT '最低使用等级'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. 装备鉴定状态（背包装备是否已鉴定）
ALTER TABLE `inventory` ADD COLUMN `is_identified` TINYINT NOT NULL DEFAULT 1;

-- 3. 插入词缀数据（按稀有度分层）
INSERT INTO `item_affix` (`affix_name`, `stat_key`, `stat_min`, `stat_max`, `rarity`, `tier`, `level_req`) VALUES
-- 普通词缀（rarity=1）
('锐利', 'atk', 2, 5, 1, 'normal', 1),
('坚韧', 'def', 2, 5, 1, 'normal', 1),
('生机', 'hp', 5, 15, 1, 'normal', 1),
('敏捷', 'agility', 1, 3, 1, 'normal', 1),
('幸运', 'crit', 1, 3, 1, 'normal', 1),
('魔力', 'mp', 3, 10, 1, 'normal', 1),
('锋锐', 'atk', 3, 7, 1, 'normal', 5),
('坚固', 'def', 3, 7, 1, 'normal', 5),
('活力', 'hp', 10, 25, 1, 'normal', 5),
('灵巧', 'agility', 2, 4, 1, 'normal', 10),
('致命', 'crit', 2, 5, 1, 'normal', 10),
-- 稀有词缀（rarity=2）
('精通之锋', 'atk', 6, 12, 2, 'elite', 15),
('精通之甲', 'def', 6, 12, 2, 'elite', 15),
('精通之魂', 'hp', 20, 50, 2, 'elite', 15),
('精通之速', 'agility', 3, 7, 2, 'elite', 15),
('精通之怒', 'crit', 4, 8, 2, 'elite', 15),
('狂暴之力', 'atk', 10, 20, 2, 'elite', 25),
('钢铁之躯', 'def', 10, 20, 2, 'elite', 25),
('生命怒涛', 'hp', 40, 100, 2, 'elite', 25),
('疾风之速', 'agility', 5, 10, 2, 'elite', 25),
('狂暴之击', 'crit', 6, 12, 2, 'elite', 25),
-- 传说词缀（rarity=3）
('龙之怒', 'atk', 15, 30, 3, 'boss', 35),
('龙之鳞', 'def', 15, 30, 3, 'boss', 35),
('龙之血', 'hp', 80, 200, 3, 'boss', 35),
('龙之速', 'agility', 8, 16, 3, 'boss', 35),
('龙之噬', 'crit', 10, 20, 3, 'boss', 35),
('诸神黄昏', 'atk', 25, 50, 3, 'boss', 50),
('诸神庇护', 'def', 25, 50, 3, 'boss', 50),
('诸神意志', 'hp', 150, 400, 3, 'boss', 50),
('诸神脚步', 'agility', 12, 25, 3, 'boss', 50),
('诸神一击', 'crit', 15, 30, 3, 'boss', 50);

-- 4. 更新game_config增加鉴定配置
INSERT INTO `game_config` (`category`, `config_key`, `config_value`, `description`) VALUES
('identify', 'cost_base', '500', '鉴定费用基数（按装备等级计算）'),
('identify', 'cost_per_level', '100', '鉴定费用每级增加铜币'),
('identify', 'normal_affix_count', '1', '普通装备鉴定后词缀数量'),
('identify', 'elite_affix_count', '2', '精英装备鉴定后词缀数量'),
('identify', 'boss_affix_count', '3', 'BOSS装备鉴定后词缀数量')
ON DUPLICATE KEY UPDATE `config_value`=VALUES(`config_value`);
-- ============================================================
-- 宠物被动技能系统 v1.0 (2026-05-25)
-- 宠物通过技能书学习被动技能，战斗中自动生效
-- ============================================================

-- 宠物技能表（所有技能定义）
CREATE TABLE IF NOT EXISTS `pet_skill` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `skill_key` VARCHAR(32) NOT NULL UNIQUE COMMENT '技能标识',
  `name` VARCHAR(32) NOT NULL COMMENT '技能名称',
  `desc` VARCHAR(128) NOT NULL COMMENT '技能描述',
  `stat_key` VARCHAR(16) NOT NULL COMMENT '影响的属性：hp/atk/def/crit/dodge/money_exp',
  `stat_value` INT NOT NULL DEFAULT 0 COMMENT '属性加成值',
  `rarity` TINYINT DEFAULT 0 COMMENT '0=普通,1=稀有,2=传说',
  `book_item_id` INT DEFAULT 0 COMMENT '对应的技能书道具ID'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 插入宠物被动技能（8种）
INSERT INTO `pet_skill` (`skill_key`, `name`, `desc`, `stat_key`, `stat_value`, `rarity`, `book_item_id`) VALUES
('hp_1', '生命强化·初级', '主人生命上限+50', 'hp', 50, 0, 91001),
('hp_2', '生命强化·中级', '主人生命上限+150', 'hp', 150, 1, 91002),
('hp_3', '生命强化·高级', '主人生命上限+300', 'hp', 300, 2, 91003),
('atk_1', '攻击强化·初级', '主人攻击力+10', 'atk', 10, 0, 91004),
('atk_2', '攻击强化·中级', '主人攻击力+30', 'atk', 30, 1, 91005),
('atk_3', '攻击强化·高级', '主人攻击力+60', 'atk', 60, 2, 91006),
('def_1', '防御强化·初级', '主人防御+8', 'def', 8, 0, 91007),
('def_2', '防御强化·中级', '主人防御+24', 'def', 24, 1, 91008);

-- 宠物技能书道具（8本）
INSERT INTO `item` (`id`, `name`, `type`, `subtype`, `description`, `price_buy`, `price_sell`, `level_req`, `quality`) VALUES
(91001, '生命强化·初级技能书', 9, 'pet_skill', '教会宠物「生命强化·初级」被动技能。', 100, 50, 1, 0),
(91002, '生命强化·中级技能书', 9, 'pet_skill', '教会宠物「生命强化·中级」被动技能。', 0, 100, 5, 1),
(91003, '生命强化·高级技能书', 9, 'pet_skill', '教会宠物「生命强化·高级」被动技能，只能用于30级以上宠物。', 0, 200, 10, 2),
(91004, '攻击强化·初级技能书', 9, 'pet_skill', '教会宠物「攻击强化·初级」被动技能。', 100, 50, 1, 0),
(91005, '攻击强化·中级技能书', 9, 'pet_skill', '教会宠物「攻击强化·中级」被动技能。', 0, 100, 5, 1),
(91006, '攻击强化·高级技能书', 9, 'pet_skill', '教会宠物「攻击强化·高级」被动技能，只能用于30级以上宠物。', 0, 200, 10, 2),
(91007, '防御强化·初级技能书', 9, 'pet_skill', '教会宠物「防御强化·初级」被动技能。', 100, 50, 1, 0),
(91008, '防御强化·中级技能书', 9, 'pet_skill', '教会宠物「防御强化·中级」被动技能。', 0, 100, 5, 1);

-- 为 user_pet 表增加技能槽（3个槽）
ALTER TABLE `user_pet` ADD COLUMN `skill_1` VARCHAR(32) DEFAULT '' COMMENT '技能key',
  ADD COLUMN `skill_2` VARCHAR(32) DEFAULT '' COMMENT '技能key',
  ADD COLUMN `skill_3` VARCHAR(32) DEFAULT '' COMMENT '技能key';
-- 商城商品池 + 用户每日商城表
-- 纵横四海 v1.0 | 2026-05-28

-- 商品池（所有候选商品）
CREATE TABLE IF NOT EXISTS `mall_item_pool` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `item_id`     INT UNSIGNED NOT NULL COMMENT 'item表ID',
  `category`    VARCHAR(20)  NOT NULL DEFAULT '' COMMENT '分类：weapon/armor/accessory/consumable/material',
  `weight`      INT UNSIGNED NOT NULL DEFAULT 10 COMMENT '抽中权重(越高越容易抽到)',
  `min_level`   INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '最低出现等级',
  `max_level`   INT UNSIGNED NOT NULL DEFAULT 99 COMMENT '最高出现等级',
  `is_special`  TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '是否限时特惠(不受刷新影响)',
  UNIQUE KEY `uk_item` (`item_id`),
  KEY `idx_category_level` (`category`, `min_level`, `max_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 用户每日商城（每天凌晨CST随机抽取N个商品）
CREATE TABLE IF NOT EXISTS `user_mall` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id`    INT UNSIGNED NOT NULL,
  `item_id`    INT UNSIGNED NOT NULL COMMENT 'item表ID',
  `price`       INT UNSIGNED NOT NULL COMMENT '当日售价(可动态浮动)',
  `refresh_cnt` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '今日已刷新次数',
  `mall_date`   DATE NOT NULL COMMENT '商城日期(CST零点)',
  UNIQUE KEY `uk_user_item` (`user_id`, `item_id`, `mall_date`),
  KEY `idx_user_date` (`user_id`, `mall_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 插入候选商品（从原MALL_ITEMS映射）
INSERT IGNORE INTO `mall_item_pool` (`item_id`, `category`, `weight`, `min_level`, `max_level`) VALUES
-- 武器
(201,  'weapon',    15,  1,  99),
(202,  'weapon',    15,  1,  99),
(203,  'weapon',    15,  1,  99),
-- 防具
(301,  'armor',     15,  1,  99),
(302,  'armor',     15,  1, 99),
-- 饰品
(401,  'accessory', 15,  1,  99),
(402,  'accessory', 15,  1,  99),
-- 消耗品
(501,  'consumable',20,  1,  99),
(502,  'consumable',20,  1,  99),
(503,  'consumable',20,  1,  99),
-- 材料
(601,  'material',  20,  1,  99),
(602,  'material',  20,  1,  99),
(603,  'material',  20,  1,  99),
(90001,'material',   5,  1,  99),
-- 宠物技能书
(91001,'material',  10,  1,  99),
(91002,'material',  10,  5,  99),
(91003,'material',  10, 10,  99),
(91004,'material',  10,  1,  99),
(91005,'material',  10,  5,  99),
(91006,'material',  10, 10,  99),
(91007,'material',  10,  1,  99),
(91008,'material',  10,  5,  99);
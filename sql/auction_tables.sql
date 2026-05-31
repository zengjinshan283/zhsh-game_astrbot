-- =============================================
-- 拍卖行系统 v1.0
-- 4张表: auction / auction_bid / auction_watch / auction_category
-- =============================================

-- 1. 拍卖分类配置
CREATE TABLE IF NOT EXISTS `auction_category` (
  `id`         INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `name`       VARCHAR(30) NOT NULL COMMENT '分类名称',
  `icon`       VARCHAR(20) NOT NULL DEFAULT '📦' COMMENT '图标',
  `sort_order` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '排序',
  `is_active`  TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '是否启用'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='拍卖分类配置';

INSERT INTO `auction_category` (`id`, `name`, `icon`, `sort_order`, `is_active`) VALUES
(1, '武器',   '⚔️', 10, 1),
(2, '防具',   '🛡️', 20, 1),
(3, '饰品',   '💍', 30, 1),
(4, '消耗品', '💊', 40, 1),
(5, '材料',   '📦', 50, 1),
(6, '宠物',   '🐾', 60, 1),
(7, '其他',   '🎁', 99, 1);

-- 2. 拍卖物品主表
CREATE TABLE IF NOT EXISTS `auction` (
  `id`             INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `item_id`        INT UNSIGNED NOT NULL COMMENT '物品ID(item.id)',
  `seller_id`      INT UNSIGNED NOT NULL COMMENT '卖家用户ID',
  `category_id`    INT UNSIGNED NOT NULL DEFAULT 7 COMMENT '分类ID',
  `title`          VARCHAR(100) NOT NULL COMMENT '拍卖标题',
  `description`    TEXT COMMENT '物品描述',

  `starting_price` INT UNSIGNED NOT NULL COMMENT '起拍价(铜币)',
  `current_price`  INT UNSIGNED NOT NULL COMMENT '当前价(铜币)',
  `buyout_price`    INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '一口价(0=无)',

  `highest_bidder_id` INT UNSIGNED DEFAULT NULL COMMENT '当前最高出价者ID',

  `bid_count`      INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '总出价次数',

  `start_time`     DATETIME NOT NULL COMMENT '开始时间',
  `end_time`       DATETIME NOT NULL COMMENT '结束时间(CST)',

  `status`         TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0=进行中 1=已成交 2=流拍 3=已取消',

  `winner_id`      INT UNSIGNED DEFAULT NULL COMMENT '最终获得者ID',
  `final_price`    INT UNSIGNED DEFAULT NULL COMMENT '最终成交价',

  `created_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX `idx_status_endtime` (`status`, `end_time`),
  INDEX `idx_seller`         (`seller_id`),
  INDEX `idx_highest_bidder`  (`highest_bidder_id`),
  INDEX `idx_category`       (`category_id`),
  INDEX `idx_item`           (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='拍卖物品主表';

-- 3. 竞拍出价记录
CREATE TABLE IF NOT EXISTS `auction_bid` (
  `id`           INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `auction_id`   INT UNSIGNED NOT NULL COMMENT '拍卖ID',
  `bidder_id`    INT UNSIGNED NOT NULL COMMENT '出价者ID',
  `bid_price`    INT UNSIGNED NOT NULL COMMENT '出价金额(铜币)',
  `is_winning`  TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '是否为当前最高 0=否 1=是',

  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX `idx_auction`  (`auction_id`),
  INDEX `idx_bidder`   (`bidder_id`),

  FOREIGN KEY (`auction_id`) REFERENCES `auction`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='竞拍出价记录';

-- 4. 用户关注的拍卖
CREATE TABLE IF NOT EXISTS `auction_watch` (
  `id`         INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `user_id`    INT UNSIGNED NOT NULL COMMENT '用户ID',
  `auction_id` INT UNSIGNED NOT NULL COMMENT '拍卖ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY `uk_user_auction` (`user_id`, `auction_id`),
  INDEX `idx_user`    (`user_id`),
  INDEX `idx_auction` (`auction_id`),

  FOREIGN KEY (`auction_id`) REFERENCES `auction`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户关注的拍卖';

-- 默认流拍时限(小时)
-- INSERT INTO `game_config` (`key`, `value`, `remark`) VALUES ('auction_default_duration', '24', '拍卖默认持续时长(小时)');
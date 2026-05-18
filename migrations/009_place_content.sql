-- Migration: place_content 表 + 初始数据
-- 用途：各地点显示的 NPC/怪物/BOSS 内容可配置
-- 时间：2026-05-18

CREATE TABLE IF NOT EXISTS `place_content` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `place_id` INT NOT NULL DEFAULT 0 COMMENT '地点ID',
  `content_type` ENUM('npc','monster','boss') NOT NULL DEFAULT 'monster' COMMENT '内容类型',
  `content_id` INT NOT NULL DEFAULT 0 COMMENT 'monster.id 或 npc.id',
  `display_mode` ENUM('fixed','random') NOT NULL DEFAULT 'fixed' COMMENT '显示模式',
  `weight` INT NOT NULL DEFAULT 1 COMMENT '随机权重(0-100, 越大概率越高)',
  `min_level` INT NOT NULL DEFAULT 0 COMMENT '最低玩家等级',
  `max_level` INT NOT NULL DEFAULT 999 COMMENT '最高玩家等级',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '显示顺序',
  `enabled` TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用',
  UNIQUE KEY `uk_place_content` (`place_id`, `content_type`, `content_id`),
  KEY `idx_place_type` (`place_id`, `content_type`),
  KEY `idx_enabled` (`enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='地点内容配置表';

-- 威尼斯★码头(1022) - 船只商人
INSERT IGNORE INTO place_content (place_id, content_type, content_id, display_mode, weight, sort_order) VALUES (1022, 'npc', 1203, 'fixed', 1, 10);

-- 威尼斯码头(1011) - 船只商人
INSERT IGNORE INTO place_content (place_id, content_type, content_id, display_mode, weight, sort_order) VALUES (1011, 'npc', 1203, 'fixed', 1, 10);

-- 威尼斯酒馆(1013) - 马可
INSERT IGNORE INTO place_content (place_id, content_type, content_id, display_mode, weight, sort_order) VALUES (1013, 'npc', 1, 'fixed', 1, 10);

-- 威尼斯铁匠铺(1014) - 安芬尼奥
INSERT IGNORE INTO place_content (place_id, content_type, content_id, display_mode, weight, sort_order) VALUES (1014, 'npc', 2, 'fixed', 1, 10);

-- 威尼斯广场(1020) - 多个商人
INSERT IGNORE INTO place_content (place_id, content_type, content_id, display_mode, weight, sort_order) VALUES (1020, 'npc', 3, 'fixed', 1, 10);
INSERT IGNORE INTO place_content (place_id, content_type, content_id, display_mode, weight, sort_order) VALUES (1020, 'npc', 4, 'fixed', 1, 20);
INSERT IGNORE INTO place_content (place_id, content_type, content_id, display_mode, weight, sort_order) VALUES (1020, 'npc', 5, 'fixed', 1, 30);
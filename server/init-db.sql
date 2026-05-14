SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `user` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(32) NOT NULL,
  `password` varchar(255) NOT NULL,
  `sex` tinyint NOT NULL DEFAULT 1,
  `avatar` tinyint NOT NULL DEFAULT 1,
  `sid` varchar(64) NOT NULL DEFAULT '',
  `regdate` int NOT NULL DEFAULT 0,
  `lastdate` int NOT NULL DEFAULT 0,
  `regip` varchar(64) NOT NULL DEFAULT '',
  `money` int NOT NULL DEFAULT 10000,
  `gold` int NOT NULL DEFAULT 0,
  `level` int NOT NULL DEFAULT 1,
  `exp` int NOT NULL DEFAULT 0,
  `exp_max` int NOT NULL DEFAULT 500,
  `hp` int NOT NULL DEFAULT 100,
  `hp_max` int NOT NULL DEFAULT 100,
  `atk_min` int NOT NULL DEFAULT 1,
  `atk_max` int NOT NULL DEFAULT 28,
  `def` int NOT NULL DEFAULT 0,
  `agility` int NOT NULL DEFAULT 0,
  `place_id` int NOT NULL DEFAULT 1011,
  `bank_money` int NOT NULL DEFAULT 0,
  `pet_id` int NOT NULL DEFAULT 0,
  `pet_name` varchar(32) NOT NULL DEFAULT '',
  `pet_level` int NOT NULL DEFAULT 0,
  `pet_exp` int NOT NULL DEFAULT 0,
  `ship_id` int NOT NULL DEFAULT 0,
  `sail_time` int NOT NULL DEFAULT 0,
  `sail_from` int NOT NULL DEFAULT 0,
  `sail_to` int NOT NULL DEFAULT 0,
  `sail_event_checked_at` int NOT NULL DEFAULT 0,
  `sail_remaining_sec` int NOT NULL DEFAULT 0,
  `sail_paused` tinyint NOT NULL DEFAULT 0,
  `shortcut_slot_1` int NOT NULL DEFAULT 0,
  `shortcut_slot_2` int NOT NULL DEFAULT 0,
  `shortcut_slot_3` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `map` (
  `id` int NOT NULL,
  `name` varchar(64) NOT NULL,
  `type` tinyint NOT NULL DEFAULT 1,
  `parent_id` int NOT NULL DEFAULT 0,
  `description` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `place` (
  `id` int NOT NULL,
  `name` varchar(64) NOT NULL,
  `city_id` int NOT NULL DEFAULT 0,
  `map_id` int NOT NULL DEFAULT 0,
  `type` tinyint NOT NULL DEFAULT 0,
  `description` text,
  `n` int NOT NULL DEFAULT 0,
  `s` int NOT NULL DEFAULT 0,
  `e` int NOT NULL DEFAULT 0,
  `w` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `npc` (
  `id` int NOT NULL,
  `name` varchar(64) NOT NULL,
  `place_id` int NOT NULL DEFAULT 0,
  `type` tinyint NOT NULL DEFAULT 0,
  `dialog` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `npc_dialog` (
  `id` int NOT NULL AUTO_INCREMENT,
  `npc_id` int NOT NULL,
  `trigger_type` varchar(32) NOT NULL DEFAULT 'idle',
  `content` text NOT NULL,
  `sort_order` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `monster` (
  `id` int NOT NULL,
  `name` varchar(64) NOT NULL,
  `place_id` int NOT NULL DEFAULT 0,
  `level` int NOT NULL DEFAULT 1,
  `hp` int NOT NULL DEFAULT 30,
  `atk_min` int NOT NULL DEFAULT 1,
  `atk_max` int NOT NULL DEFAULT 5,
  `def` int NOT NULL DEFAULT 0,
  `agility` int NOT NULL DEFAULT 0,
  `exp` int NOT NULL DEFAULT 10,
  `money` int NOT NULL DEFAULT 10,
  `capture_rate` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `item` (
  `id` int NOT NULL,
  `name` varchar(64) NOT NULL,
  `type` tinyint NOT NULL DEFAULT 0,
  `subtype` varchar(32) NOT NULL DEFAULT '',
  `description` text,
  `price_buy` int NOT NULL DEFAULT 0,
  `price_sell` int NOT NULL DEFAULT 0,
  `atk` int NOT NULL DEFAULT 0,
  `def_val` int NOT NULL DEFAULT 0,
  `hp` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `inventory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `item_id` int NOT NULL,
  `quantity` int NOT NULL DEFAULT 1,
  `equipped` tinyint NOT NULL DEFAULT 0,
  `enhance_level` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_inventory_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `npc_shop_item` (
  `id` int NOT NULL AUTO_INCREMENT,
  `npc_id` int NOT NULL,
  `item_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_shop_item` (`npc_id`, `item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `quest` (
  `id` int NOT NULL,
  `name` varchar(80) NOT NULL,
  `description` text,
  `category` tinyint NOT NULL DEFAULT 0,
  `type` tinyint NOT NULL DEFAULT 0,
  `target_id` int NOT NULL DEFAULT 0,
  `require_value` int NOT NULL DEFAULT 1,
  `npc_id` int NOT NULL DEFAULT 0,
  `pre_quest_id` int NOT NULL DEFAULT 0,
  `level_req` int NOT NULL DEFAULT 1,
  `reward_exp` int NOT NULL DEFAULT 0,
  `reward_money` int NOT NULL DEFAULT 0,
  `reward_gold` int NOT NULL DEFAULT 0,
  `reward_item_id` int NOT NULL DEFAULT 0,
  `reward_item_qty` int NOT NULL DEFAULT 0,
  `sort_order` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user_quest` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `quest_id` int NOT NULL,
  `status` tinyint NOT NULL DEFAULT 0,
  `progress` int NOT NULL DEFAULT 0,
  `accepted_at` int NOT NULL DEFAULT 0,
  `completed_at` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_user_quest_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `battle_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `monster_id` int NOT NULL DEFAULT 0,
  `enemy_user_id` int NOT NULL DEFAULT 0,
  `result` tinyint NOT NULL DEFAULT 0,
  `exp` int NOT NULL DEFAULT 0,
  `money` int NOT NULL DEFAULT 0,
  `created_at` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `bank_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `type` tinyint NOT NULL DEFAULT 0,
  `amount` int NOT NULL DEFAULT 0,
  `balance` int NOT NULL DEFAULT 0,
  `created_at` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `chat` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `target_id` int NOT NULL DEFAULT 0,
  `message` varchar(255) NOT NULL,
  `type` tinyint NOT NULL DEFAULT 0,
  `created_at` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ship` (
  `id` int NOT NULL,
  `name` varchar(64) NOT NULL,
  `price` int NOT NULL DEFAULT 0,
  `speed` int NOT NULL DEFAULT 1,
  `capacity` int NOT NULL DEFAULT 10,
  `description` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user_ship` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `ship_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_ship` (`user_id`, `ship_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `goods` (
  `id` int NOT NULL,
  `name` varchar(64) NOT NULL,
  `category` tinyint NOT NULL DEFAULT 0,
  `description` varchar(255) NOT NULL DEFAULT '',
  `unit` varchar(16) NOT NULL DEFAULT '件',
  `weight` int NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `market_price` (
  `id` int NOT NULL AUTO_INCREMENT,
  `city_id` int NOT NULL,
  `goods_id` int NOT NULL,
  `base_price` int NOT NULL DEFAULT 10,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_market_price` (`city_id`, `goods_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cargo` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `goods_id` int NOT NULL,
  `quantity` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cargo` (`user_id`, `goods_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `pet` (
  `id` int NOT NULL,
  `name` varchar(64) NOT NULL,
  `type` tinyint NOT NULL DEFAULT 0,
  `atk` int NOT NULL DEFAULT 1,
  `def_val` int NOT NULL DEFAULT 0,
  `hp` int NOT NULL DEFAULT 20,
  `skill_name` varchar(64) NOT NULL DEFAULT '',
  `skill_desc` varchar(255) NOT NULL DEFAULT '',
  `capture_rate` int NOT NULL DEFAULT 50,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user_pet` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `pet_id` int NOT NULL,
  `nickname` varchar(64) NOT NULL DEFAULT '',
  `level` int NOT NULL DEFAULT 1,
  `exp` int NOT NULL DEFAULT 0,
  `satiety` int NOT NULL DEFAULT 100,
  `is_active` tinyint NOT NULL DEFAULT 0,
  `created_at` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `friend` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `friend_id` int NOT NULL,
  `status` tinyint NOT NULL DEFAULT 0,
  `created_at` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `guild` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(64) NOT NULL,
  `leader_id` int NOT NULL DEFAULT 0,
  `level` int NOT NULL DEFAULT 1,
  `exp` int NOT NULL DEFAULT 0,
  `exp_max` int NOT NULL DEFAULT 1000,
  `notice` varchar(255) NOT NULL DEFAULT '',
  `member_max` int NOT NULL DEFAULT 20,
  `created_at` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_guild_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `guild_member` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guild_id` int NOT NULL,
  `user_id` int NOT NULL,
  `role` tinyint NOT NULL DEFAULT 0,
  `joined_at` int NOT NULL DEFAULT 0,
  `contribution` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_guild_member_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `admin_user` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(32) NOT NULL,
  `password` varchar(255) NOT NULL,
  `nickname` varchar(64) NOT NULL DEFAULT '',
  `role` varchar(32) NOT NULL DEFAULT 'admin',
  `is_active` tinyint NOT NULL DEFAULT 1,
  `last_login_at` datetime DEFAULT NULL,
  `last_login_ip` varchar(64) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_admin_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `admin_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int NOT NULL DEFAULT 0,
  `action` varchar(64) NOT NULL DEFAULT '',
  `target` varchar(64) DEFAULT NULL,
  `detail` text,
  `ip` varchar(64) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `operation_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int NOT NULL DEFAULT 0,
  `module` varchar(64) NOT NULL DEFAULT '',
  `action` varchar(64) NOT NULL DEFAULT '',
  `target_id` int NOT NULL DEFAULT 0,
  `detail` text,
  `ip` varchar(64) NOT NULL DEFAULT '',
  `created_at` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `data_changelog` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int NOT NULL DEFAULT 0,
  `table_name` varchar(64) NOT NULL DEFAULT '',
  `record_id` int NOT NULL DEFAULT 0,
  `action` varchar(64) NOT NULL DEFAULT '',
  `old_data` json DEFAULT NULL,
  `new_data` json DEFAULT NULL,
  `ip` varchar(64) DEFAULT NULL,
  `created_at` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `game_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category` varchar(64) NOT NULL DEFAULT '',
  `config_key` varchar(64) NOT NULL,
  `config_value` varchar(255) NOT NULL DEFAULT '',
  `description` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `enum_definition` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_name` varchar(64) NOT NULL,
  `key_value` varchar(64) NOT NULL,
  `label` varchar(64) NOT NULL,
  `description` varchar(255) NOT NULL DEFAULT '',
  `sort_order` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO `map` (`id`, `name`, `type`, `parent_id`, `description`) VALUES
(1, '地中海', 0, 0, '温暖而繁忙的海域'),
(101, '威尼斯', 1, 1, '水城威尼斯'),
(102, '雅典', 1, 1, '爱琴海明珠');

INSERT IGNORE INTO `place` (`id`, `name`, `city_id`, `map_id`, `type`, `description`, `n`, `s`, `e`, `w`) VALUES
(1011, '威尼斯码头', 101, 101, 1, '船只停泊的地方', 1012, 0, 0, 0),
(1012, '商业街', 101, 101, 2, '商人云集的街道', 1013, 1011, 1014, 1015),
(1013, '马可酒馆', 101, 101, 4, '冒险者休息的酒馆', 0, 1012, 0, 0),
(1014, '铁匠铺', 101, 101, 3, '可以强化装备', 0, 0, 0, 1012),
(1015, '城外小路', 101, 101, 5, '偶尔有野怪出没', 0, 0, 1012, 0),
(1021, '雅典码头', 102, 102, 1, '雅典港口', 0, 0, 0, 0);

INSERT IGNORE INTO `npc` (`id`, `name`, `place_id`, `type`, `dialog`) VALUES
(1, '马可', 1013, 1, '欢迎来到马可酒馆。'),
(2, '安芬尼奥', 1014, 2, '需要强化装备吗？'),
(3, '银行家', 1012, 3, '把铜币存起来更安全。'),
(4, '赌场老板', 1012, 4, '来试试手气吧。'),
(5, '东方商人', 1012, 5, '这里有不错的货物。');

INSERT IGNORE INTO `monster` (`id`, `name`, `place_id`, `level`, `hp`, `atk_min`, `atk_max`, `def`, `agility`, `exp`, `money`, `capture_rate`) VALUES
(1, '野狗', 1015, 1, 35, 2, 6, 0, 1, 20, 30, 0),
(2, '海盗喽啰', 0, 2, 55, 4, 10, 1, 2, 40, 80, 0);

INSERT IGNORE INTO `item` (`id`, `name`, `type`, `subtype`, `description`, `price_buy`, `price_sell`, `atk`, `def_val`, `hp`) VALUES
(1, '小回复药', 1, 'consumable', '恢复少量生命', 100, 50, 0, 0, 50),
(2, '铁剑', 2, 'weapon', '普通铁剑', 800, 400, 8, 0, 0),
(3, '皮甲', 2, 'armor', '普通皮甲', 600, 300, 0, 4, 20),
(19, '宠物口粮', 1, 'pet_food', '恢复宠物饱食度', 120, 60, 0, 0, 0),
(20, '高级宠物口粮', 1, 'pet_food', '恢复较多饱食度', 220, 110, 0, 0, 0),
(21, '豪华宠物口粮', 1, 'pet_food', '恢复全部饱食度', 360, 180, 0, 0, 0);

INSERT IGNORE INTO `npc_shop_item` (`npc_id`, `item_id`) VALUES
(5, 1), (5, 2), (5, 3), (5, 19), (5, 20), (5, 21);

INSERT IGNORE INTO `quest` (`id`, `name`, `description`, `type`, `target_id`, `require_value`, `npc_id`, `level_req`, `reward_exp`, `reward_money`, `reward_item_id`, `reward_item_qty`, `sort_order`) VALUES
(1, '清理野狗', '帮马可清理城外的野狗。', 0, 1, 3, 1, 1, 100, 200, 1, 2, 1);

INSERT IGNORE INTO `ship` (`id`, `name`, `price`, `speed`, `capacity`, `description`) VALUES
(1, '小帆船', 1000, 1, 20, '入门船只'),
(2, '轻快帆船', 5000, 2, 40, '速度更快，货舱更大'),
(3, '商用大船', 15000, 3, 80, '适合贸易');

INSERT IGNORE INTO `goods` (`id`, `name`, `category`, `description`, `unit`, `weight`) VALUES
(1, '葡萄酒', 1, '威尼斯特产', '桶', 2),
(2, '橄榄油', 1, '地中海常见商品', '罐', 1),
(4, '香料', 2, '利润较高', '袋', 1),
(7, '丝绸', 2, '东方货品', '匹', 2),
(9, '铁矿', 3, '沉重的矿石', '箱', 3),
(11, '珠宝', 4, '高价值货品', '盒', 1);

INSERT IGNORE INTO `market_price` (`city_id`, `goods_id`, `base_price`) VALUES
(101, 1, 90), (101, 2, 70), (101, 4, 160), (101, 7, 260), (101, 9, 120), (101, 11, 500),
(102, 1, 130), (102, 2, 55), (102, 4, 220), (102, 7, 210), (102, 9, 90), (102, 11, 650);

INSERT IGNORE INTO `pet` (`id`, `name`, `type`, `atk`, `def_val`, `hp`, `skill_name`, `skill_desc`, `capture_rate`) VALUES
(1, '狸花猫', 0, 3, 1, 20, '抓挠', '轻微提升输出', 70),
(2, '海鹰', 1, 5, 1, 24, '俯冲', '提升攻击', 45),
(3, '赤狐', 2, 7, 2, 28, '灵动', '更强的伙伴', 30),
(4, '棕熊', 3, 10, 4, 45, '猛击', '强力伙伴', 15);

INSERT IGNORE INTO `admin_user` (`id`, `username`, `password`, `nickname`, `role`, `is_active`) VALUES
(1, 'admin', '$2a$10$wgIhauABtz1Rc1OIvpuiL.PASrUhavQUfe9jUDQ5PmUzPsoKLcDze', '管理员', 'admin', 1);

INSERT IGNORE INTO `enum_definition` (`group_name`, `key_value`, `label`, `description`, `sort_order`) VALUES
('item_type', '1', '消耗品', '', 1),
('item_type', '2', '装备', '', 2),
('pet_type', '0', '普通', '', 1),
('pet_type', '1', '稀有', '', 2),
('pet_type', '2', '史诗', '', 3),
('pet_type', '3', '传说', '', 4);

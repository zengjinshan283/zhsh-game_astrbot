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

-- ============================================================
-- 扩容后的 map 表：6 海域 + 40 城市
-- ============================================================
INSERT IGNORE INTO `map` (`id`, `name`, `type`, `parent_id`, `description`) VALUES
-- 海域（type=0）
(1, '地中海', 0, 0, '温暖而繁忙的海域'),
(2, '北海', 0, 0, '寒冷而富饶的海域'),
(3, '非洲', 0, 0, '神秘而危险的海域'),
(4, '东亚', 0, 0, '古老而繁荣的海域'),
(5, '印度洋', 0, 0, '炎热而香料丰饶的海域'),
(6, '新大陆', 0, 0, '未知而充满机遇的海域'),
-- 地中海城市（parent_id=1）
(101, '威尼斯', 1, 1, '水城威尼斯'),
(102, '里斯本', 1, 1, '葡萄牙港口城市'),
(103, '亚历山大', 1, 1, '埃及港口城市'),
(104, '拉古扎', 1, 1, '亚得里亚海港口'),
(105, '雅典', 1, 1, '爱琴海明珠'),
(106, '伊斯坦堡', 1, 1, '东西方交汇之城'),
(107, '伊斯坦布尔', 1, 1, '土耳其古城'),
(108, '突尼斯', 1, 1, '北非港口'),
(109, '阿尔及尔', 1, 1, '地中海南岸'),
(110, '马塞', 1, 1, '法兰西港口'),
-- 北海城市（parent_id=2）
(201, '南特', 1, 2, '法兰西西部港城'),
(202, '伦敦', 1, 2, '日不落帝国中心'),
(203, '爱丁堡', 1, 2, '苏格兰古都'),
(204, '阿姆斯特丹', 1, 2, '低地国之都'),
(205, '汉堡', 1, 2, '北欧商业中心'),
(206, '奥斯陆', 1, 2, '挪威首都'),
(207, '哥本哈根', 1, 2, '北欧丹麦首都'),
-- 非洲城市（parent_id=3）
(301, '达喀尔', 1, 3, '西非港口'),
(302, '圣乔治', 1, 3, '佛得角港口'),
(303, '卢旺达', 1, 3, '中非内陆国'),
(304, '开普敦', 1, 3, '南非好望角'),
(305, '亚特兰蒂斯', 1, 3, '传说中的海底城市'),
(306, '莫桑比克', 1, 3, '东非港口'),
(307, '马达加斯加', 1, 3, '印度洋最大岛屿'),
(308, '蒙巴萨', 1, 3, '肯尼亚港口'),
-- 东亚城市（parent_id=4）
(401, '马六甲', 1, 4, '海峡要塞'),
(402, '广州', 1, 4, '华南第一大港'),
(403, '泉州', 1, 4, '海上丝路起点'),
(404, '杭州', 1, 4, '人间天堂'),
(405, '扬州', 1, 4, '运河明珠'),
(406, '长安', 1, 4, '大唐帝国首都'),
(407, '大阪', 1, 4, '日本商业重镇'),
(408, '京都', 1, 4, '日本古都'),
-- 印度洋城市（parent_id=5）
(501, '亚丁', 1, 5, '红海门户'),
(502, '荷姆兹', 1, 5, '波斯湾要冲'),
(503, '锡兰', 1, 5, '印度洋明珠'),
(504, '孟买', 1, 5, '印度西海岸大港'),
-- 新大陆城市（parent_id=6）
(601, '新大陆港', 1, 6, '新大陆东方港口');

INSERT IGNORE INTO `place` (`id`, `name`, `city_id`, `map_id`, `type`, `description`, `n`, `s`, `e`, `w`) VALUES
-- ============================================================
-- 威尼斯地点（city_id=101，37条，从 PHP city_map 迁移）
-- ============================================================
(1011, '酒馆',     101, 101, 4, '空气里弥漫着呛人的烟味和刺鼻的酒味…',   1016, 1020, 1034, 1013),
(1012, '北城门',   101, 101, 0, '城市的北门',                             1037, 1018, 1025, 1026),
(1013, '赌场',     101, 101, 0, '这里MM的笑容迷人，兔女郎装扮很讨巧…',   1019, 1024, 1011, 0),
(1014, '东城门',   101, 101, 0, '城市的东门',                             1042, 1043, 1043, 1015),
(1015, '花园',     101, 101, 0, '城市的花园',                             0,    0,    1014, 1029),
(1016, '福利院',   101, 101, 0, '领福利只能解决温饱，不能发家致富…',       1018, 1011, 1032, 1019),
(1017, '教堂',     101, 101, 3, '神圣的地方，衣冠不整恕不接待……',         1022, 1023, 1038, 0),
(1018, '居民区',   101, 101, 0, '每天这里都有人需要帮助…',                1012, 1016, 0,    1030),
(1019, '警察局',   101, 101, 0, '看起来警察们都在忙着审讯犯人…..',         1030, 1013, 1016, 0),
(1020, '广场',     101, 101, 2, '这里人越来越多了',                        1011, 1022, 1029, 1024),
(1021, '研究院',   101, 101, 0, '空气里弥漫着化学药剂的味道…',              0,    0,    0,    1032),
(1022, '★码头',   101, 101, 1, '这里人声鼎沸，热闹非凡！',                 1020, 1017, 1033, 1028),
(1023, '南城门',   101, 101, 0, '城市的南门',                              1017, 1046, 0,    1045),
(1024, '银行',     101, 101, 3, '银行没利息，但能够保证你的资金安全。',     1013, 1028, 1020, 1031),
(1025, '农场',     101, 101, 0, '这里最近有些不安宁….',                    0,    0,    0,    0),
(1026, '爱情桥',   101, 101, 0, '相生相恋，永不分离。',                    0,    1030, 1012, 0),
(1027, '西城门',   101, 101, 0, '城市的西门',                              1041, 1040, 1031, 1039),
(1028, '市场',     101, 101, 0, '价格公道，童叟无欺!',                     1024, 0,    1022, 0),
(1029, '商店',     101, 101, 5, '这里销售药品和特色美食。',                 1034, 1033, 1015, 1020),
(1030, '商业街',   101, 101, 0, '这里十分繁华，人来人往。',                 1026, 1019, 1018, 0),
(1031, '铁匠铺',   101, 101, 3, '叮叮哐哐叮叮哐哐…..',                     0,    0,    1024, 1027),
(1032, '王宫',     101, 101, 0, '金碧辉煌，戒备森严。',                    0,    1034, 1021, 1016),
(1033, '占星屋',   101, 101, 0, '神奇的小屋一间！',                        1029, 1038, 0,    1022),
(1034, '珠宝店',   101, 101, 0, '钻石钻石亮晶晶，就像天上一颗星星…..',     1032, 1029, 0,    1011),
(1035, '住宅区',   101, 101, 0, '当地居民的居住地',                        0,    0,    0,    0),
(1036, '酒馆',     102, 102, 4, '空气里弥漫着呛人的烟味和刺鼻的酒味…',       0,    0,    0,    0),
(1037, '矿山',     101, 101, 0, '这座矿山废弃好久了….',                    0,    0,    0,    0),
(1038, '实验室',   101, 101, 0, '像蜜蜂一样勤劳的科学家…',                 1033, 0,    0,    1017),
(1039, '湿地',     101, 101, 0, '',                                       0,    0,    0,    0),
(1040, '荒野',     101, 101, 0, '',                                       0,    0,    0,    0),
(1041, '森林',     101, 101, 0, '',                                       0,    0,    0,    0),
(1042, '暗礁',     101, 101, 0, '',                                       0,    0,    0,    0),
(1043, '海滩',     101, 101, 0, '',                                       0,    0,    0,    0),
(1044, '浅海',     101, 101, 0, '',                                       0,    0,    0,    0),
(1045, '草原',     101, 101, 0, '',                                       0,    0,    0,    0),
(1046, '牧场',     101, 101, 0, '',                                       0,    0,    0,    0),
-- ============================================================
-- 其他城市码头（每城一个码头，type=1，供航海系统使用）
-- 规划：城市 ID × 10 + 1 = 码头 place_id
-- ============================================================
(1021, '里斯本码头',    102, 102, 1, '葡萄牙港口，繁忙而热闹。',             0, 0, 0, 0),
(1031, '亚历山大码头',  103, 103, 1, '埃及港口，沙漠商队的集散地。',          0, 0, 0, 0),
(1041, '拉古扎码头',    104, 104, 1, '亚得里亚海重要港口。',                   0, 0, 0, 0),
(1051, '雅典码头',      105, 105, 1, '爱琴海畔的古老港口。',                  0, 0, 0, 0),
(1061, '伊斯坦堡码头',  106, 106, 1, '东西方交汇的海上枢纽。',                0, 0, 0, 0),
(1071, '突尼斯码头',    108, 108, 1, '北非海岸的重要港口。',                  0, 0, 0, 0),
(1081, '阿尔及尔码头',  109, 109, 1, '地中海南岸的重要港口。',                0, 0, 0, 0),
(1091, '马塞码头',      110, 110, 1, '法兰西的重要港口。',                   0, 0, 0, 0),
(2021, '南特码头',      201, 201, 1, '法兰西西部大西洋沿岸的重要港口。',       0, 0, 0, 0),
(2022, '伦敦码头',      202, 202, 1, '泰晤士河口的繁华港口。',               0, 0, 0, 0),
(2023, '爱丁堡码头',    203, 203, 1, '苏格兰北海沿岸的港口。',               0, 0, 0, 0),
(2024, '阿姆斯特丹码头', 204, 204, 1, '低地国的重要港口。',                   0, 0, 0, 0),
(2025, '汉堡码头',      205, 205, 1, '北欧重要的商业港口。',                  0, 0, 0, 0),
(2026, '奥斯陆码头',    206, 206, 1, '挪威峡湾深处的港口。',                 0, 0, 0, 0),
(2027, '哥本哈根码头',  207, 207, 1, '北欧丹麦的海上门户。',                0, 0, 0, 0),
(3041, '达喀尔码头',    301, 301, 1, '西非最西端的港口城市。',               0, 0, 0, 0),
(3042, '开普敦码头',    304, 304, 1, '南非好望角的重要港口。',                0, 0, 0, 0),
(3043, '亚历山大港码头', 103, 103, 1, '埃及亚历山大港。',                    0, 0, 0, 0),
(4021, '马六甲码头',    401, 401, 1, '海峡要塞，华人聚集地。',               0, 0, 0, 0),
(4022, '广州码头',      402, 402, 1, '华南最大港口，海上丝路起点。',         0, 0, 0, 0),
(4023, '泉州码头',      403, 403, 1, '东方第一大港。',                      0, 0, 0, 0),
(4024, '长安码头',      406, 406, 1, '大唐帝国的首都港口。',                 0, 0, 0, 0),
(4025, '扬州码头',      405, 405, 1, '运河明珠，繁华富庶。',                0, 0, 0, 0),
(5021, '亚丁码头',      501, 501, 1, '红海门户，香料贸易中心。',             0, 0, 0, 0),
(5022, '荷姆兹码头',    502, 502, 1, '波斯湾要冲，战略地位重要。',           0, 0, 0, 0),
(5023, '锡兰码头',      503, 503, 1, '印度洋明珠，宝石与香料之国。',         0, 0, 0, 0),
(5024, '孟买码头',      504, 504, 1, '印度西海岸大港。',                     0, 0, 0, 0),
-- ============================================================
-- 特殊地点：副本入口（type=6）
-- ============================================================
|(9001, '牛头山入口',   502, 502, 6, '印度洋-荷姆兹北门直北，30级后花10银进入。', 0, 0, 0, 0),
|(9002, '四象圣殿入口',  406, 406, 6, '长安广场，奠基四象老人进入，100级才可进入。', 0, 0, 0, 0),
|(9101, '蓬莱仙岛',     101, 101, 6, '传说中东方的海上仙岛，需要蓬莱仙岛航线图方可进入。', 0, 0, 0, 0),
|(9102, '镇妖塔',       406, 406, 6, '长安附近的妖邪之地，需要机关印记方可进入。', 0, 0, 0, 0),
|(9103, '酆都鬼城',     401, 401, 6, '神秘诡异的亡者之城，需要路引方可进入。', 0, 0, 0, 0),
|(9104, '失落之城',     501, 501, 6, '印度洋深处的古代遗迹，需要失落之城地图方可进入。', 0, 0, 0, 0);

INSERT IGNORE INTO `npc` (`id`, `name`, `place_id`, `type`) VALUES
(1, '马可', 1013, 1),
(2, '安芬尼奥', 1014, 2),
(3, '银行家', 1012, 3),
(4, '赌场老板', 1012, 4),
(5, '东方商人', 1012, 5);

-- ============================================================
-- NPC 对话表（npc_dialog）
-- ============================================================
INSERT IGNORE INTO `npc_dialog` (`npc_id`, `trigger_type`, `content`, `sort_order`) VALUES
-- 马可酒馆（酒馆老板）
(1, 'idle', '欢迎来到马可酒馆，这里有美酒和情报。', 0),
(1, 'trade', '要喝点什么？', 1),
-- 安芬尼奥（铁匠）
(2, 'idle', '需要强化装备吗？精炼玄铁是你的好帮手。', 0),
(2, 'trade', '来看看今日的铁匠菜单。', 1),
-- 银行家
(3, 'idle', '把铜币存进银行，安全又放心。', 0),
(3, 'deposit', '存多少钱？', 1),
(3, 'withdraw', '要取多少钱？', 2),
-- 赌场老板
(4, 'idle', '来试试手气吧，运气好的话铜币翻倍！', 0),
(4, 'gamble', '下注吧，输赢各凭天命。', 1),
-- 东方商人
(5, 'idle', '这些货物都是从东方运来的精品。', 0),
(5, 'trade', '挑选你喜欢的货物吧。', 1);

INSERT IGNORE INTO `monster` (`id`, `name`, `place_id`, `level`, `hp`, `atk_min`, `atk_max`, `def`, `agility`, `exp`, `money`, `capture_rate`) VALUES
-- ============================================================
-- 怪物数据扩充（按场景/等级分布）
-- ============================================================
-- === 威尼斯野外（place_id=1015 附近）===
(1,  '野狗',        1015,  1,  35,  2,  6,  0,  1,  20,  30,  0),
(3,  '山贼喽啰',    1015,  3,  60,  5, 12,  1,  2,  50,  80,  0),
(4,  '流浪汉',      1015,  2,  45,  4,  9,  0,  3,  35,  55,  0),
-- === 海盗（航海遭遇，place_id=0 表示野外）===
(2,  '海盗喽啰',       0,  2,  55,  4, 10,  1,  2,  40,  80,  0),
(5,  '海盗头目',        0,  8, 200, 15, 30,  5,  5, 200, 400,  0),
(6,  '海上劫匪',        0,  5, 120,  8, 18,  3,  4, 100, 200,  0),
-- === 牛头山副本（place_id=9001）===
(10, '劣甲土匪',     9001, 30, 300, 20, 40, 10,  8, 150, 200,  5),
(11, '皮甲土匪',     9001, 30, 320, 22, 42, 12, 10, 150, 220,  8),
(12, '布甲土匪',     9001, 30, 280, 18, 38,  8,  9, 140, 180,  5),
(13, '重甲土匪',     9001, 30, 400, 25, 45, 18,  6, 160, 250,  3),
(14, '轻甲土匪',     9001, 30, 260, 16, 35,  6, 12, 130, 170,  5),
(15, '邪恶雪人',     9001, 32, 450, 30, 50, 15,  7, 180, 300,  2),
(16, '皮甲匪兵',     9001, 35, 400, 28, 48, 14, 12, 200, 280, 10),
(17, '布甲匪兵',     9001, 35, 380, 26, 46, 12, 11, 190, 260,  8),
(18, '劣甲匪兵',     9001, 35, 420, 30, 52, 16,  9, 210, 300,  5),
(19, '轻甲匪兵',     9001, 35, 350, 24, 42, 10, 14, 180, 240,  8),
(20, '精英匪霸',     9001, 38, 600, 40, 70, 25, 10, 300, 500,  2),
(21, '匪霸',         9001, 36, 500, 35, 60, 20, 12, 250, 400,  3),
(22, '卡斯克侍卫',   9001, 45, 800, 50, 90, 35, 15, 500, 800,  1),
(23, '虚弱银龙',     9001, 50,1200, 70,120, 45, 20, 800,1200,  1),
(24, '玄天海棠',     9001, 48,1000, 60,100, 40, 18, 700,1000,  1),
-- === 四象圣殿副本（place_id=9002）各宫通用===
-- 白虎宫（雪虎系）
(30, '雪虎残魂',    9002,100,2000,100,180, 60, 30,1000,1500,  0),
(31, '雪虎骨妖',    9002,100,2200,110,190, 70, 28,1100,1600,  0),
-- 玄武宫（玄武系）
(32, '玄武残魂',    9002,100,2000,100,180, 60, 30,1000,1500,  0),
(33, '玄武骨妖',    9002,100,2200,110,190, 70, 28,1100,1600,  0),
-- 青龙宫（青龙系）
(34, '青龙残魂',    9002,100,2000,100,180, 60, 30,1000,1500,  0),
(35, '青龙骨妖',    9002,100,2200,110,190, 70, 28,1100,1600,  0),
-- 朱雀宫（朱雀系）
(36, '朱雀残魂',    9002,100,2000,100,180, 60, 30,1000,1500,  0),
(37, '朱雀骨妖',    9002,100,2200,110,190, 70, 28,1100,1600,  0),
-- === 各城野外（城外）===
-- 东亚野外
(40, '华南虎',        0, 20, 250, 15, 30,  8, 10, 120, 180,  0),
(41, '巨蟒',          0, 25, 300, 20, 38,  6,  8, 150, 220,  0),
(42, '山魈',          0, 30, 400, 25, 45, 12, 12, 200, 300,  0),
-- 非洲野外
(50, '森林巨兽',      0, 40, 600, 35, 60, 20, 15, 350, 500,  0),
(51, '草原狮',        0, 35, 500, 30, 55, 18, 20, 300, 450,  0),
(52, '鳄鱼',          0, 38, 550, 32, 58, 22, 10, 320, 480,  0),
-- 印度洋野外
(60, '深海巨怪',      0, 50, 800, 45, 80, 30, 12, 500, 750,  0),
(61, '海妖',          0, 55, 900, 50, 90, 35, 18, 600, 900,  0);

-- ============================================================
-- 怪物掉落表（monster_drop）
-- ============================================================
CREATE TABLE IF NOT EXISTS `monster_drop` (
  `id` int NOT NULL AUTO_INCREMENT,
  `monster_id` int NOT NULL,
  `item_id` int NOT NULL,
  `quantity_min` int NOT NULL DEFAULT 1,
  `quantity_max` int NOT NULL DEFAULT 1,
  `drop_rate` int NOT NULL DEFAULT 1000,
  PRIMARY KEY (`id`),
  KEY `idx_drop_monster` (`monster_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO `monster_drop` (`monster_id`, `item_id`, `quantity_min`, `quantity_max`, `drop_rate`) VALUES
-- 牛头山掉落
(10, 50, 1, 2, 300), (10, 33, 1, 1,  50),
(11, 19, 1, 1, 400), (11, 33, 1, 1,  80),
(12, 57, 1, 1, 200), (12, 33, 1, 1,  50),
(13, 50, 1, 2, 300), (13, 33, 1, 1, 100),
(14, 50, 1, 2, 300), (14, 33, 1, 1,  60),
(15, 79, 1, 2, 500),
(16, 19, 1, 2, 400), (16, 33, 1, 1, 100),
(17, 74, 1, 1, 300), (17, 33, 1, 1,  80),
(18, 19, 1, 1, 300), (18, 33, 1, 1,  50),
(19, 51, 1, 2, 300), (19, 33, 1, 1, 100),
(20, 52, 1, 1, 200),
(21, 53, 1, 1, 300), (21, 33, 1, 1, 150),
(22, 54, 1, 1, 200),
(23, 55, 1, 1, 200),
(24, 56, 1, 1, 200),
-- 四象圣殿掉落（白虎宫）
(30, 62, 1, 1, 400), (30, 61, 1, 1, 100),
(31, 63, 1, 1, 400), (31, 64, 1, 1, 400), (31, 61, 1, 1, 150),
-- 玄武宫
(32, 65, 1, 1, 400), (32, 61, 1, 1, 100),
(33, 66, 1, 1, 400), (33, 67, 1, 1, 400), (33, 61, 1, 1, 150),
-- 青龙宫
(34, 68, 1, 1, 400), (34, 61, 1, 1, 100),
(35, 69, 1, 1, 400), (35, 70, 1, 1, 400), (35, 61, 1, 1, 150),
-- 朱雀宫
(36, 71, 1, 1, 400), (36, 61, 1, 1, 100),
(37, 72, 1, 1, 400), (37, 73, 1, 1, 400), (37, 61, 1, 1, 150);

-- ============================================================
-- 副本表（dungeon）- 牛头山 + 四象圣殿
-- ============================================================
CREATE TABLE IF NOT EXISTS `dungeon` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(64) NOT NULL,
  `place_id` int NOT NULL DEFAULT 0,
  `floor` int NOT NULL DEFAULT 1,
  `level_req` int NOT NULL DEFAULT 1,
  `entry_fee` int NOT NULL DEFAULT 0,
  `monster_id` int NOT NULL DEFAULT 0,
  `description` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO `dungeon` (`name`, `place_id`, `floor`, `level_req`, `entry_fee`, `monster_id`, `description`) VALUES
-- 牛头山 12 层
('牛头山', 9001,  1, 30,  10, 10, '虚弱的劣甲土匪'),
('牛头山', 9001,  2, 30,  10, 16, '虚弱的皮甲匪兵'),
('牛头山', 9001,  3, 35,  10, 18, '虚弱的劣甲匪兵'),
('牛头山', 9001,  4, 40,  10, 22, '卡斯克侍卫'),
('牛头山', 9001,  5, 45,  10, 23, '虚弱的银龙'),
('牛头山', 9001,  6, 45,  10, 24, '玄天海棠'),
('牛头山', 9001,  7, 50,  10, 10, '土匪群'),
('牛头山', 9001,  8, 50,  10, 15, '邪恶雪人'),
('牛头山', 9001,  9, 55,  10, 19, '轻甲匪兵群'),
('牛头山', 9001, 10, 55,  10, 20, '精英匪霸'),
('牛头山', 9001, 11, 58,  10, 21, '匪霸群'),
('牛头山', 9001, 12, 60,  10, 22, '终极守卫'),
-- 四象圣殿（100级）
('四象圣殿-白虎宫', 9002,  1, 100, 0, 30, '雪虎残魂'),
('四象圣殿-白虎宫', 9002,  2, 100, 0, 31, '雪虎骨妖'),
('四象圣殿-白虎宫', 9002,  3, 100, 0, 30, '雪虎残魂'),
('四象圣殿-白虎宫', 9002,  4, 100, 0, 31, '雪虎骨妖（精英）'),
('四象圣殿-玄武宫', 9002,  1, 100, 0, 32, '玄武残魂'),
('四象圣殿-玄武宫', 9002,  2, 100, 0, 33, '玄武骨妖'),
('四象圣殿-玄武宫', 9002,  3, 100, 0, 32, '玄武残魂'),
('四象圣殿-玄武宫', 9002,  4, 100, 0, 33, '玄武骨妖（精英）'),
('四象圣殿-青龙宫', 9002,  1, 100, 0, 34, '青龙残魂'),
('四象圣殿-青龙宫', 9002,  2, 100, 0, 35, '青龙骨妖'),
('四象圣殿-青龙宫', 9002,  3, 100, 0, 34, '青龙残魂'),
('四象圣殿-青龙宫', 9002,  4, 100, 0, 35, '青龙骨妖（精英）'),
('四象圣殿-朱雀宫', 9002,  1, 100, 0, 36, '朱雀残魂'),
('四象圣殿-朱雀宫', 9002,  2, 100, 0, 37, '朱雀骨妖'),
('四象圣殿-朱雀宫', 9002,  3, 100, 0, 36, '朱雀残魂'),
('四象圣殿-朱雀宫', 9002,  4, 100, 0, 37, '朱雀骨妖（精英）');

-- ============================================================
-- 师徒系统：user 表增加 mentor_id 相关字段（MySQL 8 手动执行）
-- ALTER TABLE user ADD COLUMN mentor_id int NOT NULL DEFAULT 0 AFTER shortcut_slot_3;
-- ALTER TABLE user ADD COLUMN mentor_contribution int NOT NULL DEFAULT 0 AFTER mentor_id;
-- ALTER TABLE user ADD COLUMN apprentice_count int NOT NULL DEFAULT 0 AFTER mentor_contribution;
-- ALTER TABLE user ADD COLUMN is_mentor tinyint NOT NULL DEFAULT 0 AFTER apprentice_count;

-- ============================================================

-- ============================================================
-- 游戏配置表（game_config）- 强化系统
-- ============================================================
INSERT IGNORE INTO `game_config` (`category`, `config_key`, `config_value`, `description`) VALUES
-- 强化配置
('enhance', 'success_rate_0',  '90', '强化+0→+1 成功率%'),
('enhance', 'success_rate_1',  '90', '强化+1→+2 成功率%'),
('enhance', 'success_rate_2',  '90', '强化+2→+3 成功率%'),
('enhance', 'success_rate_3',  '90', '强化+3→+4 成功率%'),
('enhance', 'success_rate_4',  '90', '强化+4→+5 成功率%'),
('enhance', 'success_rate_5',  '90', '强化+5→+6 成功率%'),
('enhance', 'success_rate_6',  '70', '强化+6→+7 成功率%'),
('enhance', 'success_rate_7',  '70', '强化+7→+8 成功率%'),
('enhance', 'success_rate_8',  '50', '强化+8→+9 成功率%'),
('enhance', 'success_rate_9',  '30', '强化+9→+10 成功率%'),
('enhance', 'cost_base',       '200', '强化基础铜币费用系数（等级×此值）'),
('enhance', 'fail_return_rate','50', '强化失败返还材料比例%'),
('enhance', 'degrade_level',   '7',  '强化失败降级的起始等级（≥此等级失败降1级）'),
-- 副本配置
('dungeon', 'niutou_cost',     '10', '牛头山入场费（银币，填10表示10铜币）'),
('dungeon', 'niutou_level',    '30', '牛头山等级要求'),
('dungeon', 'sixiang_level',  '100', '四象圣殿等级要求'),
-- 师徒配置
('mentor',  'apprentice_max_level',  '30', '徒弟出师等级'),
('mentor',  'apprentice_reward',  '1000', '徒弟出师给师父铜币奖励'),
('mentor',  'mentor_contribution', '10',   '徒弟出师给师父贡献度');

-- ============================================================
-- 物品数据扩充
-- type: 1=消耗品 2=装备(subtype:weapon=武器,armor=防具)
-- subtype 还可以是 material(材料)、quest(任务道具)
-- ============================================================
INSERT IGNORE INTO `item` (`id`, `name`, `type`, `subtype`, `description`, `price_buy`, `price_sell`, `atk`, `def_val`, `hp`) VALUES
-- === 消耗品 ===
(1,   '小回复药',       1, 'consumable', '恢复50点生命',          100,  50,  0, 0, 50),
(3,   '中回复药',       1, 'consumable', '恢复150点生命',         280, 140,  0, 0, 150),
(4,   '大回复药',       1, 'consumable', '恢复500点生命',         680, 340,  0, 0, 500),
(5,   '解毒剂',         1, 'consumable', '解除中毒状态',           80,  40,  0, 0, 0),
(6,   '凤凰羽毛',       1, 'consumable', '复活并恢复30%生命',    2000, 1000, 0, 0, 0),
(7,   '小魔回复药',     1, 'consumable', '恢复30点魔法值',        80,  40,  0, 0, 0),
(8,   '中魔回复药',     1, 'consumable', '恢复80点魔法值',        200, 100,  0, 0, 0),
(19,  '宠物口粮',       1, 'pet_food',   '恢复宠物30点饱食度',      120,  60,  0, 0, 0),
(20,  '高级宠物口粮',   1, 'pet_food',   '恢复宠物70点饱食度',      220, 110,  0, 0, 0),
(21,  '豪华宠物口粮',   1, 'pet_food',   '恢复宠物全部饱食度',      360, 180,  0, 0, 0),
-- === 武器 ===
(2,   '铁剑',           2, 'weapon', '普通铁剑',                  800, 400,  8, 0, 0),
(22,  '长剑',           2, 'weapon', '比铁剑更锋利',             1500, 750, 15, 0, 0),
(23,  '弯刀',           2, 'weapon', '海盗常用弯刀',              1800, 900, 18, 0, 0),
(24,  '钢剑',           2, 'weapon', '精钢打造',                  3000,1500, 25, 0, 0),
(25,  '火枪',           2, 'weapon', '远程武器，伤害浮动大',      5000,2500, 40, 0, 0),
(26,  '匕首',           2, 'weapon', '轻便迅捷',                  1200, 600, 10, 0, 0),
(27,  '弯弓',           2, 'weapon', '传统远程武器',              1600, 800, 14, 0, 0),
(28,  '长剑',           2, 'weapon', '长剑',                      2200,1100, 22, 0, 0),
(29,  '战斧',           2, 'weapon', '重兵器，伤害高',             3500,1750, 32, 0, 0),
(30,  '长枪',           2, 'weapon', '攻击距离远',                2800,1400, 20, 0, 0),
-- === 防具 ===
(303, '皮甲',           2, 'armor', '普通皮甲',                  600, 300,  0, 4, 20),
(31,  '皮衣',           2, 'armor', '比皮甲更坚韧',              1200, 600,  0, 8, 35),
(32,  '锁甲',           2, 'armor', '金属锁链编织',              2500,1250,  0,15, 50),
(33,  '板甲',           2, 'armor', '重型防护',                  4500,2250,  0,25, 80),
(34,  '披风',           2, 'armor', '轻便装饰+少量防御',          800, 400,  0, 3, 10),
(35,  '锁子甲',         2, 'armor', '柔韧且防护不错',            3200,1600,  0,20, 60),
(36,  '皮靴',           2, 'armor', '提升移动速度',               500, 250,  0, 2, 5),
(37,  '铁靴',           2, 'armor', '更坚固的鞋',                1100, 550,  0, 5, 10),
-- === 盾牌 ===
(38,  '木盾',           2, 'shield', '基础盾牌',                  400, 200,  2, 5, 0),
(39,  '铁盾',           2, 'shield', '金属盾牌',                 1200, 600,  4,12, 0),
(40,  '骑士盾',         2, 'shield', '骑士专属',                 3000,1500,  6,20, 0),
-- === 材料（任务/强化用）===
(50,  '玄铁石',         3, 'material', '强化材料，提升强化成功率',  200, 100, 0, 0, 0),
(51,  '翡翠石',         3, 'material', '宝石材料',                 300, 150, 0, 0, 0),
(52,  '天然玉',         3, 'material', '珍稀宝石',                800, 400, 0, 0, 0),
(53,  '琥珀',           3, 'material', '金色宝石',                500, 250, 0, 0, 0),
(54,  '虚无宝石',       3, 'material', '神秘宝石',               1000, 500, 0, 0, 0),
(55,  '银龙鳞片',       3, 'material', '银龙身上剥落的鳞片',     600, 300, 0, 0, 0),
(56,  '九天玄叶',       3, 'material', '玄天海棠所产',          1200, 600, 0, 0, 0),
(57,  '龙珠碎片',       3, 'material', '龙珠的碎片',            1500, 750, 0, 0, 0),
(58,  '玄铁',           3, 'material', '珍贵矿石',               400, 200, 0, 0, 0),
(59,  '精魂',           3, 'material', '四象之精粹',             300, 150, 0, 0, 0),
(60,  '内丹',           3, 'material', '四象之内丹',             300, 150, 0, 0, 0),
(61,  '四象之血',       3, 'material', '蕴含四象之力',           2000,1000, 0, 0, 0),
(62,  '雪虎精魄',       3, 'material', '白虎宫材料',             500, 250, 0, 0, 0),
(63,  '雪虎利爪',       3, 'material', '白虎宫材料',             500, 250, 0, 0, 0),
(64,  '雪虎尖牙',       3, 'material', '白虎宫材料',             500, 250, 0, 0, 0),
(65,  '玄武精魄',       3, 'material', '玄武宫材料',             500, 250, 0, 0, 0),
(66,  '玄武利爪',       3, 'material', '玄武宫材料',             500, 250, 0, 0, 0),
(67,  '玄武尖牙',       3, 'material', '玄武宫材料',             500, 250, 0, 0, 0),
(68,  '青龙精魄',       3, 'material', '青龙宫材料',             500, 250, 0, 0, 0),
(69,  '青龙利爪',       3, 'material', '青龙宫材料',             500, 250, 0, 0, 0),
(70,  '青龙尖牙',       3, 'material', '青龙宫材料',             500, 250, 0, 0, 0),
(71,  '朱雀精魄',       3, 'material', '朱雀宫材料',             500, 250, 0, 0, 0),
(72,  '朱雀利爪',       3, 'material', '朱雀宫材料',             500, 250, 0, 0, 0),
(73,  '朱雀尖牙',       3, 'material', '朱雀宫材料',             500, 250, 0, 0, 0),
(74,  '聚凝石',         3, 'material', '用于装备强化',            350, 175, 0, 0, 0),
(75,  '银矿石',         3, 'material', '可提炼银',               150,  75, 0, 0, 0),
(76,  '木材',           3, 'material', '基础材料',                80,  40, 0, 0, 0),
(77,  '布料',           3, 'material', '用于制作装备',            100,  50, 0, 0, 0),
(78,  '香料',           3, 'material', '贸易商品/任务道具',        200, 100, 0, 0, 0),
(79,  '雪块',           3, 'material', '牛头山材料',              50,  25, 0, 0, 0),
-- === 任务道具 ===
(90,  '神秘地图碎片',   4, 'quest',   '拼凑出完整地图',           0,   0, 0, 0, 0),
(91,  '古堡钥匙',       4, 'quest',   '打开古堡大门的钥匙',       0,   0, 0, 0, 0),
(92,  '航海日志',       4, 'quest',   '记录着航线秘密',           0,   0, 0, 0, 0),
-- === 稀有任务道具 ===
(93,  '龙珠',           4, 'quest',   '蕴含神秘力量的珠子',     0,   0, 0, 0, 0),
(94,  '龙泉水',         3, 'material', '强化装备的神奇泉水',     500, 250, 0, 0, 0),
(95,  '小龙珠',         4, 'quest',   '次级龙珠，有一定能量',    0,   0, 0, 0, 0),
(96,  '体力宝',         1, 'consumable', '自动恢复50点体力',    1000, 500, 0, 0, 0),
(97,  '大体力宝',       1, 'consumable', '自动恢复200点体力',   3000,1500, 0, 0, 0),
(98,  '机关印记',       4, 'quest',   '进入镇妖塔的钥匙',       0,   0, 0, 0, 0),
(99,  '路引',           4, 'quest',   '进入酆都鬼城的钥匙',      0,   0, 0, 0, 0),
(100, '蓬莱仙岛航线图', 4, 'quest',   '进入蓬莱仙岛的凭证',     0,   0, 0, 0, 0),
(101, '失落之城地图',   4, 'quest',   '进入失落之城的凭证',     0,   0, 0, 0, 0),
-- === 地魔套装（BOSS掉落）===
(102, '地魔指环（左）', 2, 'armor', '妖气长安BOSS可掉落',     0,   0, 0, 15, 50),
(103, '地魔指环（右）', 2, 'armor', '妖气长安BOSS可掉落',     0,   0, 0, 15, 50),
(104, '地魔龙脊护肩',   2, 'armor', '强力防具，防御极高',      0,   0, 0, 45,120),
(105, '地魔回魂之恋',   2, 'armor', '强力防具',                 0,   0, 0, 40,100),
(106, '地魔龙角羽冠',   2, 'armor', '强力防具，攻击提升',       0,   0, 0, 38, 80),
(107, '地魔龙爪之靴',   2, 'armor', '大幅提升敏捷',            0,   0, 0, 30, 60),
(108, '地魔龙鳞绑腿',   2, 'armor', '高防御护腿',              0,   0, 0, 35, 90),
-- === 天魔设计图（制作图纸）===
(109, '天魔玄夜战铠设计图', 4, 'quest', '天魔传奇制作图纸',    0,   0, 0, 0, 0),
(110, '天魔碧玉束腰设计图', 4, 'quest', '天工神剪制作图纸',    0,   0, 0, 0, 0),
(111, '天魔荆棘皇冠设计图', 4, 'quest', '天工神剪制作图纸',    0,   0, 0, 0, 0),
(112, '天魔风沙之靴设计图', 4, 'quest', '天工神剪制作图纸',    0,   0, 0, 0, 0),
(113, '魑魅魍魉',        4, 'quest', '釜底抽薪任务道具',       0,   0, 0, 0, 0);

INSERT IGNORE INTO `npc_shop_item` (`npc_id`, `item_id`) VALUES
-- 威尼斯·东方商人（酒馆NPC 5）
(5, 1), (5, 2), (5, 3), (5, 19), (5, 20), (5, 21),
-- 威尼斯·安芬尼奥（铁匠NPC 2）：强化材料
(2, 50), (2, 74), (2, 51), (2, 52), (2, 53), (2, 54), (2, 94),
-- 威尼斯·银行家（NPC 3）
(3, 1), (3, 3), (3, 4);

-- ============================================================
-- 任务数据扩充（category:0=主线 1=支线 2=日常 3=副本）
-- type: 0=打怪 1=收集物品 2=对话NPC 3=探索地区
-- ============================================================
INSERT IGNORE INTO `quest` (`id`, `name`, `description`, `category`, `type`, `target_id`, `require_value`, `npc_id`, `pre_quest_id`, `level_req`, `reward_exp`, `reward_money`, `reward_item_id`, `reward_item_qty`, `sort_order`) VALUES
-- === 主线任务（威尼斯→航海→世界）===
(1,  '清理城郊野狗',    '马可说威尼斯城郊有野狗出没，帮忙清理3只。',            0, 0, 1,   3, 1,  0,  1,  100,  200,  1, 2, 1),
(2,  '初识航海',        '去码头找船长，了解如何出海。',                            0, 2, 1,   1, 1,  1,  5,  120,  300,  0, 0, 2),
(3,  '雅典之行',        '搭船前往雅典（map_id=102），探索爱琴海城市。',          0, 3, 102, 1, 1,  2, 10,  200,  500,  0, 0, 3),
(4,  '雅典商人',        '向雅典商人打听东方航线。',                               0, 2, 2,   1, 2,  3, 12,  250,  400, 22, 1, 4),
(5,  '海盗的威胁',      '雅典附近海上有海盗作乱，去教训他们！',                   0, 0, 6,   5, 2,  4, 15,  300,  600,  0, 0, 5),
(6,  '亚历山大之行',    '乘船前往埃及亚历山大（map_id=202），探索非洲海岸。',     0, 3, 202, 1, 2,  5, 18,  400,  800,  0, 0, 6),
(7,  '沙漠中的巨兽',    '亚历山大城外有森林巨兽作乱，去清理5只。',               0, 0, 50,  5, 2,  6, 20,  500, 1000,  0, 0, 7),
(8,  '重返威尼斯',      '回到威尼斯，向马可汇报旅程。',                           0, 2, 1,   1, 1,  7, 22,  300,  500,  0, 0, 8),
(9,  '长安的召唤',      '传闻东方长安是繁华之地，乘船东行（map_id=401）。',       0, 3, 401, 1, 1,  8, 25,  600, 1200,  0, 0, 9),
(10, '银矿石的请求',    '长安工匠需要银矿石，去采集5块回来。',                    0, 1, 75,  5, 1,  9, 28,  700, 1500, 50, 3,10),
(11, '长安城外的华南虎', '长安郊外华南虎伤人，去清剿8只。',                       0, 0, 40,  8, 1, 10, 30,  800, 2000,  0, 0,11),
(12, '前往牛头山',      '听闻印度洋北有牛头山盗匪，30级可入，进去探探虚实。',    0, 3, 9001,1, 1, 11, 32, 1000, 2500,  0, 0,12),
(13, '牛头山探秘',      '进入牛头山副本，击败任意5层怪物。',                      0, 3, 9001,5, 1, 12, 35, 1200, 3000, 33, 1,13),
(14, '牛头山深处',      '深入牛头山第8层，击败精英匪霸。',                       0, 0, 20,  1, 1, 13, 40, 1500, 4000, 52, 1,14),
(15, '银龙的踪迹',      '在牛头山第10层找到虚弱银龙，击败它！',                  0, 0, 23,  1, 1, 14, 45, 2000, 5000, 55, 1,15),
(16, '四象圣殿的传说',  '100级后，可向长安奠基四象老人进入四象圣殿。',            0, 3, 9002,1, 1, 15, 98, 3000, 8000,  0, 0,16),
(17, '四象试炼',        '进入四象圣殿，击败任意8层怪物。',                        0, 0, 30,  8, 1, 16,100, 5000,12000, 61, 2,17),
-- === 支线任务 ===
(20, '铁匠学徒',        '帮安芬尼奥收集3块玄铁石。',                              1, 1, 58,  3, 2,  0,  5,  150,  300, 50, 2,20),
(21, '酒馆的谣言',      '马可提到海上有个海盗头目，去教训他！',                   1, 0, 5,   1, 1, 20, 10,  300,  600,  0, 0,21),
(22, '东方丝绸',        '帮东方商人从长安带回2匹丝绸。',                           1, 1, 77,  2, 5, 21, 15,  400,  800,  0, 0,22),
(23, '银行的信任',      '在银行存款满5000铜币。',                                  1, 1,  0,  1, 3,  0, 12,  350,  700,  0, 0,23),
(24, '驯兽师之路',      '捕捉1只海鹰作为自己的宠物。',                             1, 0,  2,  1, 0,  0, 10,  500,  800,  0, 0,24),
(25, '巨蟒之牙',        '去野外猎杀5条巨蟒，收集它们的毒牙。',                     1, 1, 41,  5, 0, 22, 22,  600, 1200,  0, 0,25),
(26, '解毒剂的材料',    '帮炼金师收集3份草药和2份翡翠石。',                       1, 1, 51,  3, 0, 25, 18,  450,  900,  5, 2,26),
(27, '翡翠石的委托',    '帮商人收集4块翡翠石。',                                   1, 1, 51,  4, 5, 26, 20,  500, 1000,  0, 0,27),
(28, '非洲草原狮',      '去非洲草原猎杀6只草原狮。',                               1, 0, 51,  6, 2, 27, 35,  700, 1500,  0, 0,28),
(29, '威尼斯商人',      '在威尼斯购买任意商品。',                                  1, 1,  0,  1, 5, 28,  8,  200,  400,  0, 0,29),
(30, '雅典的葡萄酒',    '从亚历山大带回3桶葡萄酒到威尼斯。',                        1, 1,  1,  3, 2, 29, 16,  400,  800,  0, 0,30),
(31, '雪虎的威名',      '四象圣殿白虎宫中，击败雪虎骨妖3次。',                     1, 0, 31,  3, 1, 30,102, 2000, 4000, 62, 2,31),
(32, '青龙之魂',        '四象圣殿青龙宫中，击败青龙骨妖3次。',                     1, 0, 35,  3, 1, 31,105, 2000, 4000, 68, 2,32),
(33, '玄武之力',        '四象圣殿玄武宫中，击败玄武骨妖3次。',                     1, 0, 33,  3, 1, 32,105, 2000, 4000, 65, 2,33),
(34, '朱雀之焰',        '四象圣殿朱雀宫中，击败朱雀骨妖3次。',                    1, 0, 37,  3, 1, 33,105, 2000, 4000, 71, 2,34),
-- === 日常任务 ===
(40, '日常：清理海盗',  '今日击败3只海上劫匪。',                                   2, 0,  6,  3, 0,  0,  1,  200,  400,  1, 1,40),
(41, '日常：采集药草',  '采集2份草药。',                                            2, 1, 50,  2, 0,  0,  1,  150,  300,  3, 1,41),
(42, '日常：强化装备',  '成功强化1次装备。',                                       2, 1,  0,  1, 2,  0,  1,  300,  500, 50, 1,42),
(43, '日常：牛头山',    '进入牛头山击败任意3层怪物。',                              2, 3,9001, 3, 0,  0, 30,  500, 1000, 50, 2,43),
(44, '日常：跑商',      '在任意城市进行贸易买卖。',                                2, 1,  0,  1, 0,  0, 10,  250,  600,  0, 0,44),
(45, '日常：师徒',      '收一名徒弟或当一次徒弟。',                                 2, 2,  0,  1, 0,  0,  1,  200,  400,  0, 0,45);

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
('pet_type', '3', '传说', '', 4),
('item_type', '3', '材料', '', 3),
('item_type', '4', '任务道具', '', 4);

-- ============================================================
-- 签到系统
-- ============================================================
CREATE TABLE IF NOT EXISTS `sign_in` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `sign_date` date NOT NULL COMMENT '签到日期',
  `consecutive_days` int NOT NULL DEFAULT 1 COMMENT '本次连续签到天数',
  `created_at` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_date` (`user_id`, `sign_date`),
  KEY `idx_sign_in_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sign_reward` (
  `id` int NOT NULL AUTO_INCREMENT,
  `day` int NOT NULL COMMENT '第几天(1-7循环)',
  `reward_type` varchar(32) NOT NULL COMMENT 'money/exp/item/gold',
  `reward_value` int NOT NULL DEFAULT 0 COMMENT '奖励值或物品ID',
  `reward_qty` int NOT NULL DEFAULT 1 COMMENT '物品数量',
  `description` varchar(128) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sign_reward_day` (`day`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7天循环签到奖励（连签第N天获得的奖励）
INSERT IGNORE INTO `sign_reward` (`id`, `day`, `reward_type`, `reward_value`, `reward_qty`, `description`) VALUES
(1,  1, 'money',  100,  1, '第1天：铜币 x100'),
(2,  2, 'exp',    200,  1, '第2天：经验 x200'),
(3,  3, 'money',  300,  1, '第3天：铜币 x300'),
(4,  4, 'exp',    500,  1, '第4天：经验 x500'),
(5,  5, 'item',   50,   1, '第5天：玄铁石 x1'),
(6,  6, 'money',  800,  1, '第6天：铜币 x800'),
(7,  7, 'item',   57,   1, '第7天：龙珠碎片 x1');

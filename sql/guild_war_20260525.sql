-- ============================================================
-- 帮会战系统 v1.0 (2026-05-25)
-- 宣战 → 攻城战 → 帮会领地 → 奖励分配
-- ============================================================

-- 帮会战表
CREATE TABLE IF NOT EXISTS `guild_war` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `attacker_id` INT NOT NULL COMMENT '攻击方帮会ID',
  `defender_id` INT NOT NULL COMMENT '防守方帮会ID',
  `war_time` INT NOT NULL COMMENT '战争开始时间戳',
  `duration` INT NOT NULL DEFAULT 7200 COMMENT '持续2小时',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '0=宣战中,1=进行中,2=已结束',
  `winner_id` INT DEFAULT 0 COMMENT '胜利帮会ID',
  `attacker_score` INT DEFAULT 0 COMMENT '攻击方得分',
  `defender_score` INT DEFAULT 0 COMMENT '防守方得分',
  `created_at` INT NOT NULL,
  `ended_at` INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 帮会战参战记录（每次战斗个人记录）
CREATE TABLE IF NOT EXISTS `guild_war_member` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `war_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `guild_id` INT NOT NULL,
  `kill_count` INT DEFAULT 0 COMMENT '击杀数',
  `contribution` INT DEFAULT 0 COMMENT '个人贡献分',
  `is_active` TINYINT DEFAULT 1 COMMENT '是否参战',
  `joined_at` INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 帮会领地（占领后每周领取奖励）
CREATE TABLE IF NOT EXISTS `guild_territory` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `territory_key` VARCHAR(32) NOT NULL UNIQUE COMMENT '领地标识',
  `name` VARCHAR(64) NOT NULL COMMENT '领地名称',
  `guild_id` INT DEFAULT 0 COMMENT '占领帮会ID',
  `guild_name` VARCHAR(64) DEFAULT '' COMMENT '占领帮会名',
  `weekly_gold` INT DEFAULT 500 COMMENT '每周产出铜币',
  `weekly_silver` INT DEFAULT 1 COMMENT '每周产出银币',
  `level_req` INT DEFAULT 5 COMMENT '要求帮会等级',
  `captured_at` INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 插入领地（3个海域资源点，已有数据则跳过）
INSERT IGNORE INTO `guild_territory` (`territory_key`, `name`, `level_req`, `weekly_gold`, `weekly_silver`) VALUES
('east_sea_trade', '东海商会', 3, 800, 2),
('south_sea_port', '南海港口', 5, 1200, 3),
('west_strait', '西海海峡', 7, 2000, 5),
('north_ice', '北海冰原', 5, 1500, 4),
('special_forge', '锻造工坊', 10, 3000, 8);

-- 宣战费用配置（game_config）
INSERT INTO `game_config` (`config_key`, `config_value`, `description`) VALUES
('guild_war_declare_cost', '1000', '帮会宣战所需铜币'),
('guild_war_min_member', '5', '宣战所需最少成员数'),
('guild_war_duration_hours', '2', '战争持续时间（小时）'),
('guild_war_win_gold', '5000', '胜利帮会奖励铜币'),
('guild_war_lose_gold', '2000', '失败帮会安慰奖铜币'),
('guild_territory_reward_week', '1', '领地每周结算奖励开关');

-- 每日帮会捐献触发（注入到 guild.js，检测 member.contribution 变化）
-- 注意：guild.js 目前没有 donate 路由，以下 SQL 作为占位符
-- 实际触发在帮会战结束后自动奖励时注入
-- 竞技场系统数据表
-- arena: 竞技场配置表
CREATE TABLE IF NOT EXISTS `arena` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(64) NOT NULL COMMENT '竞技场名称',
  `description` TEXT COMMENT '描述',
  `level_req` INT DEFAULT 1 COMMENT '最低等级要求',
  `entry_fee` INT DEFAULT 100 COMMENT '门票费（铜币）',
  `rewards` TEXT COMMENT '奖励配置JSON',
  `created_at` INT DEFAULT 0,
  `updated_at` INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- user_arena: 用户竞技场数据表
CREATE TABLE IF NOT EXISTS `user_arena` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `rank` INT DEFAULT 0 COMMENT '排名',
  `score` INT DEFAULT 1000 COMMENT '积分',
  `win_count` INT DEFAULT 0 COMMENT '胜利次数',
  `lose_count` INT DEFAULT 0 COMMENT '失败次数',
  `daily_challenge_count` INT DEFAULT 0 COMMENT '今日挑战次数',
  `last_challenge_at` INT DEFAULT 0 COMMENT '上次挑战时间戳',
  `created_at` INT DEFAULT 0,
  `updated_at` INT DEFAULT 0,
  UNIQUE KEY `uk_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 插入默认竞技场配置
INSERT IGNORE INTO `arena` (`id`, `name`, `description`, `level_req`, `entry_fee`, `rewards`) VALUES
(1, '四海争霸', '四海豪杰齐聚一堂，争夺最强称号', 5, 100, '{"win_silver":10,"win_prestige":100,"first_win_silver":50,"lose_silver":2}');
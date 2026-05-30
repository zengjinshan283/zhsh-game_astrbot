-- ============================================================
-- 城门独立表 gate：建表 + 数据迁移
-- 将 place.type=5 中城门性质的地点迁移到独立 gate 表
-- ============================================================

-- 1. 创建 gate 表
CREATE TABLE IF NOT EXISTS `gate` (
  `id` INT NOT NULL COMMENT '地点id(对应place.id)',
  `city_id` INT NOT NULL COMMENT '所属城市id',
  `direction` ENUM('n','s','e','w') NOT NULL COMMENT '城门方向',
  `name` VARCHAR(64) NOT NULL COMMENT '城门名称',
  `target_wild_id` INT DEFAULT NULL COMMENT '点击后进入的野外区域id(wild_map.id)',
  `level_req` INT DEFAULT 1 COMMENT '进入等级要求',
  `enabled` TINYINT DEFAULT 1 COMMENT '是否启用 0禁用 1启用',
  PRIMARY KEY (`id`),
  INDEX `idx_city_id` (`city_id`),
  INDEX `idx_direction` (`direction`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 2. 数据迁移：从 place 表提取城门数据
-- 规则：place.type=5 且名称包含"城门"的记录
-- ============================================================

-- 迁移已有城门数据
INSERT IGNORE INTO `gate` (`id`, `city_id`, `direction`, `name`, `level_req`, `enabled`)
SELECT 
  p.id,
  p.city_id,
  CASE 
    WHEN p.name LIKE '%北城门%' OR p.name LIKE '%北门%' THEN 'n'
    WHEN p.name LIKE '%南城门%' OR p.name LIKE '%南门%' THEN 's'
    WHEN p.name LIKE '%东城门%' OR p.name LIKE '%东门%' THEN 'e'
    WHEN p.name LIKE '%西城门%' OR p.name LIKE '%西门%' THEN 'w'
    ELSE 'n'
  END AS direction,
  p.name,
  1 AS level_req,
  1 AS enabled
FROM `place` p
WHERE p.type = 5 
  AND (p.name LIKE '%城门%' OR p.name LIKE '%门%')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `city_id` = VALUES(`city_id`);

-- ============================================================
-- 3. 为已有城门设置 target_wild_id（基于城市+方向匹配 wild_map）
-- ============================================================

-- 匹配规则：同一城市(city_id)、同方向(direction)的最底层(level=3)野外区域
UPDATE gate g
JOIN (
  SELECT wm.id, wm.city_id, wm.direction
  FROM wild_map wm
  INNER JOIN (
    SELECT city_id, direction, MAX(level) as max_level
    FROM wild_map
    GROUP BY city_id, direction
  ) sub ON wm.city_id = sub.city_id 
       AND wm.direction = sub.direction 
       AND wm.level = sub.max_level
) wild ON g.city_id = wild.city_id AND g.direction = wild.direction
SET g.target_wild_id = wild.id
WHERE g.target_wild_id IS NULL;

-- ============================================================
-- 4. 验证迁移结果
-- ============================================================
-- SELECT g.*, p.name as place_name, wm.name as wild_name 
-- FROM gate g 
-- JOIN place p ON g.id = p.id 
-- LEFT JOIN wild_map wm ON g.target_wild_id = wm.id
-- LIMIT 20;
-- Add quality column to inventory table (per-instance item quality, not global item quality)
ALTER TABLE `inventory` ADD COLUMN `quality` tinyint NOT NULL DEFAULT 0 AFTER `durability_max`;
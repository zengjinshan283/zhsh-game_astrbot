-- Add quality to inventory (per-instance item quality, not global item table quality)
ALTER TABLE `inventory` ADD COLUMN `quality` tinyint NOT NULL DEFAULT 0 AFTER `durability_max`;

-- Add captureable column to monster table (flag for whether monster can be captured as pet)
ALTER TABLE `monster` ADD COLUMN `captureable` tinyint NOT NULL DEFAULT 0 AFTER `capture_rate`;

-- Mark existing monsters with capture_rate > 0 as captureable
UPDATE `monster` SET `captureable` = 1 WHERE `capture_rate` > 0;
-- VIP + Monthly Card 系统字段
-- 添加银币、VIP等级、VIP到期、月卡、月卡到期字段

ALTER TABLE `user` ADD COLUMN `silver` INT NOT NULL DEFAULT 0 AFTER `gold`;
ALTER TABLE `user` ADD COLUMN `vip_level` INT NOT NULL DEFAULT 0 AFTER `silver`;
ALTER TABLE `user` ADD COLUMN `vip_expire` INT NOT NULL DEFAULT 0 AFTER `vip_level`;
ALTER TABLE `user` ADD COLUMN `monthly_card` TINYINT NOT NULL DEFAULT 0 AFTER `vip_expire`;
ALTER TABLE `user` ADD COLUMN `monthly_card_expire` INT NOT NULL DEFAULT 0 AFTER `monthly_card`;
-- 技能升级：user_skill 添加属性列
-- 纵横四海 v1.0 | 2026-05-28

ALTER TABLE user_skill ADD COLUMN atk_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.00 AFTER `level`;
ALTER TABLE user_skill ADD COLUMN def_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.00 AFTER `atk_multiplier`;
ALTER TABLE user_skill ADD COLUMN mp_cost INT UNSIGNED NOT NULL DEFAULT 0 AFTER `def_multiplier`;
ALTER TABLE user_skill ADD COLUMN cooldown INT UNSIGNED NOT NULL DEFAULT 0 AFTER `mp_cost`;
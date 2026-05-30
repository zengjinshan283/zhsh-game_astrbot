-- ================================================================
-- 装备强化系统完善 - 铁匠NPC + game_config强化/精炼配置补全
-- 日期: 2026-05-30
-- ================================================================

-- 1. 精炼(Refine)系统 game_config 配置
INSERT INTO `game_config` (`category`, `config_key`, `config_value`, `description`) VALUES
('refine', 'cost_multiplier',  '300', '精炼费用系数：强化等级 × 此值 = 精炼铜币费用'),
('refine', 'min_level',      '3',   '精炼最低强化等级要求（需+3以上）'),
('refine', 'affix_add_count', '2',   '精炼每次新增词缀数量')
ON DUPLICATE KEY UPDATE `config_value`=VALUES(`config_value`);

-- 2. 强化保护符配置（与服务器 PROTECT_ITEM_ID=95090 对应）
INSERT INTO `game_config` (`category`, `config_key`, `config_value`, `description`) VALUES
('enhance', 'protect_item_id', '95090', '强化护符道具ID（+7以上强化失败时保护装备不降级）'),
('enhance', 'protect_cost',    '0',     '强化护符使用费用（护符本身消耗，无额外费用）')
ON DUPLICATE KEY UPDATE `config_value`=VALUES(`config_value`);

-- 3. 确保 enhance 系统完整配置（补充可能缺失的 key）
-- success_rate 已存在于 init-db.sql，此处仅做确保（ON DUPLICATE KEY无效对已存在数据）
-- cost_base / fail_return_rate / degrade_level 同上，init-db.sql 已初始化
-- 此语句确保数据库中最新的值（用于开发环境重新初始化）
UPDATE `game_config` SET `config_value`='90'   WHERE `config_key`='success_rate_0' AND `category`='enhance';
UPDATE `game_config` SET `config_value`='90'   WHERE `config_key`='success_rate_1' AND `category`='enhance';
UPDATE `game_config` SET `config_value`='90'   WHERE `config_key`='success_rate_2' AND `category`='enhance';
UPDATE `game_config` SET `config_value`='90'   WHERE `config_key`='success_rate_3' AND `category`='enhance';
UPDATE `game_config` SET `config_value`='90'   WHERE `config_key`='success_rate_4' AND `category`='enhance';
UPDATE `game_config` SET `config_value`='90'   WHERE `config_key`='success_rate_5' AND `category`='enhance';
UPDATE `game_config` SET `config_value`='70'   WHERE `config_key`='success_rate_6' AND `category`='enhance';
UPDATE `game_config` SET `config_value`='70'   WHERE `config_key`='success_rate_7' AND `category`='enhance';
UPDATE `game_config` SET `config_value`='50'   WHERE `config_key`='success_rate_8' AND `category`='enhance';
UPDATE `game_config` SET `config_value`='30'   WHERE `config_key`='success_rate_9' AND `category`='enhance';
UPDATE `game_config` SET `config_value`='200'  WHERE `config_key`='cost_base'      AND `category`='enhance';
UPDATE `game_config` SET `config_value`='50'   WHERE `config_key`='fail_return_rate' AND `category`='enhance';
UPDATE `game_config` SET `config_value`='7'    WHERE `config_key`='degrade_level'   AND `category`='enhance';

-- 4. 强化护符道具（item_id=95090）— 如果不存在则插入
INSERT IGNORE INTO `item` (`id`, `name`, `type`, `subtype`, `description`, `price_buy`, `price_sell`, `atk`, `def_val`, `hp`) VALUES
(95090, '强化护符', 1, 'consumable', '强化+7以上必备，失败时保护装备不降级', 5000, 2500, 0, 0, 0);

-- 5. 铁匠NPC dialog 更新（type=2 的铁匠NPC统一对话）
-- 注意：铁匠NPC type=2 触发 MapView 中 handleNpcAction 的 openSmith()
-- 此处更新 dialog 让铁匠更有交互感
UPDATE `npc` SET dialog='叮叮哐哐...哦！冒险者，想强化装备吗？让我看看你的家伙事儿！' WHERE `type`=2 AND (dialog IS NULL OR dialog='');

SELECT 'smith_enhance_refine_20260530.sql executed' AS status;

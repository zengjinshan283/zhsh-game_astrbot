-- 修正 daily_activity 表的 key，使其与各路由写入的 key 一致
-- battle.js 写入: daily_battle   (原 key: monster_kill)
-- quest.js 写入: daily_quest    (原 key: quest_complete)
-- market.js 写入: daily_trade   (原 key: trade)
-- dungeon/arena/fishing 暂未接入，先改已有的

UPDATE `daily_activity` SET `key` = 'daily_battle'    WHERE `key` = 'monster_kill';
UPDATE `daily_activity` SET `key` = 'daily_quest'     WHERE `key` = 'quest_complete';
UPDATE `daily_activity` SET `key` = 'daily_trade'     WHERE `key` = 'trade';

-- 新增钓鱼任务的触发（目前无钓鱼功能，预留）
-- 钓鱼任务 key: daily_fishing, target: 3, active_point: 15
INSERT IGNORE INTO `daily_activity` (`key`, `name`, `description`, `target`, `active_point`)
VALUES ('daily_fishing', '钓鱼达人', '成功钓获鱼类', 3, 15);

-- 新增竞技场任务的触发（待实现）
INSERT IGNORE INTO `daily_activity` (`key`, `name`, `description`, `target`, `active_point`)
VALUES ('daily_arena', '竞技新星', '参与竞技场挑战', 1, 20);

-- 新增副本任务的触发（待实现）
INSERT IGNORE INTO `daily_activity` (`key`, `name`, `description`, `target`, `active_point`)
VALUES ('daily_dungeon', '副本先锋', '完成任意副本', 1, 30);
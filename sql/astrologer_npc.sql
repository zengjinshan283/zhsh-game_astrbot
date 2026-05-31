-- 占星师NPC数据
-- 占星师塔薇尔：type=6 对应星座答题功能入口
-- place_id=660 对应占星屋地点（需先有place记录）

-- 占星师NPC (如果place 660不存在，可以用任意已有地点)
INSERT IGNORE INTO `npc` (`id`, `name`, `place_id`, `type`, `dialog`) VALUES
(9901, '占星师 塔薇尔', 660, 6, '星星的奥秘，等待你的探索...');

-- 占星师闲聊话题
INSERT IGNORE INTO `npc_chat_topic` (`npc_id`, `topic_key`, `topic_text`, `sort_order`) VALUES
(9901, 'quiz', '🔮 我这里有星座知识问答挑战，完成答题可获得铜币奖励。', 10),
(9901, 'astrology', '✨ 十二星座各有其独特的守护星和元素属性。', 5),
(9901, 'daily', '🌟 每天来答题可以更好地了解星星的指引哦！', 3);
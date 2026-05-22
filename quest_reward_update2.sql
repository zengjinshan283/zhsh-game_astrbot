-- 跑商任务(type=4)物品奖励：根据等级给铜币袋/银币袋/道具
-- 探索任务(type=5)物品奖励：给探索发现物（矿石/宝石）
-- 护送任务(type=6)物品奖励：给护送报酬（补给品）
-- 悬赏任务(type=7)物品奖励：给对应怪物掉落的材料
-- 对话任务(type=8)物品奖励：给少量钱袋

-- type=4 跑商
UPDATE quest SET reward_item_id=4, reward_item_qty=2 WHERE type=4 AND id BETWEEN 1003 AND 1010;
UPDATE quest SET reward_item_id=50, reward_item_qty=1 WHERE type=4 AND id BETWEEN 1011 AND 1018;
UPDATE quest SET reward_item_id=4, reward_item_qty=3 WHERE type=4 AND id BETWEEN 1019 AND 1026;
UPDATE quest SET reward_item_id=51, reward_item_qty=1 WHERE type=4 AND id BETWEEN 1027 AND 1034;
UPDATE quest SET reward_item_id=4, reward_item_qty=4 WHERE type=4 AND id BETWEEN 1035 AND 1042;
UPDATE quest SET reward_item_id=51, reward_item_qty=2 WHERE type=4 AND id BETWEEN 1043 AND 1050;
UPDATE quest SET reward_item_id=53, reward_item_qty=1 WHERE type=4 AND id BETWEEN 1051 AND 1058;
UPDATE quest SET reward_item_id=4, reward_item_qty=5 WHERE type=4 AND id BETWEEN 1059 AND 1066;
UPDATE quest SET reward_item_id=54, reward_item_qty=1 WHERE type=4 AND id BETWEEN 1067 AND 1074;
UPDATE quest SET reward_item_id=58, reward_item_qty=1 WHERE type=4 AND id BETWEEN 1075 AND 1082;
UPDATE quest SET reward_item_id=4, reward_item_qty=6 WHERE type=4 AND id BETWEEN 1083 AND 1090;
UPDATE quest SET reward_item_id=58, reward_item_qty=2 WHERE type=4 AND id BETWEEN 1091 AND 1098;
UPDATE quest SET reward_item_id=53, reward_item_qty=2 WHERE type=4 AND id BETWEEN 1099 AND 1106;
UPDATE quest SET reward_item_id=59, reward_item_qty=1 WHERE type=4 AND id BETWEEN 1107 AND 1114;
UPDATE quest SET reward_item_id=4, reward_item_qty=8 WHERE type=4 AND id BETWEEN 1115 AND 1225;

-- type=5 探索遗迹 → 给矿石/宝石
UPDATE quest SET reward_item_id=50, reward_item_qty=2 WHERE type=5 AND level_req<=3;
UPDATE quest SET reward_item_id=53, reward_item_qty=2 WHERE type=5 AND level_req BETWEEN 4 AND 8;
UPDATE quest SET reward_item_id=51, reward_item_qty=2 WHERE type=5 AND level_req BETWEEN 9 AND 15;
UPDATE quest SET reward_item_id=58, reward_item_qty=2 WHERE type=5 AND level_req BETWEEN 16 AND 25;
UPDATE quest SET reward_item_id=55, reward_item_qty=1 WHERE type=5 AND level_req>25;

-- type=6 护送 → 给补给品（这里用小回复药）
UPDATE quest SET reward_item_id=1, reward_item_qty=3 WHERE type=6 AND level_req<=5;
UPDATE quest SET reward_item_id=4, reward_item_qty=2 WHERE type=6 AND level_req BETWEEN 6 AND 12;
UPDATE quest SET reward_item_id=2, reward_item_qty=2 WHERE type=6 AND level_req>12;

-- type=7 悬赏 → 给材料包（玄铁/翡翠石/琥珀等）
UPDATE quest SET reward_item_id=50, reward_item_qty=2 WHERE type=7 AND level_req<=5;
UPDATE quest SET reward_item_id=53, reward_item_qty=2 WHERE type=7 AND level_req BETWEEN 6 AND 12;
UPDATE quest SET reward_item_id=51, reward_item_qty=2 WHERE type=7 AND level_req BETWEEN 13 AND 20;
UPDATE quest SET reward_item_id=58, reward_item_qty=2 WHERE type=7 AND level_req BETWEEN 21 AND 30;
UPDATE quest SET reward_item_id=55, reward_item_qty=1 WHERE type=7 AND level_req>30;

-- type=8 对话 → 给钱袋（小回复药替代）
UPDATE quest SET reward_item_id=1, reward_item_qty=2 WHERE type=8 AND level_req<=5;
UPDATE quest SET reward_item_id=4, reward_item_qty=3 WHERE type=8 AND level_req BETWEEN 6 AND 15;
UPDATE quest SET reward_item_id=4, reward_item_qty=5 WHERE type=8 AND level_req>15;

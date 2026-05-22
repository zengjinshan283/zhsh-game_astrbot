-- 任务物品奖励补充（reward_item_id=0的主线任务）
UPDATE quest SET reward_item_id = 5, reward_item_qty = 3 WHERE id = 5;   -- 海盗的威胁Lv15 → 解毒剂x3
UPDATE quest SET reward_item_id = 50, reward_item_qty = 2 WHERE id = 7;   -- 沙漠中的巨兽Lv20 → 玄铁石x2
UPDATE quest SET reward_item_id = 53, reward_item_qty = 2 WHERE id = 11;  -- 长安城外的华南虎Lv30 → 琥珀x2
UPDATE quest SET reward_item_id = 1, reward_item_qty = 2 WHERE id = 21;  -- 酒馆的谣言Lv10 → 小回复药x2
UPDATE quest SET reward_item_id = 19, reward_item_qty = 3 WHERE id = 24;  -- 驯兽师之路Lv10 → 宠物口粮x3
UPDATE quest SET reward_item_id = 58, reward_item_qty = 2 WHERE id = 28;  -- 非洲草原狮Lv35 → 玄铁x2

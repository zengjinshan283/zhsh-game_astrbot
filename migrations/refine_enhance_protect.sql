-- 精炼系统 & 强化保护符
-- 纵横四海 v1.0 | 2026-05-28

-- inventory 新增精炼词缀列
ALTER TABLE inventory ADD COLUMN refine_affixes TEXT AFTER identify_affixes;

-- 强化护符道具（用于+7以上强化保护）
INSERT IGNORE INTO item (id, name, subtype, level_req, price_buy, price_sell, quality)
VALUES (95090, '强化护符', 'material', 1, 500, 100, 3);

-- 商城商品池添加强化护符
INSERT IGNORE INTO mall_item_pool (item_id, category, weight, min_level, max_level)
VALUES (95090, 'material', 5, 1, 99);
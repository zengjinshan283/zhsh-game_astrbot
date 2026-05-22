-- 航海者新手套装（1级绿色套装，6件 + 套装效果）
-- 已有字段: id, name, type, subtype, description, price_buy, price_sell, atk, def_val, hp, level_req, quality, effect_key, effect_value, set_name

-- 1152 航海者短剑（武器）
INSERT INTO item (id, name, type, subtype, level_req, quality, atk, def_val, hp, set_name, price_buy, price_sell, description) VALUES
(1152, '航海者短剑', 2, 'weapon', 1, 1, 12, 0, 0, '航海者套装', 100, 30, '新手必备短剑，轻便锋利，适合航海冒险者。')
ON DUPLICATE KEY UPDATE name=VALUES(name), atk=VALUES(atk), set_name=VALUES(set_name), price_buy=VALUES(price_buy), price_sell=VALUES(price_sell), description=VALUES(description);

-- 1153 航海者皮甲（衣服）
INSERT INTO item (id, name, type, subtype, level_req, quality, atk, def_val, hp, set_name, price_buy, price_sell, description) VALUES
(1153, '航海者皮甲', 2, 'armor', 1, 1, 0, 5, 20, '航海者套装', 120, 40, '皮革护甲，轻便且提供基础防护，适合出海新手。')
ON DUPLICATE KEY UPDATE name=VALUES(name), def_val=VALUES(def_val), hp=VALUES(hp), set_name=VALUES(set_name), price_buy=VALUES(price_buy), price_sell=VALUES(price_sell), description=VALUES(description);

-- 1154 航海者圆盾（盾牌）
INSERT INTO item (id, name, type, subtype, level_req, quality, atk, def_val, hp, set_name, price_buy, price_sell, description) VALUES
(1154, '航海者圆盾', 2, 'shield', 1, 1, 0, 4, 10, '航海者套装', 80, 25, '圆形木盾，制作简单，能抵挡部分攻击。')
ON DUPLICATE KEY UPDATE name=VALUES(name), def_val=VALUES(def_val), hp=VALUES(hp), set_name=VALUES(set_name), price_buy=VALUES(price_buy), price_sell=VALUES(price_sell), description=VALUES(description);

-- 1155 航海者皮靴（靴子）
INSERT INTO item (id, name, type, subtype, level_req, quality, atk, def_val, hp, set_name, price_buy, price_sell, description) VALUES
(1155, '航海者皮靴', 2, 'boots', 1, 1, 0, 2, 5, '航海者套装', 60, 20, '轻便皮靴，让航海者行动更加敏捷。')
ON DUPLICATE KEY UPDATE name=VALUES(name), def_val=VALUES(def_val), hp=VALUES(hp), set_name=VALUES(set_name), price_buy=VALUES(price_buy), price_sell=VALUES(price_sell), description=VALUES(description);

-- 1156 航海者皮帽（头盔）
INSERT INTO item (id, name, type, subtype, level_req, quality, atk, def_val, hp, set_name, price_buy, price_sell, description) VALUES
(1156, '航海者皮帽', 2, 'helmet', 1, 1, 0, 3, 8, '航海者套装', 50, 15, '基础皮革头盔，提供头部防护。')
ON DUPLICATE KEY UPDATE name=VALUES(name), def_val=VALUES(def_val), hp=VALUES(hp), set_name=VALUES(set_name), price_buy=VALUES(price_buy), price_sell=VALUES(price_sell), description=VALUES(description);

-- 1157 航海者护腿（护腿）
INSERT INTO item (id, name, type, subtype, level_req, quality, atk, def_val, hp, set_name, price_buy, price_sell, description) VALUES
(1157, '航海者护腿', 2, 'legs', 1, 1, 0, 3, 10, '航海者套装', 70, 22, '保护腿部的轻便护甲，不影响行动。')
ON DUPLICATE KEY UPDATE name=VALUES(name), def_val=VALUES(def_val), hp=VALUES(hp), set_name=VALUES(set_name), price_buy=VALUES(price_buy), price_sell=VALUES(price_sell), description=VALUES(description);

-- 航海者套装效果（3档：2件/4件/6件）
INSERT INTO item_set (id, set_name, piece_count, bonus_atk, bonus_def, bonus_hp, description) VALUES
(901, '航海者套装', 2, 3, 4, 15, '2件：攻击+3 防御+4 生命+15')
ON DUPLICATE KEY UPDATE bonus_atk=VALUES(bonus_atk), bonus_def=VALUES(bonus_def), bonus_hp=VALUES(bonus_hp), description=VALUES(description);

INSERT INTO item_set (id, set_name, piece_count, bonus_atk, bonus_def, bonus_hp, description) VALUES
(902, '航海者套装', 4, 5, 8, 30, '4件：攻击+5 防御+8 生命+30')
ON DUPLICATE KEY UPDATE bonus_atk=VALUES(bonus_atk), bonus_def=VALUES(bonus_def), bonus_hp=VALUES(bonus_hp), description=VALUES(description);

INSERT INTO item_set (id, set_name, piece_count, bonus_atk, bonus_def, bonus_hp, description) VALUES
(903, '航海者套装', 6, 8, 12, 50, '6件：攻击+8 防御+12 生命+50')
ON DUPLICATE KEY UPDATE bonus_atk=VALUES(bonus_atk), bonus_def=VALUES(bonus_def), bonus_hp=VALUES(bonus_hp), description=VALUES(description);

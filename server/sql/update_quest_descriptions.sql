-- 更新杀怪任务(type=0)的description，明确写出从哪个城门出去、去哪个地点、打什么怪
-- 规则：查monster.place_id → 找对应place → 判断在哪个城门外（pos_row/pos_col比较）

-- 先查所有target_id是monster的type=0任务，看monster和place的对应关系
-- 然后逐条更新

UPDATE quest q,
  (SELECT m.id AS monster_id, m.name AS monster_name, p.id AS place_id, p.name AS place_name,
          pg.name AS gate_name,
          CASE
            WHEN p.pos_row < 3 AND p.pos_col = 3 THEN '北门'
            WHEN p.pos_row > 3 AND p.pos_col = 3 THEN '南门'
            WHEN p.pos_col < 3 AND p.pos_row = 3 THEN '西门'
            WHEN p.pos_col > 3 AND p.pos_row = 3 THEN '东门'
            WHEN p.pos_row < 3 AND p.pos_col < 3 THEN '西北'
            WHEN p.pos_row < 3 AND p.pos_col > 3 THEN '东北'
            WHEN p.pos_row > 3 AND p.pos_col < 3 THEN '西南'
            WHEN p.pos_row > 3 AND p.pos_col > 3 THEN '东南'
            ELSE '城外'
          END AS direction
   FROM monster m
   JOIN place p ON m.place_id = p.id
   LEFT JOIN place pg ON pg.city_id = p.city_id AND pg.name LIKE CONCAT('%', SUBSTRING_INDEX(CASE
            WHEN p.pos_row < 3 AND p.pos_col = 3 THEN '北门'
            WHEN p.pos_row > 3 AND p.pos_col = 3 THEN '南门'
            WHEN p.pos_col < 3 AND p.pos_row = 3 THEN '西门'
            WHEN p.pos_col > 3 AND p.pos_row = 3 THEN '东门'
            ELSE ''
          END, '门', 1), '%门%')
   WHERE p.city_id IS NOT NULL) AS m2
SET q.description = CONCAT('前往', m2.direction, '的「', m2.place_name, '」，击败', m2.require_value, '只「', m2.monster_name, '」。')
WHERE q.type = 0 AND q.target_id = m2.monster_id AND q.target_id > 0;

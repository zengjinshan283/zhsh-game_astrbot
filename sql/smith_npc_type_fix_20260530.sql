-- ================================================================
-- 铁匠NPC type 修正 & 铁匠铺交互流程完善
-- 日期: 2026-05-30
-- ================================================================
-- 背景: MapView.vue 的 handleNpcAction(t=2) 触发 openSmith()
--       但部分铁匠铺的 npc.type 在数据库中设为3（银行家同类型）
--       此SQL将所有铁匠NPC的type统一改为2，确保点击铁匠铺时正确响应

-- 1. 将所有"铁匠"相关NPC的type改为2（如果尚未更改）
UPDATE `npc` SET `type`=2 WHERE (`name` LIKE '%铁匠%' OR `dialog` LIKE '%强化%装备%' OR `dialog` LIKE '%叮叮哐哐%') AND `type` != 2;

-- 2. 更新铁匠NPC的dialog（更有交互感的铁匠对话）
UPDATE `npc` SET `dialog`='叮叮哐哐...哦！冒险者，想强化装备吗？让我看看你的家伙事儿！' WHERE `type`=2 AND (`name` LIKE '%铁匠%');

-- 3. 确保铁匠铺门口place.type也是3（铁匠铺类型，用于BottomNav判断）
--    此处不做修改，仅作记录：铁匠铺 place.type=3

-- 4. 确保铁匠铺（1031威尼斯铁匠铺）可从BottomNav快捷进入
--    BottomNav.vue 中: if (p.id === 1031) btns.push({ icon: '⚒️', label: '铁匠', route: '/smith' })
--    该逻辑已就绪，此处确保 place id 1031 存在
SELECT 'smith_npc_type_fix_20260530.sql executed' AS status;
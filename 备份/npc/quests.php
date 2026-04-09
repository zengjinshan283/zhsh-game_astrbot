<?php
require_once __DIR__ . '/../inc/functions.php';
$role = requireLogin();
header('Content-Type: application/json; charset=utf-8');

$npcId = (int)($_GET['npc_id'] ?? 0);
if ($npcId <= 0) { echo json_encode([]); exit; }

$npc = db()->getOne("SELECT * FROM npc WHERE id = ?", [$npcId]);
if (!$npc) { echo json_encode([]); exit; }

// 可接任务
$available = db()->getAll(
    "SELECT q.*, 0 as status, 0 as progress 
     FROM quest q 
     WHERE q.npc_id = ? AND q.level_req <= ?
     ORDER BY q.sort_order, q.id",
    [$npcId, $role->level]
);

// 过滤已接/前置未完成的
$final = [];
foreach ($available as $q) {
    $exists = db()->getVar("SELECT COUNT(*) FROM user_quest WHERE user_id = ? AND quest_id = ?", [$role->id, $q['id']]);
    if ($exists > 0) continue;
    if ($q['pre_quest_id'] > 0) {
        $preDone = db()->getVar("SELECT COUNT(*) FROM user_quest WHERE user_id = ? AND quest_id = ? AND status >= 1", [$role->id, $q['pre_quest_id']]);
        if ($preDone == 0) continue;
    }
    $q['reward_text'] = '经验+' . $q['reward_exp'] . ' 铜币+' . $q['reward_money'];
    if ($q['reward_item_id'] > 0) {
        $ri = db()->getOne("SELECT name FROM item WHERE id = ?", [$q['reward_item_id']]);
        if ($ri) $q['reward_text'] .= ' ' . $ri['name'] . '×' . $q['reward_item_qty'];
    }
    $final[] = $q;
}

// 进行中任务
$active = db()->getAll(
    "SELECT q.*, uq.progress, uq.status 
     FROM quest q JOIN user_quest uq ON q.id = uq.quest_id 
     WHERE uq.user_id = ? AND q.npc_id = ? AND uq.status < 2
     ORDER BY q.sort_order, q.id",
    [$role->id, $npcId]
);

echo json_encode(['available' => $final, 'active' => $active, 'npc_name' => $npc['name']]);

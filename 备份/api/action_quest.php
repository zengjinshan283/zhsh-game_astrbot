<?php
/**
 * 任务操作 API - 弹窗化
 */
require_once __DIR__ . '/../inc/functions.php';
$role = requireLogin();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['ok'=>false,'msg'=>'无效请求']);
    exit;
}

$action = $_POST['action'] ?? '';

if ($action === 'accept') {
    $questId = (int)($_POST['quest_id'] ?? 0);
    $npcId = (int)($_POST['npc_id'] ?? 0);
    
    $quest = db()->getOne("SELECT * FROM quest WHERE id = ? AND npc_id = ? AND level_req <= ?", [$questId, $npcId, $role->level]);
    if (!$quest) { echo json_encode(['ok'=>false,'msg'=>'任务不存在或等级不足']); exit; }
    
    $exists = db()->getVar("SELECT COUNT(*) FROM user_quest WHERE user_id = ? AND quest_id = ?", [$role->id, $questId]);
    if ($exists > 0) { echo json_encode(['ok'=>false,'msg'=>'已接过此任务']); exit; }
    
    if ($quest['pre_quest_id'] > 0) {
        $preDone = db()->getVar("SELECT COUNT(*) FROM user_quest WHERE user_id = ? AND quest_id = ? AND status >= 1", [$role->id, $quest['pre_quest_id']]);
        if ($preDone == 0) { echo json_encode(['ok'=>false,'msg'=>'需要先完成前置任务']); exit; }
    }
    
    db()->insert('user_quest', ['user_id'=>$role->id,'quest_id'=>$questId,'status'=>0,'progress'=>0,'accepted_at'=>time()]);
    echo json_encode(['ok'=>true,'msg'=>'接受任务：'.$quest['name']]);
    
} elseif ($action === 'claim') {
    $questId = (int)($_POST['quest_id'] ?? 0);
    
    $uq = db()->getOne("SELECT * FROM user_quest WHERE user_id = ? AND quest_id = ? AND status = 1", [$role->id, $questId]);
    if (!$uq) { echo json_encode(['ok'=>false,'msg'=>'任务未完成']); exit; }
    
    $quest = db()->getOne("SELECT * FROM quest WHERE id = ?", [$questId]);
    if (!$quest) { echo json_encode(['ok'=>false,'msg'=>'任务不存在']); exit; }
    
    $rewards = [];
    if ($quest['reward_exp'] > 0) {
        $leveled = $role->gainExp($quest['reward_exp']);
        $rewards[] = '经验+'.$quest['reward_exp'];
        if ($leveled) $rewards[] = '升级了！';
    }
    if ($quest['reward_money'] > 0) {
        $role->gainMoney($quest['reward_money']);
        $rewards[] = '铜币+'.$quest['reward_money'];
    }
    if ($quest['reward_gold'] > 0) {
        $role->gold += $quest['reward_gold'];
        db()->update('user', ['gold'=>$role->gold], '`id` = ?', [$role->id]);
        $rewards[] = '金币+'.$quest['reward_gold'];
    }
    if ($quest['reward_item_id'] > 0 && $quest['reward_item_qty'] > 0) {
        $existing = db()->getOne("SELECT * FROM inventory WHERE user_id = ? AND item_id = ? AND equipped = 0", [$role->id, $quest['reward_item_id']]);
        if ($existing) {
            db()->update('inventory', ['quantity'=>$existing['quantity']+$quest['reward_item_qty']], '`id` = ?', [$existing['id']]);
        } else {
            db()->insert('inventory', ['user_id'=>$role->id,'item_id'=>$quest['reward_item_id'],'quantity'=>$quest['reward_item_qty'],'equipped'=>0]);
        }
        $item = db()->getOne("SELECT name FROM item WHERE id = ?", [$quest['reward_item_id']]);
        $rewards[] = ($item ? $item['name'] : '物品').' x'.$quest['reward_item_qty'];
    }
    // 收集类任务扣道具
    if ((int)$quest['type'] === 1 && $quest['target_id'] > 0) {
        $role->removeItem((int)$quest['target_id'], (int)$quest['require_value']);
    }
    
    db()->update('user_quest', ['status'=>2,'completed_at'=>time()], 'id=?', [$uq['id']]);
    echo json_encode(['ok'=>true,'msg'=>'任务完成！'.implode('，', $rewards),'money'=>$role->money]);
    
} else {
    echo json_encode(['ok'=>false,'msg'=>'无效操作']);
}

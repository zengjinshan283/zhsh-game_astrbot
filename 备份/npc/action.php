<?php
require_once __DIR__ . '/../inc/functions.php';
$role = requireLogin();
header('Content-Type: application/json; charset=utf-8');

if (!isPost()) { echo json_encode(['ok'=>false,'msg'=>'无效请求']); exit; }

if (isset($_POST['accept_quest'])) {
    $qid = (int)$_POST['accept_quest'];
    $q = db()->getOne("SELECT * FROM quest WHERE id = ? AND level_req <= ?", [$qid, $role->level]);
    if (!$q) { echo json_encode(['ok'=>false,'msg'=>'任务不存在']); exit; }
    $exists = db()->getVar("SELECT COUNT(*) FROM user_quest WHERE user_id = ? AND quest_id = ?", [$role->id, $qid]);
    if ($exists > 0) { echo json_encode(['ok'=>false,'msg'=>'已接过此任务']); exit; }
    if ($q['pre_quest_id'] > 0) {
        $preDone = db()->getVar("SELECT COUNT(*) FROM user_quest WHERE user_id = ? AND quest_id = ? AND status >= 1", [$role->id, $q['pre_quest_id']]);
        if ($preDone == 0) { echo json_encode(['ok'=>false,'msg'=>'需要先完成前置任务']); exit; }
    }
    db()->insert('user_quest', ['user_id'=>$role->id, 'quest_id'=>$qid, 'status'=>0, 'progress'=>0, 'accepted_at'=>time()]);
    echo json_encode(['ok'=>true,'msg'=>'接受任务：'.$q['name']]);
} elseif (isset($_POST['claim_quest'])) {
    $qid = (int)$_POST['claim_quest'];
    $uq = db()->getOne("SELECT * FROM user_quest WHERE user_id = ? AND quest_id = ? AND status = 1", [$role->id, $qid]);
    if (!$uq) { echo json_encode(['ok'=>false,'msg'=>'任务未完成']); exit; }
    $q = db()->getOne("SELECT * FROM quest WHERE id = ?", [$qid]);
    if (!$q) { echo json_encode(['ok'=>false,'msg'=>'任务不存在']); exit; }
    $rewards = [];
    if ($q['reward_exp'] > 0) {
        $leveled = $role->gainExp($q['reward_exp']);
        $rewards[] = '经验+'.$q['reward_exp'];
        if ($leveled) $rewards[] = '升级了！';
    }
    if ($q['reward_money'] > 0) {
        $role->gainMoney($q['reward_money']);
        $rewards[] = '铜币+'.$q['reward_money'];
    }
    // 收集类任务(type=1)扣除对应道具
    if ((int)$q['type'] === 1 && $q['target_id'] > 0) {
        $role->removeItem((int)$q['target_id'], (int)$q['require_value']);
    }
    db()->update('user_quest', ['status'=>2, 'completed_at'=>time()], 'id=?', [$uq['id']]);
    echo json_encode(['ok'=>true,'msg'=>'任务完成！'.implode('，', $rewards)]);
} else {
    echo json_encode(['ok'=>false,'msg'=>'无效操作']);
}

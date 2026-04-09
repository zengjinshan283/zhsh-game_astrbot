<?php
/**
 * NPC银行 API - 弹窗化
 */
require_once __DIR__ . '/../inc/functions.php';
$role = requireLogin();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    $amount = (int)($_POST['amount'] ?? 0);
    
    if ($amount <= 0) {
        echo json_encode(['ok'=>false,'msg'=>'请输入有效金额']);
        exit;
    }
    
    if ($action === 'deposit') {
        if ($amount > $role->money) {
            echo json_encode(['ok'=>false,'msg'=>'铜币不足！']);
            exit;
        }
        if ($role->bankDeposit($amount)) {
            echo json_encode(['ok'=>true,'msg'=>'存入 '.formatMoney($amount).' 铜币','money'=>$role->money,'bank_money'=>$role->bank_money]);
        } else {
            echo json_encode(['ok'=>false,'msg'=>'存入失败']);
        }
    } elseif ($action === 'withdraw') {
        if ($amount > $role->bank_money) {
            echo json_encode(['ok'=>false,'msg'=>'存款不足！']);
            exit;
        }
        if ($role->bankWithdraw($amount)) {
            echo json_encode(['ok'=>true,'msg'=>'取出 '.formatMoney($amount).' 铜币','money'=>$role->money,'bank_money'=>$role->bank_money]);
        } else {
            echo json_encode(['ok'=>false,'msg'=>'取出失败']);
        }
    } else {
        echo json_encode(['ok'=>false,'msg'=>'无效操作']);
    }
    exit;
}

// GET: 返回银行信息
$logs = db()->getAll("SELECT * FROM bank_log WHERE user_id = ? ORDER BY id DESC LIMIT 5", [$role->id]);
echo json_encode(['money'=>$role->money,'bank_money'=>$role->bank_money,'logs'=>$logs]);

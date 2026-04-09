<?php
/**
 * NPC赌场 API - 弹窗化
 */
require_once __DIR__ . '/../inc/functions.php';
$role = requireLogin();
header('Content-Type: application/json; charset=utf-8');

$diceFaces = [1=>'⚀',2=>'⚁',3=>'⚂',4=>'⚃',5=>'⚄',6=>'⚅'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $betAmount = (int)($_POST['bet'] ?? 0);
    $choice = $_POST['choice'] ?? '';
    
    $casinoLimit = $role->getCasinoLimit();
    
    if (!in_array($choice, ['big','small'])) {
        echo json_encode(['ok'=>false,'msg'=>'无效选择']);
        exit;
    }
    if ($betAmount <= 0) {
        echo json_encode(['ok'=>false,'msg'=>'请输入有效金额']);
        exit;
    }
    if ($betAmount > $role->money) {
        echo json_encode(['ok'=>false,'msg'=>'铜币不足！']);
        exit;
    }
    if ($betAmount > $casinoLimit) {
        echo json_encode(['ok'=>false,'msg'=>'超过今日限额！剩余：'.formatMoney($casinoLimit)]);
        exit;
    }
    
    $dice1 = mt_rand(1, 6);
    $dice2 = mt_rand(1, 6);
    $total = $dice1 + $dice2;
    $isBig = $total >= 7;
    $isWin = ($choice === 'big' && $isBig) || ($choice === 'small' && !$isBig);
    
    $role->casinoBet($betAmount);
    
    if ($isWin) {
        $winAmount = $betAmount * 2;
        $role->gainMoney($winAmount);
        $msg = "恭喜！赢了 {$winAmount} 铜币！";
    } else {
        $role->spendMoney($betAmount);
        $msg = "可惜！输了 {$betAmount} 铜币";
    }
    
    $newLimit = $role->getCasinoLimit();
    
    echo json_encode([
        'ok'=>true,
        'dice1'=>$dice1, 'dice2'=>$dice2, 'total'=>$total,
        'isBig'=>$isBig, 'choice'=>$choice, 'isWin'=>$isWin,
        'dice1_face'=>$diceFaces[$dice1], 'dice2_face'=>$diceFaces[$dice2],
        'msg'=>$msg, 'money'=>$role->money, 'limit'=>$newLimit
    ]);
    exit;
}

// GET: 返回赌场信息
$casinoLimit = $role->getCasinoLimit();
echo json_encode(['money'=>$role->money,'limit'=>$casinoLimit]);

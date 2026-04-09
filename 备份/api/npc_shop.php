<?php
/**
 * NPC商店 API - 弹窗化
 */
require_once __DIR__ . '/../inc/functions.php';
$role = requireLogin();
header('Content-Type: application/json; charset=utf-8');

$npcId = (int)($_GET['npc'] ?? 0);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $itemId = (int)($_POST['buy_id'] ?? 0);
    $qty = max(1, (int)($_POST['qty'] ?? 1));
    
    if ($npcId > 0) {
        $item = db()->getOne(
            "SELECT i.* FROM item i INNER JOIN npc_shop_item nsi ON i.id = nsi.item_id WHERE i.id = ? AND nsi.npc_id = ? AND i.price_buy > 0",
            [$itemId, $npcId]
        );
    } else {
        $item = db()->getOne("SELECT * FROM item WHERE id = ? AND price_buy > 0", [$itemId]);
    }
    
    if (!$item) {
        echo json_encode(['ok'=>false,'msg'=>'物品不存在或该商店不出售']);
        exit;
    }
    if ($role->level < $item['level_req']) {
        echo json_encode(['ok'=>false,'msg'=>'等级不足，需要 Lv.'.$item['level_req']]);
        exit;
    }
    $totalCost = $item['price_buy'] * $qty;
    if ($role->money < $totalCost) {
        echo json_encode(['ok'=>false,'msg'=>'铜币不足！需要 '.formatMoney($totalCost).' 铜币']);
        exit;
    }
    
    $existing = db()->getOne("SELECT * FROM inventory WHERE user_id = ? AND item_id = ? AND equipped = 0", [$role->id, $itemId]);
    if ($existing) {
        db()->update('inventory', ['quantity' => $existing['quantity'] + $qty], '`id` = ?', [$existing['id']]);
    } else {
        db()->insert('inventory', ['user_id' => $role->id, 'item_id' => $itemId, 'quantity' => $qty, 'equipped' => 0]);
    }
    $role->spendMoney($totalCost);
    $role->updateCollectQuests();
    echo json_encode(['ok'=>true,'msg'=>'购买 '.$item['name'].' ×'.$qty.'，花费 '.formatMoney($totalCost).' 铜币','money'=>$role->money]);
    exit;
}

// GET: 返回商品列表
if ($npcId > 0) {
    $items = db()->getAll(
        "SELECT i.* FROM item i INNER JOIN npc_shop_item nsi ON i.id = nsi.item_id WHERE nsi.npc_id = ? AND i.price_buy > 0 ORDER BY i.type, i.id",
        [$npcId]
    );
} else {
    $items = db()->getAll("SELECT * FROM item WHERE price_buy > 0 ORDER BY type, id");
}

echo json_encode(['money'=>$role->money,'items'=>$items]);

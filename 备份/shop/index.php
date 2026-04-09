<?php
require_once __DIR__ . '/../inc/functions.php';
$role = requireLogin();
$tab = $_GET['tab'] ?? 'buy';
$msg = ''; $msgType = '';

// ========== NPC商品分销：获取当前NPC ==========
$npcId = (int)($_GET['npc'] ?? 0);
$shopNpc = null;
if ($npcId > 0) {
    $shopNpc = db()->getOne("SELECT n.*, p.name AS place_name, m.name AS city_name 
                             FROM `npc` n 
                             LEFT JOIN `place` p ON n.place_id = p.id 
                             LEFT JOIN `map` m ON p.city_id = m.id 
                             WHERE n.id = ?", [$npcId]);
} elseif ($role->place_id > 0) {
    // 无npc参数时，根据用户当前位置自动匹配商店NPC
    $shopNpc = db()->getOne("SELECT n.*, p.name AS place_name, m.name AS city_name 
                             FROM `npc` n 
                             LEFT JOIN `place` p ON n.place_id = p.id 
                             LEFT JOIN `map` m ON p.city_id = m.id 
                             WHERE n.place_id = ? AND n.type = 1 
                             LIMIT 1", [$role->place_id]);
    if ($shopNpc) $npcId = (int)$shopNpc['id'];
}

// ========== 根据NPC获取商品列表 ==========
if ($shopNpc) {
    $shopItems = db()->getAll(
        "SELECT i.* FROM `item` i 
         INNER JOIN `npc_shop_item` nsi ON i.id = nsi.item_id 
         WHERE nsi.npc_id = ? AND i.price_buy > 0 
         ORDER BY i.type, i.id", [$npcId]);
} else {
    // 兼容旧链接（无NPC参数时显示全部可购物品）
    $shopItems = db()->getAll("SELECT * FROM `item` WHERE `price_buy` > 0 ORDER BY `type`, `id`");
}

$npcParam = $npcId > 0 ? '&npc=' . $npcId : '';

if (isPost() && isset($_POST['buy_id'])) {
    $itemId = (int)$_POST['buy_id'];
    $qty = max(1, (int)($_POST['qty'] ?? 1));
    // 验证该NPC确实售卖此物品
    if ($shopNpc) {
        $item = db()->getOne(
            "SELECT i.* FROM `item` i 
             INNER JOIN `npc_shop_item` nsi ON i.id = nsi.item_id 
             WHERE i.id = ? AND nsi.npc_id = ? AND i.price_buy > 0", [$itemId, $npcId]);
    } else {
        $item = db()->getOne("SELECT * FROM `item` WHERE `id` = ? AND `price_buy` > 0", [$itemId]);
    }
    if (!$item) { $msg = '物品不存在或该商店不售卖'; $msgType = 'error'; }
    elseif ($role->level < $item['level_req']) { $msg = '等级不足，需要 Lv.'.$item['level_req']; $msgType = 'error'; }
    else {
        $totalCost = $item['price_buy'] * $qty;
        if ($role->money < $totalCost) { $msg = '铜币不足！需要 '.formatMoney($totalCost).' 铜币'; $msgType = 'error'; }
        else {
            $existing = db()->getOne("SELECT * FROM `inventory` WHERE `user_id` = ? AND `item_id` = ? AND `equipped` = 0", [$role->id, $itemId]);
            if ($existing) { db()->update('inventory', ['quantity' => $existing['quantity'] + $qty], '`id` = ?', [$existing['id']]); }
            else { db()->insert('inventory', ['user_id' => $role->id, 'item_id' => $itemId, 'quantity' => $qty, 'equipped' => 0]); }
            $role->spendMoney($totalCost);
            $role->updateCollectQuests();
            $msg = '购买 '.$item['name'].' ×'.$qty.'，花费 '.formatMoney($totalCost).' 铜币'; $msgType = 'success';
        }
    }
}

if (isPost() && isset($_POST['sell_id'])) {
    $invId = (int)$_POST['sell_id'];
    $qty = max(1, (int)($_POST['qty'] ?? 1));
    $inv = db()->getOne("SELECT inv.*, i.name, i.price_sell FROM `inventory` inv JOIN `item` i ON inv.item_id = i.id WHERE inv.id = ? AND inv.user_id = ? AND inv.equipped = 0", [$invId, $role->id]);
    if (!$inv) { $msg = '物品不存在'; $msgType = 'error'; }
    elseif ($qty > $inv['quantity']) { $msg = '数量不足，最多可卖'.$inv['quantity'].'个'; $msgType = 'error'; }
    else {
        $totalGain = $inv['price_sell'] * $qty;
        if ($qty == $inv['quantity']) {
            db()->delete('inventory', '`id` = ?', [$invId]);
        } else {
            db()->update('inventory', ['quantity' => $inv['quantity'] - $qty], '`id` = ?', [$invId]);
        }
        $role->gainMoney($totalGain);
        $msg = '出售 '.$inv['name'].' ×'.$qty.'，获得 '.formatMoney($totalGain).' 铜币'; $msgType = 'success';
    }
}

$sellItems = db()->getAll("SELECT inv.id AS inv_id, inv.quantity, i.* FROM `inventory` inv JOIN `item` i ON inv.item_id = i.id WHERE inv.user_id = ? AND inv.equipped = 0 AND i.price_sell > 0 ORDER BY i.type, i.id", [$role->id]);
renderHeader('商店');
?>
<style>
.shop-list-wrap {
    padding-bottom: 56px;
    max-height: calc(100vh - 200px);
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    margin-bottom: 8px;
}
.shop-item {
    display: flex;
    align-items: center;
    padding: 8px 10px;
    border-bottom: 1px solid rgba(226,183,20,0.06);
}
.shop-item:last-child { border-bottom: none; }
.shop-item-left {
    flex: 1;
    min-width: 0;
}
.shop-item-right {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
}
.qty-ctrl {
    display: inline-flex;
    align-items: center;
    border: 1px solid #ddd;
    border-radius: 4px;
    overflow: hidden;
}
.qty-ctrl button {
    width: 26px;
    height: 26px;
    border: none;
    background: #f5f5f5;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #333;
}
.qty-ctrl button:active { background: #e0e0e0; }
.qty-ctrl input {
    width: 36px;
    height: 26px;
    border: none;
    border-left: 1px solid #ddd;
    border-right: 1px solid #ddd;
    text-align: center;
    font-size: 12px;
    -moz-appearance: textfield;
    outline: none;
}
.qty-ctrl input::-webkit-outer-spin-button,
.qty-ctrl input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
</style>

<div class="location-bar">
    <div class="location-name">🏪 <?php echo $shopNpc ? e($shopNpc['name']) : '商店'; ?></div>
    <?php if ($shopNpc): ?>
    <div class="location-path">📍 <?php echo e($shopNpc['city_name'] ?? ''); ?> · 💰 铜币：<span class="text-gold"><?php echo formatMoney($role->money); ?></span></div>
    <?php else: ?>
    <div class="location-path">💰 铜币：<span class="text-gold"><?php echo formatMoney($role->money); ?></span></div>
    <?php endif; ?>
</div>

<?php if ($msg): ?>
<div class="card" style="border-color:<?php echo $msgType=='error'?'#e74c3c':'#27ae60'; ?>;padding:6px 10px;margin-bottom:6px;">
    <p style="color:<?php echo $msgType=='error'?'#ff6b6b':'#27ae60'; ?>;font-size:12px;margin:0;">
        <?php echo $msgType=='error'?'❌':'✅'; ?> <?php echo e($msg); ?>
    </p>
</div>
<?php endif; ?>

<!-- Tab切换 -->
<div class="tab-bar">
    <a href="/shop/index.php?tab=buy<?php echo $npcParam; ?>" class="btn <?php echo $tab=='buy'?'btn-primary':'btn-secondary'; ?>">
🏪购买</a>
    <a href="/shop/index.php?tab=sell<?php echo $npcParam; ?>" class="btn <?php echo $tab=='sell'?'btn-primary':'btn-secondary'; ?>">
💰出售</a>
</div>

<?php if ($tab == 'buy'): ?>
<div class="shop-list-wrap">
<?php if (empty($shopItems)): ?>
<div class="card"><div class="empty-state">这个商人暂时没有货物出售</div></div>
<?php else: ?>
<?php foreach ($shopItems as $item): ?>
<div class="shop-item">
    <div class="shop-item-left">
        <div>
            <span class="item-name" style="font-size:13px;"><?php echo e($item['name']); ?></span>
            <?php if ($item['level_req'] > 1): ?><span class="text-muted" style="font-size:10px;"> Lv.<?php echo $item['level_req']; ?></span><?php endif; ?>
        </div>
        <div class="item-desc" style="font-size:11px;">
            <?php echo e($item['description']); ?>
            <?php if ($item['atk'] > 0): ?> · ⚔️攻+<?php echo $item['atk']; ?><?php endif; ?>
            <?php if ($item['def_val'] > 0): ?> · 🛡️防+<?php echo $item['def_val']; ?><?php endif; ?>
            <?php if ($item['hp'] > 0): ?> · ❤️回<?php echo $item['hp']; ?>HP<?php endif; ?>
        </div>
        <div style="font-size:12px;color:#e67e22;font-weight:600;margin-top:2px;"><?php echo formatMoney($item['price_buy']); ?> 铜</div>
    </div>
    <div class="shop-item-right">
        <form method="POST" action="/shop/index.php?tab=buy<?php echo $npcParam; ?>" style="display:flex;align-items:center;gap:4px;">
            <input type="hidden" name="buy_id" value="<?php echo $item['id']; ?>">
            <div class="qty-ctrl">
                <button type="button" onclick="this.parentElement.querySelector('input').stepDown()">−</button>
                <input type="number" name="qty" value="1" min="1" max="99">
                <button type="button" onclick="this.parentElement.querySelector('input').stepUp()">+</button>
            </div>
            <button type="submit" class="btn btn-success" style="padding:5px 12px;font-size:11px;">购买</button>
        </form>
    </div>
</div>
<?php endforeach; ?>
<?php endif; ?>
</div>

<?php else: ?>
<div class="shop-list-wrap">
<?php if (empty($sellItems)): ?>
<div class="card"><div class="empty-state">没有可出售的物品</div></div>
<?php else: ?>
<?php foreach ($sellItems as $item): ?>
<div class="shop-item">
    <div class="shop-item-left">
        <div>
            <span class="item-name" style="font-size:13px;"><?php echo e($item['name']); ?></span>
            <span class="text-gold" style="font-size:10px;"> ×<?php echo $item['quantity']; ?></span>
        </div>
        <div class="item-desc" style="font-size:11px;">
            <?php echo e($item['description']); ?>
        </div>
        <div style="font-size:12px;color:#27ae60;font-weight:600;margin-top:2px;"><?php echo formatMoney($item['price_sell']); ?> 铜/个</div>
    </div>
    <div class="shop-item-right">
        <form method="POST" action="/shop/index.php?tab=sell<?php echo $npcParam; ?>" style="display:flex;align-items:center;gap:4px;">
            <input type="hidden" name="sell_id" value="<?php echo $item['inv_id']; ?>">
            <div class="qty-ctrl">
                <button type="button" onclick="this.parentElement.querySelector('input').stepDown()">−</button>
                <input type="number" name="qty" value="<?php echo $item['quantity']; ?>" min="1" max="<?php echo $item['quantity']; ?>">
                <button type="button" onclick="this.parentElement.querySelector('input').stepUp()">+</button>
            </div>
            <button type="submit" class="btn btn-danger" style="padding:5px 12px;font-size:11px;">出售</button>
        </form>
    </div>
</div>
<?php endforeach; ?>
<?php endif; ?>
</div>
<?php endif; ?>

<?php if ($shopNpc): ?>
<a href="/map/index.php" class="btn btn-secondary btn-block mt-10">← 返回<?php echo e($shopNpc['name']); ?></a>
<?php else: ?>
<a href="/map/index.php" class="btn btn-secondary btn-block mt-10">← 返回地图</a>
<?php endif; ?>

<?php renderFooter(); ?>

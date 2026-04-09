<?php
/**
 * 纵横四海 - 背包/物品
 */
require_once __DIR__ . '/../inc/functions.php';

$role = requireLogin();

// 处理使用物品
if (isPost() && isset($_POST['use_id'])) {
    $invId = (int)$_POST['use_id'];
    $inv = db()->getOne(
        "SELECT inv.*, i.name, i.type, i.subtype, i.atk, i.def_val, i.hp AS item_hp FROM `inventory` inv
         JOIN `item` i ON inv.item_id = i.id
         WHERE inv.id = ? AND inv.user_id = ?",
        [$invId, $role->id]
    );
    if ($inv && $inv['equipped'] == 0) {
        if ($inv['subtype'] === 'consumable') {
            if ($inv['item_hp'] > 0) {
                $role->heal($inv['item_hp']);
            }
            if ($inv['quantity'] > 1) {
                db()->update('inventory', ['quantity' => $inv['quantity'] - 1], '`id` = ?', [$invId]);
            } else {
                db()->delete('inventory', '`id` = ?', [$invId]);
            }
            redirect('/user/inventory.php?msg=used');
        } elseif ($inv['subtype'] === 'weapon' || $inv['subtype'] === 'armor') {
            db()->update('inventory', ['equipped' => 0], "`user_id` = ? AND `equipped` = 1 AND `item_id` IN (SELECT id FROM `item` WHERE `subtype` = ?)", [$role->id, $inv['subtype']]);
            db()->update('inventory', ['equipped' => 1], '`id` = ?', [$invId]);
            redirect('/user/inventory.php?msg=equipped');
        }
    }
}

// 获取背包物品
$items = db()->getAll(
    "SELECT inv.id AS inv_id, inv.quantity, inv.equipped, inv.enhance_level, i.* FROM `inventory` inv
     JOIN `item` i ON inv.item_id = i.id
     WHERE inv.user_id = ? AND inv.equipped = 0
     ORDER BY i.type, i.id",
    [$role->id]
);

$itemTypes = [
    'weapon' => ['name' => '🗡️武器', 'color' => '#e74c3c'],
    'armor' => ['name' => '🛡️防具', 'color' => '#3498db'],
    'consumable' => ['name' => '🧪消耗', 'color' => '#27ae60'],
    'material' => ['name' => '📦材料', 'color' => '#e2b714'],
    'other' => ['name' => '📋其他', 'color' => '#8a7a5a'],
];

$msg = $_GET['msg'] ?? '';

renderHeader('背包');
?>

<div class="location-bar">
    <div class="location-name">🎒 背包</div>
    <div class="location-path">物品：<?php echo count($items); ?>种</div>
</div>

<?php if ($msg == 'used'): ?>
<div class="card" style="border-color:#27ae60;padding:3px 8px;">
    <p class="text-green" style="font-size:11px;margin:0;">✅ 物品使用成功！</p>
</div>
<?php elseif ($msg == 'equipped'): ?>
<div class="card" style="border-color:#3498db;padding:3px 8px;">
    <p style="color:#3498db;font-size:11px;margin:0;">✅ 装备成功！</p>
</div>
<?php endif; ?>

<?php if (empty($items)): ?>
<div class="card">
    <div class="empty-state">🎒 背包空空如也</div>
    
</div>
<?php else: ?>
<?php foreach ($items as $item): ?>
<?php
$el = (int)($item['enhance_level'] ?? 0);
$enhanceMult = 1 + $el * 0.03;
$effAtk = (int)round($item['atk'] * $enhanceMult);
$effDef = (int)round($item['def_val'] * $enhanceMult);
?>
<div class="card" style="padding:4px 8px;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="display:flex;align-items:center;gap:4px;">
            <span class="item-name"><?php echo e($item['name']); ?></span>
            <?php if ($el > 0): ?><span style="color:#e2b714;font-size:11px;">+<?php echo $el; ?></span><?php endif; ?>
            <?php if ($item['quantity'] > 1): ?><span class="text-gold" style="font-size:11px;">×<?php echo $item['quantity']; ?></span><?php endif; ?>
        </div>
        <span style="font-size:10px;color:<?php echo $itemTypes[$item['subtype']]['color'] ?? '#8a7a5a'; ?>">
            <?php echo $itemTypes[$item['subtype']]['name'] ?? '其他'; ?>
        </span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:2px;">
        <span class="item-desc">
            <?php if ($item['atk'] > 0): ?>攻+<?php echo $effAtk; ?><?php endif; ?>
            <?php if ($item['def_val'] > 0): ?>防+<?php echo $effDef; ?><?php endif; ?>
            <?php if ($item['hp'] > 0): ?>❤️+<?php echo $item['hp']; ?><?php endif; ?>
        </span>
        <span class="item-actions">
            <?php if ($item['subtype'] === 'consumable'): ?>
            <form method="POST" action="/user/inventory.php" style="display:inline;">
                <input type="hidden" name="use_id" value="<?php echo $item['inv_id']; ?>">
                <button type="submit" class="btn btn-success btn-small">使用</button>
            </form>
            <?php elseif ($item['subtype'] === 'weapon' || $item['subtype'] === 'armor'): ?>
            <form method="POST" action="/user/inventory.php" style="display:inline;">
                <input type="hidden" name="use_id" value="<?php echo $item['inv_id']; ?>">
                <button type="submit" class="btn btn-primary btn-small">装备</button>
            </form>
            <?php endif; ?>
        </span>
    </div>
</div>
<?php endforeach; ?>
<?php endif; ?>

<a href="/user/equipment.php" class="btn btn-secondary btn-block mt-4">⚔️ 查看装备</a>

<?php renderFooter(); ?>

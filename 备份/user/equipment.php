<?php
require_once __DIR__ . '/../inc/functions.php';
$role = requireLogin();
if (isset($_GET['unequip'])) {
    $invId = (int)$_GET['unequip'];
    $inv = db()->getOne("SELECT * FROM `inventory` WHERE `id` = ? AND `user_id` = ? AND `equipped` = 1", [$invId, $role->id]);
    if ($inv) {
        db()->update('inventory', ['equipped' => 0], '`id` = ?', [$invId]);
        redirect('/user/equipment.php?msg=unequipped');
    }
}
$equipped = db()->getAll(
    "SELECT inv.id AS inv_id, inv.quantity, inv.enhance_level, i.* FROM `inventory` inv JOIN `item` i ON inv.item_id = i.id WHERE inv.user_id = ? AND inv.equipped = 1 ORDER BY i.subtype, i.id", [$role->id]
);
$stats = $role->getEffectiveStats();
$msg = $_GET['msg'] ?? '';
renderHeader('装备管理');
?>
<div class="location-bar">
    <div class="location-name">⚔️ 装备管理</div>
    <div class="location-path">已装备 <?php echo count($equipped); ?> 件</div>
</div>
<?php if ($msg == 'unequipped'): ?>
<div class="card" style="border-color:#e2b714;padding:3px 8px;"><p class="text-gold" style="font-size:11px;margin:0;">✅ 已卸下装备</p></div>
<?php endif; ?>
<div class="card">
    <div class="card-title">📊 总属性</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;font-size:12px;">
        <span style="color:#c4a87c;">⚔️ 攻击力</span><span style="text-align:right;"><?php echo $stats['atk_min']; ?>-<?php echo $stats['atk_max']; ?> <?php $b=$stats['atk_min']-$role->atk_min; if($b>0): ?><span class="text-green" style="font-size:10px;">(+<?php echo $b; ?>)</span><?php endif; ?></span>
        <span style="color:#c4a87c;">🛡️ 防御力</span><span style="text-align:right;"><?php echo $stats['def']; ?> <?php $b=$stats['def']-$role->def; if($b>0): ?><span class="text-green" style="font-size:10px;">(+<?php echo $b; ?>)</span><?php endif; ?></span>
    </div>
</div>
<?php if (empty($equipped)): ?>
<div class="card"><div class="empty-state">没有装备任何物品</div></div>
<?php else: ?>
<?php foreach ($equipped as $eq): ?>
<?php $el=(int)($eq['enhance_level']??0);$enhanceMult=1+$el*0.03;$effAtk=(int)round($eq['atk']*$enhanceMult);$effDef=(int)round($eq['def_val']*$enhanceMult); ?>
<div class="card" style="padding:4px 8px;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
        <span class="item-name"><?php echo $eq['subtype']==='weapon'?'🗡️':'🛡️'; ?> <?php echo e($eq['name']); ?><?php if($el>0):?> <span style="color:#e2b714;font-weight:bold;">+<?php echo $el; ?></span><?php endif; ?></span>
        <a href="/user/equipment.php?unequip=<?php echo $eq['inv_id']; ?>" class="btn btn-danger btn-small" onclick="return confirm('确认卸下?');">卸下</a>
    </div>
    <div class="item-desc" style="margin-top:2px;">
        <?php if($eq['atk']>0):?>⚔️攻+<?php echo $effAtk; ?><?php endif; ?>
        <?php if($eq['def_val']>0):?>🛡️防+<?php echo $effDef; ?><?php endif; ?>
    </div>
</div>
<?php endforeach; ?>
<?php endif; ?>
<div style="display:flex;gap:4px;" class="mt-4">
    <a href="/user/inventory.php" class="btn btn-secondary" style="flex:1;">🎒 背包</a>
    <a href="/user/status.php" class="btn btn-secondary" style="flex:1;">👤 状态</a>
</div>
<?php renderFooter(); ?>

<?php
/**
 * 纵横四海 - 查看其他玩家
 */
require_once __DIR__ . '/../inc/functions.php';

$role = requireLogin();

$targetId = (int)($_GET['id'] ?? 0);
if ($targetId <= 0) {
    showError('无效的玩家ID', '/map/index.php');
}

$target = new Role();
if (!$target->loadById($targetId)) {
    showError('该玩家不存在', '/map/index.php');
}

// 获取目标装备
$equipped = db()->getAll(
    "SELECT i.*, inv.quantity FROM `inventory` inv
     JOIN `item` i ON inv.item_id = i.id
     WHERE inv.user_id = ? AND inv.equipped = 1",
    [$target->id]
);

// 战斗统计
$winCount = db()->getVar("SELECT COUNT(*) FROM `battle_log` WHERE `user_id` = ? AND `result` = 1", [$target->id]);
$battleCount = db()->getVar("SELECT COUNT(*) FROM `battle_log` WHERE `user_id` = ?", [$target->id]);

renderHeader('查看 - ' . $target->username);
?>

<div class="location-bar">
    <div class="location-name"><?php echo ($target->sex == 2) ? '♀' : '♂'; ?> <?php echo e($target->username); ?></div>
    <div class="location-path">Lv.<?php echo $target->level; ?> · <?php echo $target->getSexText(); ?></div>
</div>

<div class="card">
    <div class="card-title">📊 角色属性</div>
    <table style="width:100%;font-size:14px;">
        <tr>
            <td style="padding:6px 0;color:#c4a87c;">❤️ 生命值</td>
            <td style="text-align:right;"><?php echo $target->hp; ?>/<?php echo $target->hp_max; ?></td>
        </tr>
        <tr>
            <td style="padding:6px 0;color:#c4a87c;">⚔️ 攻击力</td>
            <td style="text-align:right;"><?php echo $target->atk_min; ?> - <?php echo $target->atk_max; ?></td>
        </tr>
        <tr>
            <td style="padding:6px 0;color:#c4a87c;">🛡️ 防御力</td>
            <td style="text-align:right;"><?php echo $target->def; ?></td>
        </tr>
        <tr>
            <td style="padding:6px 0;color:#c4a87c;">💨 敏捷</td>
            <td style="text-align:right;"><?php echo $target->agility; ?></td>
        </tr>
    </table>
</div>

<?php if (!empty($equipped)): ?>
<div class="card">
    <div class="card-title">🗡️ 已装备</div>
    <?php foreach ($equipped as $eq): ?>
    <div style="padding:4px 0;font-size:14px;">
        <?php echo e($eq['name']); ?>
        <?php if ($eq['atk'] > 0): ?><span class="text-green">攻+<?php echo $eq['atk']; ?></span><?php endif; ?>
        <?php if ($eq['def_val'] > 0): ?><span class="text-green">防+<?php echo $eq['def_val']; ?></span><?php endif; ?>
    </div>
    <?php endforeach; ?>
</div>
<?php endif; ?>

<div class="card">
    <div class="card-title">📈 统计</div>
    <p style="font-size:14px;color:#c4a87c;">
        ⚔️ 总战斗 <?php echo $battleCount; ?> 场 · 🏆 胜利 <?php echo $winCount; ?> 场
    </p>
</div>

<a href="/map/index.php" class="btn btn-secondary btn-block mt-10">← 返回地图</a>

<?php renderFooter(); ?>

<?php
/**
 * 纵横四海 - 附近玩家
 */
require_once __DIR__ . '/../inc/functions.php';

$role = requireLogin();
$nearby = $role->getNearby();
$place = $role->getPlace();

renderHeader('附近玩家');
?>

<div class="location-bar">
    <div class="location-name">👥 附近玩家</div>
    <div class="location-path"><?php echo e($place['name']); ?></div>
</div>

<div class="card">
    <?php if (empty($nearby)): ?>
    <div class="empty-state">附近没有其他冒险者</div>
    <?php else: ?>
    <p class="text-muted" style="font-size:13px;margin-bottom:10px;">找到 <?php echo count($nearby); ?> 名冒险者</p>
    <ul class="player-list">
        <?php foreach ($nearby as $p): ?>
        <li style="padding:10px 0;">
            <div>
                <a href="/user/view.php?id=<?php echo $p['id']; ?>" class="player-name" style="font-size:15px;">
                    <?php echo ($p['sex'] == 2) ? '♀' : '♂'; ?>
                    <?php echo e($p['username']); ?>
                </a>
                <span class="player-level">Lv.<?php echo $p['level']; ?></span>
            </div>
            <div style="font-size:13px;margin-top:4px;">
                ❤️ <?php echo $p['hp']; ?>/<?php echo $p['hp_max']; ?>
                <div class="status-bar bar-hp" style="margin-top:3px;">
                    <div class="bar-track" style="height:8px;">
                        <div class="bar-fill" style="width:<?php echo round(($p['hp']/$p['hp_max'])*100); ?>%;"></div>
                    </div>
                </div>
            </div>
        </li>
        <?php endforeach; ?>
    </ul>
    <?php endif; ?>
</div>

<a href="/map/index.php" class="btn btn-secondary btn-block mt-10">← 返回地图</a>

<?php renderFooter(); ?>

<?php
/**
 * 纵横四海 - 战斗结果
 */
require_once __DIR__ . '/../inc/functions.php';

$role = requireLogin();

$battleKey = 'battle_' . $role->id;
$battle = $_SESSION[$battleKey] ?? null;

if (!$battle || !isset($battle['result'])) {
    redirect('/map/index.php');
}

$result = $battle['result'];
$lastMonsterId = (int)($battle['monster_id'] ?? 0);
unset($_SESSION[$battleKey]);

// 重新加载角色数据（可能已更新）
$role = getCurrentRole();

renderHeader('战斗结果');
?>
<style>
.battle-block-bar{position:fixed;left:0;right:0;z-index:200;pointer-events:auto}
.battle-block-top{top:0;height:36px;background:rgba(22,33,62,0.95);display:flex;align-items:center;justify-content:center;font-size:12px;color:#e74c3c;border-bottom:1px solid rgba(231,76,60,0.3)}
.battle-block-bottom{bottom:0;height:48px;background:rgba(22,33,62,0.95);border-top:1px solid rgba(231,76,60,0.3)}
</style>
<?php
?>

<div class="location-bar">
    <div class="location-name">⚔️ 战斗结束</div>
    <div class="location-path">共 <?php echo $battle['round']; ?> 回合</div>
</div>

<?php if ($result === 'win'): ?>
<!-- 胜利 -->
<div class="card" style="border-color:#27ae60;">
    <div class="card-title" style="color:#27ae60;">🏆 胜利！</div>
    <p style="font-size:16px;">你成功击败了 <strong><?php echo e($battle['monster_name']); ?></strong>！</p>
    <div class="divider"></div>
    <p>✨ 获得经验：<span class="text-gold">+<?php echo $battle['exp_gained']; ?></span></p>
    <p>💰 获得铜币：<span class="text-gold">+<?php echo $battle['money_gained']; ?></span></p>
</div>


<?php elseif ($result === 'capture'): ?>
<!-- 捕捉成功 -->
<div class="card" style="border-color:#e2b714;">
    <div class="card-title" style="color:#e2b714;">🎉 捕捉成功</div>
    <p style="font-size:16px;"><strong><?php echo e($battle['monster_name']); ?></strong> 成为了你的伙伴！</p>
    <div class="divider"></div>
    <p>🐾 宠物等级：Lv.1</p>
</div>
<?php elseif ($result === 'lose'): ?>
<!-- 失败 -->
<div class="card" style="border-color:#e74c3c;">
    <div class="card-title" style="color:#e74c3c;">💀 战败</div>
    <p style="font-size:16px;">你被 <strong><?php echo e($battle['monster_name']); ?></strong> 击败了……</p>
    <div class="divider"></div>
    <p>你被传送回了威尼斯酒馆</p>
    <p>当前体力：<span class="text-red"><?php echo $role->hp; ?>/<?php echo $role->hp_max; ?></span></p>
</div>

<?php endif; ?>

<!-- 战斗日志 -->
<div class="card">
    <div class="card-title">📜 战斗回顾</div>
    <div class="battle-log">
        <?php foreach ($battle['log'] as $log): ?>
        <div class="log-line log-<?php echo $log['type']; ?>"><?php echo e($log['text']); ?></div>
        <?php endforeach; ?>
    </div>
</div>

<div class="text-center mt-20">
    <?php if ($result !== 'capture'): ?><a href="/battle/index.php?monster_id=<?php echo $lastMonsterId; ?>" class="btn btn-danger">⚔️ 继续战斗</a>
    <a href="/map/index.php" class="btn btn-secondary" style="margin-top:8px;">🗺️ 返回地图</a>
    <?php endif; ?>
</div>


<div class="battle-block-bar battle-block-top">⚔️ 战斗中</div>
<div class="battle-block-bar battle-block-bottom"></div>
<?php renderFooter(); ?>

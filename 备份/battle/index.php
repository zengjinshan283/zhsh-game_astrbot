<?php
/**
 * 纵横四海 - 怪物互动页面
 */
require_once __DIR__ . '/../inc/functions.php';
$role = requireLogin();
if ($role->hp <= 0) { showError('你已经倒下了，请回酒店休息。', '/map/index.php'); }

$monsterId = (int)($_GET['monster_id'] ?? 0);
$monster = db()->getOne("SELECT * FROM `monster` WHERE `id` = ?", [$monsterId]);
if (!$monster) { showError('怪物不存在', '/map/index.php'); }

// 验证怪物在当前地点
$place = $role->getPlace();
$placeMonsters = db()->getAll("SELECT * FROM `monster` WHERE `place_id` = ? OR `place_id` = 0 ORDER BY `id`", [$place['id']]);
$validIds = array_column($placeMonsters, 'id');
if (!in_array($monster['id'], $validIds)) { showError('这个地点没有这个怪物', '/map/index.php'); }

// 检查是否有可捕捉的宠物
$pet = $role->getPet();
$petBattleAtk = $role->getPetBattleAtk();

renderHeader('遭遇 - ' . $monster['name']);
?>
<style>
.interact-panel {
    text-align: center;
    padding: 20px 10px;
}
.interact-monster {
    font-size: 48px;
    margin-bottom: 8px;
}
.interact-name {
    font-size: 18px;
    font-weight: bold;
    color: #f5e6c8;
    margin-bottom: 4px;
}
.interact-stats {
    font-size: 11px;
    color: #8a7a5a;
    margin-bottom: 16px;
    line-height: 1.6;
}
.interact-desc {
    font-size: 12px;
    color: #c4a87c;
    margin-bottom: 20px;
    line-height: 1.6;
    font-style: italic;
}
.interact-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 280px;
    margin: 0 auto;
}
.interact-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 16px;
    border-radius: 8px;
    text-decoration: none;
    font-size: 14px;
    font-weight: bold;
    -webkit-tap-highlight-color: transparent;
}
.interact-btn:active { transform: scale(0.97); }
.interact-btn .btn-icon { font-size: 20px; }
.btn-battle {
    background: linear-gradient(135deg, #e74c3c, #c0392b);
    color: #fff;
    box-shadow: 0 2px 8px rgba(231,76,60,0.3);
}
.btn-capture {
    background: linear-gradient(135deg, #3498db, #2980b9);
    color: #fff;
    box-shadow: 0 2px 8px rgba(52,152,219,0.3);
}
.btn-back {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    color: #8a7a5a;
    font-size: 12px;
    font-weight: normal;
}
.capture-note {
    font-size: 10px;
    color: #8a7a5a;
    margin-top: 4px;
}
</style>

<div class="card" style="border-color:rgba(231,76,60,0.3);">
    <div class="interact-panel">
        <div class="interact-monster">👾</div>
        <div class="interact-name"><?php echo e($monster['name']); ?></div>
        <div class="interact-stats">
            ❤️ HP <?php echo $monster['hp']; ?> · ⚔️ <?php echo $monster['atk_min']; ?>-<?php echo $monster['atk_max']; ?> · 🛡️ <?php echo $monster['def']; ?><br>
            🎁 +<?php echo $monster['exp_reward']; ?>exp · 🪙 +<?php echo $monster['money_reward_min']; ?>-<?php echo $monster['money_reward_max']; ?>铜币
        </div>
        <?php if ($monster['description']): ?>
        <div class="interact-desc">「<?php echo e($monster['description']); ?>」</div>
        <?php endif; ?>

        <div class="interact-actions">
            <a href="javascript:void(0)" class="interact-btn btn-battle" onclick="GameWS.battleStart(<?php echo $monster['id']; ?>)">
                <span class="btn-icon">⚔️</span> 挑战
            </a>
<a href="javascript:history.back()" class="interact-btn btn-back">
                ← 返回地图
            </a>
        </div>
    </div>
</div>

<?php renderFooter(); ?>

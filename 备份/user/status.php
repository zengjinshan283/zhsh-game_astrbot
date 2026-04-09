<?php
/**
 * 纵横四海 - 个人状态面板 + 快捷栏设置
 */
require_once __DIR__ . '/../inc/functions.php';

$role = requireLogin();
$place = $role->getPlace();
$stats = $role->getEffectiveStats();

// 处理快捷栏设置
if (isset($_GET['set_slot'])) {
    $slot = (int)$_GET['set_slot'];
    $invId = (int)($_GET['inv_id'] ?? 0);
    if ($slot >= 1 && $slot <= 3) {
        $slotCol = 'shortcut_slot_' . $slot;
        if ($invId > 0) {
            // 验证道具属于玩家且是消耗品
            $inv = db()->getOne("SELECT * FROM `inventory` WHERE `id` = ? AND `user_id` = ? AND `equipped` = 0", [$invId, $role->id]);
            if ($inv) {
                $item = db()->getOne("SELECT * FROM `item` WHERE `id` = ?", [$inv['item_id']]);
                if ($item && $item['subtype'] === 'consumable') {
                    // 清除其他槽位中的同一物品，避免重复绑定
                    for ($j = 1; $j <= 3; $j++) {
                        $otherCol = 'shortcut_slot_' . $j;
                        if ($j !== $slot && (int)$role->$otherCol === $invId) {
                            db()->update('user', [$otherCol => 0], '`id` = ?', [$role->id]);
                        }
                    }
                    db()->update('user', [$slotCol => $invId], '`id` = ?', [$role->id]);
                }
            }
        } else {
            db()->update('user', [$slotCol => 0], '`id` = ?', [$role->id]);
        }
    }
    redirect('/user/status.php');
}

// 获取已装备物品
$equipped = db()->getAll(
    "SELECT i.*, inv.quantity, inv.equipped, inv.enhance_level FROM `inventory` inv
     JOIN `item` i ON inv.item_id = i.id
     WHERE inv.user_id = ? AND inv.equipped = 1",
    [$role->id]
);

// 获取背包物品数量
$invCount = db()->getVar("SELECT COUNT(*) FROM `inventory` WHERE `user_id` = ? AND `equipped` = 0", [$role->id]);

// 战斗统计
$battleCount = db()->getVar("SELECT COUNT(*) FROM `battle_log` WHERE `user_id` = ?", [$role->id]);
$winCount = db()->getVar("SELECT COUNT(*) FROM `battle_log` WHERE `user_id` = ? AND `result` = 1", [$role->id]);

// 宠物信息
$pet = $role->getPet();

// 获取快捷栏道具
$shortcuts = [];
for ($i = 1; $i <= 3; $i++) {
    $col = 'shortcut_slot_' . $i;
    $invId = (int)$role->$col;
    if ($invId > 0) {
        $inv = db()->getOne(
            "SELECT inv.id AS inv_id, inv.quantity, i.name, i.hp AS item_hp FROM `inventory` inv JOIN `item` i ON inv.item_id = i.id WHERE inv.id = ? AND inv.user_id = ? AND inv.equipped = 0",
            [$invId, $role->id]
        );
        if ($inv) {
            $shortcuts[$i] = $inv;
        } else {
            db()->update('user', [$col => 0], '`id` = ?', [$role->id]);
        }
    }
}

// 获取可设置到快捷栏的消耗品
$consumables = db()->getAll(
    "SELECT inv.id AS inv_id, inv.quantity, i.name, i.hp AS item_hp FROM `inventory` inv
     JOIN `item` i ON inv.item_id = i.id
     WHERE inv.user_id = ? AND inv.equipped = 0 AND i.subtype = 'consumable' AND i.hp > 0
     ORDER BY i.hp",
    [$role->id]
);

echo '<style>.main-content{overflow:hidden!important;}</style>';
renderHeader('角色状态');
?>

<div class="location-bar">
    <div class="location-name"><?php echo ($role->sex == 2) ? '♀' : '♂'; ?> <?php echo e($role->username); ?></div>
    <div class="location-path">Lv.<?php echo $role->level; ?> · <?php echo $role->getSexText(); ?><?php echo $pet ? ' · 🐾' . e($pet['nickname']) : ''; ?></div>
</div>

<!-- HP & EXP -->
<div class="card">
    <div class="status-bar bar-hp <?php echo ($role->hp / $role->hp_max < 0.3) ? 'bar-low' : ''; ?>">
        <div class="bar-label">
            <span>❤️ HP</span>
            <span><?php echo $role->hp; ?>/<?php echo $role->hp_max; ?></span>
        </div>
        <div class="bar-track">
            <div class="bar-fill" style="width:<?php echo $role->getHpPercent(); ?>%"></div>
        </div>
    </div>
    <div class="status-bar bar-exp mt-4">
        <div class="bar-label">
            <span>✨ EXP</span>
            <span><?php echo $role->exp; ?>/<?php echo $role->exp_max; ?></span>
        </div>
        <div class="bar-track">
            <div class="bar-fill" style="width:<?php echo $role->getExpPercent(); ?>%"></div>
        </div>
    </div>
</div>

<!-- 属性 -->
<div class="card">
    <div class="card-title">📊 属性</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;font-size:12px;">
        <span style="color:#c4a87c;">⚔️ 攻击力</span>
        <span style="text-align:right;"><?php echo $stats['atk_min']; ?>-<?php echo $stats['atk_max']; ?>
            <?php if ($stats['atk_min'] > $role->atk_min): ?><span class="text-green" style="font-size:10px;">(+<?php echo $stats['atk_min'] - $role->atk_min; ?>)</span><?php endif; ?>
        </span>
        <span style="color:#c4a87c;">🛡️ 防御力</span>
        <span style="text-align:right;"><?php echo $stats['def']; ?>
            <?php if ($stats['def'] > $role->def): ?><span class="text-green" style="font-size:10px;">(+<?php echo $stats['def'] - $role->def; ?>)</span><?php endif; ?>
        </span>
        <span style="color:#c4a87c;">💨 敏捷</span>
        <span style="text-align:right;"><?php echo $role->agility; ?></span>
        <span style="color:#c4a87c;">🪙 铜币</span>
        <span style="text-align:right;" class="text-gold"><?php echo formatMoney($role->money); ?></span>
        <span style="color:#c4a87c;">🏦 存款</span>
        <span style="text-align:right;color:#27ae60;"><?php echo formatMoney($role->bank_money); ?></span>
        <span style="color:#c4a87c;">🪙 金币</span>
        <span style="text-align:right;" class="text-gold"><?php echo $role->gold; ?></span>
    </div>
</div>

<!-- 装备 -->
<?php if (!empty($equipped)): ?>
<div class="card">
    <div class="card-title">⚔️ 已装备</div>
    <?php foreach ($equipped as $eq): ?>
    <?php
    $el = (int)($eq['enhance_level'] ?? 0);
    $enhanceMult = 1 + $el * 0.03;
    ?>
    <div class="compact-row">
        <span class="item-name"><?php echo e($eq['name']); ?><?php if ($el > 0): ?> <span style="color:#e2b714;">+<?php echo $el; ?></span><?php endif; ?></span>
        <span class="text-green" style="font-size:11px;">
            <?php if ($eq['atk'] > 0): ?>攻+<?php echo (int)round($eq['atk'] * $enhanceMult); ?><?php endif; ?>
            <?php if ($eq['def_val'] > 0): ?>防+<?php echo (int)round($eq['def_val'] * $enhanceMult); ?><?php endif; ?>
        </span>
    </div>
    <?php endforeach; ?>
</div>
<?php endif; ?>


<!-- 快捷栏设置 -->
<div class="card">
    <div class="card-title">⚡ 战斗快捷栏</div>
    <div style="display:flex;gap:6px;justify-content:center;">
        <?php for ($i = 1; $i <= 3; $i++): ?>
        <?php if (isset($shortcuts[$i])): ?>
        <a href="/user/status.php?set_slot=<?php echo $i; ?>&inv_id=0" title="点击移除" style="display:flex;flex-direction:column;align-items:center;width:56px;padding:4px 2px;border-radius:6px;border:1px solid rgba(226,183,20,0.3);background:rgba(226,183,20,0.06);text-decoration:none;color:#f5e6c8;">
            <span style="font-size:16px;">💊</span>
            <span style="font-size:9px;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:52px;"><?php echo e($shortcuts[$i]['name']); ?></span>
            <span style="font-size:8px;color:#8a7a5a;">×<?php echo $shortcuts[$i]['quantity']; ?></span>
        </a>
        <?php else: ?>
        <a href="javascript:void(0)" onclick="openSlotPicker(<?php echo $i; ?>)" style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:56px;height:48px;border-radius:6px;border:1px dashed rgba(226,183,20,0.2);background:rgba(255,255,255,0.02);text-decoration:none;color:#555;cursor:pointer;">
            <span style="font-size:16px;">＋</span>
            <span style="font-size:8px;margin-top:1px;">槽<?php echo $i; ?></span>
        </a>
        <?php endif; ?>
        <?php endfor; ?>
    </div>
</div>
<!-- 快捷栏道具选择弹窗 -->
<div class="slot-picker-overlay" id="slotPicker" style="display:none;">
    <div class="slot-picker-bg" onclick="closeSlotPicker()"></div>
    <div class="slot-picker-panel">
        <div class="slot-picker-bar"></div>
        <div class="slot-picker-title" id="slotPickerTitle">选择消耗品 - 槽位1</div>
        <div class="slot-picker-list" id="slotPickerList"></div>
        <div class="slot-picker-empty" id="slotPickerEmpty" style="display:none;">背包中没有可用的消耗品</div>
    </div>
</div>
<script>
var consumables = <?php echo json_encode($consumables); ?>;
function openSlotPicker(slot) {
    var picker = document.getElementById('slotPicker');
    var title = document.getElementById('slotPickerTitle');
    var list = document.getElementById('slotPickerList');
    var empty = document.getElementById('slotPickerEmpty');
    title.textContent = '选择消耗品 - 槽位' + slot;
    list.innerHTML = '';
    if (consumables.length === 0) { empty.style.display = 'block'; }
    else {
        empty.style.display = 'none';
        consumables.forEach(function(c) {
            var a = document.createElement('a');
            a.href = '/user/status.php?set_slot=' + slot + '&inv_id=' + c.inv_id;
            a.className = 'slot-picker-item';
            a.innerHTML = '<span class="spi-icon">💊</span><span class="spi-name">' + c.name + '</span><span class="spi-qty">×' + c.quantity + '</span>';
            list.appendChild(a);
        });
    }
    picker.style.display = 'block';
}
function closeSlotPicker() {
    document.getElementById('slotPicker').style.display = 'none';
}
</script>
<style>
.slot-picker-overlay{position:fixed;top:0;left:0;right:0;bottom:0;z-index:300;}
.slot-picker-bg{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);}
.slot-picker-panel{position:fixed;bottom:48px;left:50%;transform:translateX(-50%);width:100%;max-width:480px;max-height:50vh;max-height:50dvh;background:rgba(26,26,46,0.97);border-radius:12px 12px 0 0;overflow-y:auto;z-index:301;}
.slot-picker-bar{width:36px;height:4px;background:rgba(226,183,20,0.3);border-radius:2px;margin:8px auto 4px;}
.slot-picker-title{font-size:13px;color:#c4a87c;text-align:center;padding:4px 0 8px;border-bottom:1px solid rgba(255,255,255,0.06);}
.slot-picker-list{padding:6px 8px;}
.slot-picker-item{display:flex;align-items:center;gap:8px;padding:10px 8px;border-radius:8px;text-decoration:none;color:#f5e6c8;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);margin-bottom:4px;-webkit-tap-highlight-color:transparent;}
.slot-picker-item:active{background:rgba(226,183,20,0.1);}
.spi-icon{font-size:18px;}
.spi-name{flex:1;font-size:13px;}
.spi-qty{font-size:11px;color:#8a7a5a;}
.slot-picker-empty{text-align:center;color:#555;font-size:12px;padding:24px 0;}
</style>

<!-- 统计 -->
<div class="card" style="padding:6px 10px;">
    <div style="display:flex;justify-content:space-between;font-size:11px;flex-wrap:wrap;gap:2px 12px;">
        <span>⚔️ <?php echo $battleCount; ?>战 <span class="text-green"><?php echo $winCount; ?>胜</span></span>
        <span>🎒 <?php echo $invCount; ?>种</span>
        <span>📍 <?php echo $place ? e($place['name']) : '未知'; ?></span>
        <span class="text-gold">距升级 <?php echo $role->exp_max - $role->exp; ?>exp</span>
    </div>
</div>

<?php renderFooter(); ?>

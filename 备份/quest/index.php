<?php
require_once __DIR__ . '/../inc/functions.php';
$role = requireLogin();
$msg = ''; $msgType = '';
$tab = $_GET['tab'] ?? 'active';

if (isPost() && isset($_POST['accept_quest'])) {
    $questId = (int)$_POST['accept_quest'];
    $quest = db()->getOne("SELECT * FROM `quest` WHERE `id` = ? AND `level_req` <= ?", [$questId, $role->level]);
    if ($quest) {
        $exists = db()->getVar("SELECT COUNT(*) FROM `user_quest` WHERE `user_id` = ? AND `quest_id` = ?", [$role->id, $questId]);
        if ($exists > 0) { $msg = '你已经接了'; $msgType = 'error'; }
        elseif ($quest['pre_quest_id'] > 0) {
            $preDone = db()->getVar("SELECT COUNT(*) FROM `user_quest` WHERE `user_id` = ? AND `quest_id` = ? AND `status` >= 1", [$role->id, $quest['pre_quest_id']]);
            if ($preDone == 0) { $msg = '需要先完成前置任务'; $msgType = 'error'; }
            else { db()->insert('user_quest', ['user_id' => $role->id, 'quest_id' => $questId, 'status' => 0, 'progress' => 0, 'accepted_at' => time()]); $msg = '接取：'.$quest['name']; $msgType = 'success'; }
        } else { db()->insert('user_quest', ['user_id' => $role->id, 'quest_id' => $questId, 'status' => 0, 'progress' => 0, 'accepted_at' => time()]); $msg = '接取：'.$quest['name']; $msgType = 'success'; }
    }
}
if (isPost() && isset($_POST['claim_quest'])) {
    $questId = (int)$_POST['claim_quest'];
    $uq = db()->getOne("SELECT * FROM `user_quest` WHERE `user_id` = ? AND `quest_id` = ? AND `status` = 1", [$role->id, $questId]);
    if ($uq) {
        $quest = db()->getOne("SELECT * FROM `quest` WHERE `id` = ?", [$questId]);
        if ($quest) {
            $rewards = [];
            if ($quest['reward_exp'] > 0) { $leveled = $role->gainExp($quest['reward_exp']); $rewards[] = '经验+'.$quest['reward_exp']; if($leveled) $rewards[] = '🎉升级！'; }
            if ($quest['reward_money'] > 0) { $role->gainMoney($quest['reward_money']); $rewards[] = '铜币+'.$quest['reward_money']; }
            if ($quest['reward_gold'] > 0) { $role->gold += $quest['reward_gold']; db()->update('user', ['gold' => $role->gold], '`id` = ?', [$role->id]); $rewards[] = '金币+'.$quest['reward_gold']; }
            if ($quest['reward_item_id'] > 0 && $quest['reward_item_qty'] > 0) {
                $existing = db()->getOne("SELECT * FROM `inventory` WHERE `user_id` = ? AND `item_id` = ? AND `equipped` = 0", [$role->id, $quest['reward_item_id']]);
                if ($existing) { db()->update('inventory', ['quantity' => $existing['quantity'] + $quest['reward_item_qty']], '`id` = ?', [$existing['id']]); }
                else { db()->insert('inventory', ['user_id' => $role->id, 'item_id' => $quest['reward_item_id'], 'quantity' => $quest['reward_item_qty'], 'equipped' => 0]); }
                $item = db()->getOne("SELECT `name` FROM `item` WHERE `id` = ?", [$quest['reward_item_id']]);
                $rewards[] = ($item?$item['name']:'物品').' x'.$quest['reward_item_qty'];
            }
            db()->update('user_quest', ['status' => 2, 'completed_at' => time()], '`id` = ?', [$uq['id']]);
            $msg = '🎉 任务完成！'.implode('，', $rewards); $msgType = 'success';
        }
    }
}
if (isset($_GET['abandon'])) { $questId = (int)$_GET['abandon']; db()->delete('user_quest', '`user_id` = ? AND `quest_id` = ? AND `status` = 0', [$role->id, $questId]); redirect('/quest/index.php?tab=active&msg=abandoned'); }

$activeQuests = db()->getAll("SELECT q.*, uq.progress, uq.status, uq.accepted_at, n.name AS npc_name FROM `quest` q JOIN `user_quest` uq ON q.id = uq.quest_id LEFT JOIN `npc` n ON q.npc_id = n.id WHERE uq.user_id = ? AND uq.status IN (0, 1) ORDER BY uq.status DESC, q.sort_order", [$role->id]);
$completedQuests = db()->getAll("SELECT q.*, uq.completed_at, n.name AS npc_name FROM `quest` q JOIN `user_quest` uq ON q.id = uq.quest_id LEFT JOIN `npc` n ON q.npc_id = n.id WHERE uq.user_id = ? AND uq.status = 2 ORDER BY uq.completed_at DESC LIMIT 10", [$role->id]);
$availableQuests = db()->getAll("SELECT q.*, n.name AS npc_name, n.place_id AS npc_place FROM `quest` q LEFT JOIN `npc` n ON q.npc_id = n.id WHERE q.level_req <= ? ORDER BY q.sort_order", [$role->level]);
$acceptedIds = array_column($activeQuests, 'id'); $completedIds = array_column($completedQuests, 'id'); $allDoneIds = array_merge($acceptedIds, $completedIds);
foreach ($availableQuests as $idx => $q) {
    if (in_array($q['id'], $allDoneIds)) { unset($availableQuests[$idx]); continue; }
    if ($q['pre_quest_id'] > 0 && !in_array($q['pre_quest_id'], $completedIds)) { unset($availableQuests[$idx]); continue; }
}
$questTypes = [0 => '⚔️杀怪', 1 => '📦收集', 2 => '📍到达', 3 => '💬对话', 4 => '🛡️护送'];
renderHeader('任务');
?>
<div class="location-bar">
    <div class="location-name">📜 任务面板</div>
    <div class="location-path">进行中 <?php echo count($activeQuests); ?> · 可接 <?php echo count($availableQuests); ?></div>
</div>
<?php if ($msg): ?>
<div class="card" style="border-color:<?php echo $msgType=='error'?'#e74c3c':'#27ae60'; ?>;padding:3px 8px;">
    <p style="color:<?php echo $msgType=='error'?'#ff6b6b':'#27ae60'; ?>;font-size:11px;margin:0;"><?php echo $msgType=='error'?'❌':'✅'; ?> <?php echo e($msg); ?></p>
</div>
<?php endif; ?>

<div class="tab-bar">
    <a href="/quest/index.php?tab=active" class="btn <?php echo $tab=='active'?'btn-primary':'btn-secondary'; ?>">🔄进行中</a>
    <a href="/quest/index.php?tab=available" class="btn <?php echo $tab=='available'?'btn-primary':'btn-secondary'; ?>">📋可接</a>
    <a href="/quest/index.php?tab=completed" class="btn <?php echo $tab=='completed'?'btn-primary':'btn-secondary'; ?>">✅已完成</a>
</div>

<?php if ($tab == 'active'): ?>
<?php if (empty($activeQuests)): ?>
<div class="card"><div class="empty-state">没有进行中的任务</div></div>
<?php else: ?>
<?php foreach ($activeQuests as $q): ?>
<div class="card" style="border-color:<?php echo $q['status']==1?'#27ae60':'#e2b714'; ?>;padding:4px 8px;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
        <span class="item-name" style="font-size:12px;"><?php echo $q['status']==1?'✅':'🔄'; ?> <?php echo e($q['name']); ?></span>
        <span style="font-size:11px;color:<?php echo $q['status']==1?'#27ae60':'#e2b714'; ?>"><?php echo $q['status']==1?'已完成':$q['progress'].'/'.$q['require_value']; ?></span>
    </div>
    <div class="item-desc" style="margin-top:2px;"><?php echo e($q['description']); ?></div>
    <div class="item-desc"><?php echo $questTypes[$q['type']]??'📋任务'; ?> · <?php echo e($q['npc_name']?:'未知'); ?></div>
    <?php if ($q['status'] == 0): ?>
    <div class="status-bar bar-exp mt-4"><div class="bar-track"><div class="bar-fill" style="width:<?php echo min(100,round($q['progress']/max(1,$q['require_value'])*100)); ?>%"></div></div></div>
    <div class="mt-4"><a href="/quest/index.php?abandon=<?php echo $q['id']; ?>" class="btn btn-secondary btn-small" onclick="return confirm('确定放弃?');">🗑️ 放弃</a></div>
    <?php else: ?>
    <form method="POST" action="/quest/index.php?tab=active" style="margin-top:3px;display:inline;">
        <input type="hidden" name="claim_quest" value="<?php echo $q['id']; ?>">
        <button type="submit" class="btn btn-primary btn-small">🎁 领取奖励</button>
        <span class="text-gold" style="font-size:10px;">经验+<?php echo $q['reward_exp']; ?> 铜+<?php echo $q['reward_money']; ?></span>
    </form>
    <?php endif; ?>
</div>
<?php endforeach; ?>
<?php endif; ?>

<?php elseif ($tab == 'available'): ?>
<?php if (empty($availableQuests)): ?>
<div class="card"><div class="empty-state">暂无可接任务</div></div>
<?php else: ?>
<?php foreach (array_slice($availableQuests, 0, 5) as $q): ?>
<div class="card" style="padding:4px 8px;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
        <span class="item-name" style="font-size:12px;">📋 <?php echo e($q['name']); ?></span>
        <span class="text-muted" style="font-size:10px;">Lv.<?php echo $q['level_req']; ?></span>
    </div>
    <div class="item-desc"><?php echo e($q['description']); ?></div>
    <div class="item-desc text-gold">奖励：经验+<?php echo $q['reward_exp']; ?> 铜+<?php echo $q['reward_money']; ?></div>
    <form method="POST" action="/quest/index.php?tab=available" style="margin-top:3px;display:inline;">
        <input type="hidden" name="accept_quest" value="<?php echo $q['id']; ?>">
        <button type="submit" class="btn btn-success btn-small">✅ 接取</button>
    </form>
</div>
<?php endforeach; ?>
<?php endif; ?>

<?php elseif ($tab == 'completed'): ?>
<?php if (empty($completedQuests)): ?>
<div class="card"><div class="empty-state">还没有完成任何任务</div></div>
<?php else: ?>
<?php foreach ($completedQuests as $q): ?>
<div class="card" style="opacity:0.7;padding:4px 8px;">
    <div class="compact-row">
        <span class="item-name" style="color:#27ae60;font-size:12px;">✅ <?php echo e($q['name']); ?></span>
        <span class="text-muted" style="font-size:10px;"><?php echo date('m/d H:i', $q['completed_at']); ?></span>
    </div>
</div>
<?php endforeach; ?>
<?php endif; ?>
<?php endif; ?>
<?php renderFooter(); ?>

<?php
require_once __DIR__ . '/../inc/functions.php';
$role = requireLogin(); $msg=''; $msgType='';
$petTypes = [0=>['name'=>'普通','color'=>'#c4a87c'],1=>['name'=>'稀有','color'=>'#3498db'],2=>['name'=>'史诗','color'=>'#9b59b6'],3=>['name'=>'传说','color'=>'#e2b714']];
$petEmojis = ['','🐱','🦅','🦊','🐺'];
$allPets = db()->getAll("SELECT * FROM `pet` ORDER BY `type` DESC, `id`");
$currentPet = $role->getPet();
$feedCost = $role->pet_level * 200;

if (isset($_GET['capture']) && !$currentPet) {
    $petId = (int)$_GET['capture']; $targetPet = db()->getOne("SELECT * FROM `pet` WHERE `id` = ?",[$petId]);
    if ($targetPet) {
        if (mt_rand(1,100) <= $targetPet['capture_rate']) { $role->setPet($petId); $msg="🎉 成功捕捉了 {$targetPet['name']}！"; $msgType='success'; $currentPet=$role->getPet(); }
        else { $msg="😢 {$targetPet['name']} 挣脱了..."; $msgType='error'; }
    }
}
if (isset($_GET['release']) && $currentPet) {
    if (isset($_GET['confirm']) && $_GET['confirm']==1) { $petName=$currentPet['nickname']; $role->releasePet(); $msg="已放生 {$petName}"; $msgType='success'; $currentPet=null; }
}
if (isPost() && isset($_POST['feed_pet']) && $currentPet) {
    if ($role->money < $feedCost) { $msg="铜币不足！需要 {$feedCost}"; $msgType='error'; }
    else { $role->spendMoney($feedCost); $leveled=$role->petGainExp(100+($role->pet_level-1)*50);
        if ($leveled) { $msg="✨ 宠物升级到 Lv.{$role->pet_level}！"; $msgType='success'; } else { $msg="🍽️ 喂食成功"; $msgType='success'; }
        $currentPet=$role->getPet(); }
}
if (isPost() && isset($_POST['rename_pet']) && $currentPet) {
    $newName = trim($_POST['new_name']); if (empty($newName)||mb_strlen($newName)>20) { $msg='名字不合法'; $msgType='error'; }
    else { $role->pet_name=$newName; db()->update('user',['pet_name'=>$newName],'`id` = ?',[$role->id]); $msg='已改名为 '.$newName; $msgType='success'; $currentPet=$role->getPet(); }
}
$feedCost = $role->pet_level * 200;
renderHeader('宠物');
?>
<div class="location-bar">
    <div class="location-name">🐾 宠物</div>
    <div class="location-path"><?php echo $currentPet?'当前：'.e($currentPet['nickname']).' Lv.'.$currentPet['level']:'还没有宠物'; ?></div>
</div>
<?php if ($msg): ?>
<div class="card" style="border-color:<?php echo $msgType=='error'?'#e74c3c':'#27ae60'; ?>;padding:3px 8px;">
    <p style="color:<?php echo $msgType=='error'?'#ff6b6b':'#27ae60'; ?>;font-size:11px;margin:0;"><?php echo $msgType=='error'?'❌':'✅'; ?> <?php echo e($msg); ?></p>
</div>
<?php endif; ?>

<?php if ($currentPet): ?>
<?php $pt=$petTypes[$currentPet['type']]??$petTypes[0]; $emoji=$petEmojis[$currentPet['id']]??'🐾'; $expMax=100+($currentPet['level']-1)*50; $expPercent=$expMax>0?round($currentPet['exp']/$expMax*100):0; ?>
<div class="card" style="border-color:<?php echo $pt['color']; ?>;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
        <span style="font-size:36px;"><?php echo $emoji; ?></span>
        <div>
            <div style="font-size:15px;font-weight:bold;color:<?php echo $pt['color']; ?>"><?php echo e($currentPet['nickname']); ?></div>
            <div style="font-size:11px;color:<?php echo $pt['color']; ?>;opacity:0.8;"><?php echo $pt['name']; ?> · <?php echo e($currentPet['name']); ?></div>
        </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:2px;font-size:11px;">
        <div><span style="color:#c4a87c;">⭐等级</span><br><span style="color:<?php echo $pt['color']; ?>;font-weight:bold;">Lv.<?php echo $currentPet['level']; ?></span></div>
        <div><span style="color:#c4a87c;">⚔️攻击</span><br><span style="color:#e74c3c;font-weight:bold;"><?php echo $currentPet['effective_atk']; ?></span></div>
        <div><span style="color:#c4a87c;">❤️生命</span><br><span style="color:#27ae60;font-weight:bold;"><?php echo $currentPet['effective_hp']; ?></span></div>
    </div>
    <?php if($currentPet['effective_def']>0): ?><div style="font-size:11px;color:#c4a87c;">🛡️防御：<span style="color:#3498db;"><?php echo $currentPet['effective_def']; ?></span> · 技能：<?php echo e($currentPet['skill_name']); ?></div><?php endif; ?>
    <div class="status-bar bar-exp mt-4"><div class="bar-track"><div class="bar-fill" style="width:<?php echo $expPercent; ?>%;background:<?php echo $pt['color']; ?>;"></div></div></div>
    <div style="display:flex;gap:4px;margin-top:4px;">
        <form method="POST" action="/pet/index.php" style="flex:1;">
            <input type="hidden" name="feed_pet" value="1">
            <button type="submit" class="btn btn-success btn-small btn-block">🍽️ 喂食(<?php echo $feedCost; ?>铜)</button>
        </form>
        <?php if(isset($_GET['release'])): ?>
        <a href="/pet/index.php?release=1&confirm=1" class="btn btn-danger btn-small">确认放生</a>
        <a href="/pet/index.php" class="btn btn-secondary btn-small">取消</a>
        <?php else: ?>
        <a href="/pet/index.php?release=1" class="btn btn-danger btn-small" onclick="return confirm('确定放生?');">放生</a>
        <?php endif; ?>
    </div>
</div>
<div class="card" style="padding:4px 8px;">
    <div class="inline-form">
        <input type="text" name="new_name" maxlength="20" value="<?php echo e($currentPet['nickname']); ?>" placeholder="宠物昵称" form="renameForm" required style="flex:1;">
        <button type="submit" form="renameForm" class="btn btn-primary btn-small">确认</button>
    </div>
</div>
<form id="renameForm" method="POST" action="/pet/index.php"><input type="hidden" name="rename_pet" value="1"></form>

<?php else: ?>
<div class="card"><div class="empty-state">🐾 你还没有宠物<br><span style="font-size:11px;">战斗后有概率遇到野生宠物</span></div></div>
<?php if(!empty($allPets)): ?>
<div class="card" style="border-color:#9b59b6;">
    <div class="card-title" style="color:#9b59b6;">🗺️ 野外探索（捕捉宠物）</div>
    <?php foreach ($allPets as $p): $pt=$petTypes[$p['type']]??$petTypes[0]; $emoji=$petEmojis[$p['id']]??'🐾'; ?>
    <div class="compact-row">
        <div><span style="font-size:14px;"><?php echo $emoji; ?></span> <span style="color:<?php echo $pt['color']; ?>;"><?php echo e($p['name']); ?></span> <span class="text-muted" style="font-size:10px;">⚔️<?php echo $p['atk']; ?> ❤️<?php echo $p['hp']; ?></span></div>
        <a href="/pet/index.php?capture=<?php echo $p['id']; ?>" class="btn btn-success btn-small" onclick="return confirm('捕捉<?php echo e($p['name']); ?>? 概率:<?php echo $p['capture_rate']; ?>%');">捕捉(<?php echo $p['capture_rate']; ?>%)</a>
    </div>
    <?php endforeach; ?>
</div>
<?php endif; ?>
<?php endif; ?>
<?php renderFooter(); ?>

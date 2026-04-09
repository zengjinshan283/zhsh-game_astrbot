<?php
/**
 * 纵横四海 - 捕捉怪物
 */
require_once __DIR__ . '/../inc/functions.php';
$role = requireLogin();
if ($role->hp <= 0) { showError('你已经倒下了。', '/map/index.php'); }

$monsterId = (int)($_GET['monster_id'] ?? 0);
$monster = db()->getOne("SELECT * FROM `monster` WHERE `id` = ?", [$monsterId]);
if (!$monster || !$monster['captureable']) { showError('无法捕捉', '/map/index.php'); }

$pet = $role->getPet();
if ($pet) { showError('你已经拥有宠物了', '/map/index.php'); }

// 验证地点
$place = $role->getPlace();
$placeMonsters = db()->getAll("SELECT * FROM `monster` WHERE `place_id` = ? OR `place_id` = 0", [$place['id']]);
if (!in_array($monsterId, array_column($placeMonsters, 'id'))) { showError('这里没有这个怪物', '/map/index.php'); }

$success = mt_rand(1, 100) <= $monster['capture_rate'];

if ($success) {
    // 捕捉成功 - 将宠物信息写入user表
    db()->update('user', [
        'pet_id' => $monster['id'],
        'pet_name' => $monster['name'],
        'pet_level' => 1,
        'pet_exp' => 0,
    ], '`id` = ?', [$role->id]);
    $msg = "🎉 捕捉成功！{$monster['name']} 成为了你的伙伴！";
    showError($msg, '/map/index.php', 'success');
} else {
    // 捕捉失败 - 怪物反击
    $mAtk = mt_rand($monster['atk_min'], $monster['atk_max']);
    $mDmg = max(1, $mAtk - $role->def);
    $role->hp -= $mDmg;
    if ($role->hp <= 0) {
        $role->hp = 0;
        $role->save();
        $lostMoney = (int)($role->money * 0.05);
        if ($lostMoney > 0) $role->spendMoney($lostMoney);
        $role->move(START_PLACE_ID);
        $role->hp = (int)($role->hp_max * 0.1);
        $role->save();
        showError("捕捉失败！{$monster['name']}反击，你被打晕了...", '/map/index.php');
    }
    $role->save();
    showError("捕捉失败！{$monster['name']}挣脱了，反击造成 {$mDmg} 点伤害。", '/battle/index.php?monster_id=' . $monsterId);
}

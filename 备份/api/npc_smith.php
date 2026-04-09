<?php
/**
 * NPC铁匠铺 API - 弹窗化
 */
require_once __DIR__ . '/../inc/functions.php';
$role = requireLogin();
header('Content-Type: application/json; charset=utf-8');

function getEnhanceRate($l) { if($l>=9) return 30; if($l>=6) return 70; return 90; }
function getEnhanceCost($l) { return ($l+1)*200; }
function getEnhanceColor($l) { if($l>=9) return '#ff6b6b'; if($l>=7) return '#e67e22'; if($l>=5) return '#9b59b6'; if($l>=3) return '#3498db'; return '#27ae60'; }

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $invId = (int)($_POST['enhance_id'] ?? 0);
    $inv = db()->getOne("SELECT inv.*, i.name, i.subtype, i.atk, i.def_val FROM inventory inv JOIN item i ON inv.item_id = i.id WHERE inv.id = ? AND inv.user_id = ? AND inv.equipped = 0", [$invId, $role->id]);
    
    if (!$inv) { echo json_encode(['ok'=>false,'msg'=>'物品不存在']); exit; }
    if (!in_array($inv['subtype'], ['weapon','armor'])) { echo json_encode(['ok'=>false,'msg'=>'只有武器和防具可以强化']); exit; }
    
    $currentLevel = (int)$inv['enhance_level'];
    if ($currentLevel >= 10) { echo json_encode(['ok'=>false,'msg'=>'已达最高等级 +10']); exit; }
    
    $cost = getEnhanceCost($currentLevel);
    if ($role->money < $cost) { echo json_encode(['ok'=>false,'msg'=>"铜币不足！需要 {$cost}"]); exit; }
    
    $role->spendMoney($cost);
    $rate = getEnhanceRate($currentLevel);
    $roll = mt_rand(1, 100);
    $success = $roll <= $rate;
    
    if ($success) {
        $newLevel = $currentLevel + 1;
        db()->update('inventory', ['enhance_level' => $newLevel], '`id` = ?', [$invId]);
        $enhanceMult = 1 + $newLevel * 0.03;
        $effAtk = (int)round($inv['atk'] * $enhanceMult);
        $effDef = (int)round($inv['def_val'] * $enhanceMult);
        echo json_encode([
            'ok'=>true,
            'msg'=>"✨ 强化成功！{$inv['name']} +{$newLevel}！",
            'item'=>[
                'inv_id'=>$invId,'name'=>$inv['name'],'subtype'=>$inv['subtype'],
                'atk'=>$inv['atk'],'def_val'=>$inv['def_val'],'enhance_level'=>$newLevel,
                'color'=>getEnhanceColor($newLevel),'eff_atk'=>$effAtk,'eff_def'=>$effDef
            ],
            'money'=>$role->money
        ]);
    } else {
        if ($currentLevel >= 7) {
            $newLevel = max(0, $currentLevel - 1);
            db()->update('inventory', ['enhance_level' => $newLevel], '`id` = ?', [$invId]);
            $enhanceMult = 1 + $newLevel * 0.03;
            $effAtk = (int)round($inv['atk'] * $enhanceMult);
            $effDef = (int)round($inv['def_val'] * $enhanceMult);
            echo json_encode([
                'ok'=>false,
                'msg'=>"😈 强化失败！降级到 +{$newLevel}",
                'item'=>[
                    'inv_id'=>$invId,'name'=>$inv['name'],'subtype'=>$inv['subtype'],
                    'atk'=>$inv['atk'],'def_val'=>$inv['def_val'],'enhance_level'=>$newLevel,
                    'color'=>getEnhanceColor($newLevel),'eff_atk'=>$effAtk,'eff_def'=>$effDef
                ],
                'money'=>$role->money
            ]);
        } else {
            echo json_encode(['ok'=>false,'msg'=>"😈 强化失败！仍是 +{$currentLevel}",'money'=>$role->money]);
        }
    }
    exit;
}

// GET: 返回可强化装备
$items = db()->getAll(
    "SELECT inv.id AS inv_id, inv.enhance_level, i.* FROM inventory inv JOIN item i ON inv.item_id = i.id WHERE inv.user_id = ? AND inv.equipped = 0 AND i.subtype IN ('weapon','armor') ORDER BY inv.enhance_level DESC, i.atk+i.def_val DESC",
    [$role->id]
);

$result = [];
foreach ($items as $item) {
    $el = (int)$item['enhance_level'];
    $cost = getEnhanceCost($el);
    $rate = getEnhanceRate($el);
    $color = getEnhanceColor($el);
    $enhanceMult = 1 + $el * 0.03;
    $result[] = array_merge($item, [
        'cost' => $cost,
        'rate' => $rate,
        'color' => $color,
        'eff_atk' => (int)round($item['atk'] * $enhanceMult),
        'eff_def' => (int)round($item['def_val'] * $enhanceMult),
        'is_max' => $el >= 10,
    ]);
}

echo json_encode(['money'=>$role->money,'items'=>$result]);

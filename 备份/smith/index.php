<?php
require_once __DIR__ . '/../inc/functions.php';
$role = requireLogin(); $msg=''; $msgType=''; $enhanceResult=null;
function getEnhanceRate($l){if($l>=9)return 30;if($l>=6)return 70;return 90;}
function getEnhanceCost($l){return($l+1)*200;}
function getEnhanceColor($l){if($l>=9)return '#ff6b6b';if($l>=7)return '#e67e22';if($l>=5)return '#9b59b6';if($l>=3)return '#3498db';return '#27ae60';}

if (isPost() && isset($_POST['enhance_id'])) {
    $invId=(int)$_POST['enhance_id'];
    $inv=db()->getOne("SELECT inv.*, i.name, i.subtype, i.atk, i.def_val FROM `inventory` inv JOIN `item` i ON inv.item_id = i.id WHERE inv.id = ? AND inv.user_id = ? AND inv.equipped = 0",[$invId,$role->id]);
    if (!$inv) { $msg='物品不存在'; $msgType='error'; }
    elseif (!in_array($inv['subtype'],['weapon','armor'])) { $msg='只有武器和防具可以强化'; $msgType='error'; }
    else {
        $currentLevel=(int)$inv['enhance_level'];
        if ($currentLevel>=10) { $msg='已达最高等级 +10'; $msgType='error'; }
        else {
            $cost=getEnhanceCost($currentLevel);
            if ($role->money<$cost) { $msg="铜币不足！需要 {$cost}"; $msgType='error'; }
            else {
                $role->spendMoney($cost); $rate=getEnhanceRate($currentLevel); $roll=mt_rand(1,100); $success=$roll<=$rate;
                if ($success) { $newLevel=$currentLevel+1; db()->update('inventory',['enhance_level'=>$newLevel],'`id` = ?',[$invId]); $msg="✨ 强化成功！{$inv['name']} +{$newLevel}！"; $msgType='success'; }
                else { if($currentLevel>=7){$newLevel=max(0,$currentLevel-1);db()->update('inventory',['enhance_level'=>$newLevel],'`id` = ?',[$invId]);$msg="😤 强化失败！降级到 +{$newLevel}";}else{$msg="😤 强化失败！仍是 +{$currentLevel}";} $msgType='error'; }
            }
        }
    }
}
$enhanceableItems=db()->getAll("SELECT inv.id AS inv_id, inv.enhance_level, i.* FROM `inventory` inv JOIN `item` i ON inv.item_id = i.id WHERE inv.user_id = ? AND inv.equipped = 0 AND i.subtype IN ('weapon','armor') ORDER BY inv.enhance_level DESC, i.atk+i.def_val DESC",[$role->id]);
renderHeader('铁匠铺');
?>
<div class="location-bar">
    <div class="location-name">🔨 铁匠铺</div>
    <div class="location-path">💰铜币：<span class="text-gold"><?php echo formatMoney($role->money); ?></span></div>
</div>
<?php if ($msg): ?>
<div class="card" style="border-color:<?php echo $msgType=='error'?'#e74c3c':'#27ae60'; ?>;padding:3px 8px;text-align:center;">
    <p style="color:<?php echo $msgType=='error'?'#ff6b6b':'#27ae60'; ?>;font-size:13px;font-weight:bold;margin:0;"><?php echo e($msg); ?></p>
</div>
<?php endif; ?>

<div class="card" style="border-color:#e67e22;padding:3px 8px;">
    <div style="font-size:11px;color:#c4a87c;">
        +1~5成功率<span class="text-green">90%</span> · +6~8<span style="color:#e67e22;">70%</span> · +9~10<span class="text-red">30%</span>
        · ⚠️+7以上失败<span class="text-red">降级</span> · 💰费用=(等级+1)×200
    </div>
</div>

<?php if (empty($enhanceableItems)): ?>
<div class="card"><div class="empty-state">背包中没有可强化的装备</div></div>
<?php else: ?>
<?php foreach ($enhanceableItems as $item): ?>
<?php $el=(int)$item['enhance_level'];$cost=getEnhanceCost($el);$rate=getEnhanceRate($el);$color=getEnhanceColor($el);$isMax=$el>=10;$enhanceMult=1+$el*0.03;$effAtk=(int)round($item['atk']*$enhanceMult);$effDef=(int)round($item['def_val']*$enhanceMult); ?>
<div class="card" style="border-color:<?php echo $color; ?>;padding:4px 8px;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
        <span class="item-name" style="font-size:12px;"><?php echo $item['subtype']==='weapon'?'🗡️':'🛡️'; ?> <?php echo e($item['name']); ?><?php if($el>0):?><span style="color:<?php echo $color; ?>;font-weight:bold;">+<?php echo $el; ?></span><?php endif; ?></span>
        <span style="font-size:11px;">⚔️<?php echo $item['atk']?($item['atk'].'→'.$effAtk):''; ?><?php echo $item['def_val']?(' 🛡️'.$item['def_val'].'→'.$effDef):''; ?></span>
    </div>
    <?php if (!$isMax): ?>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:3px;font-size:11px;">
        <span style="color:#c4a87c;">💰<?php echo $cost; ?>铜 · 成功率<span style="color:<?php echo $rate>=70?'#27ae60':'#e74c3c'; ?>"><?php echo $rate; ?>%</span></span>
        <form method="POST" action="/smith/index.php" style="display:inline;">
            <input type="hidden" name="enhance_id" value="<?php echo $item['inv_id']; ?>">
            <button type="submit" class="btn btn-primary btn-small" onclick="return confirm('花费<?php echo $cost; ?>铜强化? 成功率<?php echo $rate; ?>%<?php echo $el>=7?' 失败降级':''; ?>');">🔨 强化</button>
        </form>
    </div>
    <?php else: ?>
    <div style="text-align:center;margin-top:2px;"><span style="color:#e2b714;font-weight:bold;font-size:12px;">👑 已满级</span></div>
    <?php endif; ?>
</div>
<?php endforeach; ?>
<?php endif; ?>
<?php renderFooter(); ?>

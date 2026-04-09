<?php
require_once __DIR__ . '/../inc/functions.php';
$role = requireLogin(); $msg=''; $msgType=''; $result=null;
$casinoLimit = $role->getCasinoLimit();
$diceFaces = [1=>'⚀',2=>'⚁',3=>'⚂',4=>'⚃',5=>'⚄',6=>'⚅'];
if (isPost() && isset($_POST['bet']) && isset($_POST['choice'])) {
    $betAmount=(int)$_POST['bet']; $choice=$_POST['choice'];
    if (!in_array($choice,['big','small'])) { $msg='无效选择'; $msgType='error'; }
    elseif ($betAmount<=0) { $msg='请输入有效金额'; $msgType='error'; }
    elseif ($betAmount>$role->money) { $msg='铜币不足！'; $msgType='error'; }
    elseif ($betAmount>$casinoLimit) { $msg='超过今日限额！剩余：'.formatMoney($casinoLimit); $msgType='error'; }
    else {
        $dice1=mt_rand(1,6); $dice2=mt_rand(1,6); $total=$dice1+$dice2; $isBig=$total>=7; $isWin=($choice==='big'&&$isBig)||($choice==='small'&&!$isBig);
        $role->casinoBet($betAmount);
        if ($isWin) { $winAmount=$betAmount*2; $role->gainMoney($winAmount); $msg="恭喜！赢了 {$winAmount} 铜币！"; $msgType='success'; }
        else { $role->spendMoney($betAmount); $msg="可惜！输了 {$betAmount} 铜币"; $msgType='error'; }
        $result=['dice1'=>$dice1,'dice2'=>$dice2,'total'=>$total,'isBig'=>$isBig,'choice'=>$choice,'isWin'=>$isWin,'betAmount'=>$betAmount];
    }
}
renderHeader('赌场');
?>
<style>
.choice-btn {
    flex:1; cursor:pointer; border-radius:8px; padding:12px 0; text-align:center;
    font-size:16px; font-weight:bold; transition: all 0.2s; border:3px solid transparent;
    opacity:0.5;
}
.choice-btn.active { opacity:1; transform:scale(1.03); box-shadow:0 4px 15px rgba(0,0,0,0.3); }
.choice-big { background:linear-gradient(135deg,#e74c3c,#c0392b); color:#fff; }
.choice-big.active { border-color:#ff6b6b; box-shadow:0 0 20px rgba(231,76,60,0.5); }
.choice-small { background:linear-gradient(135deg,#3498db,#2980b9); color:#fff; }
.choice-small.active { border-color:#5dade2; box-shadow:0 0 20px rgba(52,152,219,0.5); }
.quick-btn { transition: all 0.15s; }
.quick-btn:active { transform:scale(0.95); }
</style>

<div class="location-bar">
    <div class="location-name">🎰 赌场</div>
    <div class="location-path">💰铜币：<span class="text-gold"><?php echo formatMoney($role->money); ?></span> · 限额：<span class="<?php echo $casinoLimit>0?'text-green':'text-red'; ?>"><?php echo formatMoney($casinoLimit); ?></span></div>
</div>

<?php if ($msg): ?>
<div class="card" style="border-color:<?php echo $msgType=='error'?'#e74c3c':'#27ae60'; ?>;padding:3px 8px;text-align:center;">
    <p style="color:<?php echo $msgType=='error'?'#ff6b6b':'#27ae60'; ?>;font-size:14px;font-weight:bold;margin:0;">
        <?php echo $msgType=='error'?'😢':'🎉'; ?> <?php echo e($msg); ?>
    </p>
</div>
<?php endif; ?>

<?php if ($result): ?>
<div class="card" style="border-color:<?php echo $result['isWin']?'#27ae60':'#e74c3c'; ?>;text-align:center;padding:8px;">
    <div style="font-size:40px;"><?php echo $diceFaces[$result['dice1']]; ?> + <?php echo $diceFaces[$result['dice2']]; ?> = <span style="font-size:22px;color:#e2b714;font-weight:bold;"><?php echo $result['total']; ?></span></div>
    <div style="font-size:14px;margin:4px 0;">
        <?php echo $result['isBig']?'🔵大':'🔵小'; ?> · 你选了<?php echo $result['choice']==='big'?'大':'小'; ?>
        <?php if($result['isWin']):?><span class="text-green"> → 猜对了！</span><?php else:?><span class="text-red"> → 猜错了</span><?php endif; ?>
    </div>
</div>
<?php endif; ?>

<div class="card" style="padding:8px 10px;">
    <div class="card-title">🎲 猜大小</div>
    <div style="font-size:11px;color:#c4a87c;margin-bottom:6px;">🎲 两个骰子 ⚬小(2~6) ⚬大(7~12) · 猜对赢双倍</div>
    <form method="POST" action="/casino/index.php" id="betForm">
        <input type="hidden" name="choice" id="hiddenChoice" value="">
        <!-- 大小选择 -->
        <div style="display:flex;gap:6px;margin-bottom:8px;">
            <div class="choice-btn choice-big" id="btnBig" onclick="pickChoice('big')">⬤ 大 (7-12)</div>
            <div class="choice-btn choice-small" id="btnSmall" onclick="pickChoice('small')">⬤ 小 (2-6)</div>
        </div>
        <!-- 金额 -->
        <div class="inline-form">
            <input type="number" name="bet" id="betInput" min="1" max="<?php echo min($role->money,$casinoLimit); ?>" placeholder="下注金额" required style="flex:1;">
            <button type="submit" class="btn btn-success btn-small">下注</button>
        </div>
        <!-- 快捷按钮 -->
        <div style="display:flex;gap:6px;margin-top:6px;">
            <button type="button" class="btn btn-secondary btn-small quick-btn btn-block" onclick="quickBet(100)">⚡ 快捷100</button>
            <button type="button" class="btn btn-secondary btn-small quick-btn btn-block" onclick="quickBet(500)">⚡ 快捷500</button>
            <button type="button" class="btn btn-secondary btn-small quick-btn btn-block" onclick="quickBet(<?php echo min(1000,$role->money,$casinoLimit); ?>)">⚡ 全押</button>
        </div>
    </form>
</div>

<script>
var currentChoice = '';
function pickChoice(c) {
    currentChoice = c;
    document.getElementById('hiddenChoice').value = c;
    var big = document.getElementById('btnBig');
    var small = document.getElementById('btnSmall');
    big.classList.toggle('active', c === 'big');
    small.classList.toggle('active', c === 'small');
}
function quickBet(amount) {
    if (!currentChoice) {
        // 高亮大小按钮提示用户先选择
        var big = document.getElementById('btnBig');
        var small = document.getElementById('btnSmall');
        big.style.animation = 'shake 0.3s ease';
        small.style.animation = 'shake 0.3s ease';
        setTimeout(function() { big.style.animation = ''; small.style.animation = ''; }, 400);
        return;
    }
    document.getElementById('betInput').value = amount;
    document.getElementById('betForm').submit();
}
</script>

<?php renderFooter(); ?>

<?php
require_once __DIR__ . '/../inc/functions.php';
$role = requireLogin(); $msg=''; $msgType='';
if (isPost() && isset($_POST['deposit'])) {
    $amount = (int)$_POST['amount'];
    if ($amount <= 0) { $msg='请输入有效金额'; $msgType='error'; }
    elseif ($amount > $role->money) { $msg='铜币不足！'; $msgType='error'; }
    else { $role->bankDeposit($amount); $msg='存入 '.formatMoney($amount).' 铜币'; $msgType='success'; }
}
if (isPost() && isset($_POST['withdraw'])) {
    $amount = (int)$_POST['amount'];
    if ($amount <= 0) { $msg='请输入有效金额'; $msgType='error'; }
    elseif ($amount > $role->bank_money) { $msg='存款不足！'; $msgType='error'; }
    else { $role->bankWithdraw($amount); $msg='取出 '.formatMoney($amount).' 铜币'; $msgType='success'; }
}
$logs = db()->getAll("SELECT * FROM `bank_log` WHERE `user_id` = ? ORDER BY `id` DESC LIMIT 5",[$role->id]);
renderHeader('威尼斯银行');
?>
<div class="location-bar">
    <div class="location-name">💰 银行</div>
    <div class="location-path">最安全的资金保管</div>
</div>
<?php if ($msg): ?>
<div class="card" style="border-color:<?php echo $msgType=='error'?'#e74c3c':'#27ae60'; ?>;padding:3px 8px;">
    <p style="color:<?php echo $msgType=='error'?'#ff6b6b':'#27ae60'; ?>;font-size:11px;margin:0;"><?php echo $msgType=='error'?'❌':'✅'; ?> <?php echo e($msg); ?></p>
</div>
<?php endif; ?>

<div class="card">
    <div class="card-title">📊 资产</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:2px;font-size:12px;text-align:center;">
        <div><span style="color:#c4a87c;">携带</span><br><span class="text-gold" style="font-weight:bold;"><?php echo formatMoney($role->money); ?></span></div>
        <div><span style="color:#c4a87c;">存款</span><br><span style="color:#27ae60;font-weight:bold;"><?php echo formatMoney($role->bank_money); ?></span></div>
        <div><span style="color:#c4a87c;">总资产</span><br><span class="text-gold" style="font-weight:bold;font-size:14px;"><?php echo formatMoney($role->money+$role->bank_money); ?></span></div>
    </div>
</div>

<div class="card" style="padding:4px 8px;">
    <div class="card-title">💰 存款</div>
    <form method="POST" action="/bank/index.php" class="inline-form">
        <input type="hidden" name="deposit" value="1">
        <input type="number" name="amount" min="1" max="<?php echo $role->money; ?>" placeholder="金额" required style="flex:1;">
        <button type="submit" class="btn btn-success btn-small">存入</button>
    </form>
    <div style="display:flex;gap:4px;margin-top:3px;">
        <form method="POST" action="/bank/index.php" style="flex:1;"><input type="hidden" name="deposit" value="1"><input type="hidden" name="amount" value="<?php echo floor($role->money*0.5); ?>"><button type="submit" class="btn btn-secondary btn-small btn-block">存50%</button></form>
        <form method="POST" action="/bank/index.php" style="flex:1;"><input type="hidden" name="deposit" value="1"><input type="hidden" name="amount" value="<?php echo $role->money; ?>"><button type="submit" class="btn btn-secondary btn-small btn-block">全存</button></form>
    </div>
</div>

<div class="card" style="padding:4px 8px;">
    <div class="card-title">💸 取款</div>
    <form method="POST" action="/bank/index.php" class="inline-form">
        <input type="hidden" name="withdraw" value="1">
        <input type="number" name="amount" min="1" max="<?php echo $role->bank_money; ?>" placeholder="金额" required style="flex:1;">
        <button type="submit" class="btn btn-primary btn-small">取出</button>
    </form>
    <div style="display:flex;gap:4px;margin-top:3px;">
        <form method="POST" action="/bank/index.php" style="flex:1;"><input type="hidden" name="withdraw" value="1"><input type="hidden" name="amount" value="<?php echo floor($role->bank_money*0.5); ?>"><button type="submit" class="btn btn-secondary btn-small btn-block">取50%</button></form>
        <form method="POST" action="/bank/index.php" style="flex:1;"><input type="hidden" name="withdraw" value="1"><input type="hidden" name="amount" value="<?php echo $role->bank_money; ?>"><button type="submit" class="btn btn-secondary btn-small btn-block">全取</button></form>
    </div>
</div>

<?php if (!empty($logs)): ?>
<div class="card">
    <div class="card-title">📜 最近交易</div>
    <?php foreach ($logs as $log): ?>
    <div class="compact-row">
        <span style="font-size:11px;"><?php echo $log['type']==0?'📥 存入':'📤 取出'; ?></span>
        <span style="font-size:11px;"><span style="color:<?php echo $log['type']==0?'#ff6b6b':'#27ae60'; ?>"><?php echo $log['type']==0?'-':'+'; ?><?php echo formatMoney($log['amount']); ?></span> <span class="text-muted" style="font-size:9px;"><?php echo date('m/d H:i',$log['created_at']); ?></span></span>
    </div>
    <?php endforeach; ?>
</div>
<?php endif; ?>

<div class="card" style="border-color:#3498db;padding:3px 8px;">
    <p style="color:#3498db;font-size:11px;margin:0;">💡 战斗失败损失5%携带铜币，建议多余铜币存入银行</p>
</div>
<?php renderFooter(); ?>

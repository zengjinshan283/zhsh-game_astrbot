<?php
require_once __DIR__ . '/../inc/functions.php';
$role = requireLogin();

// 获取当前place和city
$place = db()->getOne("SELECT * FROM `place` WHERE `id` = ?", [$role->place_id]);
if (!$place || !$place['city_id']) { redirect('/map/index.php'); exit; }

$city = db()->getOne("SELECT * FROM `map` WHERE `id` = ?", [$place['city_id']]);
if (!$city) { redirect('/map/index.php'); exit; }

$cityId = $city['id'];
$regionId = db()->getVar("SELECT `parent_id` FROM `map` WHERE `id` = ?", [$cityId]);
$regionName = db()->getVar("SELECT `name` FROM `map` WHERE `id` = ?", [$regionId]);

$msg = ''; $msgType = '';
if (isset($_GET['msg'])) { $msg = $_GET['msg']; $msgType = 'success'; }

// 船只和货舱
$ship = null;
$cargoUsed = 0;
$cargoMax = 0;
if ($role->ship_id > 0) {
    $ship = db()->getOne("SELECT * FROM `ship` WHERE `id` = ?", [$role->ship_id]);
    $cargoMax = $ship ? $ship['capacity'] : 100;
    $cargoRows = db()->getAll("SELECT c.*, g.weight FROM `cargo` c JOIN `goods` g ON c.goods_id = g.id WHERE c.user_id = ?", [$role->id]);
    foreach ($cargoRows as $cr) { $cargoUsed += $cr['quantity'] * $cr['weight']; }
}

// 买入
if (isPost() && isset($_POST['buy'])) {
    $gid = (int)$_POST['buy'];
    $qty = max(1, (int)($_POST['qty'] ?? 1));
    $g = db()->getOne("SELECT g.*, mp.base_price FROM `goods` g JOIN `market_price` mp ON g.id=mp.goods_id WHERE mp.city_id=? AND g.id=?", [$cityId, $gid]);
    if (!$g) { $msg = '商品不存在'; $msgType = 'error'; }
    elseif (!$ship) { $msg = '需要先拥有船只！'; $msgType = 'error'; }
    else {
        $today = date('Ymd');
        mt_srand($cityId * 10000 + $gid * 100 + intval($today));
        $price = max(10, (int)($g['base_price'] * (1 + mt_rand(-15,15)/100)));
        $cost = $price * $qty;
        $w = $g['weight'] * $qty;
        if ($role->money < $cost) { $msg = "铜币不足，需要{$cost}铜"; $msgType = 'error'; }
        elseif ($cargoUsed + $w > $cargoMax) { $msg = "货舱不足，剩余{$cargoMax}/{$cargoUsed}"; $msgType = 'error'; }
        else {
            $role->spendMoney($cost);
            $ex = db()->getOne("SELECT * FROM cargo WHERE user_id=? AND goods_id=?", [$role->id, $gid]);
            if ($ex) db()->update('cargo', ['quantity'=>$ex['quantity']+$qty], 'id=?', [$ex['id']]);
            else db()->insert('cargo', ['user_id'=>$role->id, 'goods_id'=>$gid, 'quantity'=>$qty]);
            header("Location: /market/index.php?msg=" . urlencode("购入{$g['name']}×{$qty}，花费{$cost}铜币"));
            exit;
        }
    }
}

// 卖出
if (isPost() && isset($_POST['sell'])) {
    $gid = (int)$_POST['sell'];
    $qty = max(1, (int)($_POST['qty'] ?? 1));
    $c = db()->getOne("SELECT * FROM cargo WHERE user_id=? AND goods_id=?", [$role->id, $gid]);
    if (!$c || $c['quantity'] < $qty) { $msg = '货舱中没有足够的货物'; $msgType = 'error'; }
    else {
        $g = db()->getOne("SELECT g.*, mp.base_price FROM goods g JOIN market_price mp ON g.id=mp.goods_id WHERE mp.city_id=? AND g.id=?", [$cityId, $gid]);
        if (!$g) { $msg = '此城市不收购该商品'; $msgType = 'error'; }
        else {
            $today = date('Ymd');
            mt_srand($cityId * 10000 + $gid * 100 + intval($today));
            $price = max(10, (int)($g['base_price'] * (1 + mt_rand(-15,15)/100)));
            $gain = (int)($price * $qty * 0.9);
            $role->gainMoney($gain);
            if ($c['quantity'] == $qty) db()->delete('cargo', 'id=?', [$c['id']]);
            else db()->update('cargo', ['quantity'=>$c['quantity']-$qty], 'id=?', [$c['id']]);
            header("Location: /market/index.php?msg=" . urlencode("卖出{$g['name']}×{$qty}，获得{$gain}铜币"));
            exit;
        }
    }
}

// 商品列表和价格
$today = date('Ymd');
$goodsList = db()->getAll(
    "SELECT g.*, mp.base_price FROM goods g JOIN market_price mp ON g.id=mp.goods_id WHERE mp.city_id=? ORDER BY g.category, g.id", [$cityId]);
foreach ($goodsList as &$g) {
    mt_srand($cityId * 10000 + $g['id'] * 100 + intval($today));
    $g['price'] = max(10, (int)($g['base_price'] * (1 + mt_rand(-15,15)/100)));
    $g['hold'] = 0;
}
unset($g);
$cargoHolds = db()->getAll("SELECT goods_id, quantity FROM cargo WHERE user_id=?", [$role->id]);
$holdMap = [];
foreach ($cargoHolds as $ch) $holdMap[$ch['goods_id']] = $ch['quantity'];
foreach ($goodsList as &$g) { $g['hold'] = $holdMap[$g['id']] ?? 0; }
unset($g);

// 区域均价参考
$hotGoods = [1,2,4,7,9,11];
$priceHints = [];
foreach ($hotGoods as $gid) {
    $gn = db()->getVar("SELECT name FROM goods WHERE id=?", [$gid]);
    $regs = db()->getAll("SELECT m.parent_id as rid, r.name as rname, ROUND(AVG(mp.base_price)) as avgp FROM market_price mp JOIN map m ON mp.city_id=m.id JOIN map r ON m.parent_id=r.id WHERE mp.goods_id=? AND m.parent_id!=? GROUP BY m.parent_id ORDER BY avgp", [$gid, $regionId]);
    $priceHints[] = ['name'=>$gn, 'regions'=>$regs];
}

renderHeader('市场');
?>
<style>
.market-list-wrap {
    padding-bottom: 56px;
    max-height: calc(100vh - 280px);
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    margin-bottom: 8px;
}
.market-item {
    display: flex;
    align-items: center;
    padding: 8px 10px;
    border-bottom: 1px solid rgba(226,183,20,0.06);
}
.market-item:last-child { border-bottom: none; }
.market-item-left {
    flex: 1;
    min-width: 0;
}
.market-item-right {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
}
.qty-ctrl {
    display: inline-flex;
    align-items: center;
    border: 1px solid #ddd;
    border-radius: 4px;
    overflow: hidden;
}
.qty-ctrl button {
    width: 26px;
    height: 26px;
    border: none;
    background: #f5f5f5;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #333;
}
.qty-ctrl button:active { background: #e0e0e0; }
.qty-ctrl input {
    width: 36px;
    height: 26px;
    border: none;
    border-left: 1px solid #ddd;
    border-right: 1px solid #ddd;
    text-align: center;
    font-size: 12px;
    -moz-appearance: textfield;
    outline: none;
}
.qty-ctrl input::-webkit-outer-spin-button,
.qty-ctrl input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
</style>

<div class="location-bar">
    <div class="location-name">🏪 <?php echo e($city['name']); ?>市场</div>
    <div class="location-path">📍<?php echo e($regionName); ?> · 💰<span class="text-gold"><?php echo formatMoney($role->money); ?></span>铜</div>
</div>

<?php if ($msg): ?>
<div class="card" style="border-color:<?php echo $msgType=='error'?'#e74c3c':'#27ae60'; ?>;padding:6px 10px;margin-bottom:6px;">
    <p style="color:<?php echo $msgType=='error'?'#ff6b6b':'#27ae60'; ?>;font-size:12px;margin:0;">
        <?php echo $msgType=='error'?'❌':'✅'; ?> <?php echo e($msg); ?>
    </p>
</div>
<?php endif; ?>

<?php if ($ship): ?>
<div class="card" style="padding:6px 10px;margin-bottom:6px;background:linear-gradient(135deg,rgba(41,128,185,0.08),rgba(41,128,185,0.03));">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <span style="font-size:11px;color:#7f8c8d;">🚢 <?php echo e($ship['name']); ?></span>
        <span style="font-size:11px;">货舱 <b style="color:<?php echo $cargoUsed/$cargoMax>0.8?'#e74c3c':'#2980b9'; ?>"><?php echo $cargoUsed; ?></b>/<?php echo $cargoMax; ?></span>
    </div>
    <div style="background:#ecf0f1;border-radius:4px;height:6px;overflow:hidden;">
        <div style="background:<?php echo $cargoUsed/$cargoMax>0.8?'#e74c3c':($cargoUsed/$cargoMax>0.5?'#f39c12':'#2980b9'); ?>;height:100%;width:<?php echo min(100,round($cargoUsed/$cargoMax*100)); ?>%;"></div>
    </div>
</div>
<?php else: ?>
<div class="card" style="padding:8px;margin-bottom:6px;text-align:center;">
    <span style="font-size:12px;color:#e74c3c;">⚠️ 没有船只，无法贸易。请先到码头购买。</span>
</div>
<?php endif; ?>

<div style="display:flex;gap:6px;margin-bottom:6px;">
    <span style="font-size:11px;color:#95a5a6;">📅 今日价格（每天变化一次）</span>
</div>

<div class="market-list-wrap">
<?php foreach ($goodsList as $g): ?>
<div class="market-item">
    <div class="market-item-left">
        <div>
            <span style="font-size:13px;font-weight:600;"><?php echo e($g['name']); ?></span>
            <span style="font-size:10px;color:#95a5a6;"> · <?php echo e($g['description']); ?></span>
            <?php if ($g['hold'] > 0): ?><span style="font-size:10px;color:#2980b9;"> 📦×<?php echo $g['hold']; ?></span><?php endif; ?>
        </div>
        <div style="display:flex;gap:10px;margin-top:2px;">
            <span style="font-size:13px;color:#e67e22;font-weight:600;"><?php echo $g['price']; ?><span style="font-size:10px;color:#95a5a6;"> 铜/<?php echo e($g['unit']); ?></span></span>
            <span style="font-size:10px;color:#bdc3c8;">⏱<?php echo $g['weight']; ?>舱位</span>
        </div>
    </div>
    <?php if ($ship): ?>
    <div class="market-item-right">
        <div class="qty-ctrl">
            <button type="button" onclick="this.parentElement.querySelector('input').stepDown()">−</button>
            <input type="number" id="q<?php echo $g['id']; ?>" value="1" min="1" max="99">
            <button type="button" onclick="this.parentElement.querySelector('input').stepUp()">+</button>
        </div>
        <button class="btn btn-success" style="padding:5px 10px;font-size:11px;" onclick="doBuy(<?php echo $g['id']; ?>)">🛒买</button>
        <?php if ($g['hold'] > 0): ?>
        <button class="btn btn-danger" style="padding:5px 10px;font-size:11px;" onclick="doSell(<?php echo $g['id']; ?>,<?php echo $g['hold']; ?>)">💰卖</button>
        <?php endif; ?>
    </div>
    <?php endif; ?>
</div>
<?php endforeach; ?>
</div>

<div class="card" style="padding:8px 10px;margin-top:8px;">
    <div style="font-size:12px;font-weight:600;color:#2c3e50;margin-bottom:6px;">📊 走商参考（其他区域均价）</div>
    <?php foreach ($priceHints as $h): ?>
    <div style="margin-bottom:3px;">
        <span style="font-size:11px;font-weight:500;"><?php echo e($h['name']); ?>:</span>
        <?php foreach ($h['regions'] as $r): ?>
        <span style="font-size:10px;color:#7f8c8d;"><?php echo e($r['rname']); ?><?php echo $r['avgp']; ?> ·</span>
        <?php endforeach; ?>
    </div>
    <?php endforeach; ?>
    <div style="font-size:10px;color:#95a5a6;margin-top:4px;">💡 卖出价为买入价的90%，注意货舱容量和价格波动</div>
</div>

<script>
function doBuy(gid) {
    var qty = parseInt(document.getElementById('q'+gid).value) || 1;
    var f = document.createElement('form');
    f.method = 'POST'; f.action = '/market/index.php';
    addField(f, 'buy', gid);
    addField(f, 'qty', qty);
    document.body.appendChild(f);
    f.submit();
}
function doSell(gid, maxQty) {
    var qty = parseInt(document.getElementById('q'+gid).value) || 1;
    qty = Math.min(qty, maxQty);
    var f = document.createElement('form');
    f.method = 'POST'; f.action = '/market/index.php';
    addField(f, 'sell', gid);
    addField(f, 'qty', qty);
    document.body.appendChild(f);
    f.submit();
}
function addField(f, name, val) {
    var inp = document.createElement('input');
    inp.type = 'hidden'; inp.name = name; inp.value = val;
    f.appendChild(inp);
}
</script>

<?php renderFooter(); ?>

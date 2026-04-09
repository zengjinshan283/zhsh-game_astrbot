<?php
/**
 * 纵横四海 - 航海系统
 */
require_once __DIR__ . '/../inc/functions.php';

$role = requireLogin();
$place = $role->getPlace();
$msg = '';
$msgType = '';

// 获取当前船只
$myShip = $role->ship_id > 0 ? db()->getOne("SELECT * FROM `ship` WHERE `id` = ?", [$role->ship_id]) : null;
$allShips = db()->getAll("SELECT * FROM `ship` ORDER BY `price`");

// 获取当前城市信息
$city = $place ? db()->getOne("SELECT * FROM `map` WHERE `id` = ?", [$place['city_id']]) : null;

// 检查是否在码头
$isDock = $place && $place['type'] == 1;

// 基础航海时间（秒）= 速度倒数的分钟数 * 60
function getSailSeconds($speed) {
    $minutes = [1 => 10, 2 => 6, 3 => 3, 5 => 1];
    return ($minutes[$speed] ?? 10) * 60;
}

// 检查航海状态
$now = time();
$isSailing = false;
$sailProgress = 0;
$sailRemain = 0;
$eventTriggered = false;

if ($role->sail_time > 0) {
    $sailDuration = getSailSeconds($myShip ? $myShip['speed'] : 1);
    $elapsed = $now - $role->sail_time;
    
    if ($elapsed >= $sailDuration) {
        // 海上事件（随机）
        $eventType = mt_rand(1, 10);
        
        if ($eventType <= 2) {
            // 遇到海盗（战斗）- 先移动到目的地再跳转战斗
            if ($role->sail_to > 0) {
                $dockPlace = db()->getOne("SELECT * FROM `place` WHERE `city_id` = ? AND `type` = 1 LIMIT 1", [$role->sail_to]);
                if (!$dockPlace) $dockPlace = db()->getOne("SELECT * FROM `place` WHERE `city_id` = ? LIMIT 1", [$role->sail_to]);
                $newPlaceId = $dockPlace ? $dockPlace['id'] : $role->place_id;
            } else {
                $newPlaceId = $role->place_id;
            }
            db()->update('user', ['place_id' => $newPlaceId, 'sail_time' => 0, 'sail_from' => 0, 'sail_to' => 0], '`id` = ?', [$role->id]);
            redirect('/battle/fight.php?monster_id=3');
        }
        
        // 宝藏事件（先加钱）
        if ($eventType <= 4) {
            $moneyFound = mt_rand(50, 500);
            $role->gainMoney($moneyFound);
            $msg = "🎁 航行途中发现了一箱宝藏！获得 {$moneyFound} 铜币！";
            $msgType = 'success';
        } else {
            $msg = '🌊 平安到达目的地！';
            $msgType = 'success';
        }
        
        // 清除航海状态并到达目的地
        if ($role->sail_to > 0) {
            $dockPlace = db()->getOne("SELECT * FROM `place` WHERE `city_id` = ? AND `type` = 1 LIMIT 1", [$role->sail_to]);
            if (!$dockPlace) $dockPlace = db()->getOne("SELECT * FROM `place` WHERE `city_id` = ? LIMIT 1", [$role->sail_to]);
            $newPlaceId = $dockPlace ? $dockPlace['id'] : $role->place_id;
        } else {
            $newPlaceId = $role->place_id;
        }
        db()->update('user', [
            'place_id' => $newPlaceId,
            'sail_time' => 0,
            'sail_from' => 0,
            'sail_to' => 0,
            'money' => $role->money,
        ], '`id` = ?', [$role->id]);
        $role->loadById($role->id);
        $place = $role->getPlace();
        $city = $place ? db()->getOne("SELECT * FROM `map` WHERE `id` = ?", [$place['city_id']]) : null;
        $myShip = $role->ship_id > 0 ? db()->getOne("SELECT * FROM `ship` WHERE `id` = ?", [$role->ship_id]) : null;
    } else {

        // 航海中
        $isSailing = true;
        $sailProgress = round(($elapsed / $sailDuration) * 100);
        $sailRemain = $sailDuration - $elapsed;
    }
}

// 购买船只
if (isPost() && isset($_POST['buy_ship']) && !$isSailing) {
    $shipId = (int)$_POST['buy_ship'];
    $ship = db()->getOne("SELECT * FROM `ship` WHERE `id` = ?", [$shipId]);
    if (!$ship) {
        $msg = '船只不存在';
        $msgType = 'error';
    } elseif ($role->ship_id == $shipId) {
        $msg = '你已经拥有这艘船了';
        $msgType = 'error';
    } elseif ($role->money < $ship['price']) {
        $msg = '铜钱不足！需要 ' . formatMoney($ship['price']) . ' 铜钱';
        $msgType = 'error';
    } else {
        $role->spendMoney($ship['price']);
        db()->update('user', ['ship_id' => $shipId], '`id` = ?', [$role->id]);
        $role->ship_id = $shipId;
        $myShip = $ship;
        $msg = '🎉 成功购买了「' . $ship['name'] . '」！';
        $msgType = 'success';
    }
}

// 出航
if (isPost() && isset($_POST['sail_to']) && !$isSailing && $myShip && $isDock) {
    $targetCityId = (int)$_POST['sail_to'];
    $targetCity = db()->getOne("SELECT * FROM `map` WHERE `id` = ? AND `type` = 1", [$targetCityId]);
    if (!$targetCity) {
        $msg = '目标城市不存在';
        $msgType = 'error';
    } elseif ($targetCity['id'] == $city['id']) {
        $msg = '你已经在当前城市了';
        $msgType = 'error';
    } elseif ($role->hp <= 0) {
        $msg = '体力不足，无法出海';
        $msgType = 'error';
    } else {
        db()->update('user', [
            'sail_time' => time(),
            'sail_from' => $city['id'],
            'sail_to' => $targetCity['id'],
        ], '`id` = ?', [$role->id]);
        redirect('/sail/index.php');
    }
}

// 获取可到达的城市（同一海域或相邻海域）
$reachableCities = [];
if ($city) {
    $seaId = $city['parent_id'];
    $reachableCities = db()->getAll(
        "SELECT * FROM `map` WHERE `type` = 1 AND `id` != ? AND (`parent_id` = ? OR `parent_id` IN (SELECT id FROM `map` WHERE parent_id = ?)) ORDER BY `id`",
        [$city['id'], $seaId, $seaId]
    );
    // 也包括同一海域的城市
    $sameSea = db()->getAll(
        "SELECT * FROM `map` WHERE `type` = 1 AND `parent_id` = ? AND `id` != ? ORDER BY `id`",
        [$seaId, $city['id']]
    );
    // 合并去重
    $seen = [];
    foreach ($reachableCities as $c) $seen[$c['id']] = true;
    foreach ($sameSea as $c) {
        if (!isset($seen[$c['id']])) {
            $reachableCities[] = $c;
            $seen[$c['id']] = true;
        }
    }
}

renderHeader('航海');
?>
<?php if ($isSailing): ?>
<!-- 航行遮罩 -->
<div class="sail-mask-top"></div>
<div class="sail-mask-bottom"></div>
<?php endif; ?>

<div class="location-bar">
    <div class="location-name">⛵ 航海</div>
    <div class="location-path"><?php echo $city ? e($city['name']) : '未知'; ?><?php echo $myShip ? ' · ' . e($myShip['name']) : ' · 无船只'; ?></div>
</div>

<?php if ($msg): ?>
<div class="card" style="border-color:<?php echo $msgType == 'error' ? '#e74c3c' : '#27ae60'; ?>;">
    <p style="color:<?php echo $msgType == 'error' ? '#ff6b6b' : '#27ae60'; ?>;">
        <?php echo $msgType == 'error' ? '❌' : '✅'; ?> <?php echo e($msg); ?>
    </p>
</div>
<?php endif; ?>

<?php if ($isSailing): ?>
<!-- 航海中 -->
<div class="card" style="border-color:#3498db;">
    <div class="card-title" style="color:#3498db;">🌊 航行中...</div>
    <div style="text-align:center;margin:20px 0;">
        <div style="font-size:48px;animation:sailWave 2s ease-in-out infinite;">⛵</div>
        <div style="font-size:18px;color:#e2b714;margin:12px 0;">
            <?php
            $fromCity = db()->getOne("SELECT name FROM `map` WHERE `id` = ?", [$role->sail_from]);
            $toCity = db()->getOne("SELECT name FROM `map` WHERE `id` = ?", [$role->sail_to]);
            ?>
            <?php echo $fromCity ? e($fromCity['name']) : '???'; ?> → <?php echo $toCity ? e($toCity['name']) : '???'; ?>
        </div>
    </div>
    <!-- 进度条 -->
    <div style="margin:12px 0;">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#8a7a5a;margin-bottom:4px;">
            <span>航行进度</span>
            <span id="sailProgressText"><?php echo $sailProgress; ?>%</span>
        </div>
        <div style="height:12px;background:#0f0f2e;border-radius:6px;overflow:hidden;border:1px solid #3a3a5e;">
            <div id="sailProgressBar" style="height:100%;width:<?php echo $sailProgress; ?>%;background:linear-gradient(90deg,#3498db,#2980b9);border-radius:6px;transition:width 1s;"></div>
        </div>
    </div>
    <p class="text-center text-muted" style="font-size:13px;">
        预计还需 <span class="text-gold" id="sailRemain"><?php echo ceil($sailRemain / 60); ?></span> 分钟
        
    </p>
</div>


<?php else: ?>

<?php if (!$isDock): ?>
<div class="card">
    <div class="empty-state">
        ⚓ 你需要前往码头才能出海<br>
        <span style="font-size:12px;">在地图中找到码头（★标记）</span>
    </div>
</div>
<?php else: ?>

<?php if ($myShip): ?>
<!-- 当前船只 -->
<div class="card" style="border-color:#27ae60;">
    <div class="card-title" style="color:#27ae60;">⛵ 当前船只：<?php echo e($myShip['name']); ?></div>
    <table style="width:100%;font-size:14px;">
        <tr><td style="padding:6px 0;color:#c4a87c;">⚡ 速度</td><td style="text-align:right;"><?php echo ['','慢','中','快','','极快'][$myShip['speed']] ?? '一般'; ?></td></tr>
        <tr><td style="padding:6px 0;color:#c4a87c;">📦 容量</td><td style="text-align:right;"><?php echo $myShip['capacity']; ?></td></tr>
    </table>
    <p class="text-muted" style="font-size:12px;margin-top:4px;"><?php echo e($myShip['desc']); ?></p>
</div>

<!-- 出航 -->
<div class="card" style="border-color:#3498db;">
    <div class="card-title" style="color:#3498db;">🗺️ 选择目的地</div>
    <p class="text-muted" style="font-size:13px;">从 <?php echo e($city['name']); ?> 出发，航程约 <?php echo getSailSeconds($myShip['speed']) / 60; ?> 分钟</p>
    <?php if (empty($reachableCities)): ?>
    <div class="empty-state">没有可到达的城市</div>
    <?php else: ?>
    <form method="POST" action="/sail/index.php">
        <select name="sail_to" required style="width:100%;padding:10px;background:#0f0f2e;color:#f5e6c8;border:1px solid #3a3a5e;border-radius:6px;font-size:15px;margin:8px 0;">
            <option value="">-- 选择目标城市 --</option>
            <?php foreach ($reachableCities as $rc): ?>
            <option value="<?php echo $rc['id']; ?>"><?php echo e($rc['name']); ?></option>
            <?php endforeach; ?>
        </select>
        <button type="submit" class="btn btn-primary btn-block">⛵ 出航！</button>
    </form>
    <?php endif; ?>
</div>
<?php else: ?>
<!-- 没有船只 -->
<div class="card">
    <div class="empty-state">
        ⛵ 你还没有船只<br>
        <span style="font-size:12px;">购买一艘船才能出海远航</span>
    </div>
</div>
<?php endif; ?>

<!-- 船只商店 -->
<div class="card" style="border-color:#e2b714;">
    <div class="card-title" style="color:#e2b714;">🏪 船只商店</div>
    <?php foreach ($allShips as $s): ?>
    <div style="padding:8px 0;border-bottom:1px solid rgba(226,183,20,0.05);">
        <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
                <span style="font-weight:bold;<?php echo $role->ship_id == $s['id'] ? 'color:#27ae60;' : ''; ?>"><?php echo e($s['name']); ?></span>
                <?php if ($role->ship_id == $s['id']): ?>
                <span style="font-size:11px;color:#27ae60;">[当前]</span>
                <?php endif; ?>
            </div>
            <span class="text-gold" style="font-size:13px;"><?php echo $s['price'] > 0 ? formatMoney($s['price']) . '铜' : '免费'; ?></span>
        </div>
        <div class="item-desc">
            速度:<?php echo ['','慢','中','快','','极快'][$s['speed']] ?? '一般'; ?>
            · 容量:<?php echo $s['capacity']; ?>
            · 航程:<?php echo getSailSeconds($s['speed']) / 60; ?>分钟
        </div>
        <div class="item-desc"><?php echo e($s['desc']); ?></div>
        <?php if ($role->ship_id != $s['id']): ?>
        <form method="POST" action="/sail/index.php" style="margin-top:4px;display:inline;">
            <input type="hidden" name="buy_ship" value="<?php echo $s['id']; ?>">
            <button type="submit" class="btn btn-success btn-small"
                    <?php echo ($role->money < $s['price']) ? 'disabled style="opacity:0.5;font-size:12px;padding:3px 10px;"' : 'style="font-size:12px;padding:3px 10px;"'; ?>>
                购买
            </button>
        </form>
        <?php endif; ?>
    </div>
    <?php endforeach; ?>
</div>

<?php endif; ?>
<?php endif; ?>


<?php if ($isSailing): ?>
<!-- 世界聊天 -->
<div class="card" style="border-color:#3498db;padding:0;display:flex;flex-direction:column;height:220px;">
    <div style="padding:8px 10px 6px;border-bottom:1px solid rgba(226,183,20,0.08);flex-shrink:0;">
        <span style="font-size:13px;font-weight:bold;color:#3498db;">💬 世界频道</span>
    </div>
    <div class="sail-chat-messages" id="sailChatMsgs">
        <div class="empty-state" style="padding:20px 0;">加载中...</div>
    </div>
    <form id="sailChatForm" style="flex-shrink:0;padding:6px 8px;border-top:1px solid rgba(226,183,20,0.08);">
        <div style="display:flex;gap:6px;">
            <input type="text" id="sailChatInput" maxlength="200" placeholder="输入消息..." 
                   style="flex:1;padding:6px 10px;background:#0f0f2e;color:#f5e6c8;border:1px solid #3a3a5e;border-radius:6px;font-size:13px;outline:none;">
            <button type="submit" class="btn btn-primary" style="padding:6px 14px;font-size:13px;">发送</button>
        </div>
    </form>
</div>
<?php endif; ?>

<!-- 航海须知 -->
<div class="card" style="border-color:#9b59b6;">
    <div class="card-title" style="color:#9b59b6;">📖 航海须知</div>
    <div style="font-size:13px;line-height:1.8;color:#c4a87c;">
        <p>⚓ 必须在码头才能出航</p>
        <p>⛵ 拥有船只才能出海，越快的船航程越短</p>
        <p>🌊 航海中可能遇到随机事件（海盗、宝藏等）</p>
        <p>⏱️ 航海期间不能进行其他操作</p>
    </div>
</div>

<?php if (!$isSailing): ?>
<a href="/map/index.php" class="btn btn-secondary btn-block mt-10">← 返回地图</a>
<?php endif; ?>

<style>
@keyframes sailWave {
    0%, 100% { transform: translateY(0) rotate(-3deg); }
    50% { transform: translateY(-8px) rotate(3deg); }
}

.sail-mask-top, .sail-mask-bottom {
    position: fixed;
    left: 0; right: 0;
    z-index: 200;
    background: rgba(15,15,30,0.95);
    pointer-events: auto;
}
.sail-mask-top { top: 0; height: 44px; }
.sail-mask-bottom { bottom: 0; height: 48px; }
.sail-chat-messages {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    padding: 6px 10px;
    scrollbar-width: none;
}
.sail-chat-messages::-webkit-scrollbar { display: none; }

</style>


<?php if ($isSailing): ?>
<script>
(function(){
    var lastChatId = 0;
    var chatMsgs = document.getElementById('sailChatMsgs');
    var chatForm = document.getElementById('sailChatForm');
    var chatInput = document.getElementById('sailChatInput');
    var progText = document.getElementById('sailProgressText');
    var progBar = document.getElementById('sailProgressBar');
    var remainEl = document.getElementById('sailRemain');
    
    function loadChat(){
        fetch('/chat/api.php?action=messages&last_id='+lastChatId)
            .then(function(r){return r.json()})
            .then(function(d){
                if(d.ok && d.messages && d.messages.length){
                    if(lastChatId===0) chatMsgs.innerHTML='';
                    d.messages.forEach(function(m){
                        var sex = m.sex==2?'♀':'♂';
                        var div = document.createElement('div');
                        div.className='chat-msg';
                        div.innerHTML='<span class="chat-sender">'+sex+m.username+' <span class="text-muted" style="font-weight:normal;font-size:10px;">Lv.'+m.level+'</span></span><span class="chat-time">'+new Date(m.created_at*1000).getHours().toString().padStart(2,'0')+':'+new Date(m.created_at*1000).getMinutes().toString().padStart(2,'0')+'</span><span class="chat-text">'+m.message.replace(/</g,'&lt;')+'</span>';
                        chatMsgs.appendChild(div);
                        lastChatId = m.id;
                    });
                    chatMsgs.scrollTop = chatMsgs.scrollHeight;
                }
            });
    }
    
    chatForm.addEventListener('submit', function(e){
        e.preventDefault();
        var msg = chatInput.value.trim();
        if(!msg) return;
        var fd = new FormData();
        fd.append('message', msg);
        fetch('/chat/api.php?action=send', {method:'POST',body:fd})
            .then(function(r){return r.json()})
            .then(function(d){
                if(d.ok){ chatInput.value=''; loadChat(); }
            });
    });
    
    function checkSail(){
        fetch('/sail/api.php')
            .then(function(r){return r.json()})
            .then(function(d){
                if(d.status==='done'){
                    window.location.href = d.url;
                } else if(d.status==='sailing'){
                    if(progText) progText.textContent = d.progress+'%';
                    if(progBar) progBar.style.width = d.progress+'%';
                    if(remainEl) remainEl.textContent = d.remain;
                }
            });
    }
    
    loadChat();
    setInterval(loadChat, 5000);
    setInterval(checkSail, 10000);
})();
</script>
<?php endif; ?>

<?php renderFooter(); ?>

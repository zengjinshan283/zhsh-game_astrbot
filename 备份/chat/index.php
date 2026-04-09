<?php
require_once __DIR__ . '/../inc/functions.php';
$role = requireLogin();
$messages = db()->getAll("SELECT c.*, u.username, u.sex, u.level FROM `chat` c LEFT JOIN `user` u ON c.user_id = u.id WHERE c.target_id = 0 ORDER BY c.id DESC LIMIT 30");
$messages = array_reverse($messages);
$onlineCount = db()->getVar("SELECT COUNT(*) FROM `user` WHERE `lastdate` > ?", [time() - ONLINE_TIMEOUT]);
renderHeader('世界频道');
?>
<div class="location-bar">
    <div class="location-name">💬 世界频道</div>
    <div class="location-path">在线：<span class="online-count"><?php echo $onlineCount; ?></span> 人</div>
</div>
<div class="chat-messages" id="chatMessages" style="flex:1;min-height:0;">
    <?php if (empty($messages)): ?>
    <div class="empty-state">还没有消息</div>
    <?php else: ?>
    <?php foreach ($messages as $msg): ?>
    <div class="chat-msg">
        <span class="chat-sender"><?php echo ($msg['sex']==2)?'♀':'♂'; ?><?php echo e($msg['username']); ?> <span class="text-muted" style="font-weight:normal;font-size:10px;">Lv.<?php echo $msg['level']; ?></span></span>
        <span class="chat-time"><?php echo date('H:i', $msg['created_at']); ?></span>
        <span class="chat-text"><?php echo e($msg['message']); ?></span>
    </div>
    <?php endforeach; ?>
    <?php endif; ?>
</div>
<div id="chatInputArea" style="flex-shrink:0;margin-top:4px;">
    <div class="inline-form">
        <input type="text" id="chatInput" maxlength="200" placeholder="输入消息..." style="flex:1;">
        <button id="chatSendBtn" class="btn btn-primary">发送</button>
    </div>
</div>
<script>
(function(){
    var input = document.getElementById('chatInput');
    var btn = document.getElementById('chatSendBtn');
    var container = document.getElementById('chatMessages');
    if (container) container.scrollTop = container.scrollHeight;

    function sendMsg() {
        var msg = input.value.trim();
        if (!msg) return;
        GameWS.chatSend(msg);
        input.value = '';
        input.focus();
    }

    btn.addEventListener('click', function(e) {
        e.preventDefault();
        sendMsg();
    });
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); sendMsg(); }
    });
})();
</script>
<?php renderFooter(); ?>

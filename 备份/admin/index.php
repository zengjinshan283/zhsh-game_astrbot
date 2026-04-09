<?php
/**
 * 管理后台 - 仪表盘
 */
require_once __DIR__ . '/../inc/config.php';
require_once __DIR__ . '/../inc/functions.php';
checkAdmin();

$db = db();

// 统计数据
$totalPlayers = $db->getVar("SELECT COUNT(*) FROM `user`");
$todayReg = $db->getVar("SELECT COUNT(*) FROM `user` WHERE `regdate` > ?", [strtotime('today')]);
$onlineNow = $db->getVar("SELECT COUNT(*) FROM `user` WHERE `lastdate` > ?", [time() - ONLINE_TIMEOUT]);
$totalItems = $db->getVar("SELECT COUNT(*) FROM `item`");
$totalMonsters = $db->getVar("SELECT COUNT(*) FROM `monster`");

// 最近注册5个玩家
$recentPlayers = $db->getAll("SELECT id, username, level, money, regdate, lastdate FROM `user` ORDER BY `id` DESC LIMIT 5");

// 最近5条聊天
$recentChat = $db->getAll(
    "SELECT c.*, u.username FROM `chat` c LEFT JOIN `user` u ON c.user_id = u.id ORDER BY c.id DESC LIMIT 5"
);

adminHeader('仪表盘');
?>
<h2 class="page-title">📊 仪表盘</h2>

<div class="stat-cards">
    <div class="stat-card blue">
        <div class="stat-value"><?php echo number_format($totalPlayers); ?></div>
        <div class="stat-label">总玩家数</div>
    </div>
    <div class="stat-card green">
        <div class="stat-value"><?php echo number_format($todayReg); ?></div>
        <div class="stat-label">今日注册</div>
    </div>
    <div class="stat-card orange">
        <div class="stat-value"><?php echo number_format($onlineNow); ?></div>
        <div class="stat-label">当前在线</div>
    </div>
    <div class="stat-card purple">
        <div class="stat-value"><?php echo number_format($totalItems); ?></div>
        <div class="stat-label">总物品数</div>
    </div>
    <div class="stat-card red">
        <div class="stat-value"><?php echo number_format($totalMonsters); ?></div>
        <div class="stat-label">总怪物数</div>
    </div>
</div>

<div class="grid-2">
    <!-- 最近注册玩家 -->
    <div class="panel">
        <div class="panel-header">最近注册玩家</div>
        <div class="panel-body">
            <?php if (empty($recentPlayers)): ?>
            <div class="empty">暂无玩家</div>
            <?php else: ?>
            <ul class="recent-list">
                <?php foreach ($recentPlayers as $p): ?>
                <li>
                    <span class="name"><?php echo e($p['username']); ?></span>
                    <span class="detail">Lv.<?php echo $p['level']; ?> | 金钱: <?php echo number_format($p['money']); ?></span>
                    <span class="time"><?php echo date('m-d H:i', $p['regdate']); ?></span>
                </li>
                <?php endforeach; ?>
            </ul>
            <?php endif; ?>
        </div>
    </div>

    <!-- 最近聊天消息 -->
    <div class="panel">
        <div class="panel-header">最近聊天消息</div>
        <div class="panel-body">
            <?php if (empty($recentChat)): ?>
            <div class="empty">暂无消息</div>
            <?php else: ?>
            <ul class="recent-list">
                <?php foreach ($recentChat as $c): ?>
                <li>
                    <span class="name"><?php echo e($c['username'] ?? '未知'); ?></span>
                    <span class="detail"><?php echo e(mb_substr($c['message'], 0, 30)); ?></span>
                    <span class="time"><?php echo date('m-d H:i', $c['created_at']); ?></span>
                </li>
                <?php endforeach; ?>
            </ul>
            <?php endif; ?>
        </div>
    </div>
</div>

<?php adminFooter(); ?>

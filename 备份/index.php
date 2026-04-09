<?php
/**
 * 纵横四海 - 首页
 */
require_once __DIR__ . '/inc/functions.php';

// 如果已登录，检查是否有新剧情要播放
$role = getCurrentRole();
if ($role->isLoggedIn()) {
    if (isset($_GET['logout'])) {
        $_SESSION = [];
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        session_destroy();
        redirect('/');
    }
}

// 处理退出（未登录状态）
if (isset($_GET['logout']) && !$role->isLoggedIn()) {
    redirect('/');
}
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title><?php echo SITE_NAME; ?></title>
    <link rel="stylesheet" href="/css/style.css">
</head>
<body>
<div class="container">
    <div class="main-content">
    <?php if ($role->isLoggedIn()): ?>
    <!-- 已登录 -->
    <div class="game-title" style="padding:24px 20px 12px;">
        <h1 style="font-size:28px;">⚓ 纵横四海</h1>
        <div class="divider"></div>
        <p class="subtitle">大航海时代的冒险</p>
        <p class="version">v<?php echo SITE_VERSION; ?></p>
    </div>

    <div class="card">
        <div class="card-title">👤 角色信息</div>
        <p><strong><?php echo e($role->username); ?></strong> · <?php echo $role->getSexText(); ?> · Lv.<?php echo $role->level; ?></p>
        <div class="status-bar mt-10 bar-hp">
            <div class="bar-label">
                <span>❤️ 体力</span>
                <span><?php echo $role->hp; ?>/<?php echo $role->hp_max; ?></span>
            </div>
            <div class="bar-track">
                <div class="bar-fill" style="width:<?php echo $role->getHpPercent(); ?>%"></div>
            </div>
        </div>
        <div class="status-bar bar-exp">
            <div class="bar-label">
                <span>✨ 经验</span>
                <span><?php echo $role->exp; ?>/<?php echo $role->exp_max; ?></span>
            </div>
            <div class="bar-track">
                <div class="bar-fill" style="width:<?php echo $role->getExpPercent(); ?>%"></div>
            </div>
        </div>
        <p class="text-gold mt-10">💰 <?php echo formatMoney($role->money); ?> 铜币</p>
    </div>

    <a href="/map/index.php" class="btn btn-primary btn-block">🗺️ 进入游戏</a>
    <a href="/?logout=1" class="btn btn-secondary btn-block mt-10">🚪 退出登录</a>

    <?php else: ?>
    <!-- 未登录 -->
    <div class="game-title" style="padding:40px 20px 16px;">
        <h1>⚓ 纵横四海</h1>
        <div class="divider"></div>
        <p class="subtitle">大航海时代的文字冒险</p>
        <p class="version">v<?php echo SITE_VERSION; ?></p>
    </div>

    <div class="card">
        <div class="card-title">📜 游戏简介</div>
        <p style="font-size:13px;line-height:1.7;color:#c4a87c;">
            1453年，奥斯曼帝国攻陷君士坦丁堡，东西方贸易路线被切断。<br><br>
            面对危机，欧洲的航海家们纷纷扬帆远航，寻找通往东方的新航线……<br><br>
            在这个大航海时代，你将作为一名年轻的冒险者，从威尼斯出发，横跨地中海，穿越非洲，探索东亚，驶向印度洋，最终到达神秘的新大陆……
        </p>
    </div>

    <a href="/reg.php" class="btn btn-primary btn-block">🚀 创建角色</a>
    <a href="/login.php" class="btn btn-secondary btn-block mt-10">🔓 登录游戏</a>

    <?php endif; ?>
    </div>

    <div class="footer">
        <p>⚓ <?php echo SITE_NAME; ?> v<?php echo SITE_VERSION; ?></p>
        <p class="text-muted">© 2024-<?php echo date('Y'); ?> All Rights Reserved</p>
    </div>
</div>
</body>
</html>

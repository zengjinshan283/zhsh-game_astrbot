<?php
/**
 * 纵横四海 - 通用函数
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/role.php';

/**
 * 检查登录状态，未登录则跳转到首页
 */
function requireLogin() {
    $role = getCurrentRole();
    if (!$role->isLoggedIn()) {
        header('Location: /');
        exit;
    }
    return $role;
}

/**
 * 获取公共页面头部HTML
 * $hasBottomNav: 是否显示底部导航栏
 */
function renderHeader($title = '纵横四海', $hasBottomNav = true) {
    $role = getCurrentRole();
    $isLoggedIn = $role->isLoggedIn();
    ?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title><?php echo htmlspecialchars($title); ?> - <?php echo SITE_NAME; ?></title>
    <link rel="stylesheet" href="/css/style.css?v=1775411618">

    <?php if ($isLoggedIn): ?>
    <script>
    window.__GAME_SID__ = <?php echo json_encode($_SESSION['sid'] ?? ''); ?>;
    </script>
    <script src="/assets/js/game-ws.js"></script>
    <?php endif; ?>

</head>
<body>
<div class="container">
    <?php if ($isLoggedIn): ?>
    <div class="top-bar">
        <span class="top-bar-title">⚓ <?php echo SITE_NAME; ?></span>
        <span class="top-bar-right">
            <?php echo htmlspecialchars($role->username); ?> Lv.<?php echo $role->level; ?>
            <a href="/" class="top-link" style="color:#ff6b6b;">退出</a>
        </span>
    </div>
    <?php endif; ?>
    <div class="main-content">
<?php
}

/**
 * 获取公共页面底部HTML
 * $showNav: 是否显示底部导航栏
 */
function renderFooter($showNav = true) {
    $role = getCurrentRole();
    $isLoggedIn = $role->isLoggedIn();
    ?>
    </div><!-- /main-content -->
    <?php if ($showNav && $isLoggedIn): ?>
    <!-- 功能菜单 overlay -->
    <div class="func-float" id="globalFuncFloat">
        <div class="func-overlay-bg" onclick="toggleGlobalFunc()"></div>
        <div class="func-panel">
            <div class="func-close-bar"></div>
            <div class="func-scroll"><div class="func-grid">
                <a href="/user/status.php" class="func-btn">
                    <span class="func-emoji">👤</span><span class="func-label">状态</span>
                </a>
                <a href="/user/equipment.php" class="func-btn">
                    <span class="func-emoji">⚔️</span><span class="func-label">装备</span>
                </a>
                <a href="/quest/index.php" class="func-btn">
                    <span class="func-emoji">📜</span><span class="func-label">任务</span>
                </a>
                <a href="/friend/index.php" class="func-btn">
                    <span class="func-emoji">👥</span><span class="func-label">好友</span>
                </a>
                <a href="/pet/index.php" class="func-btn">
                    <span class="func-emoji">🐶</span><span class="func-label">宠物</span>
                </a>
                <a href="/rank/index.php" class="func-btn">
                    <span class="func-emoji">🏆</span><span class="func-label">排行</span>
                </a>
                <a href="/guild/index.php" class="func-btn">
                    <span class="func-emoji">🏴</span><span class="func-label">帮会</span>
                </a>
            </div>
        </div>
        </div>
    </div>
    <div class="bottom-bar">
        <a href="/map/index.php" class="bottom-link">
            <span class="nav-icon">🗺️</span>
            <span class="nav-text">地图</span>
        </a>
        <a href="/user/inventory.php" class="bottom-link">
            <span class="nav-icon">🎒</span>
            <span class="nav-text">背包</span>
        </a>
        <a href="/chat/index.php" class="bottom-link">
            <span class="nav-icon">💬</span>
            <span class="nav-text">聊天</span>
        </a>
        <a href="javascript:void(0)" class="bottom-link" onclick="toggleGlobalFunc()">
            <span class="nav-icon">☰</span>
            <span class="nav-text">更多</span>
        </a>
    </div>
    <script>
    function toggleGlobalFunc(){
        document.getElementById('globalFuncFloat').classList.toggle('open');
    }
    </script>
    <?php endif; ?>
</div>
</body>
</html>
<?php
}

/**
 * 显示提示消息
 */
function showMessage($message, $title = '提示', $url = null, $delay = 2) {
    renderHeader($title);
    ?>
    <div class="msg-box">
        <h2><?php echo htmlspecialchars($title); ?></h2>
        <p><?php echo $message; ?></p>
        <?php if ($url): ?>
        <p><a href="<?php echo htmlspecialchars($url); ?>">如果页面没有自动跳转，请点击这里</a></p>
        <script>
        setTimeout(function(){ window.location.href = '<?php echo addslashes($url); ?>'; }, <?php echo $delay * 1000; ?>);
        </script>
        <?php endif; ?>
    </div>
    <?php
    renderFooter();
    exit;
}

/**
 * 显示错误消息
 */
function showError($message, $url = null) {
    showMessage('<span style="color:#ff6b6b;">' . $message . '</span>', '错误', $url, 3);
}

/**
 * 方向中文名
 */
function getDirName($dir) {
    $names = ['n' => '北', 's' => '南', 'e' => '东', 'w' => '西'];
    return isset($names[$dir]) ? $names[$dir] : '';
}

/**
 * 格式化金钱
 */
function formatMoney($amount) {
    return number_format($amount);
}

/**
 * 生成SID
 */
function generateSid() {
    return bin2hex(random_bytes(16));
}

/**
 * HTML转义
 */
function e($str) {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}

/**
 * 重定向
 */
function redirect($url) {
    header('Location: ' . $url);
    exit;
}

/**
 * 检查是否POST请求
 */
function isPost() {
    return $_SERVER['REQUEST_METHOD'] === 'POST';
}

/**
 * 检查管理员登录状态
 */
function checkAdmin() {
    if (empty($_SESSION['admin_logged_in'])) {
        redirect('/admin/login.php');
    }
}

/**
 * 管理后台头部
 */
function adminHeader($title = '管理后台', $breadcrumb = []) {
    ?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo e($title); ?> - <?php echo SITE_NAME; ?> 管理后台</title>
    <link rel="stylesheet" href="/admin/css/admin.css">

    <?php if ($isLoggedIn): ?>
    <script>
    window.__GAME_SID__ = <?php echo json_encode($_SESSION['sid'] ?? ''); ?>;
    </script>
    <script src="/assets/js/game-ws.js"></script>
    <?php endif; ?>

</head>
<body>
    <!-- 左侧菜单 -->
    <aside class="sidebar">
        <div class="sidebar-header">
            <h2>⚓ 纵横四海</h2>
            <p>管理后台</p>
        </div>
        <nav class="sidebar-nav">
            <a href="/admin/index.php" class="nav-item">
                <span class="nav-icon">📊</span>
                <span>仪表盘</span>
            </a>
            <a href="/admin/players/list.php" class="nav-item">
                <span class="nav-icon">👥</span>
                <span>玩家管理</span>
            </a>
            <div class="nav-group">
                <a href="/admin/map/seas.php" class="nav-item">
                    <span class="nav-icon">🗺️</span>
                    <span>地图管理</span>
                </a>
                <a href="/admin/map/seas.php" class="nav-sub">海域管理</a>
                <a href="/admin/map/cities.php" class="nav-sub">城市管理</a>
                <a href="/admin/map/places.php" class="nav-sub">地点管理</a>
            </div>
            <a href="/admin/items/list.php" class="nav-item">
                <span class="nav-icon">⚔️</span>
                <span>物品管理</span>
            </a>
            <a href="/admin/monsters/list.php" class="nav-item">
                <span class="nav-icon">👹</span>
                <span>怪物管理</span>
            </a>
            <a href="/admin/chat/list.php" class="nav-item">
                <span class="nav-icon">💬</span>
                <span>聊天管理</span>
            </a>
            <a href="/admin/config/index.php" class="nav-item">
                <span class="nav-icon">⚙️</span>
                <span>系统配置</span>
            </a>
        </nav>
    </aside>

    <!-- 右侧内容区 -->
    <main class="main-content">
        <header class="top-header">
            <div class="breadcrumb">
                <a href="/admin/index.php">管理后台</a>
                <?php foreach ($breadcrumb as $item): ?>
                <span class="sep">›</span>
                <?php if (!empty($item['url'])): ?>
                <a href="<?php echo e($item['url']); ?>"><?php echo e($item['text']); ?></a>
                <?php else: ?>
                <span><?php echo e($item['text']); ?></span>
                <?php endif; ?>
                <?php endforeach; ?>
            </div>
            <div class="header-right">
                <span class="admin-name">管理员</span>
                <a href="/admin/logout.php" class="btn-logout">退出登录</a>
            </div>
        </header>

        <div class="content-body">
<?php
}

/**
 * 管理后台底部
 */
function adminFooter() {
    ?>
        </div>
    </main>
</body>
</html>
<?php
}

/**
 * 获取系统配置
 */
function getSetting($key, $default = '') {
    $val = db()->getVar("SELECT `value` FROM `settings` WHERE `key` = ?", [$key]);
    return $val !== false ? $val : $default;
}

/**
 * 设置系统配置
 */
function setSetting($key, $value) {
    $exists = db()->getVar("SELECT COUNT(*) FROM `settings` WHERE `key` = ?", [$key]);
    if ($exists > 0) {
        db()->update('settings', ['value' => $value], '`key` = ?', [$key]);
    } else {
        db()->insert('settings', ['key' => $key, 'value' => $value]);
    }
}

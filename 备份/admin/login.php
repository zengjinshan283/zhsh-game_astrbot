<?php
/**
 * 管理员登录
 */
require_once __DIR__ . '/../inc/config.php';
require_once __DIR__ . '/../inc/db.php';

// 已登录则跳转
if (!empty($_SESSION['admin_logged_in'])) {
    header('Location: index.php');
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = trim($_POST['password'] ?? '');
    if ($username === ADMIN_USER && $password === ADMIN_PASS) {
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['admin_login_time'] = time();
        header('Location: index.php');
        exit;
    } else {
        $error = '用户名或密码错误';
    }
}
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>管理员登录 - <?php echo SITE_NAME; ?></title>
    <link rel="stylesheet" href="/admin/css/admin.css">
</head>
<body class="login-page">
    <div class="login-box">
        <h1>⚓ 纵横四海</h1>
        <p class="login-sub">管理后台</p>
        <?php if ($error): ?>
        <div class="login-error"><?php echo e($error); ?></div>
        <?php endif; ?>
        <form method="POST">
            <div class="form-row">
                <label>用户名</label>
                <input type="text" name="username" required autofocus autocomplete="username">
            </div>
            <div class="form-row">
                <label>密码</label>
                <input type="password" name="password" required autocomplete="current-password">
            </div>
            <div class="form-row">
                <button type="submit" class="btn btn-primary">登 录</button>
            </div>
        </form>
    </div>
</body>
</html>

<?php
/**
 * 纵横四海 - 登录
 */
require_once __DIR__ . '/inc/functions.php';

$role = getCurrentRole();
if ($role->isLoggedIn()) {
    redirect('/map/index.php');
}

$error = '';

if (isPost()) {
    $username = trim($_POST['username'] ?? '');
    $password = trim($_POST['password'] ?? '');

    if (empty($username) || empty($password)) {
        $error = '请输入角色名和密码';
    } else {
        $user = db()->getOne("SELECT * FROM `user` WHERE `username` = ?", [$username]);
        if (!$user) {
            $error = '角色名不存在';
        } elseif (!password_verify($password, $user['password'])) {
            $error = '密码错误';
        } else {
            $sid = generateSid();
            $now = time();
            db()->update('user', [
                'sid' => $sid,
                'lastdate' => $now,
            ], '`id` = ?', [$user['id']]);

            $_SESSION['sid'] = $sid;
            redirect('/map/index.php');
        }
    }
}
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>登录 - <?php echo SITE_NAME; ?></title>
    <link rel="stylesheet" href="/css/style.css">
</head>
<body>
<div class="container">
    <div class="main-content">
        <div class="game-title" style="padding:30px 20px 16px;">
            <h1 style="font-size:26px;">⚓ 登录</h1>
            <div class="divider"></div>
        </div>

        <?php if ($error): ?>
        <div class="card" style="border-color:#e74c3c;">
            <p style="color:#ff6b6b;"><?php echo e($error); ?></p>
        </div>
        <?php endif; ?>

        <form method="POST" action="/login.php">
            <div class="card">
                <div class="form-group">
                    <label>🎮 角色名</label>
                    <input type="text" name="username" maxlength="20" required
                           value="<?php echo e($_POST['username'] ?? ''); ?>"
                           placeholder="请输入角色名">
                </div>
                <div class="form-group">
                    <label>🔐 密码</label>
                    <input type="password" name="password" maxlength="20" required
                           placeholder="请输入密码">
                </div>
                <button type="submit" class="btn btn-primary btn-block">🔓 登录</button>
            </div>
        </form>

        <p class="text-center mt-20">
            <a href="/reg.php">没有角色？去创建</a>
        </p>
    </div>

    <div class="footer">
        <p>⚓ <?php echo SITE_NAME; ?> v<?php echo SITE_VERSION; ?></p>
    </div>
</div>
</body>
</html>

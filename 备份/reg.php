<?php
/**
 * 纵横四海 - 创建角色
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
    $password2 = trim($_POST['password2'] ?? '');
    $sex = (int)($_POST['sex'] ?? 1);

    if (mb_strlen($username) < 2 || mb_strlen($username) > 10) {
        $error = '角色名需要2-10个字符';
    } elseif (!preg_match('/^[\x{4e00}-\x{9fa5}a-zA-Z0-9_]+$/u', $username)) {
        $error = '角色名只能包含中文、英文、数字和下划线';
    } elseif (strlen($password) < 4 || strlen($password) > 20) {
        $error = '密码需要4-20个字符';
    } elseif ($password !== $password2) {
        $error = '两次输入的密码不一致';
    } elseif ($sex != 1 && $sex != 2) {
        $error = '请选择正确的性别';
    } else {
        $exists = db()->getVar("SELECT COUNT(*) FROM `user` WHERE `username` = ?", [$username]);
        if ($exists > 0) {
            $error = '该角色名已被使用';
        } else {
            $sid = generateSid();
            $now = time();
            $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

            db()->insert('user', [
                'username' => $username,
                'password' => password_hash($password, PASSWORD_DEFAULT),
                'sex' => $sex,
                'avatar' => $sex,
                'sid' => $sid,
                'regdate' => $now,
                'lastdate' => $now,
                'regip' => $ip,
                'money' => 10000,
                'gold' => 0,
                'level' => 1,
                'exp' => 0,
                'exp_max' => 500,
                'hp' => 100,
                'hp_max' => 100,
                'atk_min' => 1,
                'atk_max' => 28,
                'def' => 0,
                'agility' => 0,
                'place_id' => START_PLACE_ID,
            ]);

            $_SESSION['sid'] = $sid;

            $newUser = db()->getVar("SELECT `id` FROM `user` WHERE `sid` = ?", [$sid]);
            if ($newUser) {
                db()->insert('inventory', ['user_id' => $newUser, 'item_id' => 1, 'quantity' => 1, 'equipped' => 0]);
                db()->insert('inventory', ['user_id' => $newUser, 'item_id' => 3, 'quantity' => 3, 'equipped' => 0]);
            }

            redirect('/step.php?step=1');
        }
    }
}
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>创建角色 - <?php echo SITE_NAME; ?></title>
    <link rel="stylesheet" href="/css/style.css">
</head>
<body>
<div class="container">
    <div class="main-content">
        <div class="game-title" style="padding:24px 20px 12px;">
            <h1 style="font-size:24px;">⚓ 创建角色</h1>
            <div class="divider"></div>
        </div>

        <?php if ($error): ?>
        <div class="card" style="border-color:#e74c3c;">
            <p style="color:#ff6b6b;"><?php echo e($error); ?></p>
        </div>
        <?php endif; ?>

        <form method="POST" action="/reg.php">
            <div class="card">
                <div class="form-group">
                    <label>🎮 角色名（2-10个字符）</label>
                    <input type="text" name="username" maxlength="10" required
                           value="<?php echo e($_POST['username'] ?? ''); ?>"
                           placeholder="请输入你的角色名">
                </div>
                <div class="form-group">
                    <label>🔐 密码（4-20个字符）</label>
                    <input type="password" name="password" maxlength="20" required
                           placeholder="请输入密码">
                </div>
                <div class="form-group">
                    <label>🔐 确认密码</label>
                    <input type="password" name="password2" maxlength="20" required
                           placeholder="请再次输入密码">
                </div>
                <div class="form-group">
                    <label>👤 性别</label>
                    <select name="sex">
                        <option value="1" <?php echo (($_POST['sex'] ?? 1) == 1) ? 'selected' : ''; ?>>♂ 男</option>
                        <option value="2" <?php echo (($_POST['sex'] ?? '') == 2) ? 'selected' : ''; ?>>♀ 女</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary btn-block">🚀 扬帆起航</button>
            </div>
        </form>

        <p class="text-center mt-20">
            <a href="/login.php">已有角色？去登录</a>
        </p>
    </div>

    <div class="footer">
        <p>⚓ <?php echo SITE_NAME; ?> v<?php echo SITE_VERSION; ?></p>
    </div>
</div>
</body>
</html>

<?php
/**
 * 管理员退出
 */
require_once __DIR__ . '/../inc/config.php';

$_SESSION['admin_logged_in'] = false;
unset($_SESSION['admin_logged_in'], $_SESSION['admin_login_time']);
session_destroy();
header('Location: login.php');
exit;

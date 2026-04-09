<?php
/**
 * 纵横四海 - 全局配置
 */

ini_set("session.save_path", "/tmp/php_sessions");
// 时区设置
date_default_timezone_set('Asia/Shanghai');

// Session 启动
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// 站点常量
define('SITE_NAME', '纵横四海');
define('SITE_VERSION', '1.0.0');
define('SITE_URL', 'https://zhsh.xinanc.cn');

// 数据库配置
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'zhsh_game');
define('DB_USER', 'zhsh_game');
define('DB_PASS', 'Zhsh2026game!');
define('DB_CHARSET', 'utf8mb4');

// 游戏常量
define('ONLINE_TIMEOUT', 900);       // 15分钟内算在线
define('START_PLACE_ID', 1011);      // 威尼斯酒馆
define('SHOP_PLACE_ID', 1029);       // 商店
define('MAX_CHAT_MESSAGES', 50);     // 聊天最大消息数
define('SID_LENGTH', 32);

// 游戏参数
define('LEVEL_HP_BONUS', 20);
define('LEVEL_ATK_MIN_BONUS', 2);
define('LEVEL_ATK_MAX_BONUS', 5);
define('LEVEL_DEF_BONUS', 1);
define('BASE_EXP_MAX', 500);
define('EXP_GROWTH', 300);           // 每级经验增长

// 聊天类型
define('CHAT_WORLD', 0);
define('CHAT_PRIVATE', 1);

// 管理员配置
define('ADMIN_USER', 'admin');
define('ADMIN_PASS', 'admin123');

<?php
/**
 * 聊天 AJAX API
 */
require_once __DIR__ . '/../inc/functions.php';
$role = requireLogin();
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? '';

if ($action === 'send' && isPost()) {
    $message = trim($_POST['message'] ?? '');
    if (mb_strlen($message) > 0 && mb_strlen($message) <= 200) {
        db()->insert('chat', [
            'user_id' => $role->id,
            'target_id' => 0,
            'message' => $message,
            'created_at' => time()
        ]);
        echo json_encode(['ok' => true]);
    } else {
        echo json_encode(['ok' => false, 'msg' => '消息无效']);
    }
    exit;
}

if ($action === 'messages') {
    $lastId = (int)($_GET['last_id'] ?? 0);
    $messages = db()->getAll(
        "SELECT c.id, c.message, c.created_at, u.username, u.sex, u.level 
         FROM `chat` c LEFT JOIN `user` u ON c.user_id = u.id 
         WHERE c.target_id = 0 AND c.id > ? ORDER BY c.id ASC LIMIT 30",
        [$lastId]
    );
    echo json_encode(['ok' => true, 'messages' => $messages]);
    exit;
}

echo json_encode(['ok' => false, 'msg' => '未知操作']);

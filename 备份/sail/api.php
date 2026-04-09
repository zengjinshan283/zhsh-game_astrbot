<?php
/**
 * 航海状态 AJAX API
 */
require_once __DIR__ . '/../inc/functions.php';
$role = requireLogin();
header('Content-Type: application/json; charset=utf-8');

if ($role->sail_time > 0) {
    $myShip = $role->ship_id > 0 ? db()->getOne("SELECT * FROM `ship` WHERE `id` = ?", [$role->ship_id]) : null;
    $speed = $myShip ? $myShip['speed'] : 1;
    $minutes = [1 => 10, 2 => 6, 3 => 3, 5 => 1];
    $sailDuration = ($minutes[$speed] ?? 10) * 60;
    $elapsed = time() - $role->sail_time;
    
    if ($elapsed >= $sailDuration) {
        echo json_encode(['status' => 'done', 'url' => '/sail/index.php']);
    } else {
        echo json_encode([
            'status' => 'sailing',
            'progress' => round(($elapsed / $sailDuration) * 100),
            'remain' => ceil(($sailDuration - $elapsed) / 60)
        ]);
    }
} else {
    echo json_encode(['status' => 'idle']);
}

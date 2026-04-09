<?php
/**
 * 纵横四海 - 任务辅助函数
 * 用于在各系统中检测和更新任务进度
 */

/**
 * 检查杀怪任务进度（在battle/fight.php中调用）
 * @param int $userId 玩家ID
 * @param int $monsterId 怪物ID
 * @return array 完成的任务列表
 */
function checkKillQuestProgress($userId, $monsterId) {
    $completed = [];
    $quests = db()->getAll(
        "SELECT q.id, q.name, q.require_value, uq.progress FROM `quest` q
         JOIN `user_quest` uq ON q.id = uq.quest_id
         WHERE uq.user_id = ? AND q.type = 0 AND q.target_id = ? AND uq.status = 0",
        [$userId, $monsterId]
    );
    foreach ($quests as $q) {
        $newProgress = min($q['require_value'], $q['progress'] + 1);
        $status = $newProgress >= $q['require_value'] ? 1 : 0;
        db()->update('user_quest', [
            'progress' => $newProgress,
            'status' => $status,
        ], '`user_id` = ? AND `quest_id` = ?', [$userId, $q['id']]);
        if ($status == 1) {
            $completed[] = $q['name'];
        }
    }
    return $completed;
}

/**
 * 检查收集物品任务进度
 * @param int $userId 玩家ID
 * @param int $itemId 物品ID
 * @return array 完成的任务列表
 */
function checkCollectQuestProgress($userId, $itemId) {
    $completed = [];
    $quests = db()->getAll(
        "SELECT q.id, q.name, q.require_value, uq.progress FROM `quest` q
         JOIN `user_quest` uq ON q.id = uq.quest_id
         WHERE uq.user_id = ? AND q.type = 1 AND q.target_id = ? AND uq.status = 0",
        [$userId, $itemId]
    );
    foreach ($quests as $q) {
        // 检查当前背包中该物品的数量
        $currentCount = db()->getVar(
            "SELECT SUM(inv.quantity) FROM `inventory` inv
             JOIN `item` i ON inv.item_id = i.id
             WHERE inv.user_id = ? AND inv.item_id = ?",
            [$userId, $itemId]
        );
        $currentCount = (int)$currentCount;
        $newProgress = min($q['require_value'], $currentCount);
        $status = $newProgress >= $q['require_value'] ? 1 : 0;
        db()->update('user_quest', [
            'progress' => $newProgress,
            'status' => $status,
        ], '`user_id` = ? AND `quest_id` = ?', [$userId, $q['id']]);
        if ($status == 1) {
            $completed[] = $q['name'];
        }
    }
    return $completed;
}

/**
 * 检查到达地点任务进度（在map/index.php中调用）
 * @param int $userId 玩家ID
 * @param int $placeId 地点ID
 * @return array 完成的任务列表
 */
function checkPlaceQuestProgress($userId, $placeId) {
    $completed = [];
    $quests = db()->getAll(
        "SELECT q.id, q.name, q.require_value, uq.progress FROM `quest` q
         JOIN `user_quest` uq ON q.id = uq.quest_id
         WHERE uq.user_id = ? AND q.type = 2 AND q.target_id = ? AND uq.status = 0",
        [$userId, $placeId]
    );
    foreach ($quests as $q) {
        $newProgress = min($q['require_value'], $q['progress'] + 1);
        $status = $newProgress >= $q['require_value'] ? 1 : 0;
        db()->update('user_quest', [
            'progress' => $newProgress,
            'status' => $status,
        ], '`user_id` = ? AND `quest_id` = ?', [$userId, $q['id']]);
        if ($status == 1) {
            $completed[] = $q['name'];
        }
    }
    return $completed;
}

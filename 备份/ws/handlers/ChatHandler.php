<?php
/**
 * Chat Handler - Real-time world chat
 */
class ChatHandler extends Handler {
    public function handle(WsServer $server, $fd, $data) {
        $role = $this->requireAuth($server, $fd);
        if (!$role) return;

        $message = trim($data['message'] ?? '');
        if (mb_strlen($message) < 1 || mb_strlen($message) > 200) {
            $server->send($fd, ['type' => 'error', 'data' => ['text' => '消息长度1-200字符']]);
            return;
        }

        // Save to DB
        db()->insert('chat', [
            'user_id' => $role->id,
            'target_id' => 0,
            'message' => $message,
            'created_at' => time()
        ]);

        $msgData = [
            'id' => db()->getVar("SELECT LAST_INSERT_ID()"),
            'user_id' => $role->id,
            'username' => $role->username,
            'sex' => $role->sex,
            'level' => $role->level,
            'message' => $message,
            'time' => date('H:i'),
            'created_at' => time(),
        ];

        // Broadcast to all online players
        $server->broadcast(['type' => 'chat_new', 'data' => $msgData]);

        $server->send($fd, ['type' => 'chat_sent', 'data' => ['ok' => true]]);
    }
}

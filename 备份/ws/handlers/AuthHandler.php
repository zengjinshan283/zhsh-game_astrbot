<?php
/**
 * Auth Handler
 */
class AuthHandler extends Handler {
    public function handle(WsServer $server, $fd, $data) {
        $sid = $data['sid'] ?? '';
        if (empty($sid)) {
            $server->send($fd, ['type' => 'auth_fail', 'data' => ['text' => '缺少SID']]);
            return;
        }
        $role = $server->authenticate($fd, $sid);
        if ($role) {
            $place = $role->getPlace();
            $server->send($fd, [
                'type' => 'auth_ok',
                'data' => [
                    'id' => $role->id,
                    'username' => $role->username,
                    'sex' => $role->sex,
                    'level' => $role->level,
                    'hp' => $role->hp,
                    'hp_max' => $role->hp_max,
                    'exp' => $role->exp,
                    'exp_max' => $role->exp_max,
                    'money' => $role->money,
                    'gold' => $role->gold,
                    'place_id' => $role->place_id,
                    'sail_time' => $role->sail_time,
                    'sail_from' => $role->sail_from,
                    'sail_to' => $role->sail_to,
                ]
            ]);
            // Notify room
            if ($place) {
                $server->broadcastToRoom($role->place_id, [
                    'type' => 'player_joined',
                    'data' => [
                        'user_id' => $role->id,
                        'username' => $role->username,
                        'sex' => $role->sex,
                        'level' => $role->level,
                        'hp' => $role->hp,
                        'hp_max' => $role->hp_max,
                    ]
                ], $role->id);
            }
        } else {
            $server->send($fd, ['type' => 'auth_fail', 'data' => ['text' => '认证失败']]);
        }
    }
}

<?php
/**
 * Handler base class and router
 */
abstract class Handler {
    abstract public function handle(WsServer $server, $fd, $data);

    public static function getHandler($type) {
        static $map = null;
        if ($map === null) {
            $map = [
                'auth' => new AuthHandler(),
                'chat_send' => new ChatHandler(),
                'move' => new MoveHandler(),
                'battle_start' => new BattleHandler(),
                'battle_action' => new BattleHandler(),
                'sail_start' => new SailHandler(),
                'sail_status' => new SailHandler(),
                'npc_action' => new NpcHandler(),
                'heal' => new MoveHandler(),
                'scene_request' => new MoveHandler(),
            ];
        }
        return $map[$type] ?? null;
    }

    protected function requireAuth(WsServer $server, $fd) {
        if (!$server->isAuthenticated($fd)) {
            $server->send($fd, ['type' => 'error', 'data' => ['text' => '请先登录']]);
            return null;
        }
        return $server->getUser($fd);
    }
}

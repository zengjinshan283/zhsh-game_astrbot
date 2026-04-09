<?php
/**
 * Move Handler - Map navigation
 */
class MoveHandler extends Handler {
    public function handle(WsServer $server, $fd, $data) {
        $role = $this->requireAuth($server, $fd);
        if (!$role) return;

        switch ($data['type']) {
            case 'move':
                $this->doMove($server, $fd, $role, $data);
                break;
            case 'heal':
                $this->doHeal($server, $fd, $role);
                break;
            case 'scene_request':
                $this->sendScene($server, $fd, $role);
                break;
        }
    }

    private function doMove(WsServer $server, $fd, $role, $data) {
        $dir = $data['dir'] ?? '';
        if (!in_array($dir, ['n', 's', 'e', 'w'])) {
            $server->send($fd, ['type' => 'error', 'data' => ['text' => '无效方向']]);
            return;
        }

        // Check if sailing
        if ($role->sail_time > 0) {
            $server->send($fd, ['type' => 'error', 'data' => ['text' => '航海中无法移动']]);
            return;
        }

        $place = $role->getPlace();
        if (!$place) {
            $role->move(START_PLACE_ID);
            $this->sendScene($server, $fd, $role);
            return;
        }

        $target = (int)$place[$dir];
        if ($target <= 0) {
            $server->send($fd, ['type' => 'move_fail', 'data' => ['text' => '此方向无出口']]);
            return;
        }

        // Notify old room
        $server->broadcastToRoom($role->place_id, [
            'type' => 'player_left',
            'data' => ['user_id' => $role->id, 'username' => $role->username]
        ], $role->id);

        $role->move($target);
        $role->loadById($role->id);

        // Notify new room
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

        $this->sendScene($server, $fd, $role);
    }

    private function doHeal(WsServer $server, $fd, $role) {
        $place = $role->getPlace();
        if ($place && $place['id'] == START_PLACE_ID) {
            $role->fullHeal();
            $role->loadById($role->id);
            $server->send($fd, ['type' => 'healed', 'data' => [
                'hp' => $role->hp, 'hp_max' => $role->hp_max,
            ]]);
        }
    }

    public function sendScene(WsServer $server, $fd, $role) {
        $place = $role->getPlace();
        if (!$place) return;

        $city = null;
        if ($place['city_id']) {
            $city = db()->getOne("SELECT * FROM `map` WHERE `id` = ?", [$place['city_id']]);
        }

        // Nearby players
        $nearby = $role->getNearby();

        // Monsters
        $monsters = [];
        if ($place['type'] == 0 && $city) {
            $regionId = db()->getVar("SELECT `parent_id` FROM `map` WHERE `id` = ?", [$city['id']]);
            $monsters = db()->getAll("SELECT * FROM `monster` WHERE `region_id` = ? AND `place_id` = 0 ORDER BY `hp`", [$regionId]);
        }

        // NPCs
        $npcs = db()->getAll("SELECT * FROM `npc` WHERE `place_id` = ? ORDER BY `id`", [$place['id']]);

        // Direction places
        $dirNames = ['n' => '北', 's' => '南', 'e' => '东', 'w' => '西'];
        $dirPlaces = [];
        foreach ($dirNames as $dk => $dn) {
            if ($place[$dk] > 0) {
                $dp = db()->getOne("SELECT `name` FROM `place` WHERE `id` = ?", [$place[$dk]]);
                $dirPlaces[$dk] = $dp ? $dp['name'] : '';
            }
        }

        // Quest alerts
        $claimable = db()->getVar("SELECT COUNT(*) FROM `user_quest` WHERE `user_id` = ? AND `status` = 1", [$role->id]);

        // Special location flags
        $isDock = ($place['type'] == 1);
        $isShop = ($place['id'] == SHOP_PLACE_ID);
        $isBank = ($place['id'] == 1024);
        $isCasino = ($place['id'] == 1013);
        $isSmith = ($place['id'] == 1031);
        $isTavern = ($place['id'] == START_PLACE_ID);
        $isInn = ($place['id'] == 1036);
        $isMarket = ($place['type'] == 2);

        // Get city places for city map
        $cityPlaces = [];
        if ($city) {
            $cityPlaces = db()->getAll("SELECT id, name, type FROM `place` WHERE `city_id` = ? ORDER BY `id`", [$city['id']]);
        }

        // Update collect quests
        $role->updateCollectQuests();

        $server->send($fd, [
            'type' => 'scene_update',
            'data' => [
                'place' => [
                    'id' => $place['id'], 'name' => $place['name'],
                    'type' => $place['type'], 'notice' => $place['notice'],
                    'n' => $place['n'], 's' => $place['s'], 'e' => $place['e'], 'w' => $place['w'],
                ],
                'city' => $city ? ['id' => $city['id'], 'name' => $city['name']] : null,
                'dirPlaces' => $dirPlaces,
                'monsters' => array_map(function($m) use ($place) {
                    $hp = (int)$m['hp'];
                    $dangerColor = $hp >= 100 ? '#e74c3c' : ($hp >= 50 ? '#e67e22' : '#f39c12');
                    $dangerLabel = $hp >= 100 ? '危险' : ($hp >= 50 ? '普通' : '较弱');
                    return [
                        'id' => (int)$m['id'], 'name' => $m['name'],
                        'hp' => $hp, 'atk_min' => (int)$m['atk_min'], 'atk_max' => (int)$m['atk_max'],
                        'def' => (int)$m['def'], 'exp_reward' => (int)$m['exp_reward'],
                        'money_reward_min' => (int)$m['money_reward_min'], 'money_reward_max' => (int)$m['money_reward_max'],
                        'description' => $m['description'] ?? '', 'captureable' => (int)$m['captureable'],
                        'capture_rate' => (int)$m['capture_rate'],
                        'danger_color' => $dangerColor, 'danger_label' => $dangerLabel,
                    ];
                }, $monsters),
                'npcs' => array_map(function($n) {
                    return [
                        'id' => (int)$n['id'], 'name' => $n['name'], 'type' => (int)$n['type'],
                        'dialog' => $n['dialog'] ?? '',
                    ];
                }, $npcs),
                'nearby' => array_map(function($p) {
                    return ['id' => (int)$p['id'], 'username' => $p['username'], 'sex' => (int)$p['sex'], 'level' => (int)$p['level']];
                }, $nearby),
                'claimable_quests' => (int)$claimable,
                'flags' => [
                    'is_dock' => $isDock, 'is_shop' => $isShop, 'is_bank' => $isBank,
                    'is_casino' => $isCasino, 'is_smith' => $isSmith,
                    'is_tavern' => $isTavern, 'is_inn' => $isInn, 'is_market' => $isMarket,
                ],
                'city_places' => array_map(function($cp) {
                    return ['id' => (int)$cp['id'], 'name' => $cp['name'], 'type' => (int)$cp['type']];
                }, $cityPlaces),
                'player' => [
                    'hp' => $role->hp, 'hp_max' => $role->hp_max,
                    'exp' => $role->exp, 'exp_max' => $role->exp_max,
                    'money' => $role->money, 'gold' => $role->gold,
                ],
            ]
        ]);
    }
}

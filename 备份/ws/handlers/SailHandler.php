<?php
/**
 * Sail Handler - Sea navigation
 */
class SailHandler extends Handler {
    public function handle(WsServer $server, $fd, $data) {
        $role = $this->requireAuth($server, $fd);
        if (!$role) return;
        $role->loadById($role->id);

        if ($data['type'] === 'sail_start') {
            $this->startSail($server, $fd, $role, $data);
        } elseif ($data['type'] === 'sail_status') {
            $this->sailStatus($server, $fd, $role);
        }
    }

    private function startSail(WsServer $server, $fd, $role, $data) {
        $place = $role->getPlace();
        if (!$place || $place['type'] != 1) {
            $server->send($fd, ['type' => 'error', 'data' => ['text' => '必须在码头才能出航']]);
            return;
        }

        $myShip = $role->ship_id > 0 ? db()->getOne("SELECT * FROM `ship` WHERE `id` = ?", [$role->ship_id]) : null;
        if (!$myShip) {
            $server->send($fd, ['type' => 'error', 'data' => ['text' => '你还没有船只']]);
            return;
        }

        $city = db()->getOne("SELECT * FROM `map` WHERE `id` = ?", [$place['city_id']]);
        $targetCityId = (int)($data['target_city'] ?? 0);
        $targetCity = db()->getOne("SELECT * FROM `map` WHERE `id` = ? AND `type` = 1", [$targetCityId]);

        if (!$targetCity || $targetCity['id'] == $city['id']) {
            $server->send($fd, ['type' => 'error', 'data' => ['text' => '无效的目的地']]);
            return;
        }

        if ($role->hp <= 0) {
            $server->send($fd, ['type' => 'error', 'data' => ['text' => '体力不足']]);
            return;
        }

        $minutes = [1 => 10, 2 => 6, 3 => 3, 5 => 1];
        $duration = ($minutes[$myShip['speed']] ?? 10) * 60;

        db()->update('user', [
            'sail_time' => time(), 'sail_from' => $city['id'], 'sail_to' => $targetCity['id'],
        ], '`id` = ?', [$role->id]);

        $fromName = $city['name'];
        $toName = $targetCity['name'];

        $server->send($fd, ['type' => 'sail_started', 'data' => [
            'from' => $fromName, 'to' => $toName,
            'duration' => $duration, 'speed' => $myShip['speed'],
        ]]);
    }

    private function sailStatus(WsServer $server, $fd, $role) {
        if ($role->sail_time <= 0) {
            $server->send($fd, ['type' => 'sail_status', 'data' => ['status' => 'idle']]);
            return;
        }

        $myShip = $role->ship_id > 0 ? db()->getOne("SELECT * FROM `ship` WHERE `id` = ?", [$role->ship_id]) : null;
        $speed = $myShip ? $myShip['speed'] : 1;
        $minutes = [1 => 10, 2 => 6, 3 => 3, 5 => 1];
        $duration = ($minutes[$speed] ?? 10) * 60;
        $elapsed = time() - $role->sail_time;

        if ($elapsed >= $duration) {
            // Arrived
            $this->processArrival($server, $fd, $role);
        } else {
            $percent = round(($elapsed / $duration) * 100);
            $remain = ceil(($duration - $elapsed) / 60);
            $server->send($fd, ['type' => 'sail_progress', 'data' => [
                'status' => 'sailing', 'percent' => $percent, 'remain' => $remain,
            ]]);
        }
    }

    private function processArrival(WsServer $server, $fd, $role) {
        $eventType = mt_rand(1, 10);
        $event = 'safe_arrive';
        $eventData = [];

        if ($eventType <= 2) {
            $event = 'pirate';
        } elseif ($eventType <= 4) {
            $moneyFound = mt_rand(50, 500);
            $role->gainMoney($moneyFound);
            $event = 'treasure';
            $eventData = ['money' => $moneyFound];
        }

        $dockPlace = db()->getOne("SELECT * FROM `place` WHERE `city_id` = ? AND `type` = 1 LIMIT 1", [$role->sail_to]);
        if (!$dockPlace) $dockPlace = db()->getOne("SELECT * FROM `place` WHERE `city_id` = ? LIMIT 1", [$role->sail_to]);
        $newPlaceId = $dockPlace ? $dockPlace['id'] : $role->place_id;

        db()->update('user', [
            'place_id' => $newPlaceId, 'sail_time' => 0, 'sail_from' => 0, 'sail_to' => 0,
        ], '`id` = ?', [$role->id]);

        $role->loadById($role->id);

        $fromCity = db()->getOne("SELECT name FROM `map` WHERE `id` = ?", [$role->sail_from ?: 0]);
        $toCity = db()->getOne("SELECT name FROM `map` WHERE `id` = ?", [$role->sail_to ?: 0]);

        $server->send($fd, ['type' => 'sail_arrived', 'data' => [
            'event' => $event,
            'from' => $fromCity['name'] ?? '???',
            'to' => $toCity['name'] ?? '???',
            'money' => $role->money,
            'event_data' => $eventData,
        ]]);
    }
}

<?php
/**
 * Room Manager - tracks players by location
 */
class RoomManager {
    private $rooms = []; // place_id => [userId, ...]

    public function join($userId, $placeId) {
        $this->leave($userId);
        if (!isset($this->rooms[$placeId])) $this->rooms[$placeId] = [];
        $this->rooms[$placeId][$userId] = true;
    }

    public function leave($userId) {
        foreach ($this->rooms as $pid => $users) {
            unset($this->rooms[$pid][$userId]);
            if (empty($this->rooms[$pid])) unset($this->rooms[$pid]);
        }
    }

    public function getPlayers($placeId) {
        return isset($this->rooms[$placeId]) ? array_keys($this->rooms[$placeId]) : [];
    }
}

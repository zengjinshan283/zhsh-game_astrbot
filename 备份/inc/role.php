<?php
/**
 * 纵横四海 - 角色类
 */

require_once __DIR__ . '/db.php';

class Role {
    public $id = 0;
    public $username = '';
    public $sex = 1;
    public $avatar = 1;
    public $level = 1;
    public $exp = 0;
    public $exp_max = 500;
    public $hp = 100;
    public $hp_max = 100;
    public $atk_min = 1;
    public $atk_max = 28;
    public $def = 0;
    public $agility = 0;
    public $money = 10000;
    public $gold = 0;
    public $place_id = 0;
    public $regdate = 0;
    public $lastdate = 0;
    public $sid = '';
    public $bank_money = 0;
    public $casino_today = 0;
    public $casino_date = 0;
    public $pet_id = 0;
    public $pet_name = '';
    public $pet_level = 1;
    public $pet_exp = 0;
    public $sail_time = 0;
    public $sail_from = 0;
    public $sail_to = 0;
    public $ship_id = 0;
    public $pet_atk = 0;
    public $pet_def = 0;
    public $pet_hp = 0;
    public $shortcut_slot_1 = 0;
    public $shortcut_slot_2 = 0;
    public $shortcut_slot_3 = 0;

    // 当前位置信息缓存
    private $placeInfo = null;
    private $cityInfo = null;
    private $mapInfo = null;

    // 宠物信息缓存
    private $petInfo = null;

    /**
     * 根据session中的sid加载角色
     */
    public function loadBySid($sid) {
        if (empty($sid)) {
            return false;
        }
        $user = db()->getOne("SELECT * FROM `user` WHERE `sid` = ?", [$sid]);
        if (!$user) {
            return false;
        }
        $this->loadFromArray($user);
        $this->updateLastActive();
        return true;
    }

    /**
     * 根据id加载角色
     */
    public function loadById($id) {
        $user = db()->getOne("SELECT * FROM `user` WHERE `id` = ?", [$id]);
        if (!$user) {
            return false;
        }
        $this->loadFromArray($user);
        return true;
    }

    /**
     * 从数组加载数据
     */
    private function loadFromArray($data) {
        $this->id = (int)$data['id'];
        $this->username = $data['username'];
        $this->sex = (int)$data['sex'];
        $this->avatar = (int)$data['avatar'];
        $this->level = (int)$data['level'];
        $this->exp = (int)$data['exp'];
        $this->exp_max = (int)$data['exp_max'];
        $this->hp = (int)$data['hp'];
        $this->hp_max = (int)$data['hp_max'];
        $this->atk_min = (int)$data['atk_min'];
        $this->atk_max = (int)$data['atk_max'];
        $this->def = (int)$data['def'];
        $this->agility = (int)$data['agility'];
        $this->money = (int)$data['money'];
        $this->gold = (int)$data['gold'];
        $this->place_id = (int)$data['place_id'];
        $this->regdate = (int)$data['regdate'];
        $this->lastdate = (int)$data['lastdate'];
        $this->sid = $data['sid'];
        $this->bank_money = (int)($data['bank_money'] ?? 0);
        $this->casino_today = (int)($data['casino_today'] ?? 0);
        $this->casino_date = (int)($data['casino_date'] ?? 0);
        $this->sail_time = (int)($data['sail_time'] ?? 0);
        $this->sail_from = (int)($data['sail_from'] ?? 0);
        $this->sail_to = (int)($data['sail_to'] ?? 0);
        $this->ship_id = (int)($data['ship_id'] ?? 0);
        $this->pet_id = (int)($data['pet_id'] ?? 0);
        $this->pet_name = $data['pet_name'] ?? '';
        $this->pet_level = (int)($data['pet_level'] ?? 1);
        $this->pet_exp = (int)($data['pet_exp'] ?? 0);
        $this->shortcut_slot_1 = (int)($data['shortcut_slot_1'] ?? 0);
        $this->shortcut_slot_2 = (int)($data['shortcut_slot_2'] ?? 0);
        $this->shortcut_slot_3 = (int)($data['shortcut_slot_3'] ?? 0);
        // 清除缓存
        $this->placeInfo = null;
        $this->cityInfo = null;
        $this->mapInfo = null;
        $this->petInfo = null;
    }

    /**
     * 保存角色数据到数据库
     */
    public function save() {
        db()->update('user', [
            'level' => $this->level,
            'exp' => $this->exp,
            'exp_max' => $this->exp_max,
            'hp' => $this->hp,
            'hp_max' => $this->hp_max,
            'atk_min' => $this->atk_min,
            'atk_max' => $this->atk_max,
            'def' => $this->def,
            'agility' => $this->agility,
            'money' => $this->money,
            'gold' => $this->gold,
            'place_id' => $this->place_id,
            'bank_money' => $this->bank_money,
            'pet_id' => $this->pet_id,
            'pet_name' => $this->pet_name,
            'pet_level' => $this->pet_level,
            'pet_exp' => $this->pet_exp,
        ], '`id` = ?', [$this->id]);
    }

    /**
     * 移动到新地点
     */
    public function move($place_id) {
        $this->place_id = (int)$place_id;
        db()->update('user', ['place_id' => $this->place_id], '`id` = ?', [$this->id]);
        $this->placeInfo = null;
        $this->cityInfo = null;
        $this->mapInfo = null;
    }

    /**
     * 获取当前位置信息（JOIN place和map表）
     */
    public function getPlace() {
        if ($this->placeInfo !== null) {
            return $this->placeInfo;
        }
        $this->placeInfo = db()->getOne(
            "SELECT p.*, m.name AS city_name, mp.name AS sea_name, mp.id AS sea_id
             FROM `place` p
             LEFT JOIN `map` m ON p.city_id = m.id
             LEFT JOIN `map` mp ON m.parent_id = mp.id
             WHERE p.id = ?",
            [$this->place_id]
        );
        return $this->placeInfo;
    }

    /**
     * 获取所在城市信息
     */
    public function getCity() {
        $place = $this->getPlace();
        if (!$place) return null;
        return db()->getOne("SELECT * FROM `map` WHERE `id` = ?", [$place['city_id']]);
    }

    /**
     * 获取附近玩家（在线15分钟内）
     */
    public function getNearby() {
        $now = time();
        return db()->getAll(
            "SELECT id, username, sex, avatar, level, hp, hp_max FROM `user`
             WHERE `place_id` = ? AND `id` != ? AND `lastdate` > ?
             ORDER BY `level` DESC",
            [$this->place_id, $this->id, $now - ONLINE_TIMEOUT]
        );
    }

    /**
     * 恢复体力
     */
    public function heal($amount) {
        $amount = (int)$amount;
        $this->hp = min($this->hp + $amount, $this->hp_max);
        db()->update('user', ['hp' => $this->hp], '`id` = ?', [$this->id]);
    }

    /**
     * 完全恢复
     */
    public function fullHeal() {
        $this->hp = $this->hp_max;
        db()->update('user', ['hp' => $this->hp], '`id` = ?', [$this->id]);
    }

    /**
     * 获得经验，检查升级
     */
    public function gainExp($amount) {
        $amount = (int)$amount;
        $this->exp += $amount;
        $leveled = false;
        while ($this->exp >= $this->exp_max) {
            $this->exp -= $this->exp_max;
            $this->level++;
            $this->hp_max += LEVEL_HP_BONUS;
            $this->hp = $this->hp_max;
            $this->atk_min += LEVEL_ATK_MIN_BONUS;
            $this->atk_max += LEVEL_ATK_MAX_BONUS;
            $this->def += LEVEL_DEF_BONUS;
            $this->exp_max = BASE_EXP_MAX + ($this->level - 1) * EXP_GROWTH;
            $leveled = true;
        }
        $this->save();
        return $leveled;
    }

    /**
     * 获得金钱
     */
    public function gainMoney($amount) {
        $this->money += (int)$amount;
        db()->update('user', ['money' => $this->money], '`id` = ?', [$this->id]);
    }

    /**
     * 花费金钱
     */
    public function spendMoney($amount) {
        $amount = (int)$amount;
        if ($this->money < $amount) {
            return false;
        }
        $this->money -= $amount;
        db()->update('user', ['money' => $this->money], '`id` = ?', [$this->id]);
        return true;
    }

    public function removeItem($itemId, $qty) {
        $itemId = (int)$itemId;
        $qty = (int)$qty;
        $inv = db()->getOne("SELECT * FROM inventory WHERE user_id = ? AND item_id = ?", [$this->id, $itemId]);
        if (!$inv) return;
        $remain = (int)$inv['quantity'] - $qty;
        if ($remain <= 0) {
            db()->delete('inventory', 'user_id=? AND item_id=?', [$this->id, $itemId]);
        } else {
            db()->update('inventory', ['quantity' => $remain], 'user_id=? AND item_id=?', [$this->id, $itemId]);
        }
    }

    /**
     * 更新最后活跃时间
     */
    public function updateLastActive() {
        $now = time();
        $this->lastdate = $now;
        db()->update('user', ['lastdate' => $now], '`id` = ?', [$this->id]);
    }

    /**
     * 获取装备加成后的属性
     */
    public function getEffectiveStats() {
        $equipBonus = db()->getAll(
            "SELECT i.atk, i.def_val AS def, inv.enhance_level FROM `inventory` inv
             JOIN `item` i ON inv.item_id = i.id
             WHERE inv.user_id = ? AND inv.equipped = 1",
            [$this->id]
        );
        $bonusAtk = 0;
        $bonusDef = 0;
        foreach ($equipBonus as $eq) {
            $enhance = (int)$eq['enhance_level'];
            $enhanceBonus = $enhance * 0.03;
            $baseAtk = (int)$eq['atk'];
            $baseDef = (int)$eq['def'];
            $bonusAtk += (int)round($baseAtk * (1 + $enhanceBonus));
            $bonusDef += (int)round($baseDef * (1 + $enhanceBonus));
        }
        return [
            'atk_min' => $this->atk_min + $bonusAtk,
            'atk_max' => $this->atk_max + $bonusAtk,
            'def' => $this->def + $bonusDef,
            'hp' => $this->hp,
            'hp_max' => $this->hp_max,
        ];
    }

    /**
     * 是否已登录
     */
    public function isLoggedIn() {
        return $this->id > 0;
    }

    /**
     * 获取性别文字
     */
    public function getSexText() {
        return $this->sex == 1 ? '男' : '女';
    }

    /**
     * 获取经验百分比
     */
    public function getExpPercent() {
        if ($this->exp_max <= 0) return 0;
        return round(($this->exp / $this->exp_max) * 100);
    }

    /**
     * 获取HP百分比
     */
    public function getHpPercent() {
        if ($this->hp_max <= 0) return 0;
        return round(($this->hp / $this->hp_max) * 100);
    }

    /**
     * 获取宠物信息
     */
    public function getPet() {
        if ($this->petInfo !== null) {
            return $this->petInfo;
        }
        if ($this->pet_id <= 0) {
            return null;
        }
        $pet = db()->getOne("SELECT * FROM `pet` WHERE `id` = ?", [$this->pet_id]);
        if ($pet) {
            $pet['level'] = $this->pet_level;
            $pet['exp'] = $this->pet_exp;
            $pet['nickname'] = $this->pet_name ?: $pet['name'];
            // 计算宠物当前属性（根据等级加成）
            $levelMult = 1 + ($this->pet_level - 1) * 0.15;
            $pet['effective_atk'] = (int)round($pet['atk'] * $levelMult);
            $pet['effective_def'] = (int)round($pet['def_val'] * $levelMult);
            $pet['effective_hp'] = (int)round($pet['hp'] * $levelMult);
            $pet['exp_max'] = 100 + ($this->pet_level - 1) * 50;
        }
        $this->petInfo = $pet;
        return $pet;
    }

    /**
     * 设置宠物
     */
    public function setPet($petId, $petName = '') {
        $this->pet_id = (int)$petId;
        $this->pet_name = $petName;
        $this->pet_level = 1;
        $this->pet_exp = 0;
        $this->petInfo = null;
        db()->update('user', [
            'pet_id' => $this->pet_id,
            'pet_name' => $this->pet_name,
            'pet_level' => $this->pet_level,
            'pet_exp' => $this->pet_exp,
        ], '`id` = ?', [$this->id]);
    }

    /**
     * 释放宠物
     */
    public function releasePet() {
        $this->pet_id = 0;
        $this->pet_name = '';
        $this->pet_level = 1;
        $this->pet_exp = 0;
        $this->petInfo = null;
        db()->update('user', [
            'pet_id' => 0,
            'pet_name' => '',
            'pet_level' => 1,
            'pet_exp' => 0,
        ], '`id` = ?', [$this->id]);
    }

    /**
     * 宠物获得经验
     */
    public function petGainExp($amount) {
        if ($this->pet_id <= 0) return false;
        $amount = (int)$amount;
        $this->pet_exp += $amount;
        $leveled = false;
        $expMax = 100 + ($this->pet_level - 1) * 50;
        while ($this->pet_exp >= $expMax && $this->pet_level < 50) {
            $this->pet_exp -= $expMax;
            $this->pet_level++;
            $expMax = 100 + ($this->pet_level - 1) * 50;
            $leveled = true;
        }
        db()->update('user', [
            'pet_level' => $this->pet_level,
            'pet_exp' => $this->pet_exp,
        ], '`id` = ?', [$this->id]);
        $this->petInfo = null;
        return $leveled;
    }

    /**
     * 获取宠物战斗攻击力
     */
    public function getPetBattleAtk() {
        $pet = $this->getPet();
        if (!$pet) return 0;
        return (int)round($pet['effective_atk'] * 0.5);
    }

    /**
     * 银行存入
     */
    public function bankDeposit($amount) {
        $amount = (int)$amount;
        if ($amount <= 0 || $this->money < $amount) return false;
        $this->money -= $amount;
        $this->bank_money += $amount;
        db()->update('user', [
            'money' => $this->money,
            'bank_money' => $this->bank_money,
        ], '`id` = ?', [$this->id]);
        // 记录交易
        db()->insert('bank_log', [
            'user_id' => $this->id,
            'type' => 0,
            'amount' => $amount,
            'balance' => $this->bank_money,
            'created_at' => time(),
        ]);
        return true;
    }

    /**
     * 银行取出
     */
    public function bankWithdraw($amount) {
        $amount = (int)$amount;
        if ($amount <= 0 || $this->bank_money < $amount) return false;
        $this->bank_money -= $amount;
        $this->money += $amount;
        db()->update('user', [
            'money' => $this->money,
            'bank_money' => $this->bank_money,
        ], '`id` = ?', [$this->id]);
        db()->insert('bank_log', [
            'user_id' => $this->id,
            'type' => 1,
            'amount' => $amount,
            'balance' => $this->bank_money,
            'created_at' => time(),
        ]);
        return true;
    }

    /**
     * 获取今日下注限额
     */
    public function getCasinoLimit() {
        $today = strtotime(date('Y-m-d'));
        if ($this->casino_date < $today) {
            // 新的一天，重置
            $this->casino_today = 0;
            $this->casino_date = $today;
            db()->update('user', [
                'casino_today' => 0,
                'casino_date' => $today,
            ], '`id` = ?', [$this->id]);
        }
        return max(0, $this->level * 1000 - $this->casino_today);
    }

    /**
     * 记录赌场下注
     */
    public function casinoBet($amount) {
        $amount = (int)$amount;
        $today = strtotime(date('Y-m-d'));
        if ($this->casino_date < $today) {
            $this->casino_today = 0;
            $this->casino_date = $today;
        }
        $this->casino_today += $amount;
        db()->update('user', [
            'casino_today' => $this->casino_today,
            'casino_date' => $this->casino_date,
        ], '`id` = ?', [$this->id]);
    }
    /**
     * 更新收集类任务进度（背包物品变化后调用）
     */
    public function updateCollectQuests() {
        // 获取所有进行中的收集类任务(type=1)
        $activeQuests = db()->getAll(
            "SELECT uq.id as uq_id, q.id as quest_id, q.require_value, q.target_id 
             FROM user_quest uq JOIN quest q ON uq.quest_id = q.id 
             WHERE uq.user_id = ? AND uq.status = 0 AND q.type = 1",
            [$this->id]
        );
        foreach ($activeQuests as $aq) {
            // 统计背包中该物品的总数量
            $count = db()->getVar(
                "SELECT SUM(quantity) FROM inventory WHERE user_id = ? AND item_id = ?",
                [$this->id, $aq['target_id']]
            );
            $count = $count ? (int)$count : 0;
            $newProgress = min($count, $aq['require_value']);
            // 更新进度
            db()->update('user_quest', ['progress' => $newProgress], 'id = ?', [$aq['uq_id']]);
            // 自动完成
            if ($newProgress >= $aq['require_value']) {
                db()->update('user_quest', ['status' => 1], 'id = ?', [$aq['uq_id']]);
            }
        }
    }

}

/**
 * 获取当前登录角色
 */
function getCurrentRole() {
    $role = new Role();
    if (!empty($_SESSION['sid'])) {
        $role->loadBySid($_SESSION['sid']);
    }
    return $role;
}

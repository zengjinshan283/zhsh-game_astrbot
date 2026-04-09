<?php
/**
 * Battle Handler - Real-time combat
 */
class BattleHandler extends Handler {
    public function handle(WsServer $server, $fd, $data) {
        $role = $this->requireAuth($server, $fd);
        if (!$role) return;

        $role->loadById($role->id);
        if ($role->hp <= 0) {
            $server->send($fd, ['type' => 'error', 'data' => ['text' => '你已经倒下了，请回酒店休息。']]);
            return;
        }

        if ($data['type'] === 'battle_start') {
            $this->startBattle($server, $fd, $role, $data);
        } elseif ($data['type'] === 'battle_action') {
            $this->doAction($server, $fd, $role, $data);
        }
    }

    private function startBattle(WsServer $server, $fd, $role, $data) {
        $monsterId = (int)($data['monster_id'] ?? 0);
        $monster = db()->getOne("SELECT * FROM `monster` WHERE `id` = ?", [$monsterId]);
        if (!$monster) {
            $server->send($fd, ['type' => 'error', 'data' => ['text' => '怪物不存在']]);
            return;
        }

        // Validate monster is at current location
        $place = $role->getPlace();
        $placeMonsters = db()->getAll("SELECT * FROM `monster` WHERE `place_id` = ? OR `place_id` = 0", [$place['id']]);
        $validIds = array_column($placeMonsters, 'id');
        if (!in_array($monster['id'], $validIds)) {
            $server->send($fd, ['type' => 'error', 'data' => ['text' => '这个地点没有这个怪物']]);
            return;
        }

        $pet = $role->getPet();
        $petBattleAtk = $role->getPetBattleAtk();

        $battle = [
            'monster_id' => $monsterId,
            'monster_name' => $monster['name'],
            'monster_hp' => (int)$monster['hp'],
            'monster_hp_max' => (int)$monster['hp'],
            'monster_atk_min' => (int)$monster['atk_min'],
            'monster_atk_max' => (int)$monster['atk_max'],
            'monster_def' => (int)$monster['def'],
            'monster_exp' => (int)$monster['exp_reward'],
            'monster_money_min' => (int)$monster['money_reward_min'],
            'monster_money_max' => (int)$monster['money_reward_max'],
            'captureable' => (int)$monster['captureable'],
            'capture_rate' => (int)$monster['capture_rate'],
            'round' => 1,
            'result' => null,
            'player_hp' => $role->hp,
            'player_hp_max' => $role->hp_max,
            'pet_name' => $pet ? $pet['nickname'] : '',
            'log' => [['type' => 'info', 'text' => "你遭遇了{$monster['name']}！"]],
        ];

        if ($petBattleAtk > 0) {
            $battle['log'][] = ['type' => 'info', 'text' => "🐾 {$pet['nickname']} 在一旁准备战斗！"];
        }

        $server->setBattleState($role->id, $battle);

        $server->send($fd, ['type' => 'battle_start', 'data' => $battle]);
    }

    private function doAction(WsServer $server, $fd, $role, $data) {
        $battle = $server->getBattleState($role->id);
        if (!$battle) {
            $server->send($fd, ['type' => 'error', 'data' => ['text' => '没有进行中的战斗']]);
            return;
        }

        $action = $data['action'] ?? '';

        switch ($action) {
            case 'attack':
                $this->doAttack($server, $fd, $role, $battle);
                break;
            case 'flee':
                $this->doFlee($server, $fd, $role, $battle);
                break;
            case 'capture':
                $this->doCapture($server, $fd, $role, $battle);
                break;
            case 'use_shortcut':
                $this->useShortcut($server, $fd, $role, $battle, $data);
                break;
        }
    }

    private function doAttack(WsServer $server, $fd, $role, &$battle) {
        $petBattleAtk = $role->getPetBattleAtk();
        $pAtk = mt_rand($role->atk_min, $role->atk_max);
        $damage = max(1, $pAtk - $battle['monster_def']);
        $battle['monster_hp'] -= $damage;
        $battle['log'][] = ['type' => 'attack', 'text' => "你挥剑攻击{$battle['monster_name']}，造成 {$damage} 点伤害！"];

        if ($petBattleAtk > 0) {
            $petDmg = max(1, $petBattleAtk);
            $battle['monster_hp'] -= $petDmg;
            $battle['log'][] = ['type' => 'attack', 'text' => "🐾 {$battle['pet_name']} 追加 {$petDmg} 点伤害！"];
        }

        if ($battle['monster_hp'] <= 0) {
            $this->monsterKilled($server, $fd, $role, $battle);
            return;
        }

        $this->monsterRetaliate($server, $fd, $role, $battle);
        $server->setBattleState($role->id, $battle);
        $server->send($fd, ['type' => 'battle_update', 'data' => $battle]);
    }

    private function doFlee(WsServer $server, $fd, $role, &$battle) {
        if (mt_rand(1, 100) <= 50) {
            $battle['log'][] = ['type' => 'info', 'text' => '你成功逃离了战斗！'];
            $battle['result'] = 'flee';
            $server->clearBattleState($role->id);
            $server->send($fd, ['type' => 'battle_end', 'data' => $battle]);
        } else {
            $battle['log'][] = ['type' => 'system', 'text' => '逃跑失败！'];
            $this->monsterRetaliate($server, $fd, $role, $battle);
            $server->setBattleState($role->id, $battle);
            $server->send($fd, ['type' => 'battle_update', 'data' => $battle]);
        }
    }

    private function doCapture(WsServer $server, $fd, $role, &$battle) {
        if (empty($battle['captureable'])) {
            $battle['log'][] = ['type' => 'system', 'text' => '这个怪物无法捕捉！'];
            $server->send($fd, ['type' => 'battle_update', 'data' => $battle]);
            return;
        }

        $pet = $role->getPet();
        if ($pet) {
            $battle['log'][] = ['type' => 'system', 'text' => '你已经拥有宠物了！'];
            $server->send($fd, ['type' => 'battle_update', 'data' => $battle]);
            return;
        }

        $hpLoss = 1 - (max(0, $battle['monster_hp']) / $battle['monster_hp_max']);
        $rate = $battle['capture_rate'] * (1 + $hpLoss * 2);
        $rate = min($rate, 99);
        $rateInt = (int)round($rate);

        if (mt_rand(1, 100) <= $rateInt) {
            db()->update('user', [
                'pet_id' => $battle['monster_id'],
                'pet_name' => $battle['monster_name'],
                'pet_level' => 1, 'pet_exp' => 0,
            ], '`id` = ?', [$role->id]);
            $battle['log'][] = ['type' => 'info', 'text' => "🎉 捕捉成功！{$battle['monster_name']} 成为了你的伙伴！（成功率{$rateInt}%）"];
            $battle['result'] = 'capture';
            $server->clearBattleState($role->id);
            $server->send($fd, ['type' => 'battle_end', 'data' => $battle]);
        } else {
            $battle['log'][] = ['type' => 'system', 'text' => "捕捉失败！{$battle['monster_name']} 挣脱了…（成功率{$rateInt}%）"];
            $this->monsterRetaliate($server, $fd, $role, $battle);
            $server->setBattleState($role->id, $battle);
            $server->send($fd, ['type' => 'battle_update', 'data' => $battle]);
        }
    }

    private function useShortcut(WsServer $server, $fd, $role, &$battle, $data) {
        $slot = (int)($data['slot'] ?? 0);
        if ($slot < 1 || $slot > 3) return;

        $field = 'shortcut_slot_' . $slot;
        $invId = (int)$role->$field;
        if ($invId <= 0) {
            $battle['log'][] = ['type' => 'system', 'text' => "快捷栏槽位{$slot}为空！"];
            $server->send($fd, ['type' => 'battle_update', 'data' => $battle]);
            return;
        }

        $inv = db()->getOne(
            "SELECT inv.id AS inv_id, inv.quantity, i.name, i.type, i.subtype, i.atk, i.def_val, i.hp AS item_hp FROM `inventory` inv JOIN `item` i ON inv.item_id = i.id WHERE inv.id = ? AND inv.user_id = ? AND inv.equipped = 0",
            [$invId, $role->id]
        );
        if (!$inv) {
            db()->update('user', [$field => 0], '`id` = ?', [$role->id]);
            $battle['log'][] = ['type' => 'system', 'text' => "快捷栏槽位{$slot}物品已不存在！"];
            $server->send($fd, ['type' => 'battle_update', 'data' => $battle]);
            return;
        }

        if ($inv['item_hp'] > 0 && $role->hp < $role->hp_max) {
            $healAmt = (int)$inv['item_hp'];
            $role->heal($healAmt);
            $role->loadById($role->id);
            $battle['player_hp'] = $role->hp;
            $battle['log'][] = ['type' => 'heal', 'text' => "你使用了{$inv['name']}，恢复了 {$healAmt} 点体力。"];
            if ($inv['quantity'] > 1) {
                db()->update('inventory', ['quantity' => $inv['quantity'] - 1], '`id` = ?', [$inv['inv_id']]);
            } else {
                db()->delete('inventory', '`id` = ?', [$inv['inv_id']]);
            }
            $this->monsterRetaliate($server, $fd, $role, $battle);
            $server->setBattleState($role->id, $battle);
            $server->send($fd, ['type' => 'battle_update', 'data' => $battle]);
        } else {
            $battle['log'][] = ['type' => 'system', 'text' => "当前无法使用{$inv['name']}。"];
            $server->send($fd, ['type' => 'battle_update', 'data' => $battle]);
        }
    }

    private function monsterRetaliate(WsServer $server, $fd, $role, &$battle) {
        $mAtk = mt_rand($battle['monster_atk_min'], $battle['monster_atk_max']);
        $mDmg = max(1, $mAtk - $role->def);
        $role->hp -= $mDmg;
        $battle['player_hp'] = max(0, $role->hp);
        $battle['log'][] = ['type' => 'defend', 'text' => "{$battle['monster_name']}反击，对你造成 {$mDmg} 点伤害！"];
        $battle['round']++;

        if ($role->hp <= 0) {
            $this->playerDied($server, $fd, $role, $battle);
        } else {
            $role->save();
        }
    }

    private function monsterKilled(WsServer $server, $fd, $role, &$battle) {
        $battle['monster_hp'] = 0;
        $expGain = $battle['monster_exp'];
        $moneyGain = mt_rand($battle['monster_money_min'], $battle['monster_money_max']);
        $leveled = $role->gainExp($expGain);
        $role->gainMoney($moneyGain);
        $role->loadById($role->id);

        $battle['log'][] = ['type' => 'info', 'text' => "{$battle['monster_name']}被击败了！"];
        $battle['log'][] = ['type' => 'info', 'text' => "获得经验 +{$expGain}，铜币 +{$moneyGain}"];
        if ($leveled) {
            $battle['log'][] = ['type' => 'info', 'text' => "🎉 恭喜升级！你现在 Lv.{$role->level} 了！"];
        }

        // Pet exp
        $pet = $role->getPet();
        if ($pet) {
            $petLeveled = $role->petGainExp($expGain);
            if ($petLeveled) {
                $battle['log'][] = ['type' => 'info', 'text' => "🐾 {$pet['nickname']} 升级到 Lv.{$role->pet_level}！"];
            }
        }

        // Quest progress
        $activeQuests = db()->getAll(
            "SELECT q.id, q.require_value FROM `quest` q JOIN `user_quest` uq ON q.id = uq.quest_id WHERE uq.user_id = ? AND q.type = 0 AND q.target_id = ? AND uq.status = 0",
            [$role->id, $battle['monster_id']]
        );
        foreach ($activeQuests as $aq) {
            $newProgress = min($aq['require_value'],
                db()->getVar("SELECT progress FROM `user_quest` WHERE `user_id` = ? AND `quest_id` = ?", [$role->id, $aq['id']]) + 1);
            $status = $newProgress >= $aq['require_value'] ? 1 : 0;
            db()->update('user_quest', ['progress' => $newProgress, 'status' => $status], '`user_id` = ? AND `quest_id` = ?', [$role->id, $aq['id']]);
            if ($status == 1) {
                $qn = db()->getVar("SELECT `name` FROM `quest` WHERE `id` = ?", $aq['id']);
                $battle['log'][] = ['type' => 'info', 'text' => "📜 任务「{$qn}」已完成！"];
            }
        }

        $battle['result'] = 'win';
        $battle['exp_gained'] = $expGain;
        $battle['money_gained'] = $moneyGain;
        $battle['player_hp'] = $role->hp;
        $battle['player_hp_max'] = $role->hp_max;
        $battle['player_level'] = $role->level;
        $battle['player_exp'] = $role->exp;
        $battle['player_exp_max'] = $role->exp_max;
        $battle['player_money'] = $role->money;

        $logText = implode("
", array_column($battle['log'], 'text'));
        db()->insert('battle_log', [
            'user_id' => $role->id, 'monster_id' => $battle['monster_id'],
            'result' => 1, 'exp_gained' => $expGain, 'money_gained' => $moneyGain,
            'log_text' => $logText, 'created_at' => time(),
        ]);

        $server->clearBattleState($role->id);
        $server->send($fd, ['type' => 'battle_end', 'data' => $battle]);
    }

    private function playerDied(WsServer $server, $fd, $role, &$battle) {
        $role->hp = 0; $role->save();
        $lostMoney = (int)($role->money * 0.05);
        if ($lostMoney > 0) $role->spendMoney($lostMoney);
        $role->move(START_PLACE_ID);
        $role->hp = (int)($role->hp_max * 0.1); $role->save();

        $battle['log'][] = ['type' => 'defend', 'text' => '你被击败了……'];
        $battle['log'][] = ['type' => 'info', 'text' => '你被送回了威尼斯酒店。'];
        if ($lostMoney > 0) $battle['log'][] = ['type' => 'info', 'text' => "你损失了 {$lostMoney} 铜币。"];
        $battle['result'] = 'lose';

        $logText = implode("
", array_column($battle['log'], 'text'));
        db()->insert('battle_log', [
            'user_id' => $role->id, 'monster_id' => $battle['monster_id'],
            'result' => 0, 'exp_gained' => 0, 'money_gained' => -$lostMoney,
            'log_text' => $logText, 'created_at' => time(),
        ]);

        $server->clearBattleState($role->id);
        $server->send($fd, ['type' => 'battle_end', 'data' => $battle]);
    }
}

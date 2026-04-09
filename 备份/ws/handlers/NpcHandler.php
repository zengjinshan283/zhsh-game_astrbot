<?php
/**
 * NPC Handler - Shop/Bank/Smith/Casino/Chat via WS
 */
class NpcHandler extends Handler {
    public function handle(WsServer $server, $fd, $data) {
        $role = $this->requireAuth($server, $fd);
        if (!$role) return;
        $role->loadById($role->id);

        $action = $data['action'] ?? '';
        $npcId = (int)($data['npc_id'] ?? 0);

        switch ($action) {
            case 'shop_load':
                $this->loadShop($server, $fd, $role, $npcId);
                break;
            case 'shop_buy':
                $this->shopBuy($server, $fd, $role, $data);
                break;
            case 'bank_load':
                $this->loadBank($server, $fd, $role);
                break;
            case 'bank_deposit':
                $this->bankDeposit($server, $fd, $role, $data);
                break;
            case 'bank_withdraw':
                $this->bankWithdraw($server, $fd, $role, $data);
                break;
            case 'smith_load':
                $this->loadSmith($server, $fd, $role);
                break;
            case 'smith_enhance':
                $this->smithEnhance($server, $fd, $role, $data);
                break;
            case 'casino_load':
                $this->loadCasino($server, $fd, $role);
                break;
            case 'casino_bet':
                $this->casinoBet($server, $fd, $role, $data);
                break;
            case 'chat_load':
                $this->loadNpcChat($server, $fd, $role, $npcId);
                break;
            case 'quest_accept':
                $this->questAccept($server, $fd, $role, $data);
                break;
            case 'quest_claim':
                $this->questClaim($server, $fd, $role, $data);
                break;
        }
    }

    private function loadShop($server, $fd, $role, $npcId) {
        $items = db()->getAll("SELECT i.*, ni.price_buy FROM npc_item ni JOIN item i ON ni.item_id = i.id WHERE ni.npc_id = ? ORDER BY i.type, i.level_req", [$npcId]);
        $server->send($fd, ['type' => 'npc_shop', 'data' => [
            'money' => $role->money, 'items' => $items,
        ]]);
    }

    private function shopBuy($server, $fd, $role, $data) {
        $itemId = (int)($data['item_id'] ?? 0);
        $qty = min(99, max(1, (int)($data['qty'] ?? 1)));
        $npcId = (int)($data['npc_id'] ?? 0);

        $ni = db()->getOne("SELECT * FROM npc_item WHERE npc_id = ? AND item_id = ?", [$npcId, $itemId]);
        if (!$ni) { $server->send($fd, ['type' => 'npc_action_result', 'data' => ['ok' => false, 'msg' => '商品不存在']]); return; }

        $item = db()->getOne("SELECT * FROM item WHERE id = ?", [$itemId]);
        $totalPrice = (int)$ni['price_buy'] * $qty;

        if ($role->money < $totalPrice) { $server->send($fd, ['type' => 'npc_action_result', 'data' => ['ok' => false, 'msg' => '铜钱不足', 'money' => $role->money]]); return; }

        $role->spendMoney($totalPrice);
        for ($i = 0; $i < $qty; $i++) {
            $existing = db()->getOne("SELECT id, quantity FROM inventory WHERE user_id = ? AND item_id = ? AND equipped = 0", [$role->id, $itemId]);
            if ($existing && $item['stackable']) {
                db()->update('inventory', ['quantity' => $existing['quantity'] + 1], 'id = ?', [$existing['id']]);
            } else {
                db()->insert('inventory', ['user_id' => $role->id, 'item_id' => $itemId, 'quantity' => 1, 'equipped' => 0]);
            }
        }

        $role->loadById($role->id);
        $role->updateCollectQuests();
        $server->send($fd, ['type' => 'npc_action_result', 'data' => ['ok' => true, 'msg' => "购买了 {$item['name']} x{$qty}", 'money' => $role->money]]);
    }

    private function loadBank($server, $fd, $role) {
        $logs = db()->getAll("SELECT * FROM bank_log WHERE user_id = ? ORDER BY id DESC LIMIT 10", [$role->id]);
        $server->send($fd, ['type' => 'npc_bank', 'data' => [
            'money' => $role->money, 'bank_money' => $role->bank_money, 'logs' => $logs,
        ]]);
    }

    private function bankDeposit($server, $fd, $role, $data) {
        $amount = (int)($data['amount'] ?? 0);
        if ($amount <= 0 || $role->money < $amount) { $server->send($fd, ['type' => 'npc_action_result', 'data' => ['ok' => false, 'msg' => '金额无效']]); return; }
        $role->bankDeposit($amount);
        $role->loadById($role->id);
        $server->send($fd, ['type' => 'npc_action_result', 'data' => ['ok' => true, 'msg' => "存入 {$amount} 铜币", 'money' => $role->money, 'bank_money' => $role->bank_money]]);
    }

    private function bankWithdraw($server, $fd, $role, $data) {
        $amount = (int)($data['amount'] ?? 0);
        if ($amount <= 0 || $role->bank_money < $amount) { $server->send($fd, ['type' => 'npc_action_result', 'data' => ['ok' => false, 'msg' => '金额无效']]); return; }
        $role->bankWithdraw($amount);
        $role->loadById($role->id);
        $server->send($fd, ['type' => 'npc_action_result', 'data' => ['ok' => true, 'msg' => "取出 {$amount} 铜币", 'money' => $role->money, 'bank_money' => $role->bank_money]]);
    }

    private function loadSmith($server, $fd, $role) {
        $items = db()->getAll(
            "SELECT inv.id AS inv_id, inv.enhance_level, i.name, i.subtype, i.atk, i.def_val, inv.equipped FROM inventory inv JOIN item i ON inv.item_id = i.id WHERE inv.user_id = ? AND inv.equipped = 1 ORDER BY inv.enhance_level DESC",
            [$role->id]
        );
        $result = [];
        foreach ($items as $item) {
            $el = (int)$item['enhance_level'];
            $enhanceBonus = $el * 0.03;
            $effAtk = (int)round($item['atk'] * (1 + $enhanceBonus));
            $effDef = (int)round($item['def_val'] * (1 + $enhanceBonus));
            $isMax = $el >= 10;
            if ($el >= 7) $rate = 30;
            elseif ($el >= 6) $rate = 70;
            else $rate = 90;
            $color = $el >= 9 ? '#ff6b6b' : ($el >= 7 ? '#e67e22' : ($el >= 5 ? '#e2b714' : ($el >= 3 ? '#3498db' : '#95a5a6')));
            $result[] = [
                'inv_id' => $item['inv_id'], 'name' => $item['name'], 'subtype' => $item['subtype'],
                'enhance_level' => $el, 'atk' => $item['atk'], 'def' => $item['def_val'],
                'eff_atk' => $effAtk, 'eff_def' => $effDef, 'is_max' => $isMax,
                'rate' => $isMax ? 0 : $rate, 'cost' => ($el + 1) * 200, 'color' => $color,
            ];
        }
        $server->send($fd, ['type' => 'npc_smith', 'data' => ['money' => $role->money, 'items' => $result]]);
    }

    private function smithEnhance($server, $fd, $role, $data) {
        $invId = (int)($data['inv_id'] ?? 0);
        $inv = db()->getOne("SELECT * FROM inventory WHERE id = ? AND user_id = ? AND equipped = 1", [$invId, $role->id]);
        if (!$inv) { $server->send($fd, ['type' => 'npc_action_result', 'data' => ['ok' => false, 'msg' => '物品不存在']]); return; }

        $el = (int)$inv['enhance_level'];
        if ($el >= 10) { $server->send($fd, ['type' => 'npc_action_result', 'data' => ['ok' => false, 'msg' => '已满级']]); return; }

        $cost = ($el + 1) * 200;
        if ($role->money < $cost) { $server->send($fd, ['type' => 'npc_action_result', 'data' => ['ok' => false, 'msg' => '铜钱不足', 'money' => $role->money]]); return; }

        if ($el >= 7) $rate = 30; elseif ($el >= 6) $rate = 70; else $rate = 90;

        $role->spendMoney($cost);
        if (mt_rand(1, 100) <= $rate) {
            db()->update('inventory', ['enhance_level' => $el + 1], 'id = ?', [$invId]);
            $newEl = $el + 1;
            $item = db()->getOne("SELECT name FROM item WHERE id = ?", [$inv['item_id']]);
            $role->loadById($role->id);
            $server->send($fd, ['type' => 'npc_action_result', 'data' => [
                'ok' => true, 'msg' => "✨ 强化成功！{$item['name']} +{$newEl}", 'money' => $role->money,
            ]]);
        } else {
            if ($el >= 7) {
                db()->update('inventory', ['enhance_level' => max(0, $el - 1)], 'id = ?', [$invId]);
                $role->loadById($role->id);
                $server->send($fd, ['type' => 'npc_action_result', 'data' => [
                    'ok' => false, 'msg' => '强化失败，装备降级了！', 'money' => $role->money,
                ]]);
            } else {
                $role->loadById($role->id);
                $server->send($fd, ['type' => 'npc_action_result', 'data' => [
                    'ok' => false, 'msg' => '强化失败！', 'money' => $role->money,
                ]]);
            }
        }
    }

    private function loadCasino($server, $fd, $role) {
        $server->send($fd, ['type' => 'npc_casino', 'data' => [
            'money' => $role->money, 'limit' => $role->getCasinoLimit(),
        ]]);
    }

    private function casinoBet($server, $fd, $role, $data) {
        $bet = (int)($data['bet'] ?? 0);
        $choice = $data['choice'] ?? '';
        if ($bet <= 0 || !in_array($choice, ['big', 'small'])) {
            $server->send($fd, ['type' => 'npc_action_result', 'data' => ['ok' => false, 'msg' => '无效下注']]);
            return;
        }
        $limit = $role->getCasinoLimit();
        if ($bet > $limit) { $server->send($fd, ['type' => 'npc_action_result', 'data' => ['ok' => false, 'msg' => '超过今日限额']]); return; }
        if ($role->money < $bet) { $server->send($fd, ['type' => 'npc_action_result', 'data' => ['ok' => false, 'msg' => '铜钱不足']]); return; }

        $role->casinoBet($bet);
        $d1 = mt_rand(1, 6); $d2 = mt_rand(1, 6);
        $total = $d1 + $d2;
        $isBig = $total >= 7;
        $faces = ['','⚀','⚁','⚂','⚃','⚄','⚅'];
        $isWin = ($choice === 'big' && $isBig) || ($choice === 'small' && !$isBig);

        if ($isWin) {
            $role->gainMoney($bet);
            $role->loadById($role->id);
            $server->send($fd, ['type' => 'casino_result', 'data' => [
                'ok' => true, 'isWin' => true, 'd1' => $d1, 'd2' => $d2,
                'd1_face' => $faces[$d1], 'd2_face' => $faces[$d2],
                'total' => $total, 'isBig' => $isBig, 'choice' => $choice,
                'money' => $role->money, 'limit' => $role->getCasinoLimit(),
            ]]);
        } else {
            $role->spendMoney($bet);
            $role->loadById($role->id);
            $server->send($fd, ['type' => 'casino_result', 'data' => [
                'ok' => true, 'isWin' => false, 'd1' => $d1, 'd2' => $d2,
                'd1_face' => $faces[$d1], 'd2_face' => $faces[$d2],
                'total' => $total, 'isBig' => $isBig, 'choice' => $choice,
                'money' => $role->money, 'limit' => $role->getCasinoLimit(),
            ]]);
        }
    }

    private function loadNpcChat($server, $fd, $role, $npcId) {
        $npc = db()->getOne("SELECT * FROM npc WHERE id = ?", [$npcId]);
        if (!$npc) return;

        $chatTopics = db()->getAll("SELECT * FROM npc_chat_topic WHERE npc_id = ? ORDER BY id", [$npcId]);
        $availableQuests = db()->getAll("SELECT q.id, q.name, q.description, q.level_req, q.require_value, q.reward_exp, q.reward_money, q.reward_item_id, q.reward_item_qty, q.type, q.pre_quest_id FROM quest q WHERE q.npc_id = ? AND q.level_req <= ? ORDER BY q.sort_order, q.id", [$npcId, $role->level]);
        $availFiltered = [];
        foreach ($availableQuests as $q) {
            $exists = db()->getVar("SELECT COUNT(*) FROM user_quest WHERE user_id = ? AND quest_id = ?", [$role->id, $q['id']]);
            if ($exists > 0) continue;
            if ($q['pre_quest_id'] > 0) {
                $preDone = db()->getVar("SELECT COUNT(*) FROM user_quest WHERE user_id = ? AND quest_id = ? AND status >= 1", [$role->id, $q['pre_quest_id']]);
                if ($preDone == 0) continue;
            }
            $availFiltered[] = $q;
        }
        $activeQuests = db()->getAll("SELECT q.id, q.name, q.require_value, uq.progress, uq.status FROM quest q JOIN user_quest uq ON q.id = uq.quest_id WHERE uq.user_id = ? AND q.npc_id = ? AND uq.status < 2 ORDER BY q.sort_order, q.id", [$role->id, $npcId]);

        $server->send($fd, ['type' => 'npc_chat', 'data' => [
            'npc' => ['id' => $npc['id'], 'name' => $npc['name'], 'type' => $npc['type'], 'dialog' => $npc['dialog']],
            'chat_topics' => $chatTopics,
            'available_quests' => $availFiltered,
            'active_quests' => $activeQuests,
        ]]);
    }

    private function questAccept($server, $fd, $role, $data) {
        $questId = (int)($data['quest_id'] ?? 0);
        $quest = db()->getOne("SELECT * FROM quest WHERE id = ? AND level_req <= ?", [$questId, $role->level]);
        if (!$quest) { $server->send($fd, ['type' => 'npc_action_result', 'data' => ['ok' => false, 'msg' => '任务不存在']]); return; }

        $exists = db()->getVar("SELECT COUNT(*) FROM user_quest WHERE user_id = ? AND quest_id = ?", [$role->id, $questId]);
        if ($exists > 0) { $server->send($fd, ['type' => 'npc_action_result', 'data' => ['ok' => false, 'msg' => '已接取过']]); return; }

        if ($quest['pre_quest_id'] > 0) {
            $preDone = db()->getVar("SELECT COUNT(*) FROM user_quest WHERE user_id = ? AND quest_id = ? AND status >= 1", [$role->id, $quest['pre_quest_id']]);
            if ($preDone == 0) { $server->send($fd, ['type' => 'npc_action_result', 'data' => ['ok' => false, 'msg' => '需要先完成前置任务']]); return; }
        }

        db()->insert('user_quest', ['user_id' => $role->id, 'quest_id' => $questId, 'progress' => 0, 'status' => 0]);
        $server->send($fd, ['type' => 'npc_action_result', 'data' => ['ok' => true, 'msg' => "接取了任务「{$quest['name']}」"]]);
    }

    private function questClaim($server, $fd, $role, $data) {
        $questId = (int)($data['quest_id'] ?? 0);
        $uq = db()->getOne("SELECT * FROM user_quest WHERE user_id = ? AND quest_id = ? AND status = 1", [$role->id, $questId]);
        if (!$uq) { $server->send($fd, ['type' => 'npc_action_result', 'data' => ['ok' => false, 'msg' => '任务未完成']]); return; }

        $quest = db()->getOne("SELECT * FROM quest WHERE id = ?", [$questId]);
        if (!$quest) return;

        $leveled = $role->gainExp((int)$quest['reward_exp']);
        $role->gainMoney((int)$quest['reward_money']);

        if ($quest['reward_item_id'] > 0) {
            for ($i = 0; $i < (int)$quest['reward_item_qty']; $i++) {
                db()->insert('inventory', ['user_id' => $role->id, 'item_id' => $quest['reward_item_id'], 'quantity' => 1, 'equipped' => 0]);
            }
        }

        db()->update('user_quest', ['status' => 2], 'id = ?', [$uq['id']]);
        $role->loadById($role->id);

        $msg = "领取奖励：经验+{$quest['reward_exp']} 铜币+{$quest['reward_money']}";
        if ($leveled) $msg .= " 🎉升级了！";

        $server->send($fd, ['type' => 'npc_action_result', 'data' => ['ok' => true, 'msg' => $msg, 'money' => $role->money]]);
    }
}

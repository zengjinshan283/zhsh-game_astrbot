<?php
/**
 * 纵横四海 - 战斗处理
 */
require_once __DIR__ . '/../inc/functions.php';
$role = requireLogin();
if ($role->hp <= 0) { showError('你已经倒下了，请回酒店休息。', '/map/index.php'); }
$monsterId = (int)($_GET['monster_id'] ?? 0);
$monster = db()->getOne("SELECT * FROM `monster` WHERE `id` = ?", [$monsterId]);
if (!$monster) { showError('怪物不存在', '/battle/index.php'); }
$place = $role->getPlace();
$placeMonsters = db()->getAll("SELECT * FROM `monster` WHERE `place_id` = ? OR `place_id` = 0", [$place['id']]);
$validMonsterIds = array_column($placeMonsters, 'id');
if (!in_array($monster['id'], $validMonsterIds)) { showError('这个地点没有这个怪物', '/battle/index.php'); }
$pet = $role->getPet();
$petBattleAtk = $role->getPetBattleAtk();
$battleKey = 'battle_' . $role->id;

// 获取快捷栏道具
function getShortcutItems($role) {
    $items = [];
    for ($i = 1; $i <= 3; $i++) {
        $slot = 'shortcut_slot_' . $i;
        $invId = (int)$role->$slot;
        if ($invId > 0) {
            $inv = db()->getOne(
                "SELECT inv.id AS inv_id, inv.quantity, i.name, i.type, i.subtype, i.atk, i.def_val, i.hp AS item_hp FROM `inventory` inv JOIN `item` i ON inv.item_id = i.id WHERE inv.id = ? AND inv.user_id = ? AND inv.equipped = 0",
                [$invId, $role->id]
            );
            if ($inv) {
                $items[$i] = $inv;
            } else {
                db()->update('user', [$slot => 0], '`id` = ?', [$role->id]);
            }
        }
    }
    return $items;
}

if (isset($_GET['action'])) {
    $battle = $_SESSION[$battleKey] ?? null;
    if (!$battle) { redirect('/battle/fight.php?monster_id=' . $monsterId); }
    $action = $_GET['action'];

    if ($action === 'attack') {
        $pAtk = mt_rand($role->atk_min, $role->atk_max);
        $damage = max(1, $pAtk - $battle['monster_def']);
        $battle['monster_hp'] -= $damage;
        $battle['log'][] = ['type' => 'attack', 'text' => "你挥剑攻击{$battle['monster_name']}，造成 {$damage} 点伤害！"];
        if ($petBattleAtk > 0) {
            $petDmg = max(1, $petBattleAtk);
            $battle['monster_hp'] -= $petDmg;
            $battle['log'][] = ['type' => 'attack', 'text' => "🐾 {$battle['pet_name']} 追加 {$petDmg} 点伤害！"];
        }
        if ($battle['monster_hp'] <= 0) { handleMonsterKill($role, $battle, $monsterId, $pet); $_SESSION[$battleKey] = $battle; redirect('/battle/result.php'); }
        monsterRetaliate($role, $battle, $monsterId);

    } elseif ($action === 'use_shortcut') {
        $slot = (int)($_GET['slot'] ?? 0);
        if ($slot >= 1 && $slot <= 3) {
            $shortcutItems = getShortcutItems($role);
            if (isset($shortcutItems[$slot])) {
                $item = $shortcutItems[$slot];
                $used = false;
                if ($item['item_hp'] > 0 && $role->hp < $role->hp_max) {
                    $healAmt = $item['item_hp'];
                    $role->heal($healAmt);
                    $battle['log'][] = ['type' => 'heal', 'text' => "你使用了{$item['name']}，恢复了 {$healAmt} 点体力。"];
                    $used = true;
                }
                if ($used) {
                    if ($item['quantity'] > 1) {
                        db()->update('inventory', ['quantity' => $item['quantity'] - 1], '`id` = ?', [$item['inv_id']]);
                    } else {
                        db()->delete('inventory', '`id` = ?', [$item['inv_id']]);
                    }
                    monsterRetaliate($role, $battle, $monsterId);
                } else {
                    $battle['log'][] = ['type' => 'system', 'text' => "当前无法使用{$item['name']}。"];
                    $_SESSION[$battleKey] = $battle;
                    redirect('/battle/fight.php?monster_id=' . $monsterId);
                }
            } else {
                $battle['log'][] = ['type' => 'system', 'text' => "快捷栏槽位{$slot}为空！"];
                $_SESSION[$battleKey] = $battle;
                redirect('/battle/fight.php?monster_id=' . $monsterId);
            }
        }

    } elseif ($action === 'capture') {
        if (empty($battle['captureable'])) {
            $battle['log'][] = ['type' => 'system', 'text' => '这个怪物无法捕捉！'];
            $_SESSION[$battleKey] = $battle;
            redirect('/battle/fight.php?monster_id=' . $monsterId);
        }
        if ($pet) {
            $battle['log'][] = ['type' => 'system', 'text' => '你已经拥有宠物了！'];
            $_SESSION[$battleKey] = $battle;
            redirect('/battle/fight.php?monster_id=' . $monsterId);
        }
        $hpLoss = 1 - ($battle['monster_hp'] / $battle['monster_hp_max']);
        $rate = $battle['capture_rate'] * (1 + $hpLoss * 2);
        $rate = min($rate, 99);
        $rateInt = (int)round($rate);
        $success = mt_rand(1, 100) <= $rateInt;

        if ($success) {
            db()->update('user', [
                'pet_id' => $monsterId,
                'pet_name' => $battle['monster_name'],
                'pet_level' => 1,
                'pet_exp' => 0,
            ], '`id` = ?', [$role->id]);
            $battle['log'][] = ['type' => 'info', 'text' => "🎉 捕捉成功！{$battle['monster_name']} 成为了你的伙伴！（成功率{$rateInt}%）"];
            $battle['result'] = 'capture';
            $_SESSION[$battleKey] = $battle;
            redirect('/battle/result.php');
        } else {
            $battle['log'][] = ['type' => 'system', 'text' => "捕捉失败！{$battle['monster_name']} 挣脱了…（成功率{$rateInt}%）"];
            monsterRetaliate($role, $battle, $monsterId);
        }

    } elseif ($action === 'flee') {
        if (mt_rand(1, 100) <= 50) {
            $battle['log'][] = ['type' => 'info', 'text' => "你成功逃离了战斗！"];
            unset($_SESSION[$battleKey]); redirect('/map/index.php');
        } else {
            $battle['log'][] = ['type' => 'system', 'text' => "逃跑失败！"];
            monsterRetaliate($role, $battle, $monsterId);
        }
    }

    $_SESSION[$battleKey] = $battle;
} else {
    $battle = [
        'monster_name' => $monster['name'], 'monster_hp' => $monster['hp'], 'monster_hp_max' => $monster['hp'],
        'monster_atk_min' => $monster['atk_min'], 'monster_atk_max' => $monster['atk_max'], 'monster_def' => $monster['def'],
        'monster_exp' => $monster['exp_reward'], 'monster_money_min' => $monster['money_reward_min'], 'monster_money_max' => $monster['money_reward_max'],
        'monster_id' => $monsterId, 'captureable' => (int)$monster['captureable'], 'capture_rate' => (int)$monster['capture_rate'],
        'round' => 1, 'result' => null, 'pet_name' => $pet ? $pet['nickname'] : '',
        'log' => [['type' => 'info', 'text' => "你遭遇了{$monster['name']}！"]],
    ];
    if ($petBattleAtk > 0) { $battle['log'][] = ['type' => 'info', 'text' => "🐾 {$pet['nickname']} 在一旁准备战斗！"]; }
    $_SESSION[$battleKey] = $battle;
}

$battle = $_SESSION[$battleKey];
$shortcutItems = getShortcutItems($role);

renderHeader('战斗 - ' . $battle['monster_name']);
?>
<style>
.battle-block-bar{position:fixed;left:0;right:0;z-index:200;pointer-events:auto}
.battle-block-top{top:0;height:36px;background:rgba(22,33,62,0.95);display:flex;align-items:center;justify-content:center;font-size:12px;color:#e74c3c;border-bottom:1px solid rgba(231,76,60,0.3)}
.battle-block-bottom{bottom:0;height:48px;background:rgba(22,33,62,0.95);border-top:1px solid rgba(231,76,60,0.3)}
</style>
<?php
?>
<style>
/* 战斗页 - 固定操作栏 */
.battle-page .main-content {
    display: flex;
    flex-direction: column;
    padding: 4px 6px;
    padding-bottom: 0;
}
.battle-log {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    background: #0f0f2e;
    border: 1px solid #2a2a4e;
    border-radius: 4px;
    padding: 4px 6px;
    font-size: 11px;
    line-height: 1.4;
}
.battle-actions {
    flex-shrink: 0;
    padding: 6px 0 0;
}
.action-row {
    display: flex;
    gap: 4px;
    margin-bottom: 4px;
}
.action-row .btn {
    flex: 1;
    text-align: center;
    padding: 10px 4px;
    font-size: 13px;
    border-radius: 6px;
}
.shortcut-row .btn {
    flex: 1;
    text-align: center;
    padding: 7px 2px;
    font-size: 11px;
    border-radius: 6px;
}
.shortcut-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
}
.shortcut-btn .sk-emoji { font-size: 14px; }
.shortcut-btn .sk-name { font-size: 10px; line-height: 1.1; }
.shortcut-btn .sk-count { font-size: 9px; color: #8a7a5a; }
.shortcut-empty {
    color: #555;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
}
</style>

<div class="location-bar">
    <div class="location-name">⚔️ 战斗中</div>
    <div class="location-path">第 <?php echo $battle['round']; ?> 回合<?php echo $petBattleAtk>0?' · 🐾'.e($battle['pet_name']).' 伴战':'';?></div>
</div>

<!-- 怪物状态 -->
<div class="card" style="border-color:#e74c3c;padding:4px 8px;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
        <span class="item-name" style="font-size:14px;">👾 <?php echo e($battle['monster_name']); ?></span>
        <span style="font-size:12px;">❤️ <?php echo max(0,$battle['monster_hp']); ?>/<?php echo $battle['monster_hp_max']; ?></span>
    </div>
    <div class="status-bar bar-hp <?php echo ($battle['monster_hp']/$battle['monster_hp_max']<0.3)?'bar-low':'';?>" style="margin-top:3px;">
        <div class="bar-track"><div class="bar-fill" style="width:<?php echo round(max(0,$battle['monster_hp'])/$battle['monster_hp_max']*100); ?>%"></div></div>
    </div>
</div>

<!-- 玩家状态 -->
<div class="card" style="border-color:#3498db;padding:4px 8px;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:13px;"><?php echo ($role->sex==2)?'♀':'♂'; ?> <?php echo e($role->username); ?></span>
        <span style="font-size:12px;">❤️ <?php echo $role->hp; ?>/<?php echo $role->hp_max; ?></span>
    </div>
    <div class="status-bar bar-hp <?php echo ($role->hp/$role->hp_max<0.3)?'bar-low':'';?>" style="margin-top:3px;">
        <div class="bar-track"><div class="bar-fill" style="width:<?php echo $role->getHpPercent(); ?>%"></div></div>
    </div>
</div>

<!-- 战斗日志 -->
<div class="card" style="flex:1;display:flex;flex-direction:column;min-height:0;padding:4px 6px;">
    <div class="card-title">📜 日志</div>
    <div class="battle-log" id="battleLog">
        <?php $lastLogs = array_slice($battle['log'], -8); foreach ($lastLogs as $log): ?>
        <div class="log-line log-<?php echo $log['type']; ?>"><?php echo e($log['text']); ?></div>
        <?php endforeach; ?>
    </div>
</div>

<!-- 战斗操作 - 固定底部 -->
<div class="battle-actions">
    <div class="action-row">
        <a href="/battle/fight.php?monster_id=<?php echo $monsterId; ?>&action=attack" class="btn btn-danger">⚔️ 攻击</a>
        <a href="/battle/fight.php?monster_id=<?php echo $monsterId; ?>&action=flee" class="btn btn-secondary" onclick="return confirm('确定逃跑？(50%成功率)');">🚃 逃跑</a>
        <?php if (!empty($battle['captureable']) && !$pet): 
            $hpLoss = 1 - (max(0,$battle['monster_hp']) / $battle['monster_hp_max']);
            $capRate = min(99, (int)round($battle['capture_rate'] * (1 + $hpLoss * 2)));
        ?>
        <a href="/battle/fight.php?monster_id=<?php echo $monsterId; ?>&action=capture" class="btn btn-warning" style="flex:1;text-align:center;padding:10px 4px;font-size:13px;border-radius:6px;" onclick="return confirm('尝试捕捉？(成功率<?php echo $capRate; ?>%)')">🪤 捕捉<?php echo $capRate; ?>%</a>
        <?php endif; ?>
    </div>
    <div class="action-row shortcut-row">
        <?php for ($i = 1; $i <= 3; $i++):
            if (isset($shortcutItems[$i])):
                $si = $shortcutItems[$i];
        ?>
        <a href="/battle/fight.php?monster_id=<?php echo $monsterId; ?>&action=use_shortcut&slot=<?php echo $i; ?>" class="btn btn-success shortcut-btn">
            <span class="sk-emoji">🧪</span>
            <span class="sk-name"><?php echo e($si['name']); ?></span>
            <span class="sk-count">×<?php echo $si['quantity']; ?></span>
        </a>
        <?php else: ?>
        <span class="btn shortcut-empty">槽位<?php echo $i; ?></span>
        <?php endif; endfor; ?>
    </div>
</div>

<script>var logEl=document.getElementById('battleLog');if(logEl)logEl.scrollTop=logEl.scrollHeight;</script>

<div class="battle-block-bar battle-block-top">⚔️ 战斗中</div>
<div class="battle-block-bar battle-block-bottom"></div>

<?php if (isset($_GET['ws'])): ?>
<script>
(function(){
    var monsterId = <?php echo $monsterId; ?>;
    var inBattle = false;
    var battleOverlay = null;

    function createBattleUI(data) {
        if (battleOverlay) battleOverlay.remove();
        battleOverlay = document.createElement('div');
        battleOverlay.id = 'wsBattleOverlay';
        battleOverlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:3000;display:flex;flex-direction:column;padding:8px;';
        battleOverlay.innerHTML = buildBattleHTML(data);
        document.body.appendChild(battleOverlay);
        inBattle = true;
    }

    function buildBattleHTML(d) {
        var mHpPct = Math.max(0, Math.round(d.monster_hp / d.monster_hp_max * 100));
        var pHpPct = Math.max(0, Math.round(d.player_hp / d.player_hp_max * 100));
        var capRate = 0;
        if (d.captureable && d.monster_hp_max > 0) {
            var hpLoss = 1 - (Math.max(0, d.monster_hp) / d.monster_hp_max);
            capRate = Math.min(99, Math.round(d.capture_rate * (1 + hpLoss * 2)));
        }
        var logs = d.log || [];
        var lastLogs = logs.slice(-8);
        var logHtml = '';
        lastLogs.forEach(function(l) {
            var cls = 'log-' + (l.type || 'system');
            logHtml += '<div class="log-line ' + cls + '">' + escapeHtml(l.text) + '</div>';
        });
        var captureBtn = '';
        if (d.captureable) {
            captureBtn = '<button class="battle-btn battle-capture-btn" onclick="GameWS.battleAction('capture');">🦊 捕捉 ' + capRate + '%</button>';
        }

        return '<div style="text-align:center;color:#e74c3c;font-size:14px;padding:8px;">⚔ 战斗中 · 第 ' + d.round + ' 回合</div>'
            + '<div style="background:rgba(22,33,62,0.95);border:1px solid rgba(231,76,60,0.3);border-radius:8px;padding:8px 12px;margin:4px 0;">'
            + '<div style="display:flex;justify-content:space-between;"><span style="color:#f5e6c8;font-size:14px;">👹 ' + escapeHtml(d.monster_name) + '</span><span style="font-size:12px;">❤ ' + Math.max(0,d.monster_hp) + '/' + d.monster_hp_max + '</span></div>'
            + '<div style="height:8px;background:#1a1a2e;border-radius:4px;margin-top:4px;overflow:hidden;"><div style="height:100%;width:' + mHpPct + '%;background:linear-gradient(90deg,#e74c3c,#ff6b6b);border-radius:4px;transition:width 0.3s;"></div></div>'
            + '</div>'
            + '<div style="background:rgba(22,33,62,0.95);border:1px solid rgba(52,152,219,0.3);border-radius:8px;padding:8px 12px;margin:4px 0;">'
            + '<div style="display:flex;justify-content:space-between;"><span style="color:#f5e6c8;font-size:13px;">你</span><span style="font-size:12px;">❤ ' + d.player_hp + '/' + d.player_hp_max + '</span></div>'
            + '<div style="height:8px;background:#1a1a2e;border-radius:4px;margin-top:4px;overflow:hidden;"><div style="height:100%;width:' + pHpPct + '%;background:linear-gradient(90deg,#3498db,#74b9ff);border-radius:4px;transition:width 0.3s;"></div></div>'
            + '</div>'
            + '<div style="flex:1;overflow-y:auto;background:#0f0f2e;border:1px solid #2a2a4e;border-radius:6px;padding:6px 8px;margin:4px 0;font-size:11px;line-height:1.4;">' + logHtml + '</div>'
            + '<div style="display:flex;gap:6px;padding:6px 0;">'
            + '<button class="battle-btn battle-attack-btn" onclick="GameWS.battleAction('attack');">⚔ 攻击</button>'
            + '<button class="battle-btn battle-flee-btn" onclick="if(confirm('确定逃跑？(50%成功率)'))GameWS.battleAction('flee');">🏃 逃跑</button>'
            + captureBtn
            + '</div>';
    }

    function escapeHtml(s) {
        var d = document.createElement('div'); d.textContent = s; return d.innerHTML;
    }

    GameWS.on('battleStart', function(data) {
        createBattleUI(data);
    });

    GameWS.on('battleUpdate', function(data) {
        if (!battleOverlay) createBattleUI(data);
        else battleOverlay.innerHTML = buildBattleHTML(data);
        // Auto scroll log
        var logEl = battleOverlay.querySelector('div[style*="overflow-y:auto"]');
        if (logEl) logEl.scrollTop = logEl.scrollHeight;
    });

    GameWS.on('battleEnd', function(data) {
        if (battleOverlay) battleOverlay.innerHTML = buildBattleHTML(data);
        // Show result, then redirect after 2s
        setTimeout(function() {
            if (battleOverlay) battleOverlay.remove();
            battleOverlay = null;
            inBattle = false;
            window.location.href = '/map/index.php';
        }, 2000);
    });

    // Start the battle via WS
    if (GameWS.isAuthenticated()) {
        GameWS.battleStart(monsterId);
    } else {
        // Fallback to old redirect method
        window.location.href = '/battle/fight.php?monster_id=' + monsterId;
    }
})();
</script>
<style>
.battle-btn{flex:1;padding:12px 8px;border:none;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;color:#fff;}
.battle-attack-btn{background:linear-gradient(135deg,#e74c3c,#c0392b);}
.battle-flee-btn{background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);color:#8a7a5a;}
.battle-capture-btn{background:linear-gradient(135deg,#3498db,#2980b9);}
</style>
<?php endif; ?>

<?php renderFooter(); ?>

<?php
function monsterRetaliate($role, &$battle, $monsterId) {
    $mAtk = mt_rand($battle['monster_atk_min'], $battle['monster_atk_max']);
    $mDmg = max(1, $mAtk - $role->def);
    $role->hp -= $mDmg;
    $battle['log'][] = ['type' => 'defend', 'text' => "{$battle['monster_name']}反击，对你造成 {$mDmg} 点伤害！"];
    $battle['round']++;
    if ($role->hp <= 0) { handlePlayerDeath($role, $battle, $monsterId); $_SESSION[$battleKey] = $battle; redirect('/battle/result.php'); }
    $role->save();
}

function handleMonsterKill($role, &$battle, $monsterId, $pet) {
    $expGain=$battle['monster_exp'];$moneyMin=$battle['monster_money_min'];$moneyMax=$battle['monster_money_max'];
    $moneyGain=mt_rand($moneyMin,$moneyMax);$leveled=$role->gainExp($expGain);$role->gainMoney($moneyGain);
    $battle['log'][]=['type'=>'info','text'=>"{$battle['monster_name']}被击败了！"];
    $battle['log'][]=['type'=>'info','text'=>"获得经验 +{$expGain}，铜币 +{$moneyGain}"];
    if($leveled){$battle['log'][]=['type'=>'info','text'=>"🎉 恭喜升级！你现在 Lv.{$role->level} 了！"];}
    if($pet){$petLeveled=$role->petGainExp($expGain);if($petLeveled){$battle['log'][]=['type'=>'info','text'=>"🐾 {$pet['nickname']} 升级到 Lv.{$role->pet_level}！"];}}
    $battle['result']='win';$battle['exp_gained']=$expGain;$battle['money_gained']=$moneyGain;
    $activeQuests=db()->getAll("SELECT q.id, q.require_value FROM `quest` q JOIN `user_quest` uq ON q.id = uq.quest_id WHERE uq.user_id = ? AND q.type = 0 AND q.target_id = ? AND uq.status = 0",[$role->id,$monsterId]);
    foreach($activeQuests as $aq){
        $newProgress=min($aq['require_value'],db()->getVar("SELECT progress FROM `user_quest` WHERE `user_id` = ? AND `quest_id` = ?",[$role->id,$aq['id']])+1);
        $status=$newProgress>=$aq['require_value']?1:0;
        db()->update('user_quest',['progress'=>$newProgress,'status'=>$status],'`user_id` = ? AND `quest_id` = ?',[$role->id,$aq['id']]);
        if($status==1){$questName=db()->getVar("SELECT `name` FROM `quest` WHERE `id` = ?",$aq['id']);$battle['log'][]=['type'=>'info','text'=>"📜 任务「{$questName}」已完成！"];}}
    $logText=implode("\n",array_column($battle['log'],'text'));
    db()->insert('battle_log',['user_id'=>$role->id,'monster_id'=>$monsterId,'result'=>1,'exp_gained'=>$expGain,'money_gained'=>$moneyGain,'log_text'=>$logText,'created_at'=>time()]);
}
function handlePlayerDeath($role, &$battle, $monsterId) {
    $role->hp=0;$role->save();$lostMoney=(int)($role->money*0.05);if($lostMoney>0)$role->spendMoney($lostMoney);
    $role->move(START_PLACE_ID);$role->hp=(int)($role->hp_max*0.1);$role->save();
    $battle['log'][]=['type'=>'defend','text'=>"你被击败了……"];
    $battle['log'][]=['type'=>'info','text'=>"你被送回了威尼斯酒店。"];
    if($lostMoney>0){$battle['log'][]=['type'=>'info','text'=>"你损失了 {$lostMoney} 铜币。"];}
    $battle['result']='lose';$logText=implode("\n",array_column($battle['log'],'text'));
    db()->insert('battle_log',['user_id'=>$role->id,'monster_id'=>$monsterId,'result'=>0,'exp_gained'=>0,'money_gained'=>-$lostMoney,'log_text'=>$logText,'created_at'=>time()]);
}
?>

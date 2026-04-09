/**
 * GameWS - 纵横四海 WebSocket 客户端 v2
 */
var GameWS = (function() {
    var ws = null;
    var callbacks = {};
    var reconnectAttempts = 0;
    var maxReconnect = 30;
    var sid = '';
    var connected = false;
    var authenticated = false;
    var debug = true;

    function init() {
        if (typeof window.__GAME_SID__ !== 'undefined' && window.__GAME_SID__) {
            sid = window.__GAME_SID__;
        }
        if (!sid) return;
        connect();
    }

    function connect() {
        var protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        var url = protocol + '//' + location.host + '/ws';
        try { ws = new WebSocket(url, 'json'); } catch(e) { log('WS create failed'); return; }

        ws.onopen = function() {
            connected = true; reconnectAttempts = 0;
            log('Connected');
            if (sid) send({ type: 'auth', sid: sid });
        };
        ws.onmessage = function(e) {
            try { var msg = JSON.parse(e.data); handleMessage(msg); }
            catch(err) { log('Parse error: ' + err); }
        };
        ws.onclose = function() {
            connected = false; authenticated = false;
            log('Disconnected');
            scheduleReconnect();
        };
        ws.onerror = function() { log('Error'); };
    }

    function scheduleReconnect() {
        if (reconnectAttempts >= maxReconnect) return;
        var delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        reconnectAttempts++;
        log('Reconnect in ' + (delay/1000) + 's');
        setTimeout(connect, delay);
    }

    function send(data) {
        if (!ws || ws.readyState !== 1) return false;
        ws.send(JSON.stringify(data));
        return true;
    }

    function handleMessage(msg) {
        log('RECV: ' + msg.type + (msg.data ? (' ' + JSON.stringify(msg.data).substring(0,80)) : ''));
        switch(msg.type) {
            case 'auth_ok': authenticated = true; break;
            case 'auth_fail': authenticated = false; break;
            case 'kicked': alert(msg.data.text); location.href = '/login.php'; break;
            case 'chat_new': onChatNew(msg.data); break;
            case 'chat_sent': if (callbacks.chatSent) callbacks.chatSent(msg.data); break;
            case 'scene_update': onSceneUpdate(msg.data); break;
            case 'move_fail': if (callbacks.moveFail) callbacks.moveFail(msg.data); break;
            case 'healed': onHealed(msg.data); break;
            case 'battle_start': onBattleStart(msg.data); break;
            case 'battle_update': onBattleUpdate(msg.data); break;
            case 'battle_end': onBattleEnd(msg.data); break;
            case 'sail_started': if (callbacks.sailStarted) callbacks.sailStarted(msg.data); break;
            case 'sail_progress': if (callbacks.sailProgress) callbacks.sailProgress(msg.data); break;
            case 'sail_arrived': if (callbacks.sailArrived) callbacks.sailArrived(msg.data); break;
            case 'sail_status': if (callbacks.sailStatus) callbacks.sailStatus(msg.data); break;
            case 'npc_shop': if (callbacks.npcShop) callbacks.npcShop(msg.data); break;
            case 'npc_bank': if (callbacks.npcBank) callbacks.npcBank(msg.data); break;
            case 'npc_smith': if (callbacks.npcSmith) callbacks.npcSmith(msg.data); break;
            case 'npc_casino': if (callbacks.npcCasino) callbacks.npcCasino(msg.data); break;
            case 'casino_result': if (callbacks.casinoResult) callbacks.casinoResult(msg.data); break;
            case 'npc_chat': if (callbacks.npcChat) callbacks.npcChat(msg.data); break;
            case 'npc_action_result': if (callbacks.npcActionResult) callbacks.npcActionResult(msg.data); break;
            case 'online_update': onOnlineUpdate(msg.data); break;
            case 'player_joined': case 'player_left': onPlayerChange(msg.type, msg.data); break;
            case 'error': if (callbacks.error) callbacks.error(msg.data); break;
            default: if (callbacks[msg.type]) callbacks[msg.type](msg.data);
        }
    }

    // ====== Scene Update - Full DOM Refresh ======
    function onSceneUpdate(data) {
        // If callbacks.sceneUpdate is defined, let the page handle it
        if (callbacks.sceneUpdate) { callbacks.sceneUpdate(data); return; }

        // Default: reload page (simplest approach, works everywhere)
        location.href = '/map/index.php';
    }

    function onHealed(data) {
        if (callbacks.healed) { callbacks.healed(data); return; }
        showFloatMsg('❤ 体力已恢复！');
        updateHpDisplay(data.hp, data.hp_max);
    }

    function onChatNew(data) {
        if (callbacks.chatNew) { callbacks.chatNew(data); return; }
        // Default: append to chat container
        var container = document.getElementById('chatMessages');
        if (!container) return;
        var sex = data.sex == 2 ? '♀' : '♂';
        var div = document.createElement('div');
        div.className = 'chat-msg';
        div.innerHTML = '<span class="chat-sender">' + sex + escapeHtml(data.username) +
            ' <span class="text-muted" style="font-weight:normal;font-size:10px;">Lv.' + data.level + '</span></span>' +
            '<span class="chat-time">' + escapeHtml(data.time) + '</span>' +
            '<span class="chat-text">' + escapeHtml(data.message) + '</span>';
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    function onOnlineUpdate(data) {
        document.querySelectorAll('.online-count').forEach(function(el) { el.textContent = data.online_count; });
    }

    function onPlayerChange(type, data) {
        if (callbacks.playerChange) { callbacks.playerChange(type, data); return; }
        // Reload nearby on map page
        if (location.pathname === '/map/index.php') {
            location.reload();
        }
    }

    // ====== Battle - Full Overlay ======
    function onBattleStart(data) {
        if (callbacks.battleStart) { callbacks.battleStart(data); return; }
        showBattleOverlay(data);
    }

    function onBattleUpdate(data) {
        if (callbacks.battleUpdate) { callbacks.battleUpdate(data); return; }
        updateBattleOverlay(data);
    }

    function onBattleEnd(data) {
        if (callbacks.battleEnd) { callbacks.battleEnd(data); return; }
        updateBattleOverlay(data);
        setTimeout(function() {
            var overlay = document.getElementById('wsBattleOverlay');
            if (overlay) overlay.remove();
            location.href = '/map/index.php';
        }, 2500);
    }

    function showBattleOverlay(d) {
        removeBattleOverlay();
        var el = document.createElement('div');
        el.id = 'wsBattleOverlay';
        el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.94);z-index:5000;display:flex;flex-direction:column;padding:10px;overflow:hidden;';
        el.innerHTML = buildBattleHTML(d);
        document.body.appendChild(el);
    }

    function updateBattleOverlay(d) {
        var el = document.getElementById('wsBattleOverlay');
        if (!el) { showBattleOverlay(d); return; }
        el.innerHTML = buildBattleHTML(d);
        var logEl = el.querySelector('.battle-log-area');
        if (logEl) logEl.scrollTop = logEl.scrollHeight;
    }

    function removeBattleOverlay() {
        var el = document.getElementById('wsBattleOverlay');
        if (el) el.remove();
    }

    function buildBattleHTML(d) {
        var mHp = Math.max(0, d.monster_hp || 0);
        var mHpMax = d.monster_hp_max || 1;
        var pHp = Math.max(0, d.player_hp || 0);
        var pHpMax = d.player_hp_max || 1;
        var mPct = Math.round(mHp / mHpMax * 100);
        var pPct = Math.round(pHp / pHpMax * 100);
        var capRate = 0;
        if (d.captureable && mHpMax > 0) {
            capRate = Math.min(99, Math.round(d.capture_rate * (1 + (1 - mHp/mHpMax) * 2)));
        }
        var logs = (d.log || []).slice(-10);
        var logHtml = logs.map(function(l) {
            return '<div class="blog-' + (l.type||'system') + '">' + escapeHtml(l.text) + '</div>';
        }).join('');
        var capBtn = d.captureable ? '<button class="bb" style="background:#3498db;" onclick="GameWS.battleAction(\'capture\')">🦊 ' + capRate + '%</button>' : '';
        var resultMsg = '';
        if (d.result === 'win') resultMsg = '<div style="text-align:center;color:#27ae60;font-size:16px;padding:10px;">🎉 胜利！+' + (d.exp_gained||0) + 'exp +' + (d.money_gained||0) + '铜</div>';
        if (d.result === 'lose') resultMsg = '<div style="text-align:center;color:#e74c3c;font-size:16px;padding:10px;">💀 战败...</div>';
        if (d.result === 'flee') resultMsg = '<div style="text-align:center;color:#e2b714;font-size:16px;padding:10px;">🏃 逃跑成功</div>';
        if (d.result === 'capture') resultMsg = '<div style="text-align:center;color:#3498db;font-size:16px;padding:10px;">🦊 捕捉成功！</div>';

        return '<div style="text-align:center;color:#e74c3c;font-size:13px;padding:6px 0;">⚔ ' + escapeHtml(d.monster_name||'') + ' · 第' + (d.round||1) + '回合</div>' +
            resultMsg +
            '<div style="background:rgba(22,33,62,0.9);border:1px solid rgba(231,76,60,0.3);border-radius:6px;padding:6px 10px;margin:4px 0;">' +
            '<div style="display:flex;justify-content:space-between;font-size:12px;"><span style="color:#f5e6c8;">👹 ' + escapeHtml(d.monster_name||'') + '</span><span>❤ ' + mHp + '/' + mHpMax + '</span></div>' +
            '<div style="height:6px;background:#1a1a2e;border-radius:3px;margin-top:3px;"><div style="height:100%;width:' + mPct + '%;background:#e74c3c;border-radius:3px;transition:0.3s;"></div></div></div>' +
            '<div style="background:rgba(22,33,62,0.9);border:1px solid rgba(52,152,219,0.3);border-radius:6px;padding:6px 10px;margin:4px 0;">' +
            '<div style="display:flex;justify-content:space-between;font-size:12px;"><span style="color:#f5e6c8;">你</span><span>❤ ' + pHp + '/' + pHpMax + '</span></div>' +
            '<div style="height:6px;background:#1a1a2e;border-radius:3px;margin-top:3px;"><div style="height:100%;width:' + pPct + '%;background:#3498db;border-radius:3px;transition:0.3s;"></div></div></div>' +
            '<div class="battle-log-area" style="flex:1;overflow-y:auto;background:#0f0f2e;border:1px solid #2a2a4e;border-radius:4px;padding:6px;font-size:11px;line-height:1.4;">' + logHtml + '</div>' +
            '<style>.blog-attack{color:#e74c3c}.blog-defend{color:#f39c12}.blog-heal{color:#27ae60}.blog-info{color:#e2b714}.blog-system{color:#8a7a5a}</style>' +
            (d.result ? '' : '<div style="display:flex;gap:6px;padding:6px 0;">' +
            '<button class="bb" style="background:#e74c3c;" onclick="GameWS.battleAction(\'attack\')">⚔ 攻击</button>' +
            '<button class="bb" style="background:rgba(255,255,255,0.1);" onclick="if(confirm(\'逃跑(50%)\'))GameWS.battleAction(\'flee\')">🏃 逃跑</button>' +
            capBtn + '</div>' +
            '<style>.bb{flex:1;padding:12px 6px;border:none;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;color:#fff;}</style>');
    }

    // ====== Utilities ======
    function updateHpDisplay(hp, hpMax) {
        var el = document.getElementById('playerHp');
        if (el) el.textContent = hp + '/' + hpMax;
    }

    function showFloatMsg(text) {
        var el = document.createElement('div');
        el.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.9);color:#e2b714;padding:14px 28px;border-radius:10px;font-size:16px;z-index:9999;pointer-events:none;animation:gwsFade 1.5s forwards;';
        el.textContent = text;
        if (!document.getElementById('gwsFadeStyle')) {
            var s = document.createElement('style');
            s.id = 'gwsFadeStyle';
            s.textContent = '@keyframes gwsFade{0%{opacity:0}15%{opacity:1}85%{opacity:1}100%{opacity:0}}';
            document.head.appendChild(s);
        }
        document.body.appendChild(el);
        setTimeout(function() { el.remove(); }, 1600);
    }

    function escapeHtml(s) { var d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
    function log(msg) { if (debug) console.log('[GameWS]', msg); }

    // ====== Public API ======
    return {
        init: init, send: send,
        on: function(e, fn) { callbacks[e] = fn; },
        off: function(e) { delete callbacks[e]; },
        isConnected: function() { return connected; },
        isAuthenticated: function() { return authenticated; },
        setDebug: function(v) { debug = v; },
        move: function(dir) { send({ type: 'move', dir: dir }); },
        chatSend: function(msg) { send({ type: 'chat_send', message: msg }); },
        battleStart: function(mid) { send({ type: 'battle_start', monster_id: mid }); },
        battleAction: function(action, extra) { var d = { type: 'battle_action', action: action }; if (extra) for (var k in extra) d[k] = extra[k]; send(d); },
        heal: function() { send({ type: 'heal' }); },
        requestScene: function() { send({ type: 'scene_request' }); },
        sailStart: function(cityId) { send({ type: 'sail_start', target_city: cityId }); },
        sailStatus: function() { send({ type: 'sail_status' }); },
        npcAction: function(npcId, action, extra) { var d = { type: 'npc_action', npc_id: npcId, action: action }; if (extra) for (var k in extra) d[k] = extra[k]; send(d); },
        questAccept: function(qid, nid) { send({ type: 'npc_action', action: 'quest_accept', quest_id: qid, npc_id: nid }); },
        questClaim: function(qid, nid) { send({ type: 'npc_action', action: 'quest_claim', quest_id: qid, npc_id: nid }); },
    };
})();

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', GameWS.init);
else GameWS.init();

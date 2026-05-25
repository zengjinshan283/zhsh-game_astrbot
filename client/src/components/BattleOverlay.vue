<template>
  <!-- 战斗进行中 -->
  <div class="battle-overlay" v-if="battle && !showResult" @click.self="preventClose">
    <div class="bo-header">
      <div class="bo-status">⚔️ 战斗中</div>
      <div class="bo-round">第 {{ battle.round }} 回合{{ battle.pet_name ? ' · 🐾' + battle.pet_name + ' 伴战' : '' }}</div>
    </div>

    <div class="bo-content">
      <!-- 怪物状态 -->
      <div class="entity-card monster-card" :style="{ borderColor: monsterHpPct < 30 ? '#ff5544' : 'rgba(231,76,60,0.4)' }">
        <div class="ec-top">
          <div class="ec-avatar">👾</div>
          <div class="ec-info">
            <div class="ec-name">{{ battle.monster_name }}</div>
            <div class="ec-hp-text">❤️ {{ Math.max(0, battle.monster_hp) }}/{{ battle.monster_hp_max }}</div>
          </div>
        </div>
        <div class="hp-bar">
          <div class="hp-fill monster-fill" :class="{ low: monsterHpPct < 30 }" :style="{ width: monsterHpPct + '%' }"></div>
        </div>
      </div>

      <!-- 玩家状态 -->
      <div class="entity-card player-card" :style="{ borderColor: playerHpPct < 30 ? '#ff5544' : 'rgba(52,152,219,0.4)' }">
        <div class="ec-top">
          <div class="ec-avatar">{{ userStore.user?.sex === 2 ? '♀' : '♂' }}</div>
          <div class="ec-info">
            <div class="ec-name">{{ userStore.username }}</div>
            <div class="ec-hp-text">❤️ {{ battle.player_hp }}/{{ battle.player_hp_max }}</div>
          </div>
        </div>
        <div class="hp-bar">
          <div class="hp-fill player-fill" :class="{ low: playerHpPct < 30 }" :style="{ width: playerHpPct + '%' }"></div>
        </div>
      </div>

      <!-- 战斗日志 -->
      <div class="log-card">
        <div class="log-header">📜 日志</div>
        <div class="log-box" ref="logBox">
          <div v-for="(log, i) in displayLogs" :key="i" :class="['log-line', 'log-' + log.type]">{{ log.text }}</div>
        </div>
      </div>
    </div>

    <!-- 操作区 -->
    <div class="bo-actions">
      <div class="action-row main-row">
        <button class="action-btn attack-btn" @click="doAction('attack')">⚔️ 攻击</button>
        <button class="action-btn flee-btn" @click="tryFlee">🏃 逃跑</button>
        <button v-if="battle.captureable" class="action-btn capture-btn" @click="tryCapture">🦩 捕获 {{ currentCaptureRate }}%</button>
      </div>
      <div class="action-row shortcut-row">
        <template v-for="i in 3" :key="i">
          <button v-if="shortcuts[i - 1]" class="shortcut-btn" @click="useShortcut(i)">
            <span class="sk-emoji">💊</span>
            <span class="sk-name">{{ shortcuts[i - 1].name }}</span>
            <span class="sk-count">&times;{{ shortcuts[i - 1].quantity }}</span>
          </button>
          <span v-else class="shortcut-empty">槽位{{ i }}</span>
        </template>
      </div>
    </div>
  </div>

  <!-- 战斗结算页面 -->
  <div class="battle-overlay" v-if="battle && showResult" @click.self="preventClose">
    <div class="bo-header">
      <div class="bo-status">⚔️ 战斗结束</div>
      <div class="bo-round">共 {{ battle.round }} 回合</div>
    </div>

    <div class="result-content">
      <!-- 胜利 -->
      <div v-if="battle.result === 'win'" class="result-card win-card">
        <div class="result-title win-title">🏆 胜利！</div>
        <div class="result-sub">你成功击败了 <strong>{{ battle.monster_name }}</strong>！</div>
        <div class="result-divider"></div>
        <div class="result-items">✨ 获得经验：<span class="gold">+{{ battle.exp_gained || 0 }}</span></div>
        <div class="result-items">💰 获得铜币：<span class="gold">+{{ battle.money_gained || 0 }}</span></div>
        <div v-if="battle.loot && battle.loot.length" class="loot-list">
          <div v-for="l in battle.loot" :key="l.item_id" class="loot-item">
            <span class="loot-icon" :style="{ color: l.quality >= 2 ? '#9b59b6' : l.quality === 1 ? '#27ae60' : '#aaa' }">💎</span>
            {{ l.name }}&times;{{ l.qty }}
          </div>
        </div>
      </div>

      <!-- 捕获成功 -->
      <div v-else-if="battle.result === 'capture'" class="result-card capture-card">
        <div class="result-title capture-title">🎉 捕获成功</div>
        <div class="result-sub"><strong>{{ battle.monster_name }}</strong> 成为了你的伙伴！</div>
        <div class="result-divider"></div>
        <div class="result-items">🐾 宠物等级：Lv.1</div>
      </div>

      <!-- 失败 -->
      <div v-else-if="battle.result === 'lose'" class="result-card lose-card">
        <div class="result-title lose-title">💀 战败</div>
        <div class="result-sub">你被 <strong>{{ battle.monster_name }}</strong> 击败了……</div>
        <div class="result-divider"></div>
        <div class="result-items">你被传送回了安全地点</div>
        <div class="result-items">当前体力：<span class="hp-val">{{ battle.player_hp || 0 }}/{{ battle.player_hp_max }}</span></div>
        <div v-if="battle.money_gained < 0" class="result-items">损失铜币：<span class="lose-val">{{ Math.abs(battle.money_gained) }}</span></div>
      </div>

      <!-- 逃跑成功 -->
      <div v-else-if="battle.result === 'flee'" class="result-card flee-card">
        <div class="result-title flee-title">🏃 逃跑成功</div>
        <div class="result-sub">你成功脱离了战斗！</div>
      </div>

      <!-- 战斗日志回顾 -->
      <div class="log-review-card">
        <div class="log-header">📜 战斗回顾</div>
        <div class="log-box log-full">
          <div v-for="(log, i) in battle.log" :key="i" :class="['log-line', 'log-' + log.type]">{{ log.text }}</div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="result-actions">
        <div class="countdown-hint" v-if="autoRedirectCountdown > 0">{{ autoRedirectCountdown }}秒后自动返回地图…</div>
        <template v-if="battle.result === 'win'">
          <button class="result-btn continue-btn" @click="continueBattle">⚔️ 继续战斗</button>
        </template>
        <button class="result-btn exit-btn" @click="exitBattle">🗺️ 返回地图</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { globalConfirm, globalAlert } from '../composables/useConfirm';
import { computed, ref, watch, nextTick, reactive, onUnmounted } from 'vue';
import { useUserStore } from '../stores/user';
import { useGameStore } from '../stores/game';
import { Api } from '../composables/useApi';
import { useRouter } from 'vue-router';

const userStore = useUserStore();
const gameStore = useGameStore();
const router = useRouter();
const logBox = ref(null);
const shortcuts = reactive([null, null, null]);
const petCount = ref(0);
const autoRedirectCountdown = ref(0);
let countdownTimer = null;

const battle = computed(() => gameStore.battleData);
const showResult = computed(() => battle.value?.finished === true && !!battle.value?.result);

const monsterHpPct = computed(() => {
  if (!battle.value) return 0;
  return Math.max(0, Math.round(Math.max(0, battle.value.monster_hp) / battle.value.monster_hp_max * 100));
});
const playerHpPct = computed(() => {
  if (!battle.value) return 0;
  return Math.max(0, Math.round(battle.value.player_hp / battle.value.player_hp_max * 100));
});
const displayLogs = computed(() => {
  if (!battle.value?.log) return [];
  return battle.value.log.slice(-20);
});
const currentCaptureRate = computed(() => {
  if (!battle.value?.captureable || !battle.value.monster_hp_max) return 0;
  const hpLoss = 1 - (Math.max(0, battle.value.monster_hp) / battle.value.monster_hp_max);
  return Math.min(99, Math.round((battle.value.capture_rate || 0) * (1 + hpLoss * 2)));
});

function preventClose() {}

watch(showResult, (val) => {
  if (val) {
    autoRedirectCountdown.value = 5;
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      autoRedirectCountdown.value--;
      if (autoRedirectCountdown.value <= 0) { clearInterval(countdownTimer); countdownTimer = null; exitBattle(); }
    }, 1000);
  } else {
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    autoRedirectCountdown.value = 0;
  }
});

onUnmounted(() => { if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; } });

async function continueBattle() {
  const mid = battle.value?.monster_id;
  gameStore.clearBattle();
  if (!mid) return;
  try { const data = await Api.post('/battle/start', { monster_id: mid }); gameStore.setBattle(data); } catch (e) { await globalAlert(e.message); }
}

function exitBattle() { gameStore.clearBattle(); router.push('/citymap'); }

async function loadShortcuts() {
  try { const d = await Api.get('/user/status'); if (d.shortcuts) { for (let i = 0; i < 3; i++) shortcuts[i] = d.shortcuts[i] || null; } } catch (e) {}
}

watch(() => battle.value?.log?.length, async () => { await nextTick(); if (logBox.value) logBox.value.scrollTop = logBox.value.scrollHeight; });
watch(battle, (val) => { if (val) { loadShortcuts(); loadPetCount(); } }, { immediate: true });

async function loadPetCount() { try { const d = await Api.get('/pet/info'); petCount.value = (d.pets || []).length; } catch (e) {} }

async function doAction(action) {
  try { const data = await Api.post('/battle/action', { action }); gameStore.setBattle(data); const me = await Api.get('/auth/me'); userStore.updateUser(me.user); if (data.finished) loadShortcuts(); }
  catch (e) { await globalAlert(e.message); }
}

async function useShortcut(slot) {
  try { const data = await Api.post('/battle/action', { action: 'use_shortcut', slot }); gameStore.setBattle(data); const me = await Api.get('/auth/me'); userStore.updateUser(me.user); loadShortcuts(); }
  catch (e) { await globalAlert(e.message); }
}

async function tryFlee() { if (await globalConfirm('确定逃跑？(50%成功率)')) doAction('flee'); }
async function tryCapture() { if (await globalConfirm(`尝试捕捉？(成功率${currentCaptureRate.value}%)`)) doAction('capture'); }
</script>

<style scoped>
.battle-overlay {
  max-width: 480px; margin: 0 auto; left: 0; right: 0;
  position: fixed; inset: 0;
  background: linear-gradient(160deg, #0d1117 0%, #1a0a1a 40%, #0d1117 100%);
  z-index: 9999; display: flex; flex-direction: column;
  padding: 0; pointer-events: auto;
}
.bo-header {
  flex-shrink: 0; text-align: center;
  padding: 8px 16px; border-bottom: 1px solid rgba(255,255,255,0.06);
  background: rgba(13,17,23,0.8); backdrop-filter: blur(12px);
}
.bo-status { font-size: 13px; font-weight: 700; color: #f0f0f0; }
.bo-round { font-size: 10px; color: #7f8c8d; margin-top: 2px; }
.bo-content { flex: 1; display: flex; flex-direction: column; padding: 8px 10px; gap: 6px; min-height: 0; overflow-y: auto; }
.entity-card {
  background: rgba(255,255,255,0.03); border: 1px solid;
  border-radius: 12px; padding: 10px 12px;
}
.monster-card { border-color: rgba(231,76,60,0.3); }
.player-card { border-color: rgba(52,152,219,0.3); }
.ec-top { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.ec-avatar { font-size: 28px; }
.ec-info { flex: 1; }
.ec-name { font-size: 14px; font-weight: 700; color: #f0f0f0; }
.ec-hp-text { font-size: 11px; color: #7f8c8d; margin-top: 2px; }
.hp-bar { height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; }
.hp-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
.monster-fill { background: linear-gradient(90deg, #c0392b, #e74c3c); }
.monster-fill.low { background: linear-gradient(90deg, #8b0000, #ff5544); }
.player-fill { background: linear-gradient(90deg, #2980b9, #3498db); }
.player-fill.low { background: linear-gradient(90deg, #8b1a1a, #ff5544); }
.log-card {
  flex: 1; display: flex; flex-direction: column; min-height: 0;
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px; padding: 8px 10px;
}
.log-header { font-size: 12px; font-weight: 700; color: #7f8c8d; margin-bottom: 6px; }
.log-box { flex: 1; min-height: 0; overflow-y: auto; background: rgba(0,0,0,0.3); border-radius: 8px; padding: 6px 8px; }
.log-line { font-size: 11px; color: #7f8c8d; padding: 2px 0; line-height: 1.4; }
.log-damage { color: #e74c3c; }
.log-heal { color: #27ae60; }
.bo-actions { flex-shrink: 0; padding: 8px 10px; background: rgba(13,17,23,0.6); border-top: 1px solid rgba(255,255,255,0.06); }
.action-row { display: flex; gap: 6px; margin-bottom: 6px; }
.action-row:last-child { margin-bottom: 0; }
.action-btn {
  flex: 1; text-align: center; padding: 12px 4px;
  border-radius: 10px; border: none; font-size: 14px; font-weight: 700;
  cursor: pointer; transition: all 0.2s;
}
.attack-btn { background: linear-gradient(135deg, #c0392b, #e74c3c); color: #fff; }
.attack-btn:hover { transform: scale(1.02); box-shadow: 0 4px 16px rgba(231,76,60,0.5); }
.flee-btn { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #7f8c8d; }
.flee-btn:hover { background: rgba(255,255,255,0.1); color: #f0f0f0; }
.capture-btn { background: linear-gradient(135deg, #e67e22, #f39c12); color: #fff; }
.shortcut-btn {
  flex: 1; text-align: center; padding: 8px 4px;
  background: rgba(39,174,96,0.1); border: 1px solid rgba(39,174,96,0.2);
  border-radius: 8px; display: flex; flex-direction: column; align-items: center; gap: 2px;
  cursor: pointer; transition: all 0.2s;
}
.shortcut-btn:hover { background: rgba(39,174,96,0.2); }
.sk-emoji { font-size: 16px; }
.sk-name { font-size: 10px; color: #ddd; line-height: 1.1; }
.sk-count { font-size: 9px; color: #7f8c8d; }
.shortcut-empty { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #444; }
.result-content { flex: 1; overflow-y: auto; padding: 8px 10px 16px; display: flex; flex-direction: column; gap: 8px; }
.result-card {
  background: rgba(255,255,255,0.03); border: 1px solid; border-radius: 14px; padding: 16px;
}
.win-card { border-color: rgba(39,174,96,0.4); }
.capture-card { border-color: rgba(226,183,20,0.4); }
.lose-card { border-color: rgba(231,76,60,0.4); }
.flee-card { border-color: rgba(243,156,18,0.4); }
.result-title { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
.win-title { color: #f1c40f; }
.capture-title { color: #f39c12; }
.lose-title { color: #e74c3c; }
.flee-title { color: #f39c12; }
.result-sub { font-size: 14px; color: #7f8c8d; margin-bottom: 8px; }
.result-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 10px 0; }
.result-items { font-size: 13px; color: #ddd; margin-bottom: 4px; }
.gold { color: #c9a758; font-weight: 700; }
.hp-val { color: #e74c3c; font-weight: 700; }
.lose-val { color: #e74c3c; font-weight: 700; }
.loot-list { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; }
.loot-item { font-size: 12px; color: #7f8c8d; display: flex; align-items: center; gap: 6px; }
.loot-icon { font-size: 14px; }
.log-review-card {
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px; padding: 12px;
}
.log-full { max-height: 150px; }
.result-actions { text-align: center; padding: 12px 0; display: flex; flex-direction: column; gap: 8px; }
.countdown-hint { font-size: 11px; color: #555; margin-bottom: 4px; }
.result-btn {
  display: inline-block; padding: 12px 28px;
  border-radius: 10px; font-size: 14px; font-weight: 700;
  text-decoration: none; border: none; cursor: pointer; transition: all 0.2s;
}
.continue-btn { background: linear-gradient(135deg, #c0392b, #e74c3c); color: #fff; }
.exit-btn { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #7f8c8d; }
.result-btn:hover { transform: scale(1.05); }
</style>
<template>
  <div class="page-wrap fishing-page">

  <div class="page-hud"><div class="page-hud-title">🎣 钓鱼</div></div>    <!-- 顶部 HUD -->
    <div class="top-hud">
      <div class="hud-left">
        <div class="hud-icon">🎣</div>
        <div class="hud-title">钓鱼</div>
      </div>
    </div>

    <div v-if="loading" class="loading-card">
      <div class="loading-spinner"></div>
      <div class="loading-text">加载中...</div>
    </div>

    <div v-else class="card-area">

      <!-- 鱼竿状态 -->
      <div class="rod-card">
        <div class="rod-header">
          <div class="rod-icon">🎣</div>
          <div class="rod-title">鱼竿</div>
        </div>
        <div v-if="equippedRod" class="rod-body">
          <div class="rod-name">{{ equippedRod.name }}</div>
          <div class="rod-dur-wrap">
            <div class="rod-dur-bar">
              <div class="rod-dur-fill" :style="{ width: (equippedRod.durability / equippedRod.durability_max * 100) + '%' }"></div>
            </div>
            <span class="rod-dur-text">{{ equippedRod.durability }}/{{ equippedRod.durability_max }}</span>
          </div>
          <button class="rod-repair-btn" @click="repairRod" :disabled="repairing">
            🔧 {{ repairing ? '修理中...' : '修理' }}
          </button>
        </div>
        <div v-else class="rod-empty">背包中没有装备鱼竿（fishing类型）</div>
      </div>

      <!-- 钓鱼中状态 -->
      <div v-if="fishingSession" class="fishing-card">
        <div class="fc-status">🎣 钓鱼中...</div>
        <div class="fc-circle">
          <div class="fc-num">{{ Math.max(0, remainingSec) }}</div>
          <div class="fc-unit">秒</div>
        </div>
        <div class="fc-spot">{{ fishingSession.spot_name }}</div>
        <div class="fc-actions">
          <button class="fc-reel-btn" @click="reelFish" :disabled="remainingSec > 0">收竿</button>
          <button class="fc-cancel-btn" @click="cancelFish">取消</button>
        </div>
      </div>

      <!-- 钓鱼点列表 -->
      <div class="spots-card">
        <div class="spots-header">📍 钓鱼点</div>
        <div class="spots-list">
          <div
            v-for="spot in spots"
            :key="spot.place_id"
            class="spot-item"
            :class="{ locked: !spot.can_fish }"
          >
            <div class="si-left">
              <div class="si-name">{{ spot.name }}</div>
              <div class="si-req">Lv.{{ spot.min_level }}</div>
            </div>
            <div class="si-action">
              <span v-if="!spot.can_fish" class="si-reason">{{ spot.reason }}</span>
              <button
                v-else
                class="si-cast-btn"
                :disabled="!!fishingSession"
                @click="castFish(spot.place_id)"
              >抛竿</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 钓鱼记录 -->
      <div v-if="logs.length > 0" class="logs-card">
        <div class="logs-header">📜 钓鱼记录</div>
        <div class="logs-list">
          <div v-for="log in logs" :key="log.id" class="log-item">
            <div class="log-fish">🐟 {{ log.goods_name }} ×{{ log.quantity }}</div>
            <div class="log-val">+{{ log.value }}铜币</div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { Api } from '../composables/useApi';
import { globalAlert } from '../composables/useConfirm';

const loading = ref(true);
const spots = ref([]);
const equippedRod = ref(null);
const logs = ref([]);
const fishingSession = ref(null);
const remainingSec = ref(0);
const repairing = ref(false);
let refreshTimer = null;
let countdownTimer = null;

async function load() {
  try {
    const d = await Api.get('/fishing/spots');
    spots.value = d.spots || [];
    equippedRod.value = d.equipped_rod;
    if (d.session) {
      fishingSession.value = d.session;
      remainingSec.value = Math.ceil((d.session.remaining_sec || 0) / 1000);
    } else {
      fishingSession.value = null;
      remainingSec.value = 0;
    }
  } catch (e) {} finally { loading.value = false; }
}

async function loadLogs() {
  try { const d = await Api.get('/fishing/log'); logs.value = d.logs || []; } catch (e) {}
}

async function castFish(placeId) {
  try {
    const d = await Api.post('/fishing/cast', { place_id: placeId });
    globalAlert(d.msg);
    fishingSession.value = { spot_name: d.spot_name || '' };
    remainingSec.value = d.remaining_sec || 0;
    startCountdown();
  } catch (e) { globalAlert(e.message); }
}

function startCountdown() {
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    if (remainingSec.value > 0) remainingSec.value--;
    else clearInterval(countdownTimer);
  }, 1000);
}

async function reelFish() {
  try {
    const d = await Api.post('/fishing/reel');
    globalAlert(d.msg);
    fishingSession.value = null;
    remainingSec.value = 0;
    if (countdownTimer) clearInterval(countdownTimer);
    await load();
    await loadLogs();
  } catch (e) { globalAlert(e.message); }
}

async function cancelFish() {
  try {
    await Api.delete('/fishing/cancel');
    fishingSession.value = null;
    remainingSec.value = 0;
    if (countdownTimer) clearInterval(countdownTimer);
  } catch (e) {}
}

async function repairRod() {
  try {
    repairing.value = true;
    const d = await Api.post('/fishing/repair');
    globalAlert(d.msg);
    await load();
  } catch (e) { globalAlert(e.message); }
  finally { repairing.value = false; }
}

onMounted(() => { load(); loadLogs(); refreshTimer = setInterval(load, 15000); });
onUnmounted(() => { if (refreshTimer) clearInterval(refreshTimer); if (countdownTimer) clearInterval(countdownTimer); });
</script>

<style scoped>
.fishing-page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 10px;
  min-height: 100%;
  overflow-y: auto;
}
.top-hud {
  position: relative; z-index: 2;
  background: rgba(13,17,23,0.88); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 14px;
  padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;
}
.hud-left { display: flex; align-items: center; gap: 8px; }
.hud-icon { font-size: 20px; }
.hud-title { font-size: 16px; font-weight: 700; color: #f0f0f0; }
.loading-card {
  position: relative; z-index: 2;
  display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px;
}
.loading-spinner {
  width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.1);
  border-top-color: #4ade80; border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 13px; color: #7f8c8d; }
.card-area { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 10px; }
.rod-card {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; padding: 14px 16px;
}
.rod-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.rod-icon { font-size: 18px; }
.rod-title { font-size: 14px; font-weight: 700; color: #f0f0f0; }
.rod-body { display: flex; flex-direction: column; gap: 8px; }
.rod-name { font-size: 13px; color: #ddd; }
.rod-dur-wrap { display: flex; align-items: center; gap: 8px; }
.rod-dur-bar {
  flex: 1; height: 6px; background: rgba(255,255,255,0.08);
  border-radius: 3px; overflow: hidden;
}
.rod-dur-fill {
  height: 100%; background: linear-gradient(90deg, #4ade80, #8bc34a);
  border-radius: 3px; transition: width 0.3s;
}
.rod-dur-text { font-size: 11px; color: #7f8c8d; white-space: nowrap; }
.rod-repair-btn {
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  color: #7f8c8d; border-radius: 6px; padding: 6px 14px;
  font-size: 12px; cursor: pointer; transition: all 0.2s; align-self: flex-start;
}
.rod-repair-btn:hover { background: rgba(255,255,255,0.1); color: #f0f0f0; }
.rod-empty { font-size: 13px; color: #555; }
.fishing-card {
  background: rgba(74,222,128,0.05); border: 1px solid rgba(74,222,128,0.2);
  border-radius: 14px; padding: 16px; text-align: center;
}
.fc-status { font-size: 14px; color: #4ade80; font-weight: 600; margin-bottom: 12px; }
.fc-circle {
  display: inline-flex; flex-direction: column; align-items: center; justify-content: center;
  width: 80px; height: 80px; border-radius: 50%;
  border: 3px solid #4ade80; margin: 0 auto 10px;
}
.fc-num { font-size: 28px; font-weight: bold; color: #4ade80; line-height: 1; }
.fc-unit { font-size: 11px; color: #555; }
.fc-spot { font-size: 12px; color: #7f8c8d; margin-bottom: 12px; }
.fc-actions { display: flex; gap: 8px; justify-content: center; }
.fc-reel-btn {
  background: linear-gradient(135deg, #4ade80, #22c55e); border: none;
  border-radius: 8px; color: #0a1a0a; font-weight: 700;
  font-size: 13px; padding: 8px 20px; cursor: pointer; transition: all 0.2s;
}
.fc-reel-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.fc-cancel-btn {
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; color: #7f8c8d; font-size: 13px; padding: 8px 16px; cursor: pointer;
}
.spots-card {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; padding: 14px 16px;
}
.spots-header { font-size: 14px; font-weight: 700; color: #f0f0f0; margin-bottom: 10px; }
.spots-list { display: flex; flex-direction: column; gap: 8px; }
.spot-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 12px; background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
}
.spot-item.locked { opacity: 0.5; }
.si-left { display: flex; flex-direction: column; gap: 2px; }
.si-name { font-size: 13px; color: #ddd; }
.si-req { font-size: 11px; color: #555; }
.si-action { display: flex; align-items: center; }
.si-reason { font-size: 12px; color: #555; }
.si-cast-btn {
  background: linear-gradient(135deg, #4ade80, #22c55e); border: none;
  border-radius: 6px; color: #0a1a0a; font-weight: 700;
  font-size: 12px; padding: 6px 14px; cursor: pointer; transition: all 0.2s;
}
.si-cast-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.logs-card {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; padding: 14px 16px;
}
.logs-header { font-size: 14px; font-weight: 700; color: #f0f0f0; margin-bottom: 10px; }
.logs-list { display: flex; flex-direction: column; gap: 6px; }
.log-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 10px; background: rgba(255,255,255,0.03);
  border-radius: 8px;
}
.log-fish { font-size: 13px; color: #ddd; }
.log-val { font-size: 13px; color: #e2b70a; }
</style>
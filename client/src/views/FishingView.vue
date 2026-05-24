<template>
  <div class="page">
    <div class="location-bar">
      <div class="location-name">🎣 钓鱼</div>
    </div>

    <div v-if="loading" class="card" style="text-align:center;color:#888;padding:20px;">加载中...</div>
    <div v-else>

      <!-- 鱼竿状态 -->
      <div class="card" style="margin-bottom:12px;">
        <div class="card-title">🎣 鱼竿</div>
        <div v-if="equippedRod" class="rod-info">
          <div class="rod-name">{{ equippedRod.name }}</div>
          <div class="durability-bar-wrap">
            <div class="durability-bar">
              <div class="durability-fill" :style="{ width: (equippedRod.durability / equippedRod.durability_max * 100) + '%' }"></div>
            </div>
            <span class="durability-text">{{ equippedRod.durability }}/{{ equippedRod.durability_max }}</span>
          </div>
          <div class="rod-actions">
            <button class="btn btn-small" @click="repairRod" :disabled="repairing">
              {{ repairing ? '修理中...' : '修理' }}
            </button>
          </div>
        </div>
        <div v-else style="color:#888;font-size:13px;">背包中没有装备鱼竿（fishing类型）</div>
      </div>

      <!-- 钓鱼状态 -->
      <div v-if="fishingSession" class="card" style="margin-bottom:12px;text-align:center;background:#1a2e1a;border:1px solid #4caf50;">
        <div style="font-size:14px;color:#4caf50;margin-bottom:8px;">🎣 钓鱼中...</div>
        <div class="countdown-circle">
          <div class="countdown-num">{{ Math.max(0, remainingSec) }}</div>
          <div style="font-size:12px;color:#888;">秒</div>
        </div>
        <div style="font-size:12px;color:#888;margin-top:8px;">{{ fishingSession.spot_name }}</div>
        <div style="margin-top:10px;display:flex;gap:8px;justify-content:center;">
          <button class="btn btn-primary" @click="reelFish" :disabled="remainingSec > 0">收竿</button>
          <button class="btn btn-secondary" @click="cancelFish">取消</button>
        </div>
      </div>

      <!-- 钓鱼点 -->
      <div class="card" style="margin-bottom:12px;">
        <div class="card-title">📍 钓鱼点</div>
        <div class="spot-list">
          <div
            v-for="spot in spots"
            :key="spot.place_id"
            :class="['spot-item', { locked: !spot.can_fish }]"
          >
            <div class="spot-info">
              <div class="spot-name">{{ spot.name }}</div>
              <div class="spot-req">Lv.{{ spot.min_level }}</div>
            </div>
            <div class="spot-action">
              <span v-if="!spot.can_fish" class="spot-reason">{{ spot.reason }}</span>
              <button
                v-else
                class="btn btn-small btn-primary"
                :disabled="!!fishingSession"
                @click="castFish(spot.place_id)"
              >抛竿</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 钓鱼记录 -->
      <div v-if="logs.length > 0" class="card" style="margin-bottom:12px;">
        <div class="card-title">📜 钓鱼记录</div>
        <div class="log-list">
          <div v-for="log in logs" :key="log.id" class="log-item">
            <div class="log-fish">🐟 {{ log.goods_name }} ×{{ log.quantity }}</div>
            <div class="log-value">+{{ log.value }}铜币</div>
          </div>
        </div>
      </div>

      <button @click="$router.back()" class="btn btn-secondary btn-block">返回</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { Api } from '../composables/useApi';

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
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

async function loadLogs() {
  try {
    const d = await Api.get('/fishing/log');
    logs.value = d.logs || [];
  } catch (e) {}
}

async function castFish(placeId) {
  try {
    const d = await Api.post('/fishing/cast', { place_id: placeId });
    alert(d.msg);
    fishingSession.value = { spot_name: d.spot_name || '' };
    remainingSec.value = d.remaining_sec || 0;
    startCountdown();
  } catch (e) {
    alert(e.message);
  }
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
    alert(d.msg);
    fishingSession.value = null;
    remainingSec.value = 0;
    if (countdownTimer) clearInterval(countdownTimer);
    await load();
    await loadLogs();
  } catch (e) {
    alert(e.message);
  }
}

async function cancelFish() {
  try {
    await Api.delete('/fishing/cancel');
    fishingSession.value = null;
    remainingSec.value = 0;
    if (countdownTimer) clearInterval(countdownTimer);
  } catch (e) {
    alert(e.message);
  }
}

async function repairRod() {
  try {
    repairing.value = true;
    const d = await Api.post('/fishing/repair');
    alert(d.msg);
    await load();
  } catch (e) {
    alert(e.message);
  } finally {
    repairing.value = false;
  }
}

onMounted(() => {
  load();
  loadLogs();
  refreshTimer = setInterval(load, 15000);
});

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer);
  if (countdownTimer) clearInterval(countdownTimer);
});
</script>

<style scoped>
.rod-info { display: flex; flex-direction: column; gap: 8px; }
.rod-name { font-size: 14px; color: #ddd; font-weight: 500; }
.durability-bar-wrap { display: flex; align-items: center; gap: 8px; }
.durability-bar {
  flex: 1; height: 8px; background: #1a1a2e; border-radius: 4px; overflow: hidden; border: 1px solid #333;
}
.durability-fill {
  height: 100%; background: linear-gradient(90deg, #4caf50, #8bc34a); border-radius: 4px;
  transition: width 0.3s;
}
.durability-text { font-size: 12px; color: #888; white-space: nowrap; }
.rod-actions { display: flex; gap: 8px; }
.spot-list { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.spot-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 12px; background: #1a1a2e; border-radius: 8px; border: 1px solid #333;
}
.spot-item.locked { opacity: 0.6; }
.spot-name { font-size: 14px; color: #ddd; }
.spot-req { font-size: 12px; color: #888; margin-top: 2px; }
.spot-reason { font-size: 12px; color: #666; }
.spot-action { display: flex; align-items: center; }
.countdown-circle {
  display: inline-flex; flex-direction: column; align-items: center; justify-content: center;
  width: 80px; height: 80px; border-radius: 50%; border: 3px solid #4caf50;
  margin: 10px auto;
}
.countdown-num { font-size: 28px; font-weight: bold; color: #4caf50; line-height: 1; }
.log-list { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
.log-item { display: flex; justify-content: space-between; padding: 6px 10px; background: #1a1a2e; border-radius: 6px; }
.log-fish { font-size: 13px; color: #ddd; }
.log-value { font-size: 13px; color: #e2b70a; }
</style>
<template>
  <div class="sail-page">
    <div class="sail-bg"></div>

    <!-- 顶部 HUD -->
    <div class="top-hud">
      <div class="hud-left">
        <div class="hud-icon">⛵</div>
        <div class="hud-title">航海</div>
      </div>
      <div class="hud-sub">{{ city ? city.name : '未知' }}{{ ship ? ' · ' + ship.name : ' · 无船只' }}</div>
    </div>

    <!-- 消息 -->
    <div class="msg-card" v-if="msg" :class="{ error: msgType === 'error' }">{{ msg }}</div>

    <!-- 海盗遭遇弹窗 -->
    <Teleport to="body">
      <div v-if="showPirateDialog" class="overlay" @click="closePirateDialog">
        <div class="pirate-card">
          <div class="pirate-icon">🏴‍☠️</div>
          <div class="pirate-title">遭遇海盗！</div>
          <div class="pirate-desc">海盗盯上了你的货物<br>选择你的行动</div>
          <div class="pirate-actions">
            <button class="pirate-flee" @click="fleePirate">🏃 逃跑</button>
            <button class="pirate-fight" @click="fightPirate">⚔️ 迎战</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 宝藏弹窗 -->
    <Teleport to="body">
      <div v-if="showTreasureDialog" class="overlay" @click="closeTreasureDialog">
        <div class="treasure-card">
          <div class="treasure-icon">📦</div>
          <div class="treasure-title">🎁 航行中发现宝箱！</div>
          <div class="treasure-amount">获得 {{ treasureAmount }} 铜币</div>
          <button class="treasure-collect" @click="closeTreasureDialog">✨ 收下</button>
        </div>
      </div>
    </Teleport>

    <!-- 航行中状态 -->
    <div v-if="isSailing" class="sailing-card">
      <div class="sailing-header">🌊 航行中...</div>
      <div class="sailing-visual">
        <div class="sailing-ship">⛵</div>
        <div class="sailing-route">{{ sailFromCity }} → {{ sailToCity }}</div>
      </div>
      <div class="sailing-progress">
        <div class="sp-info">
          <span>航行进度</span>
          <span>{{ sailProgress }}%</span>
        </div>
        <div class="sp-bar">
          <div class="sp-fill" :style="{ width: sailProgress + '%' }"></div>
        </div>
      </div>
      <div class="sailing-remain">预计还需 <span class="gold">{{ sailRemain }}</span> 分钟</div>
    </div>

    <template v-else>
      <!-- 非码头状态 -->
      <div v-if="!isDock" class="dock-hint">
        ⚓ 你需要前往码头才能出海<br>
        <span class="hint-sub">在地图中找到码头（★标记）</span>
      </div>

      <template v-else>
        <!-- 当前船只 -->
        <div v-if="ship" class="ship-card">
          <div class="ship-header">⛵ 当前船只：{{ ship.name }}</div>
          <div class="ship-info">⚡ 速度 {{ ship.speed_desc || '一般' }} · 📦 船舱 {{ cargoUsed }}/{{ cargoMax }}</div>
        </div>

        <!-- 目的地选择 -->
        <div v-if="ship" class="dest-card">
          <div class="dest-header">🗺️ 选择目的地</div>
          <div class="dest-sub">从 {{ city?.name }} 出发</div>
          <select v-if="reachableCities.length" v-model="targetCityId" class="dest-select">
            <option value="">-- 选择目标城市 --</option>
            <option v-for="c in reachableCities" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
          <button class="depart-btn" @click="depart" :disabled="!targetCityId">⛵ 出航！</button>
          <div v-if="!reachableCities.length" class="dest-empty">没有可到达的城市</div>
        </div>

        <!-- 船只商店 -->
        <div class="shop-card">
          <div class="shop-header">🏪 船只商店</div>
          <div class="shop-list">
            <div v-for="s in allShips" :key="s.id" class="shop-item">
              <div class="si-top">
                <div class="si-name" :class="{ current: currentShipId == s.id }">{{ s.name }}</div>
                <div class="si-price">{{ s.price > 0 ? formatMoney(s.price) + '铜' : '免费' }}</div>
              </div>
              <div class="si-desc">速度:{{ { 1: '缓慢', 2: '一般', 3: '较快', 5: '极快' }[s.speed] || '一般' }} · 容量:{{ s.capacity }}</div>
              <button
                v-if="currentShipId != s.id"
                class="si-buy-btn"
                :class="ownedShips.includes(s.id) ? 'owned' : ''"
                :disabled="!ownedShips.includes(s.id) && money < s.price"
                @click="buyShip(s.id)"
              >
                {{ ownedShips.includes(s.id) ? '切换' : '购买' }}
              </button>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- 航海须知 -->
    <div class="info-card">
      <div class="info-header">📖 航海须知</div>
      <div class="info-list">
        <p>⚓ 必须在码头才能出航</p>
        <p>⛵ 拥有船只才能出海，越快的船航程越短</p>
        <p>🌊 航海中可能遇到随机事件（海盗、宝藏等）</p>
        <p>⏱️ 航海期间不能进行其他操作</p>
      </div>
    </div>

    <router-link v-if="!isSailing" to="/citymap" class="back-btn">← 返回地图</router-link>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { Api } from '../composables/useApi';
import { formatMoney } from '../utils/formatters';
import { useGameStore } from '../stores/game';
import { useRouter } from 'vue-router';

const isSailing = ref(false);
const sailProgress = ref(0);
const sailRemain = ref(0);
const sailFromCity = ref('');
const sailToCity = ref('');
const ship = ref(null);
const allShips = ref([]);
const city = ref(null);
const isDock = ref(false);
const reachableCities = ref([]);
const targetCityId = ref('');
const money = ref(0);
const currentShipId = ref(0);
const cargoUsed = ref(0);
const cargoMax = ref(0);
const ownedShips = ref([]);
const msg = ref('');
const msgType = ref('');
const showPirateDialog = ref(false);
const showTreasureDialog = ref(false);
const treasureAmount = ref(0);

const gameStore = useGameStore();
const router = useRouter();
let pollTimer = null;

function syncPolling() {
  stopPolling();
  if (isSailing.value) pollTimer = setInterval(() => { load(false); }, 2000);
}

async function load(resetTarget = true) {
  try {
    let d = await Api.get('/sail/status');
    if (d?.event === 'pirate_midway') {
      msg.value = d.msg || '🌊 已到达目的地';
      msgType.value = d.event?.includes('pirate') ? 'error' : 'success';
      if (d.event === 'pirate_midway') { showPirateDialog.value = true; syncPolling(); return; }
      try { const latest = await Api.get('/sail/status'); if (latest && !latest.arrived) d = latest; } catch (_) {}
    }
    if (d?.arrived) {
      const evt = d.event || '';
      msg.value = d.msg || '🌊 已到达目的地';
      msgType.value = evt === 'treasure' ? 'success' : 'normal';
      if (evt === 'treasure') {
        const match = (d.msg || '').match(/(\d+)/);
        treasureAmount.value = match ? Number(match[1]) : 0;
        showTreasureDialog.value = true;
      } else { showTreasureDialog.value = false; }
      try { const latest = await Api.get('/sail/status'); if (latest && !latest.arrived) d = latest; } catch (_) {}
    } else { showTreasureDialog.value = false; }
    isSailing.value = !!d?.isSailing;
    sailProgress.value = Number(d?.sailProgress || 0);
    sailRemain.value = Number(d?.sailRemain || 0);
    sailFromCity.value = d?.sailFromCity || '';
    sailToCity.value = d?.sailToCity || '';
    ship.value = d?.ship || null;
    allShips.value = Array.isArray(d?.allShips) ? d.allShips : [];
    city.value = d?.city || null;
    isDock.value = !!d?.isDock;
    reachableCities.value = Array.isArray(d?.reachableCities) ? d.reachableCities : [];
    money.value = Number(d?.money || 0);
    currentShipId.value = ship.value?.id || 0;
    cargoUsed.value = Number(d?.cargoUsed || 0);
    cargoMax.value = Number(d?.cargoMax || 0);
    ownedShips.value = Array.isArray(d?.ownedShips) ? d.ownedShips : [];
    if (resetTarget) {
      const exists = reachableCities.value.some(c => String(c.id) === String(targetCityId.value));
      if (!exists) targetCityId.value = '';
    }
    syncPolling();
  } catch (e) {
    msg.value = e?.response?.data?.error || e.message || '航海数据加载失败';
    msgType.value = 'error';
    syncPolling();
  }
}

async function buyShip(id) {
  const s = allShips.value.find(x => x.id === id);
  if (!s) return;
  if (!ownedShips.value.includes(id) && money.value < s.price) {
    msg.value = `铜币不足，需要 ${s.price} 铜币，你只有 ${money.value} 铜币`;
    msgType.value = 'error';
    return;
  }
  try { const d = await Api.post('/sail/buy-ship', { ship_id: id }); msg.value = d.msg || (d.switched ? '切换成功' : '购买成功'); msgType.value = 'success'; await load(); Api.post('/guide/ship-bought').catch(()=>{}); }
  catch (e) { msg.value = e?.response?.data?.error || e.message || '操作失败'; msgType.value = 'error'; }
}

async function depart() {
  if (!targetCityId.value) return;
  try { await Api.post('/sail/depart', { target_city_id: targetCityId.value }); msg.value = '⛵ 已出航'; msgType.value = 'success'; await load(false); Api.post('/guide/sail-started').catch(()=>{}); }
  catch (e) { msg.value = e?.response?.data?.error || e.message || '出航失败'; msgType.value = 'error'; }
}

function closePirateDialog() { showPirateDialog.value = false; load(false); }
function closeTreasureDialog() { showTreasureDialog.value = false; }

async function fightPirate() {
  showPirateDialog.value = false;
  try { const b = await Api.post('/battle/start-pirate', {}); gameStore.setBattle(b); router.push('/citymap'); }
  catch (e) { msg.value = e?.response?.data?.error || e.message || '海盗战斗启动失败'; msgType.value = 'error'; }
}

async function fleePirate() {
  showPirateDialog.value = false;
  try { const d = await Api.post('/sail/flee-pirate', {}); msg.value = d.msg || '🏃 成功逃离海盗'; msgType.value = 'success'; await load(false); }
  catch (e) { msg.value = e?.response?.data?.error || e.message || '逃离失败'; msgType.value = 'error'; }
}

onMounted(() => { load(); });
onUnmounted(() => { stopPolling(); });
</script>

<style scoped>
.sail-page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 10px;
  min-height: 100%;
  overflow-y: auto;
}
.sail-bg {
  position: fixed; inset: 0; z-index: 0;
  background: linear-gradient(160deg, #0d1117 0%, #0a1e2a 50%, #0d1117 100%);
  pointer-events: none;
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
.hud-sub { font-size: 11px; color: #7f8c8d; background: rgba(255,255,255,0.06); padding: 2px 10px; border-radius: 10px; }
.msg-card {
  position: relative; z-index: 2;
  border-radius: 10px; padding: 8px 14px;
  font-size: 12px; font-weight: 600; text-align: center;
}
.msg-card.error { background: rgba(184,90,58,0.1); border: 1px solid rgba(184,90,58,0.3); color: #e74c3c; }
.msg-card:not(.error) { background: rgba(39,174,96,0.1); border: 1px solid rgba(39,174,96,0.3); color: #27ae60; }
.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; backdrop-filter: blur(4px);
}
.pirate-card {
  background: rgba(13,17,23,0.97); border: 1px solid rgba(220,80,80,0.4);
  border-radius: 16px; padding: 24px 20px; width: 300px; text-align: center;
}
.pirate-icon { font-size: 48px; margin-bottom: 8px; }
.pirate-title { font-size: 18px; font-weight: 700; color: #f0f0f0; margin-bottom: 6px; }
.pirate-desc { font-size: 13px; color: #7f8c8d; margin-bottom: 16px; line-height: 1.5; }
.pirate-actions { display: flex; gap: 8px; }
.pirate-flee {
  flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; color: #7f8c8d; font-size: 14px; padding: 10px; cursor: pointer;
}
.pirate-fight {
  flex: 1; background: linear-gradient(135deg, #8b1a1a, #b22222); border: none;
  border-radius: 8px; color: #fff; font-size: 14px; font-weight: 700; padding: 10px; cursor: pointer;
}
.treasure-card {
  background: rgba(13,17,23,0.97); border: 1px solid rgba(201,168,76,0.4);
  border-radius: 16px; padding: 24px 20px; width: 300px; text-align: center;
}
.treasure-icon { font-size: 48px; margin-bottom: 8px; }
.treasure-title { font-size: 16px; font-weight: 700; color: #f0f0f0; margin-bottom: 6px; }
.treasure-amount { font-size: 14px; color: #c9a758; font-weight: 700; margin-bottom: 16px; }
.treasure-collect {
  width: 100%; background: linear-gradient(135deg, #c9a84c, #8b6914); border: none;
  border-radius: 8px; color: #fff; font-size: 14px; font-weight: 700; padding: 12px; cursor: pointer;
}
.sailing-card {
  position: relative; z-index: 2;
  background: rgba(39,174,96,0.05); border: 1px solid rgba(39,174,96,0.2);
  border-radius: 14px; padding: 16px;
}
.sailing-header { font-size: 14px; font-weight: 700; color: #27ae60; margin-bottom: 12px; }
.sailing-visual { text-align: center; margin-bottom: 14px; }
.sailing-ship { font-size: 48px; margin-bottom: 8px; }
.sailing-route { font-size: 14px; color: #c9a758; font-weight: 600; }
.sailing-progress { margin-bottom: 10px; }
.sp-info { display: flex; justify-content: space-between; font-size: 12px; color: #7f8c8d; margin-bottom: 6px; }
.sp-bar { height: 10px; background: rgba(255,255,255,0.08); border-radius: 5px; overflow: hidden; }
.sp-fill { height: 100%; background: linear-gradient(90deg, #3f6a4a, #27ae60); border-radius: 5px; transition: width 1s; }
.sailing-remain { text-align: center; font-size: 13px; color: #7f8c8d; }
.gold { color: #c9a758; font-weight: 700; }
.dock-hint {
  position: relative; z-index: 2;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 30px; text-align: center;
  font-size: 14px; color: #7f8c8d; line-height: 1.8;
}
.hint-sub { font-size: 12px; color: #555; }
.ship-card {
  position: relative; z-index: 2;
  background: rgba(39,174,96,0.05); border: 1px solid rgba(39,174,96,0.2);
  border-radius: 12px; padding: 12px 14px;
}
.ship-header { font-size: 13px; font-weight: 700; color: #27ae60; margin-bottom: 4px; }
.ship-info { font-size: 12px; color: #7f8c8d; }
.dest-card {
  position: relative; z-index: 2;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; padding: 14px 16px;
}
.dest-header { font-size: 14px; font-weight: 700; color: #f0f0f0; margin-bottom: 4px; }
.dest-sub { font-size: 12px; color: #7f8c8d; margin-bottom: 10px; }
.dest-select {
  width: 100%; padding: 10px; background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
  font-size: 14px; color: #f0f0f0; outline: none; margin-bottom: 10px;
}
.dest-select:focus { border-color: rgba(39,174,96,0.4); }
.depart-btn {
  width: 100%; background: linear-gradient(135deg, #3f6a4a, #27ae60); border: none;
  border-radius: 8px; color: #fff; font-weight: 700; font-size: 14px; padding: 12px; cursor: pointer;
  transition: all 0.2s;
}
.depart-btn:hover:not(:disabled) { transform: scale(1.02); box-shadow: 0 4px 16px rgba(39,174,96,0.4); }
.depart-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.dest-empty { font-size: 13px; color: #555; text-align: center; padding: 10px; }
.shop-card {
  position: relative; z-index: 2;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; padding: 14px 16px;
}
.shop-header { font-size: 14px; font-weight: 700; color: #c9a758; margin-bottom: 10px; }
.shop-list { display: flex; flex-direction: column; gap: 8px; }
.shop-item {
  padding: 10px 12px; background: rgba(255,255,255,0.03);
  border-radius: 10px; border-bottom: 1px solid rgba(255,255,255,0.04);
}
.shop-item:last-child { border-bottom: none; }
.si-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.si-name { font-size: 13px; font-weight: 600; color: #ddd; }
.si-name.current { color: #27ae60; }
.si-price { font-size: 12px; color: #c9a758; font-weight: 700; }
.si-desc { font-size: 11px; color: #7f8c8d; margin-bottom: 6px; }
.si-buy-btn {
  background: linear-gradient(135deg, #3f6a4a, #27ae60); border: none;
  border-radius: 6px; color: #fff; font-size: 12px; font-weight: 600;
  padding: 5px 12px; cursor: pointer; transition: all 0.2s;
}
.si-buy-btn.owned { background: rgba(255,255,255,0.06); color: #7f8c8d; }
.si-buy-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.info-card {
  position: relative; z-index: 2;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; padding: 14px 16px;
}
.info-header { font-size: 14px; font-weight: 700; color: #f0f0f0; margin-bottom: 10px; }
.info-list { display: flex; flex-direction: column; gap: 6px; }
.info-list p { font-size: 13px; color: #7f8c8d; line-height: 1.6; margin: 0; }
.back-btn {
  position: relative; z-index: 2;
  display: block; text-align: center;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; color: #7f8c8d; font-size: 14px; padding: 10px;
  text-decoration: none; transition: all 0.2s;
}
.back-btn:hover { background: rgba(255,255,255,0.1); color: #f0f0f0; }
</style>
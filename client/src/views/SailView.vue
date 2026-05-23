<template>
<div class="page">
<div class="location-bar"><div class="location-name">⛵ 航海</div><div class="location-path">{{ city?city.name:'未知' }}{{ ship?' · '+ship.name:' · 无船只' }}</div></div>
<div v-if="msg" class="card" :style="{borderColor:msgType==='error'?'#73281c':'#2e5a3b'}">
<p :style="{color:msgType==='error'?'#b85a3a':'#2e5a3b',margin:0}">{{ msg }}</p>
</div>

<!-- 海盗遭遇弹窗 -->
<Teleport to="body">
<div v-if="showPirateDialog" class="slot-picker-overlay">
  <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:300;" @click="closePirateDialog"></div>
  <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:300px;background:rgba(26,26,46,0.97);border-radius:12px;padding:20px;z-index:301;border:1px solid rgba(220,80,80,0.4);">
    <div style="text-align:center;font-size:36px;margin-bottom:8px;">🏴‍☠️</div>
    <div style="text-align:center;font-size:16px;color:#f7efdb;margin-bottom:4px;">遭遇海盗！</div>
    <div style="text-align:center;font-size:12px;color:#8b784e;margin-bottom:16px;">海盗盯上了你的货物<br>选择你的行动</div>
    <div style="display:flex;gap:8px;">
      <button class="btn btn-secondary" style="flex:1;" @click="fleePirate">🏃 逃跑</button>
      <button class="btn btn-primary" style="flex:1;background:#8b1a1a;" @click="fightPirate">⚔️ 迎战</button>
    </div>
  </div>
</div>
</Teleport>

<!-- 宝藏弹窗 -->
<Teleport to="body">
<div v-if="showTreasureDialog" class="slot-picker-overlay">
  <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:300;" @click="closeTreasureDialog"></div>
  <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:300px;background:rgba(26,26,46,0.97);border-radius:12px;padding:20px;z-index:301;border:1px solid rgba(201,165,88,0.4);">
    <div style="text-align:center;font-size:36px;margin-bottom:8px;">📦</div>
    <div style="text-align:center;font-size:16px;color:#f7efdb;margin-bottom:4px;">🎁 航行中发现宝箱！</div>
    <div style="text-align:center;font-size:13px;color:#c9a758;margin-bottom:16px;">获得 {{ treasureAmount }} 铜币</div>
    <button class="btn btn-primary btn-block" @click="closeTreasureDialog">✨ 收下</button>
  </div>
</div>
</Teleport>
<template v-if="isSailing">
<div class="card" style="border-color:#3f6a4a;">
<div class="card-title" style="color:#3f6a4a;">🌊 航行中...</div>
<div style="text-align:center;margin:20px 0;">
<div style="font-size:48px;">⛵</div>
<div style="font-size:18px;color:#c9a758;margin:12px 0;">{{ sailFromCity }} → {{ sailToCity }}</div>
</div>
<div style="margin:12px 0;">
<div style="display:flex;justify-content:space-between;font-size:12px;color:#8b784e;margin-bottom:4px;">
<span>航行进度</span><span>{{ sailProgress }}%</span>
</div>
<div style="height:12px;background:#080c08;border-radius:6px;overflow:hidden;border:1px solid #3a4f2e;"><div :style="{height:'100%',width:sailProgress+'%',background:'linear-gradient(90deg,#3f6a4a,#35573f)',borderRadius:'6px',transition:'width 1s'}"></div></div>
</div>
<p style="text-align:center;color:#8b784e;font-size:13px;">预计还需 <span class="text-gold">{{ sailRemain }}</span> 分钟</p>
</div>
</template>
<template v-else>
<template v-if="!isDock">
<div class="card"><div class="empty-state">⚓ 你需要前往码头才能出海<br><span style="font-size:12px;">在地图中找到码头（★标记）</span></div></div>
</template>
<template v-else>
<div v-if="ship" class="card" style="border-color:#2e5a3b;">
<div class="card-title" style="color:#2e5a3b;">⛵ 当前船只：{{ ship.name }}</div>
<div style="font-size:14px;">⚡ 速度 {{ ship.speed_desc||'一般' }} · 📦 船舱 {{ cargoUsed }}/{{ cargoMax }}</div>
</div>
<div v-if="ship" class="card" style="border-color:#3f6a4a;">
<div class="card-title" style="color:#3f6a4a;">🗺️ 选择目的地</div>
<p class="text-muted" style="font-size:13px;">从 {{ city?.name }} 出发</p>
<select v-if="reachableCities.length" v-model="targetCityId" style="width:100%;padding:10px;background:#080c08;color:#f7efdb;border:1px solid #3a4f2e;border-radius:6px;font-size:15px;margin:8px 0;">
<option value="">-- 选择目标城市 --</option>
<option v-for="c in reachableCities" :key="c.id" :value="c.id">{{ c.name }}</option>
</select>
<button class="btn btn-primary btn-block" @click="depart" :disabled="!targetCityId">⛵ 出航！</button>
<div v-if="!reachableCities.length" class="empty-state">没有可到达的城市</div>
</div>
<div class="card" style="border-color:#c9a758;max-height:320px;overflow-y:auto;">
<div class="card-title" style="color:#c9a758;">🏪 船只商店</div>
<div v-for="s in allShips" :key="s.id" style="padding:8px 0;border-bottom:1px solid rgba(169,119,78,0.05);">
<div style="display:flex;justify-content:space-between;align-items:center;">
<div><span style="font-weight:bold;" :style="{color:currentShipId==s.id?'#2e5a3b':''}">{{ s.name }}</span><span v-if="currentShipId==s.id" style="font-size:11px;color:#2e5a3b;"> [当前]</span></div>
<span class="text-gold" style="font-size:13px;">{{ s.price>0?formatMoney(s.price)+'铜':'免费' }}</span>
</div>
<div class="item-desc">速度:{{ {1:'缓慢',2:'一般',3:'较快',5:'极快'}[s.speed]||'一般' }} · 容量:{{ s.capacity }}</div>
<button v-if="currentShipId!=s.id" class="btn btn-small" :class="ownedShips.includes(s.id)?'btn-primary':'btn-success'" @click="buyShip(s.id)" :disabled="!ownedShips.includes(s.id)&&money<s.price" style="margin-top:4px;font-size:12px;">{{ ownedShips.includes(s.id) ? '切换' : '购买' }}</button>
</div>
</div>
</template>
</template>
<div class="card" style="border-color:#5f4a31;">
<div class="card-title" style="color:#5f4a31;">📖 航海须知</div>
<div style="font-size:13px;line-height:1.8;color:#cfc19e;">
<p>⚓ 必须在码头才能出航</p>
<p>⛵ 拥有船只才能出海，越快的船航程越短</p>
<p>🌊 航海中可能遇到随机事件（海盗、宝藏等）</p>
<p>⏱️ 航海期间不能进行其他操作</p>
</div>
</div>
<router-link v-if="!isSailing" to="/map" class="btn btn-secondary btn-block mt-10">← 返回地图</router-link>
</div>
</template>
<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { Api } from '../composables/useApi';
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

function formatMoney(n) {
  if (!n) return '0';
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿';
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  return Number(n).toLocaleString();
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function syncPolling() {
  stopPolling();
  if (isSailing.value) {
    pollTimer = setInterval(() => { load(false); }, 2000);
  }
}

async function load(resetTarget = true) {
  try {
    let d = await Api.get('/sail/status');

    // 到港后先提示，再立即拉一次最新状态，避免 arrived 响应缺少完整字段导致UI异常
    if (d?.event === 'pirate_midway') {
      msg.value = d.msg || '🌊 已到达目的地';
      msgType.value = (d.event && d.event.includes('pirate')) ? 'error' : 'success';

      // Pirate mid-way event: show dialog for user choice
      if (d.event === 'pirate_midway') {
        showPirateDialog.value = true;
        syncPolling();
        return;
      }

      try {
        const latest = await Api.get('/sail/status');
        if (latest && !latest.arrived) d = latest;
      } catch (_) {}
    }

    if (d?.arrived) {
      const evt = d.event || '';
      msg.value = d.msg || '🌊 已到达目的地';
      msgType.value = evt === 'treasure' ? 'success' : 'normal';
      if (evt === 'treasure') {
        const match = (d.msg || '').match(/(\d+)/);
        treasureAmount.value = match ? Number(match[1]) : 0;
        showTreasureDialog.value = true;
      } else {
        showTreasureDialog.value = false;
      }
      try {
        const latest = await Api.get('/sail/status');
        if (latest && !latest.arrived) d = latest;
      } catch (_) {}
    } else {
      showTreasureDialog.value = false;
    }

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
  try {
    const d = await Api.post('/sail/buy-ship', { ship_id: id });
    msg.value = d.msg || (d.switched ? '切换成功' : '购买成功');
    msgType.value = 'success';
    await load();
  } catch (e) {
    msg.value = e?.response?.data?.error || e.message || '操作失败';
    msgType.value = 'error';
  }
}

async function depart() {
  if (!targetCityId.value) return;
  try {
    await Api.post('/sail/depart', { target_city_id: targetCityId.value });
    msg.value = '⛵ 已出航';
    msgType.value = 'success';
    await load(false);
  } catch (e) {
    msg.value = e?.response?.data?.error || e.message || '出航失败';
    msgType.value = 'error';
  }
}

function closePirateDialog() {
  showPirateDialog.value = false;
  load(false);
}
function closeTreasureDialog() {
  showTreasureDialog.value = false;
}
async function fightPirate() {
  showPirateDialog.value = false;
  try {
    const b = await Api.post('/battle/start-pirate', {});
    gameStore.setBattle(b);
    router.push('/map');
  } catch (e) {
    msg.value = e?.response?.data?.error || e.message || '海盗战斗启动失败';
    msgType.value = 'error';
  }
}
async function fleePirate() {
  showPirateDialog.value = false;
  // 逃跑：扣少量铜币，继续航行
  try {
    const d = await Api.post('/sail/flee-pirate', {});
    msg.value = d.msg || '🏃 成功逃离海盗';
    msgType.value = 'success';
    await load(false);
  } catch (e) {
    msg.value = e?.response?.data?.error || e.message || '逃离失败';
    msgType.value = 'error';
  }
}

onMounted(() => {
  load();
});

onUnmounted(() => {
  stopPolling();
});
</script>

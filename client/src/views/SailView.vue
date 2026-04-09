<template>
<div class="page">
<div class="location-bar"><div class="location-name">⛵ 航海</div><div class="location-path">{{ city?city.name:'未知' }}{{ ship?' · '+ship.name:' · 无船只' }}</div></div>
<div v-if="msg" class="card" :style="{borderColor:msgType==='error'?'#73281c':'#2e5a3b'}">
<p :style="{color:msgType==='error'?'#b85a3a':'#2e5a3b',margin:0}">{{ msg }}</p>
</div>
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
<div style="font-size:14px;">⚡ 速度 {{ ship.speed_desc||'一般' }} · 📦 容量 {{ ship.capacity }}</div>
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
<div class="card" style="border-color:#c9a758;">
<div class="card-title" style="color:#c9a758;">🏪 船只商店</div>
<div v-for="s in allShips" :key="s.id" style="padding:8px 0;border-bottom:1px solid rgba(169,119,78,0.05);">
<div style="display:flex;justify-content:space-between;align-items:center;">
<div><span style="font-weight:bold;" :style="{color:currentShipId==s.id?'#2e5a3b':''}">{{ s.name }}</span><span v-if="currentShipId==s.id" style="font-size:11px;color:#2e5a3b;"> [当前]</span></div>
<span class="text-gold" style="font-size:13px;">{{ s.price>0?formatMoney(s.price)+'铜':'免费' }}</span>
</div>
<div class="item-desc">速度:{{ s.speed_desc||'一般' }} · 容量:{{ s.capacity }}</div>
<button v-if="currentShipId!=s.id" class="btn btn-success btn-small" @click="buyShip(s.id)" :disabled="money<s.price" style="margin-top:4px;font-size:12px;">购买</button>
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

const msg = ref('');
const msgType = ref('');

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
    pollTimer = setInterval(() => { load(false); }, 5000);
  }
}

async function load(resetTarget = true) {
  try {
    let d = await Api.get('/sail/status');

    // 到港后先提示，再立即拉一次最新状态，避免 arrived 响应缺少完整字段导致UI异常
    if (d?.event === 'pirate_midway') {
      msg.value = d.msg || '🌊 已到达目的地';
      msgType.value = d.event === 'pirate' ? 'error' : 'success';

      // Pirate mid-way event: auto start pirate battle overlay
      if (d.event === 'pirate_midway') {
        try {
          const b = await Api.post('/battle/start-pirate', {});
          gameStore.setBattle(b);
          router.push('/map');
          return;
        } catch (e) {
          msg.value = e?.response?.data?.error || e.message || '海盗战斗启动失败';
          msgType.value = 'error';
        }
      }

      try {
        const latest = await Api.get('/sail/status');
        if (latest && !latest.arrived) d = latest;
      } catch (_) {}
    }

    if (d?.arrived) {
      msg.value = d.msg || '🌊 已到达目的地';
      msgType.value = d.event === 'pirate' ? 'error' : 'success';
      try {
        const latest = await Api.get('/sail/status');
        if (latest && !latest.arrived) d = latest;
      } catch (_) {}
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
  try {
    const d = await Api.post('/sail/buy-ship', { ship_id: id });
    msg.value = d.msg || '购买成功';
    msgType.value = 'success';
    await load();
  } catch (e) {
    msg.value = e?.response?.data?.error || e.message || '购买失败';
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

onMounted(() => {
  load();
});

onUnmounted(() => {
  stopPolling();
});
</script>

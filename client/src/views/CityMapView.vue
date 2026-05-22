<template>
<div class="citymap-page">
  <div class="location-bar">
    <div class="location-name">🗺️ {{ cityName }}</div>
    <div class="location-path">点击城门直接前往</div>
  </div>

  <!-- 城市地图区域 -->
  <div class="city-map-wrap">
    <!-- 北门（上方） -->
    <div v-if="gatesByDir.n" class="gate gate-n" @click="goToGate(gatesByDir.n)">
      <div class="gate-icon">⬆️</div>
      <div class="gate-name">北门</div>
      <div class="gate-target">{{ gatesByDir.n.name }}</div>
    </div>

    <!-- 城市主体 -->
    <div class="city-center">
      <div class="city-emblem">🏛️</div>
      <div class="city-title">{{ cityName }}</div>
      <div class="city-sub">点击下方城门离开城市</div>
      <router-link to="/map" class="btn btn-secondary btn-block mt-10">← 返回地图</router-link>
    </div>

    <!-- 左：西门  右：东门  下：南门 -->
    <div class="gate gate-w" v-if="gatesByDir.w" @click="goToGate(gatesByDir.w)">
      <div class="gate-icon">⬅️</div>
      <div class="gate-name">西门</div>
      <div class="gate-target">{{ gatesByDir.w.name }}</div>
    </div>

    <div class="city-body">
      <!-- empty middle -->
    </div>

    <div class="gate gate-e" v-if="gatesByDir.e" @click="goToGate(gatesByDir.e)">
      <div class="gate-icon">➡️</div>
      <div class="gate-name">东门</div>
      <div class="gate-target">{{ gatesByDir.e.name }}</div>
    </div>

    <!-- 南门（下方） -->
    <div v-if="gatesByDir.s" class="gate gate-s" @click="goToGate(gatesByDir.s)">
      <div class="gate-icon">⬇️</div>
      <div class="gate-name">南门</div>
      <div class="gate-target">{{ gatesByDir.s.name }}</div>
    </div>
  </div>

  <div v-if="!gates.length" class="card" style="margin-top:12px;">
    <div class="empty-state">该城市暂无关卡数据</div>
  </div>
</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Api } from '../composables/useApi';
import { useUserStore } from '../stores/user';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const cityName = ref('');
const gates = ref([]);

// Gate direction: match by name keyword
const gatesByDir = computed(() => {
  const result = { n: null, e: null, s: null, w: null };
  gates.value.forEach(g => {
    const n = g.name;
    if (n.includes('北门') || n.includes('北城') || n.includes('北门')) result.n = g;
    else if (n.includes('东门') || n.includes('东城')) result.e = g;
    else if (n.includes('南门') || n.includes('南城')) result.s = g;
    else if (n.includes('西城') || n.includes('西门')) result.w = g;
    else {
      // Fallback: 按出现顺序填充
      if (!result.s) result.s = g;
      else if (!result.w) result.w = g;
      else if (!result.e) result.e = g;
      else if (!result.n) result.n = g;
    }
  });
  return result;
});

async function goToGate(gate) {
  try {
    await Api.post('/user/teleport', { place_id: gate.id });
    userStore.updateUser({ ...userStore.user, place_id: gate.id });
    router.push('/map');
  } catch (e) {}
}

async function load() {
  try {
    const d = await Api.get(`/user/citymap/${route.params.cityId || ''}`);
    cityName.value = d.city?.name || '城内地图';
    // Filter places that look like gates: name contains 门 or 城
    gates.value = (d.places || []).filter(p => p.name.includes('门') || p.name.includes('城'));
  } catch (e) {}
}

onMounted(load);
</script>

<style scoped>
.citymap-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 4px 6px;
  gap: 8px;
}
.citymap-page::-webkit-scrollbar { width: 2px; }
.citymap-page::-webkit-scrollbar-track { background: transparent; }
.citymap-page::-webkit-scrollbar-thumb { background: #3a4f2e; border-radius: 1px; }

.city-map-wrap {
  position: relative;
  flex: 1;
  min-height: 320px;
  display: grid;
  grid-template-areas:
    ". n ."
    "w city e"
    ". s .";
  grid-template-columns: 60px 1fr 60px;
  grid-template-rows: 56px 1fr 56px;
  gap: 4px;
}

.gate {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #1a2230;
  border: 2px solid #2a3a2a;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  gap: 2px;
  padding: 6px 4px;
}
.gate:active {
  border-color: #c9a758;
  background: #1f2a1e;
  transform: scale(0.97);
}
.gate-n { grid-area: n; }
.gate-s { grid-area: s; }
.gate-e { grid-area: e; }
.gate-w { grid-area: w; }

.gate-icon { font-size: 24px; line-height: 1; }
.gate-name { font-size: 11px; color: #c9a758; font-weight: bold; }
.gate-target { font-size: 9px; color: #8b784e; text-align: center; }

.city-center {
  grid-area: city;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at center, #1e2a3a 0%, #141e2a 100%);
  border: 2px solid #2a3a2a;
  border-radius: 16px;
  padding: 12px;
  gap: 4px;
}
.city-body {
  grid-area: city;
}

.city-emblem { font-size: 40px; line-height: 1; }
.city-title {
  font-size: 16px;
  font-weight: bold;
  color: #c9a758;
  text-align: center;
}
.city-sub {
  font-size: 10px;
  color: #8b784e;
  text-align: center;
}
</style>

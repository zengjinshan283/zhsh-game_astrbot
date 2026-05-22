<template>
<div class="citymap-page">
  <div class="location-bar">
    <div class="location-name">🗺️ {{ cityName }}</div>
    <div class="location-path">{{ places.length }}个地点 · 点击前往</div>
  </div>

  <!-- 棋盘网格 -->
  <div class="place-grid" v-if="places.length">
    <!-- 左上：北门 -->
    <div v-if="gates.n" class="place-cell place-gate" @click="goTo(placesById[gates.n])">
      <div class="cell-icon">⬆️</div>
      <div class="cell-name">北门</div>
      <div class="cell-sub">{{ placesById[gates.n]?.name }}</div>
    </div>
    <div v-else class="place-cell place-empty"></div>

    <!-- 上排中间地点（北方） -->
    <div v-for="p in placesByDir.n" :key="p.id" class="place-cell" :class="current(p)" @click="goTo(p)">
      <div class="cell-icon">{{ placeIcon(p) }}</div>
      <div class="cell-name">{{ p.name }}</div>
    </div>

    <!-- 右上：东门 -->
    <div v-if="gates.e" class="place-cell place-gate" @click="goTo(placesById[gates.e])">
      <div class="cell-icon">➡️</div>
      <div class="cell-name">东门</div>
      <div class="cell-sub">{{ placesById[gates.e]?.name }}</div>
    </div>
    <div v-else class="place-cell place-empty"></div>

    <!-- 左列（西） -->
    <div v-for="p in placesByDir.w" :key="p.id" class="place-cell" :class="current(p)" @click="goTo(p)">
      <div class="cell-icon">{{ placeIcon(p) }}</div>
      <div class="cell-name">{{ p.name }}</div>
    </div>

    <!-- 中间：城市名 -->
    <div class="place-cell place-center">
      <div class="cell-icon">🏛️</div>
      <div class="cell-name">{{ cityName }}</div>
    </div>

    <!-- 右列（东） -->
    <div v-for="p in placesByDir.e" :key="p.id" class="place-cell" :class="current(p)" @click="goTo(p)">
      <div class="cell-icon">{{ placeIcon(p) }}</div>
      <div class="cell-name">{{ p.name }}</div>
    </div>

    <!-- 左下：西门 -->
    <div v-if="gates.w" class="place-cell place-gate" @click="goTo(placesById[gates.w])">
      <div class="cell-icon">⬅️</div>
      <div class="cell-name">西门</div>
      <div class="cell-sub">{{ placesById[gates.w]?.name }}</div>
    </div>
    <div v-else class="place-cell place-empty"></div>

    <!-- 下排中间地点（南方） -->
    <div v-for="p in placesByDir.s" :key="p.id" class="place-cell" :class="current(p)" @click="goTo(p)">
      <div class="cell-icon">{{ placeIcon(p) }}</div>
      <div class="cell-name">{{ p.name }}</div>
    </div>

    <!-- 右下：南门 -->
    <div v-if="gates.s" class="place-cell place-gate" @click="goTo(placesById[gates.s])">
      <div class="cell-icon">⬇️</div>
      <div class="cell-name">南门</div>
      <div class="cell-sub">{{ placesById[gates.s]?.name }}</div>
    </div>
    <div v-else class="place-cell place-empty"></div>
  </div>

  <div v-if="!places.length" class="card">
    <div class="empty-state">该城市暂无地点数据</div>
  </div>

  <router-link to="/map" class="btn btn-secondary btn-block mt-10">← 返回地图</router-link>
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
const places = ref([]);
const currentPlaceId = ref(0);

// Gate keywords
const GATE_KEYS = { n: ['北门','北城'], e: ['东门','东城'], s: ['南门','南城'], w: ['西门','西城'] };

function isGate(name) {
  for (const v of Object.values(GATE_KEYS)) if (v.some(k => name.includes(k))) return true;
  return false;
}

function gateDir(name) {
  if (GATE_KEYS.n.some(k => name.includes(k))) return 'n';
  if (GATE_KEYS.e.some(k => name.includes(k))) return 'e';
  if (GATE_KEYS.s.some(k => name.includes(k))) return 's';
  if (GATE_KEYS.w.some(k => name.includes(k))) return 'w';
  return null;
}

// gates { n, e, s, w } by direction keyword
const gates = computed(() => {
  const g = { n: null, e: null, s: null, w: null };
  places.value.forEach(p => {
    if (isGate(p.name)) {
      const d = gateDir(p.name);
      if (d && !g[d]) g[d] = p.id;
    }
  });
  return g;
});

// placesById for quick lookup
const placesById = computed(() => {
  const m = {};
  places.value.forEach(p => { m[p.id] = p; });
  return m;
});

// placesByDir: non-gate places grouped by inferred direction
const placesByDir = computed(() => {
  // Infer from each place's n/s/e/w connections to gates
  const result = { n: [], e: [], s: [], w: [], center: [] };
  const gateSet = new Set(Object.values(gates.value).filter(Boolean));

  places.value.forEach(p => {
    if (gateSet.has(p.id)) return; // skip gates
    // Count how many connections point toward each direction
    // A place with n>0 that connects to a gate is "north"
    // Use the place's own n/s/e/w to classify
    let placed = false;
    if (p.n > 0 && gateSet.has(p.n)) { result.n.push(p); placed = true; }
    else if (p.s > 0 && gateSet.has(p.s)) { result.s.push(p); placed = true; }
    else if (p.e > 0 && gateSet.has(p.e)) { result.e.push(p); placed = true; }
    else if (p.w > 0 && gateSet.has(p.w)) { result.w.push(p); placed = true; }
    if (!placed) result.center.push(p);
  });
  return result;
});

function placeIcon(p) {
  if (p.type === 1) return '⚓';
  if (p.type === 2) return '🏪';
  if (p.type === 3) return '⚒️';
  if (p.type === 4) return '🍷';
  if (p.type === 5) return '🏪';
  return '📍';
}

function current(p) {
  return p.id === currentPlaceId.value ? 'place-current' : '';
}

async function goTo(p) {
  if (!p || p.id === currentPlaceId.value) return;
  try {
    await Api.post('/user/teleport', { place_id: p.id });
    userStore.updateUser({ ...userStore.user, place_id: p.id });
    router.push('/map');
  } catch (e) {}
}

async function load() {
  try {
    const d = await Api.get(`/user/citymap/${route.params.cityId || ''}`);
    cityName.value = d.city?.name || '城内地图';
    currentPlaceId.value = d.currentPlaceId || 0;
    places.value = d.places || [];
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

.place-grid {
  display: grid;
  grid-template-columns: 80px repeat(3, 1fr) 80px;
  grid-template-rows: 56px repeat(3, 1fr) 56px;
  gap: 4px;
  flex: 1;
}

.place-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #1a2230;
  border: 1.5px solid #2a3a2a;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  gap: 2px;
  padding: 4px;
  min-width: 0;
  min-height: 0;
}
.place-cell:active:not(.place-center):not(.place-empty) {
  border-color: #c9a758;
  background: #1f2a1e;
  transform: scale(0.97);
}
.place-cell.place-empty {
  background: transparent;
  border: none;
  cursor: default;
}
.place-cell.place-center {
  background: radial-gradient(ellipse at center, #1e2a3a 0%, #141e2a 100%);
  border-color: #3a4a2a;
  cursor: default;
}
.place-cell.place-gate {
  border-color: #3a5a2a;
  background: #1a2a1e;
}
.place-cell.place-current {
  border-color: #c9a758 !important;
  background: #1f2a1e !important;
}
.cell-icon { font-size: 22px; line-height: 1; }
.cell-name { font-size: 10px; color: #cfc19e; text-align: center; font-weight: 600; line-height: 1.2; }
.cell-sub { font-size: 8px; color: #8b784e; text-align: center; }
</style>

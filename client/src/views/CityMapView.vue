<template>
<div class="citymap-page">
  <div class="location-bar">
    <div class="location-name">🗺️ {{ cityName }}</div>
    <div class="location-path">{{ gridPlaces.length }}个地点 · 5×5网格</div>
  </div>

  <!-- 棋盘网格：7x7，城门四角，核心地点填中间 -->
  <div class="place-grid" v-if="gridPlaces.length">
    <template v-for="row in 7" :key="row">
      <template v-for="col in 7" :key="col">
        <div
          v-if="getCell(row-1, col-1)"
          class="place-cell"
          :class="[getCell(row-1, col-1).type === 5 ? 'place-gate' : '', current(getCell(row-1, col-1))]"
          @click="goTo(getCell(row-1, col-1))"
        >
          <div class="cell-icon">{{ placeIcon(getCell(row-1, col-1)) }}</div>
          <div class="cell-name">{{ shortName(getCell(row-1, col-1).name) }}</div>
        </div>
        <div v-else class="place-cell place-empty"></div>
      </template>
    </template>
  </div>

  <div v-if="!gridPlaces.length" class="card">
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

// 所有有坐标的地点
const gridPlaces = computed(() => places.value.filter(p => p.pos_row != null && p.pos_col != null));

// 按坐标查找地点
const placeMap = computed(() => {
  const m = {};
  gridPlaces.value.forEach(p => {
    m[`${p.pos_row},${p.pos_col}`] = p;
  });
  return m;
});

function getCell(row, col) {
  return placeMap.value[`${row},${col}`] || null;
}

function shortName(name) {
  if (!name) return '';
  // 去掉城市前缀
  return name.replace(/^(威尼斯|雅典|杭州|京都|长安|马六甲|广州|泉州|扬州|奥斯陆|伦敦|汉堡|爱丁堡|新大陆港|荷姆兹|亚丁|孟买|锡兰|亚特兰蒂斯|达喀尔|圣乔治|开普敦|蒙巴萨|马达加斯加|莫桑比克|卢旺达|北海|伊斯坦布尔|拉古扎|突尼斯|阿尔及尔|马塞|南特|阿姆斯特丹|哥本哈根|大阪)\s*/, '');
}

function placeIcon(p) {
  if (!p) return '📍';
  if (p.type === 1) return '⚓';
  if (p.type === 2) return '🏪';
  if (p.type === 3) return '⚒️';
  if (p.type === 4) return '🍷';
  if (p.type === 5) {
    // 城门根据位置显示方向
    const r = p.pos_row, c = p.pos_col;
    if (r === 0) return '⬆️';
    if (r === 6) return '⬇️';
    if (c === 0) return '⬅️';
    if (c === 6) return '➡️';
    return '🚪';
  }
  return '📍';
}

function current(p) {
  return p && p.id === currentPlaceId.value ? 'place-current' : '';
}

function gateDirection(p) {
  // 基于pos_row/pos_col判断城门朝向（相对于城市中心3,3）
  const r = p.pos_row, c = p.pos_col;
  if (r <= 0) return 'n';
  if (r >= 6) return 's';
  if (c <= 0) return 'w';
  if (c >= 6) return 'e';
  return 'e'; // 默认东
}

async function goTo(p) {
  if (!p || p.id === currentPlaceId.value) return;
  // 城门(type=5)点击进入野外
  if (p.type === 5) {
    const dir = gateDirection(p);
    router.push(`/wild/${route.params.cityId}?dir=${dir}`);
    return;
  }
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
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: repeat(7, 56px);
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
  overflow: hidden;
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
.place-cell.place-gate {
  border-color: #3a5a2a;
  background: #1a2a1e;
}
.place-cell.place-current {
  border-color: #c9a758 !important;
  background: #1f2a1e !important;
}
.cell-icon { font-size: 20px; line-height: 1; }
.cell-name {
  font-size: 10px;
  color: #8b9a7c;
  text-align: center;
  line-height: 1.2;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

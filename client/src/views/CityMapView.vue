<template>
  <div class="citymap-page">
    <div class="citymap-bg"></div>

    <!-- 顶部 HUD -->
    <div class="top-hud">
      <div class="hud-left">
        <div class="hud-icon">🗺️</div>
        <div class="hud-title">{{ cityName }}</div>
      </div>
      <div class="hud-info">{{ gridPlaces.length }} 个地点</div>
    </div>

    <!-- 棋盘网格：7×7，城门四角，核心地点填中间 -->
    <div class="grid-wrap" v-if="gridPlaces.length">
      <div class="place-grid">
        <template v-for="row in 7" :key="row">
          <template v-for="col in 7" :key="col">
            <div
              v-if="getCell(row - 1, col - 1)"
              class="place-cell"
              :class="[
                getCell(row - 1, col - 1).type === 5 ? 'place-gate' : '',
                current(getCell(row - 1, col - 1)) ? 'place-current' : ''
              ]"
              @click="goTo(getCell(row - 1, col - 1))"
            >
              <div class="cell-icon">{{ placeIcon(getCell(row - 1, col - 1)) }}</div>
              <div class="cell-name">{{ shortName(getCell(row - 1, col - 1).name) }}</div>
            </div>
            <div v-else class="place-cell place-empty"></div>
          </template>
        </template>
      </div>
    </div>

    <div class="empty-card" v-if="!gridPlaces.length">
      <div class="empty-icon">🏛️</div>
      <div class="empty-text">该城市暂无地点数据</div>
    </div>

    <router-link to="/map" class="back-btn">← 返回地图</router-link>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Api } from '../composables/useApi';
import { useUserStore } from '../stores/user';
import { useGameStore } from '../stores/game';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const gameStore = useGameStore();
const cityName = ref('');
const places = ref([]);
const currentPlaceId = ref(0);

const gridPlaces = computed(() => places.value.filter(p => p.pos_row != null && p.pos_col != null));

const placeMap = computed(() => {
  const m = {};
  gridPlaces.value.forEach(p => { m[`${p.pos_row},${p.pos_col}`] = p; });
  return m;
});

function getCell(row, col) { return placeMap.value[`${row},${col}`] || null; }

function shortName(name) {
  if (!name) return '';
  return name.replace(/^(威尼斯|雅典|杭州|京都|长安|马六甲|广州|泉州|扬州|奥斯陆|伦敦|汉堡|爱丁堡|新大陆港|荷姆兹|亚丁|孟买|锡兰|亚特兰蒂斯|达喀尔|圣乔治|开普敦|蒙巴萨|马达加斯加|莫桑比克|卢旺达|北海|伊斯坦布尔|拉古扎|突尼斯|阿尔及尔|马塞|南特|阿姆斯特丹|哥本哈根|大阪)\s*/, '');
}

function placeIcon(p) {
  if (!p) return '📍';
  if (p.type === 1) return '⚓';
  if (p.type === 2) return '🏪';
  if (p.type === 3) return '⚒️';
  if (p.type === 4) return '🍷';
  if (p.type === 5) {
    const r = p.pos_row, c = p.pos_col;
    if (r === 0) return '⬆️';
    if (r === 6) return '⬇️';
    if (c === 0) return '⬅️';
    if (c === 6) return '➡️';
    return '🚪';
  }
  return '📍';
}

function current(p) { return p && p.id === currentPlaceId.value; }

function gateDirection(p) {
  const r = p.pos_row, c = p.pos_col;
  if (r <= 0) return 'n';
  if (r >= 6) return 's';
  if (c <= 0) return 'w';
  if (c >= 6) return 'e';
  return 'e';
}

async function goTo(p) {
  if (!p || p.id === currentPlaceId.value) return;
  if (p.type === 5) {
    const dir = gateDirection(p);
    router.push(`/wild/${route.params.cityId}?dir=${dir}`);
    return;
  }
  try {
    const d = await Api.get(`/npc/place/${p.id}`);
    if (d.npcs && d.npcs.length > 0) {
      gameStore.showNpcDialog(d.npcs[0].id, p.name);
      return;
    }
  } catch (e) {}
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
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 10px;
  min-height: 100%;
  overflow-y: auto;
}

.citymap-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  background: linear-gradient(160deg, #0d1117 0%, #0a1628 50%, #0d1117 100%);
  pointer-events: none;
}

.top-hud {
  position: relative;
  z-index: 2;
  background: rgba(13, 17, 23, 0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.hud-left { display: flex; align-items: center; gap: 8px; }
.hud-icon { font-size: 20px; }
.hud-title { font-size: 16px; font-weight: 700; color: #f0f0f0; }
.hud-info { font-size: 11px; color: #7f8c8d; background: rgba(255,255,255,0.06); padding: 2px 10px; border-radius: 10px; }

.grid-wrap {
  position: relative;
  z-index: 2;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 10px;
}

.place-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: repeat(7, 52px);
  gap: 4px;
}

.place-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  background: rgba(255, 255, 255, 0.04);
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 4px;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.place-cell:active:not(.place-empty) {
  border-color: #c9a758;
  background: rgba(201, 165, 88, 0.1);
  transform: scale(0.96);
}
.place-cell.place-empty {
  background: transparent;
  border: none;
  cursor: default;
}
.place-cell.place-gate {
  border-color: rgba(63, 106, 74, 0.4);
  background: rgba(63, 106, 74, 0.08);
}
.place-cell.place-gate:hover {
  border-color: rgba(63, 106, 74, 0.7);
  background: rgba(63, 106, 74, 0.15);
}
.place-cell.place-current {
  border-color: #c9a758 !important;
  background: rgba(201, 165, 88, 0.12) !important;
  box-shadow: 0 0 12px rgba(201, 165, 88, 0.2);
}
.cell-icon { font-size: 18px; line-height: 1; }
.cell-name {
  font-size: 9px;
  color: #8b9a7c;
  text-align: center;
  line-height: 1.2;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-card {
  position: relative;
  z-index: 2;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.empty-icon { font-size: 32px; }
.empty-text { font-size: 12px; color: #7f8c8d; }

.back-btn {
  position: relative;
  z-index: 2;
  display: block;
  text-align: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #95a5a6;
  padding: 10px;
  border-radius: 10px;
  font-size: 13px;
  text-decoration: none;
  transition: all 0.2s;
}
.back-btn:hover { background: rgba(255, 255, 255, 0.08); color: #bdc3c7; }
</style>
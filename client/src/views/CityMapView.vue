<template>
  <div class="page-wrap citymap-page">

  <div class="page-hud"><div class="page-hud-title">🗺️ 城市地图</div></div>
    <!-- 顶部位置信息栏 -->
    <div class="top-hud">
      <div class="hud-left">
        <a href="javascript:void(0)" @click.prevent="$router.back()" class="hud-back">←</a>
        <div class="hud-icon">🗺️</div>
        <div class="hud-title">{{ cityName }}</div>
      </div>
    </div>

    <!-- 角色状态条 -->
    <div class="status-bar">
      <div class="sb-user">
        <span class="sb-name">{{ userStore.user?.username }}</span>
        <span class="sb-lv">Lv.{{ userStore.user?.level }}</span>
      </div>
      <div class="sb-bars">
        <div class="sb-item">
          <span class="sb-icon">❤️</span>
          <div class="sb-bar-wrap"><div class="sb-bar sb-hp" :style="{width: hpPct+'%'}"></div></div>
          <span class="sb-val">{{ userStore.user?.hp }}/{{ userStore.user?.hp_max }}</span>
        </div>
        <div class="sb-item">
          <span class="sb-icon">⭐</span>
          <div class="sb-bar-wrap"><div class="sb-bar sb-exp" :style="{width: expPct+'%'}"></div></div>
          <span class="sb-val">{{ userStore.user?.exp }}/{{ userStore.user?.exp_max }}</span>
        </div>
      </div>
      <div class="sb-money">
        <span class="sb-icon">💰</span>
        <span class="sb-money-val">{{ formatMoney(userStore.user?.money) }}</span>
      </div>
    </div>

    <!-- 当前地点信息条 -->
    <div class="current-bar" v-if="currentPlace">
      <div class="cb-icon">{{ placeEmoji(currentPlace) }}</div>
      <div class="cb-info">
        <div class="cb-name">{{ currentPlace.name }}</div>
        <div class="cb-desc">{{ currentPlace.description || '——' }}</div>
      </div>
    </div>

    <!-- 2D 网格地图：使用新 grid 端点，含 NPC + 邻接 -->
    <div class="grid-wrap" v-if="grid && grid.places.length">
      <div class="map2d-hud">
        <div class="m2d-title">🗺️ {{ grid.places.length }} 地点 · {{ grid.rows }}×{{ grid.cols }} 网格</div>
        <button class="m2d-refresh" @click="load" title="刷新">🔄</button>
      </div>
      <div class="map2d-canvas">
        <div class="map2d-grid" :style="{gridTemplateColumns: `repeat(${grid.cols}, 1fr)`, gridTemplateRows: `repeat(${grid.rows}, 1fr)`}">
          <div
            v-for="cell in gridCells"
            :key="cell.key"
            class="m2d-cell"
            :class="{
              'm2d-current': cell.place && cell.place.id === currentPlaceId,
              'm2d-npc': cell.place && cell.place.npcs && cell.place.npcs.length,
              'm2d-market': cell.place && cell.place.is_market,
              'm2d-empty': !cell.place,
              'm2d-gate': cell.place && cell.place.type === 5,
              'm2d-temple': cell.place && cell.place.type === 4,
              'm2d-shop': cell.place && cell.place.type === 2,
              'm2d-animating': animating && cell.place && cell.place.id === currentPlaceId,
              'm2d-adjacent': cell.place && isAdjacent(cell.place)
            }"
            @click="onCellClick(cell)"
          >
            <template v-if="cell.place">
              <div class="m2d-icon">{{ placeEmoji(cell.place) }}</div>
              <div class="m2d-name">{{ shortName(cell.place.name) }}</div>
              <div v-if="cell.place.npcs && cell.place.npcs.length" class="m2d-npc-badge">👤{{ cell.place.npcs.length }}</div>
              <div v-if="cell.place.id === currentPlaceId" class="m2d-player">🚶</div>
            </template>
            <template v-else>
              <div class="m2d-grass">🌿</div>
            </template>
          </div>
        </div>
      </div>
      <!-- 方向控制 -->
      <div class="map2d-controls">
        <button class="m2d-arrow m2d-up" @click="move('n')" :disabled="!canMove('n') || animating" title="北">⬆️</button>
        <button class="m2d-arrow m2d-left" @click="move('w')" :disabled="!canMove('w') || animating" title="西">⬅️</button>
        <button class="m2d-arrow m2d-right" @click="move('e')" :disabled="!canMove('e') || animating" title="东">➡️</button>
        <button class="m2d-arrow m2d-down" @click="move('s')" :disabled="!canMove('s') || animating" title="南">⬇️</button>
      </div>
      <div class="move-error-msg" v-if="moveError">⚠️ {{ moveError }}</div>
    </div>

    <div v-else-if="loading" class="empty-card">
      <div class="loading-spinner"></div>
      <div class="empty-text">加载 2D 地图中...</div>
    </div>

    <div v-else class="empty-card">
      <div class="empty-icon">🏛️</div>
      <div class="empty-text">该城市暂无地点数据</div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Api } from '../composables/useApi';
import { formatMoney } from '../utils/formatters';
import { useUserStore } from '../stores/user';
import { useGameStore } from '../stores/game';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const gameStore = useGameStore();
const cityName = ref('');
const grid = ref(null);
const currentPlace = ref(null);
const currentPlaceId = ref(0);
const loading = ref(true);
const animating = ref(false);
const moveError = ref('');

const hpPct = computed(() => {
  const u = userStore.user;
  return u?.hp_max > 0 ? Math.round(u.hp / u.hp_max * 100) : 0;
});
const expPct = computed(() => {
  const u = userStore.user;
  return u?.exp_max > 0 ? Math.round(u.exp / u.exp_max * 100) : 0;
});

// 2D 网格 cells（包含空地）
const gridCells = computed(() => {
  if (!grid.value) return [];
  const cells = [];
  for (let r = 0; r < grid.value.rows; r++) {
    for (let c = 0; c < grid.value.cols; c++) {
      const place = grid.value.places.find(p => p.pos_row === r && p.pos_col === c);
      cells.push({ key: `${r}-${c}`, row: r, col: c, place });
    }
  }
  return cells;
});

function shortName(name) {
  if (!name) return '';
  return name.replace(/^(威尼斯|雅典|杭州|京都|长安|马六甲|广州|泉州|扬州|奥斯陆|伦敦|汉堡|爱丁堡|新大陆港|荷姆兹|亚丁|孟买|锡兰|亚特兰蒂斯|达喀尔|圣乔治|开普敦|蒙巴萨|马达加斯加|莫桑比克|卢旺达|北海|伊斯坦布尔|拉古扎|突尼斯|阿尔及尔|马塞|南特|阿姆斯特丹|哥本哈根|大阪)\s*/, '');
}

const PLACE_EMOJI = { 0: '🏛️', 1: '⚓', 2: '🏪', 3: '⚒️', 4: '🏨', 5: '🚪', 6: '🏝️' };
function placeEmoji(p) {
  if (!p) return '📍';
  if (p.is_market) return '🛒';
  if (p.type === 5) {
    const r = p.pos_row, c = p.pos_col;
    if (r === 0) return '⬆️';
    if (r === (grid.value?.rows || 7) - 1) return '⬇️';
    if (c === 0) return '⬅️';
    if (c === (grid.value?.cols || 7) - 1) return '➡️';
  }
  return PLACE_EMOJI[p.type] || '📍';
}

function canMove(dir) {
  if (!currentPlace.value) return false;
  return currentPlace.value[dir] > 0;
}

function isAdjacent(p) {
  if (!currentPlace.value) return false;
  return ['n', 's', 'e', 'w'].some(dir => currentPlace.value[dir] === p.id);
}

function onCellClick(cell) {
  if (!cell.place || animating.value) return;
  if (cell.place.id === currentPlaceId.value) return;
  // 城门 → 跳 WildMap
  if (cell.place.type === 5) {
    const r = cell.place.pos_row, c = cell.place.pos_col;
    const dir = r === 0 ? 'n' : r === (grid.value.rows - 1) ? 's' : c === 0 ? 'w' : c === (grid.value.cols - 1) ? 'e' : 'n';
    router.push(`/wild/${grid.value.city_id}?dir=${dir}`);
    return;
  }
  // 邻接 → 移动
  const cur = currentPlace.value;
  if (cur.n === cell.place.id) return move('n');
  if (cur.s === cell.place.id) return move('s');
  if (cur.e === cell.place.id) return move('e');
  if (cur.w === cell.place.id) return move('w');
  // 不直接相邻 → teleport（保留原行为）
  if (confirm(`直接传送到「${cell.place.name}」？`)) {
    teleportTo(cell.place);
  }
}

async function move(dir) {
  if (animating.value) return;
  moveError.value = '';
  animating.value = true;
  try {
    const data = await Api.post('/map/move', { dir });
    currentPlace.value = data.place;
    currentPlaceId.value = data.place.id;
    if (grid.value) grid.value.currentPlaceId = data.place.id;
    userStore.updateUser({ ...userStore.user, place_id: data.place.id });
    setTimeout(() => { animating.value = false }, 350);
  } catch (e) {
    moveError.value = e.message;
    animating.value = false;
  }
}

async function teleportTo(p) {
  try {
    await Api.post('/user/teleport', { place_id: p.id });
    userStore.updateUser({ ...userStore.user, place_id: p.id });
    currentPlaceId.value = p.id;
    if (grid.value) grid.value.currentPlaceId = p.id;
    // 重新加载当前 place 信息
    const sc = await Api.get('/map/scene');
    currentPlace.value = sc.place;
  } catch (e) {
    alert('传送失败: ' + e.message);
  }
}

async function load() {
  loading.value = true;
  try {
    // 1. 拿当前 place_id
    const me = await Api.get('/auth/me');
    const placeId = me.user.place_id;
    // 2. 拿 city_id
    const r = await Api.get(`/user/citymap/${route.params.cityId || ''}`);
    cityName.value = r.city?.name || '城内地图';
    currentPlaceId.value = placeId;
    const cityId = r.city?.id || r.places?.[0]?.city_id || route.params.cityId;
    // 3. 加载 2D 网格（含 NPC + 邻接）
    const gd = await Api.get(`/api/map/grid?city_id=${cityId}`);
    grid.value = gd.data;
    grid.value.currentPlaceId = placeId;
    // 4. 拿当前 place 详情（邻接用）
    const sc = await Api.get('/map/scene');
    currentPlace.value = sc.place;
  } catch (e) {
    console.error('CityMapView load failed:', e);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.citymap-page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 10px;
  min-height: 100%;
  overflow-y: auto;
}

/* 顶部位置栏 */
.top-hud {
  position: relative;
  z-index: 2;
  background: rgba(13, 17, 23, 0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 10px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.hud-left { display: flex; align-items: center; gap: 8px; }
.hud-back {
  font-size: 18px; color: #bdc3c7; text-decoration: none;
  padding: 2px 6px; border-radius: 6px; transition: all 0.2s;
}
.hud-back:hover { background: rgba(255,255,255,0.08); color: #f0f0f0; }
.hud-icon { font-size: 18px; }
.hud-title { font-size: 14px; font-weight: 700; color: #f0f0f0; }

/* 状态条 */
.status-bar {
  position: relative;
  z-index: 2;
  background: rgba(13, 17, 23, 0.88);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.sb-user { display: flex; flex-direction: column; gap: 2px; min-width: 60px; }
.sb-name { font-size: 12px; font-weight: 700; color: #f0f0f0; }
.sb-lv { font-size: 10px; color: #c9a758; font-weight: 600; }
.sb-bars { flex: 1; display: flex; flex-direction: column; gap: 5px; }
.sb-item { display: flex; align-items: center; gap: 5px; }
.sb-icon { font-size: 11px; width: 14px; text-align: center; }
.sb-bar-wrap { flex: 1; height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; }
.sb-bar { height: 100%; border-radius: 2px; transition: width 0.4s ease; }
.sb-hp { background: linear-gradient(90deg, #c0392b, #e74c3c); }
.sb-exp { background: linear-gradient(90deg, #1a7a3a, #27ae60); }
.sb-val { font-size: 9px; color: #95a5a6; width: 48px; text-align: right; white-space: nowrap; }
.sb-money { display: flex; align-items: center; gap: 4px; }
.sb-money-val { font-size: 13px; font-weight: 700; color: #f1c40f; }

/* 当前地点信息条 */
.current-bar {
  position: relative; z-index: 2;
  display: flex; align-items: center; gap: 10px;
  background: linear-gradient(135deg, rgba(201,167,88,0.15), rgba(139,120,78,0.08));
  border: 1px solid rgba(201,167,88,0.3);
  border-radius: 12px;
  padding: 8px 12px;
}
.cb-icon { font-size: 22px; }
.cb-info { flex: 1; }
.cb-name { font-size: 13px; font-weight: 700; color: #f0f0f0; }
.cb-desc { font-size: 10px; color: #8b9a7c; margin-top: 1px; }

/* ===== 2D 网格地图 ===== */
.grid-wrap {
  position: relative; z-index: 2;
  background: linear-gradient(135deg, rgba(63,106,74,0.08), rgba(46,90,59,0.05));
  border: 1px solid rgba(201,167,88,0.2);
  border-radius: 14px;
  padding: 10px;
}
.map2d-hud {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 8px; padding: 0 4px;
}
.m2d-title { font-size: 11px; color: #c9a758; font-weight: 600; }
.m2d-refresh {
  background: rgba(201,167,88,0.1); border: 1px solid rgba(201,167,88,0.3);
  border-radius: 6px; padding: 4px 8px; color: #c9a758; font-size: 12px;
  cursor: pointer; transition: all 0.2s;
}
.m2d-refresh:hover { background: rgba(201,167,88,0.2); transform: rotate(180deg); }
.map2d-canvas {
  display: flex; justify-content: center;
  background: linear-gradient(180deg, #2a3a2a 0%, #1a2a1a 100%);
  border-radius: 8px; padding: 6px;
  overflow-x: auto;
}
.map2d-grid {
  display: grid; gap: 3px;
  width: 100%; max-width: 420px;
  aspect-ratio: 1 / 1;
}
.m2d-cell {
  position: relative;
  background: rgba(63,106,74,0.15);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 5px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 36px; min-width: 36px;
  padding: 2px;
  overflow: hidden;
}
.m2d-cell:hover { background: rgba(201,167,88,0.2); transform: scale(1.05); z-index: 1; }
.m2d-empty { background: rgba(63,106,74,0.04); border-style: dashed; cursor: default; }
.m2d-empty:hover { background: rgba(63,106,74,0.04); transform: none; }
.m2d-adjacent { border-color: rgba(201,167,88,0.4); box-shadow: inset 0 0 6px rgba(201,167,88,0.2); }
.m2d-current {
  background: linear-gradient(135deg, #c9a758, #8b784e) !important;
  border-color: #fff !important;
  box-shadow: 0 0 12px rgba(201,167,88,0.6);
  animation: m2d-pulse 1.5s infinite;
}
.m2d-current .m2d-name { color: #fff; font-weight: 700; }
@keyframes m2d-pulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 12px rgba(201,167,88,0.6); }
  50% { transform: scale(1.04); box-shadow: 0 0 18px rgba(201,167,88,0.9); }
}
.m2d-npc { background: rgba(169,119,78,0.15); border-color: rgba(169,119,78,0.4); }
.m2d-market { background: rgba(192,80,77,0.15); border-color: rgba(192,80,77,0.4); }
.m2d-gate { background: rgba(46,90,59,0.2); border-color: rgba(46,90,59,0.5); }
.m2d-temple { background: rgba(155,89,182,0.15); border-color: rgba(155,89,182,0.4); }
.m2d-shop { background: rgba(169,119,78,0.18); border-color: rgba(169,119,78,0.45); }
.m2d-icon { font-size: 18px; line-height: 1; }
.m2d-name {
  font-size: 9px; color: #cfc19e; text-align: center;
  margin-top: 1px; line-height: 1.1;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
}
.m2d-npc-badge {
  position: absolute; top: 1px; right: 1px;
  background: #2e5a3b; color: #fff;
  font-size: 8px; padding: 1px 3px; border-radius: 3px;
}
.m2d-player {
  position: absolute; bottom: -2px; right: -2px;
  font-size: 12px;
  animation: m2d-walk 0.4s ease-out;
}
@keyframes m2d-walk {
  0% { transform: scale(0.5) translateY(-8px); opacity: 0; }
  50% { transform: scale(1.2) translateY(-2px); }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}
.m2d-animating { animation: m2d-bounce 0.35s ease-out !important; }
@keyframes m2d-bounce {
  0% { transform: scale(1); }
  30% { transform: scale(1.15); }
  60% { transform: scale(0.95); }
  100% { transform: scale(1); }
}
.m2d-grass { font-size: 14px; opacity: 0.3; }
.map2d-controls {
  display: grid;
  grid-template-columns: repeat(3, 36px);
  grid-template-rows: repeat(3, 36px);
  gap: 4px;
  justify-content: center;
  margin-top: 10px;
}
.m2d-arrow {
  background: rgba(63,106,74,0.3);
  border: 1px solid rgba(201,167,88,0.4);
  border-radius: 6px;
  color: #c9a758;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}
.m2d-arrow:hover:not(:disabled) {
  background: rgba(201,167,88,0.3);
  transform: scale(1.1);
}
.m2d-arrow:disabled { opacity: 0.25; cursor: not-allowed; }
.m2d-up { grid-column: 2; grid-row: 1; }
.m2d-left { grid-column: 1; grid-row: 2; }
.m2d-right { grid-column: 3; grid-row: 2; }
.m2d-down { grid-column: 2; grid-row: 3; }
.move-error-msg { font-size: 10px; color: #e74c3c; text-align: center; margin-top: 4px; }
.loading-spinner {
  width: 24px; height: 24px; border: 2px solid rgba(201,167,88,0.2);
  border-top-color: #c9a758; border-radius: 50%;
  animation: spin 0.8s linear infinite; margin: 0 auto 8px;
}
@keyframes spin { to { transform: rotate(360deg); } }

.empty-card {
  position: relative; z-index: 2;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px; padding: 30px;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
.empty-icon { font-size: 32px; }
.empty-text { font-size: 12px; color: #7f8c8d; }
</style>

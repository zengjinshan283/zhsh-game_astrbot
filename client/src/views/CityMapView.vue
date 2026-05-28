<template>
  <div class="citymap-page">
    <div class="citymap-bg"></div>

    <!-- 顶部位置信息栏（参考沧澜四海） -->
    <div class="top-hud">
      <div class="hud-left">
        <div class="hud-icon">🗺️</div>
        <div class="hud-title">{{ cityName }}</div>
      </div>
      <div class="hud-actions">
        <a href="javascript:void(0)" @click.prevent="refreshPlace" class="hud-act">刷新</a>
        <a href="javascript:void(0)" @click.prevent="goQuest" class="hud-act">任务</a>
        <a href="javascript:void(0)" @click.prevent="goMall" class="hud-act">商城</a>
        <a href="javascript:void(0)" @click.prevent="goSign" class="hud-act hud-red">签到</a>
        <a href="javascript:void(0)" @click.prevent="showMenu = true" class="hud-act">☰</a>
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

    <!-- 底部更多菜单弹窗 -->
    <div v-if="showMenu" class="menu-overlay" @click.self="showMenu = false">
      <div class="menu-card">
        <button class="menu-close" @click="showMenu = false">✕</button>
        <div class="menu-title">📋 功能菜单</div>
        <div class="menu-list">
          <router-link to="/status" class="menu-item" @click="showMenu=false">👤 状态</router-link>
          <router-link to="/equipment" class="menu-item" @click="showMenu=false">⚔️ 装备</router-link>
          <router-link to="/inventory" class="menu-item" @click="showMenu=false">🎒 背包</router-link>
          <router-link to="/quest" class="menu-item" @click="showMenu=false">📋 任务</router-link>
          <router-link to="/friend" class="menu-item" @click="showMenu=false">👥 好友</router-link>
          <router-link to="/pet" class="menu-item" @click="showMenu=false">🐶 宠物</router-link>
          <router-link to="/rank" class="menu-item" @click="showMenu=false">🏆 排行</router-link>
          <router-link to="/arena" class="menu-item" @click="showMenu=false">⚔️ 竞技场</router-link>
          <router-link to="/guild" class="menu-item" @click="showMenu=false">🏴 帮会</router-link>
          <router-link to="/welfare" class="menu-item" @click="showMenu=false">🎁 福利</router-link>
          <router-link to="/daily" class="menu-item" @click="showMenu=false">📅 每日</router-link>
          <router-link to="/mall" class="menu-item" @click="showMenu=false">🛒 商城</router-link>
          <router-link to="/codex" class="menu-item" @click="showMenu=false">📜 图鉴</router-link>
          <router-link to="/dungeon" class="menu-item" @click="showMenu=false">🏔️ 副本</router-link>
          <router-link to="/vip" class="menu-item" @click="showMenu=false">👑 月卡</router-link>
          <router-link to="/fishing" class="menu-item" @click="showMenu=false">🎣 钓鱼</router-link>
          <router-link to="/chat" class="menu-item" @click="showMenu=false">💬 聊天</router-link>
          <a href="javascript:void(0)" class="menu-item logout-item" @click="doLogout">🚪 退出登录</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Api } from '../composables/useApi';
import { useUserStore } from '../stores/user';
import { useGameStore } from '../stores/game';
import { globalAlert } from '../composables/useConfirm';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const gameStore = useGameStore();
const cityName = ref('');
const places = ref([]);
const currentPlaceId = ref(0);
const showMenu = ref(false);

const hpPct = computed(() => {
  const u = userStore.user;
  return u?.hp_max > 0 ? Math.round(u.hp / u.hp_max * 100) : 0;
});
const expPct = computed(() => {
  const u = userStore.user;
  return u?.exp_max > 0 ? Math.round(u.exp / u.exp_max * 100) : 0;
});
function formatMoney(n) {
  if (!n) return '0';
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿';
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  return n.toLocaleString();
}

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
    // HomeView onMounted 会自动刷新 scene
    router.push('/home');
  } catch (e) {}
}

async function refreshPlace() {
  await load();
  await globalAlert('刷新成功');
}

function goQuest() { router.push('/quest'); }
function goMall() { router.push('/mall'); }
async function goSign() {
  try {
    const d = await Api.get('/sign/status');
    if (d.signed) { await globalAlert('今日已签到！'); }
    else { router.push('/sign'); }
  } catch { router.push('/sign'); }
}

async function doLogout() {
  showMenu.value = false;
  userStore.logout();
  router.push('/login');
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
  gap: 8px;
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
.hud-icon { font-size: 18px; }
.hud-title { font-size: 14px; font-weight: 700; color: #f0f0f0; }
.hud-actions { display: flex; align-items: center; gap: 2px; }
.hud-act {
  font-size: 11px; font-weight: 600; color: #bdc3c7;
  text-decoration: none; padding: 3px 7px;
  border-radius: 6px; transition: all 0.2s;
}
.hud-act:hover { background: rgba(255,255,255,0.08); color: #f0f0f0; }
.hud-red { color: #e74c3c; }
.hud-red:hover { background: rgba(231,76,60,0.1); color: #e74c3c; }

/* 状态条 */
.status-bar {
  position: relative;
  z-index: 2;
  background: rgba(13, 17, 23, 0.88);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.08);
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

/* 网格 */
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
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 2px;
  background: rgba(255, 255, 255, 0.04);
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px; cursor: pointer;
  transition: all 0.2s ease; padding: 4px;
  min-width: 0; min-height: 0; overflow: hidden;
}
.place-cell:active:not(.place-empty) {
  border-color: #c9a758; background: rgba(201, 165, 88, 0.1);
  transform: scale(0.96);
}
.place-cell.place-empty { background: transparent; border: none; cursor: default; }
.place-cell.place-gate { border-color: rgba(63, 106, 74, 0.4); background: rgba(63, 106, 74, 0.08); }
.place-cell.place-gate:hover { border-color: rgba(63, 106, 74, 0.7); background: rgba(63, 106, 74, 0.15); }
.place-cell.place-current { border-color: #c9a758 !important; background: rgba(201, 165, 88, 0.12) !important; box-shadow: 0 0 12px rgba(201, 165, 88, 0.2); }
.cell-icon { font-size: 18px; line-height: 1; }
.cell-name { font-size: 9px; color: #8b9a7c; text-align: center; line-height: 1.2; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.empty-card {
  position: relative; z-index: 2;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px; padding: 30px;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
.empty-icon { font-size: 32px; }
.empty-text { font-size: 12px; color: #7f8c8d; }

/* 菜单弹窗 */
.menu-overlay {
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
  display: flex; align-items: flex-end; justify-content: center;
}
.menu-card {
  position: relative;
  background: rgba(20, 25, 35, 0.97); backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 18px 18px 0 0; padding: 16px 16px 32px;
  width: 100%; max-width: 420px;
  display: flex; flex-direction: column; gap: 10px;
}
.menu-title { font-size: 13px; font-weight: 700; color: #c9a758; padding-left: 4px; }
.menu-list { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.menu-item {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; padding: 10px 4px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px; text-decoration: none; cursor: pointer;
  font-size: 11px; color: #bdc3c7; font-weight: 600;
  transition: all 0.2s;
}
.menu-item:hover { background: rgba(255,255,255,0.09); transform: translateY(-1px); }
.menu-item:active { transform: scale(0.97); }
.menu-item.logout-item { border-color: rgba(231,76,60,0.3); color: #e74c3c; }
.menu-item.logout-item:hover { background: rgba(231,76,60,0.1); }
.menu-close {
  position: absolute; top: 14px; right: 16px;
  background: rgba(255,255,255,0.06); border: none;
  color: #7f8c8d; width: 28px; height: 28px;
  border-radius: 50%; font-size: 14px; cursor: pointer;
  transition: all 0.2s;
}
.menu-close:hover { background: rgba(255,255,255,0.12); color: #f0f0f0; }

@media (max-width: 400px) {
  .menu-list { grid-template-columns: repeat(3, 1fr); }
}
</style>
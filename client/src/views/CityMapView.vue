<template>
<div class="citymap-page">
  <div class="location-bar">
    <div class="location-name">🗺️ {{ city?.name }} - 城内地图</div>
    <div class="location-path">点击地点可快速传送 · 点击建筑可查看详情</div>
  </div>

  <!-- 建筑列表 -->
  <div class="card" v-if="buildings.length">
    <div class="card-title">🏛️ 建筑</div>
    <div class="building-grid">
      <div
        v-for="b in buildings"
        :key="b.id"
        :class="['building-card', 'type-'+b.type, { active: b.id === currentPlaceId }]"
        @click="openBuilding(b)"
      >
        <div class="b-icon">{{ buildingIcon(b.type) }}</div>
        <div class="b-name">{{ b.name }}</div>
        <div class="b-hint">{{ buildingHint(b.type) }}</div>
        <div v-if="b.id === currentPlaceId" class="b-here">当前</div>
      </div>
    </div>
  </div>

  <!-- 野外/其他地点 -->
  <div class="card" v-if="wildAreas.length">
    <div class="card-title">🌿 其他地点</div>
    <ul class="city-places">
      <li v-for="p in wildAreas" :key="p.id">
        <a href="javascript:void(0)"
           @click="goto(p.id)"
           :class="{ 'current-place': p.id === currentPlaceId }">
          {{ placeIcon(p.type) }} {{ p.name }}
          <span v-if="p.id === currentPlaceId" class="current-tag">←当前</span>
        </a>
      </li>
    </ul>
  </div>

  <router-link to="/map" class="btn btn-secondary btn-block mt-10">
    ← 返回地图
  </router-link>

  <!-- 建筑交互弹窗 -->
  <Teleport to="body">
  <div class="modal-overlay" :class="{ active: buildingModal }" @click.self="closeBuilding">
    <div class="modal-card" v-if="buildingModal">
      <div class="modal-header">
        <div class="modal-avatar" :style="'background:'+buildingModalBg+';border:2px solid '+buildingModalColor">
          {{ buildingIcon(buildingModal.type) }}
        </div>
        <div>
          <div class="modal-title" :style="{ color: buildingModalColor }">{{ buildingModal.name }}</div>
          <div class="modal-subtitle">{{ buildingModalTag }}</div>
        </div>
      </div>
      <div class="modal-body">
        <!-- 码头 -->
        <template v-if="buildingModal.type === 1">
          <div class="building-desc">繁忙的港口，来往船只络绎不绝。</div>
          <div style="margin-top:10px;padding:8px;background:rgba(63,106,74,0.06);border:1px solid rgba(63,106,74,0.15);border-radius:8px;font-size:12px;color:#3f6a4a;">
            ⚓ 可在此处<strong>起航</strong>，前往其他城市探索海域
          </div>
          <div style="margin-top:8px;font-size:11px;color:#8b784e;">当前船只：{{ userStore.user?.ship_name || '无' }}</div>
        </template>
        <!-- 广场 -->
        <template v-else-if="buildingModal.type === 2">
          <div class="building-desc">{{ buildingModal.description || '热闹的广场，是城市的中心。' }}</div>
        </template>
        <!-- 功能建筑（银行/铁匠铺） -->
        <template v-else-if="buildingModal.type === 3">
          <div class="building-desc">{{ buildingModal.description || '这里提供专业服务。' }}</div>
          <div style="margin-top:8px;font-size:11px;color:#8b784e;">
            <template v-if="buildingModal.name.includes('银行')">💰 安全存储铜币，告别战斗损失</template>
            <template v-else-if="buildingModal.name.includes('铁匠')">⚒️ 强化装备，提升战斗力</template>
            <template v-else>提供专业服务</template>
          </div>
        </template>
        <!-- 酒馆 -->
        <template v-else-if="buildingModal.type === 4">
          <div class="building-desc">{{ buildingModal.description || '烟雾缭绕的酒馆，是冒险者交流信息的好去处。' }}</div>
          <div style="margin-top:8px;padding:8px;background:rgba(169,119,78,0.06);border:1px solid rgba(169,119,78,0.15);border-radius:8px;font-size:12px;color:#c9a758;">
            🍺 可在此接取任务、收集情报
          </div>
        </template>
        <!-- 商店 -->
        <template v-else-if="buildingModal.type === 5">
          <div class="building-desc">{{ buildingModal.description || '出售各类药品和物资。' }}</div>
          <div style="margin-top:8px;padding:8px;background:rgba(201,167,88,0.06);border:1px solid rgba(201,167,88,0.15);border-radius:8px;font-size:12px;color:#c9a758;">
            🏪 可购买消耗品、装备与道具
          </div>
        </template>
        <!-- 其他 -->
        <template v-else>
          <div class="building-desc">{{ buildingModal.description || '未知的地点。' }}</div>
        </template>
      </div>
      <div class="modal-footer">
        <button v-if="buildingModal.type === 1" class="modal-btn modal-btn-primary" @click="goSail" style="background:#2e5a3b;">⛵ 航海</button>
        <button v-else class="modal-btn modal-btn-primary" @click="goto(buildingModal.id)">📍 前往</button>
        <a href="javascript:void(0)" class="modal-btn modal-btn-close" @click.prevent="closeBuilding">关闭</a>
      </div>
    </div>
  </div>
  </Teleport>
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
const city = ref(null);
const places = ref([]);
const currentPlaceId = ref(0);
const buildingModal = ref(null);

// npc type -> building type mapping
// NPC type: 0=普通 1=商店 2=铁匠 3=银行 4=酒馆 5=普通
// Building type: 0=野外 1=码头 2=广场 3=功能(银行/铁匠) 4=酒馆 5=商店
const npcTypeToBuildingType = { 0: 0, 1: 5, 2: 3, 3: 3, 4: 4, 5: 0 };
const buildingTypeToNpcType  = { 0: 0, 1: 0, 2: 0, 3: 2, 4: 4, 5: 1 };

const buildings = computed(() => {
  return (places.value || [])
    .filter(p => p.type !== 0)
    .map(p => {
      // place.type 直接就是建筑类型
      // 港口特殊：1011=酒馆(type=4) 1034=珠宝店(type=0) 1033=占星屋(type=0)
      // 已有type定义见 init-db.sql
      return p;
    });
});

const wildAreas = computed(() => (places.value || []).filter(p => p.type === 0));

function buildingIcon(t) {
  const icons = { 0: '🏠', 1: '⚓', 2: '⛩️', 3: '🏛️', 4: '🍺', 5: '🏪' };
  return icons[t] || '📍';
}
function buildingHint(t) {
  const hints = {
    0: '野外',
    1: '航海',
    2: '广场',
    3: '服务',
    4: '任务',
    5: '商店'
  };
  return hints[t] || '';
}

function placeIcon(t) {
  if (t === 1) return '⚓';
  if (t === 2) return '⛩️';
  if (t === 3) return '🛃';
  return '🏠';
}

const buildingModalColor = computed(() => {
  const c = { 0: '#cfc19e', 1: '#3f6a4a', 2: '#5f4a31', 3: '#2e5a3b', 4: '#c9a758', 5: '#c9a758' };
  return c[buildingModal.value?.type] || '#cfc19e';
});
const buildingModalBg = computed(() => {
  const b = { 0: 'rgba(207,193,158,0.08)', 1: 'rgba(63,106,74,0.12)', 2: 'rgba(95,74,49,0.12)', 3: 'rgba(46,90,59,0.12)', 4: 'rgba(201,167,88,0.12)', 5: 'rgba(201,167,88,0.12)' };
  return b[buildingModal.value?.type] || 'rgba(207,193,158,0.08)';
});
const buildingModalTag = computed(() => {
  const tags = { 0: '野外区域', 1: '港口码头', 2: '城市广场', 3: '功能建筑', 4: '酒馆旅店', 5: '商店市集' };
  return tags[buildingModal.value?.type] || '';
});

function openBuilding(b) {
  buildingModal.value = b;
}
function closeBuilding() {
  buildingModal.value = null;
}

async function load() {
  try {
    const d = await Api.get(`/user/citymap/${route.params.cityId || ''}`);
    city.value = d.city;
    places.value = d.places || [];
    currentPlaceId.value = d.currentPlaceId || 0;
  } catch (e) {}
}

async function goto(placeId) {
  closeBuilding();
  try {
    await Api.post('/user/teleport', { place_id: placeId });
    router.push('/map');
  } catch (e) {}
}

function goSail() {
  closeBuilding();
  router.push('/sail');
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

.building-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-top: 8px;
}

.building-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 6px 8px;
  background: #1a2230;
  border: 1.5px solid #2a3a2a;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
  gap: 4px;
}
.building-card:active,
.building-card:hover {
  border-color: #c9a758;
  background: #1f2a1e;
  transform: translateY(-1px);
}
.building-card.active {
  border-color: #c9a758;
  background: #1f2a1e;
}
.building-card.type-1 { border-color: #1e3a2e; }
.building-card.type-1:active,
.building-card.type-1:hover { border-color: #3f6a4a; }
.building-card.type-4 { border-color: #2e2418; }
.building-card.type-4:active,
.building-card.type-4:hover { border-color: #c9a758; }
.building-card.type-5 { border-color: #2e2618; }
.building-card.type-5:active,
.building-card.type-5:hover { border-color: #c9a758; }
.building-card.type-3 { border-color: #1e2e2a; }
.building-card.type-3:active,
.building-card.type-3:hover { border-color: #2e5a3b; }

.b-icon { font-size: 28px; line-height: 1; }
.b-name { font-size: 11px; color: #f7efdb; font-weight: 600; }
.b-hint { font-size: 10px; color: #6f5632; }
.b-here {
  position: absolute;
  top: 3px;
  right: 4px;
  font-size: 9px;
  color: #c9a758;
  background: rgba(201,167,88,0.1);
  padding: 1px 4px;
  border-radius: 3px;
}

.city-places {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.city-places li a {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px 4px;
  background: #1e2a1c;
  border: 1px solid #3a4f2e;
  border-radius: 4px;
  color: #f7efdb;
  text-decoration: none;
  font-size: 11px;
  text-align: center;
  transition: all 0.15s;
  gap: 2px;
}

.city-places li a:hover,
.city-places li a:active {
  border-color: #c9a758;
  color: #c9a758;
}

.city-places li a.current-place {
  border-color: #c9a758;
  color: #c9a758;
}

.current-tag {
  font-size: 10px;
  white-space: nowrap;
}

.building-desc {
  font-size: 13px;
  color: #cfc19e;
  line-height: 1.6;
}
</style>
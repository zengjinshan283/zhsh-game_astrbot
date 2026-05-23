<template>
<div class="page wild-page">
  <!-- 顶部：城市名 + 返回 -->
  <div class="location-bar">
    <div class="location-name">🌿 {{ cityName }} - 野外探索</div>
    <div class="back-btn" @click="router.push(`/citymap/${cityId}`)">← 城内</div>
  </div>

  <!-- 方向选择 tabs -->
  <div class="dir-tabs">
    <button
      v-for="d in directions"
      :key="d.key"
      class="dir-btn"
      :class="{ active: activeDir === d.key }"
      @click="selectDir(d.key)"
    >
      {{ d.icon }} {{ d.label }}
    </button>
  </div>

  <!-- 加载状态 -->
  <div v-if="loading" class="loading-state">
    <div class="loading-spinner"></div>
    加载中...
  </div>

  <!-- 棋盘网格：3×1，每行一个区域，等级从低到高 -->
  <div v-else-if="activeDir" class="wild-grid">
    <div
      v-for="(w, idx) in wildsByDir"
      :key="w.id"
      class="wild-cell"
      :class="{
        'wild-locked': userLevel < w.level_req,
        'wild-near': w.level === 1,
        'wild-mid': w.level === 2,
        'wild-far': w.level === 3
      }"
    >
      <div class="wild-cell-near-label">
        {{ w.level === 1 ? '🌱 近' : w.level === 2 ? '🌲 中' : '🔥 深' }}
      </div>
      <div class="wild-cell-name">{{ w.name }}</div>
      <div class="wild-cell-level">Lv.{{ w.level_req }}+</div>
      <div class="wild-cell-monsters">{{ w.description || '有怪物出没' }}</div>
      <button
        v-if="userLevel >= w.level_req"
        class="wild-enter-btn"
        @click="goWild(w)"
      >
        进入探索
      </button>
      <div v-else class="wild-lock-info">🔒 需 Lv.{{ w.level_req }}</div>
    </div>

    <!-- 没有区域时占位 -->
    <template v-if="!wildsByDir.length">
      <div class="wild-empty">此方向暂无野外区域</div>
    </template>
  </div>

  <!-- 提示 -->
  <div v-if="!activeDir && !loading" class="hint-state">
    <div class="hint-icon">🧭</div>
    <div class="hint-text">选择一个城门方向探索</div>
    <div class="hint-sub">每个方向有3个等级的区域：近/中/深</div>
  </div>
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

const loading = ref(false);
const cityId = ref(0);
const cityName = ref('');
const wilds = ref({ n: [], s: [], e: [], w: [] });
const activeDir = ref('');
const userLevel = computed(() => userStore.user?.level || 1);

// 从URL参数读取默认方向
const urlDir = route.query.dir;
if (['n','s','e','w'].includes(urlDir)) {
  activeDir.value = urlDir;
}

const directions = [
  { key: 'n', label: '北', icon: '⬆️' },
  { key: 's', label: '南', icon: '⬇️' },
  { key: 'e', label: '东', icon: '➡️' },
  { key: 'w', label: '西', icon: '⬅️' },
];

const wildsByDir = computed(() => {
  if (!activeDir.value) return [];
  return wilds.value[activeDir.value] || [];
});

function dirLabel(d) {
  return { n: '北方', s: '南方', e: '东方', w: '西方' }[d] || d;
}

async function loadCity() {
  cityId.value = parseInt(route.params.cityId) || 0;
  if (!cityId.value) {
    router.replace('/map');
    return;
  }
  loading.value = true;
  try {
    const d = await Api.get(`/wild/list/${cityId.value}`);
    cityName.value = d.city?.name || '野外';
    wilds.value = d.wilds || { n: [], s: [], e: [], w: [] };
  } catch (e) {
    console.error('加载野外数据失败', e);
    router.replace('/map');
  } finally {
    loading.value = false;
  }
}

function selectDir(dir) {
  activeDir.value = dir;
}

async function goWild(w) {
  try {
    // 通知后端进入野外，返回随机怪物ID
    const d = await Api.post('/wild/go-wild', { wild_map_id: w.id });
    if (!d.monster_id) {
      alert('进入失败：未找到怪物');
      return;
    }
    // 调用战斗接口获取战斗数据
    const battleData = await Api.post('/battle/start', { monster_id: d.monster_id });
    // 写入 gameStore 触发 BattleOverlay
    gameStore.setBattle(battleData);
    // 跳转到地图页（显示战斗浮层）
    router.push('/map');
  } catch (e) {
    alert(e.message || '进入野外失败');
  }
}

onMounted(loadCity);
</script>

<style scoped>
.wild-page { padding: 8px; }

.dir-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.dir-btn {
  padding: 10px 4px;
  background: #1a1a2e;
  border: 1px solid #2a3a5a;
  border-radius: 8px;
  color: #8b9dc3;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.dir-btn.active {
  background: linear-gradient(135deg, #1a3a2a 0%, #1a2a1a 100%);
  border-color: #4ade80;
  color: #4ade80;
}

.loading-state {
  text-align: center;
  padding: 40px;
  color: #8b9dc3;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #2a3a5a;
  border-top-color: #4ade80;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 8px;
}

@keyframes spin { to { transform: rotate(360deg); } }

.wild-list { display: flex; flex-direction: column; gap: 10px; }

.wild-card-title {
  font-size: 13px;
  color: #8b9dc3;
  margin-bottom: 4px;
}

.wild-card {
  background: #1a1a2e;
  border: 1px solid #2a3a5a;
  border-radius: 10px;
  padding: 14px;
  transition: all 0.2s;
}

.wild-card.wild-locked {
  opacity: 0.5;
}

.wild-card.wild-near { border-left: 3px solid #4ade80; }
.wild-card.wild-mid { border-left: 3px solid #fbbf24; }
.wild-card.wild-far { border-left: 3px solid #ef4444; }

.wild-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.wild-name {
  font-size: 14px;
  font-weight: bold;
  color: #e8d5a3;
}

.wild-level {
  font-size: 11px;
  background: #2a3a5a;
  color: #c9a758;
  padding: 2px 8px;
  border-radius: 4px;
}

.wild-desc {
  font-size: 12px;
  color: #8b9dc3;
  margin-bottom: 8px;
  line-height: 1.4;
}

.wild-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.wild-tier { font-size: 12px; color: #8b9dc3; }

.wild-enter-btn {
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
  border: none;
  border-radius: 6px;
  color: #0a1a0a;
  font-weight: bold;
  font-size: 13px;
  padding: 6px 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.wild-enter-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.4);
}

.wild-lock-info {
  font-size: 12px;
  color: #ef4444;
}

.empty-state, .hint-state {
  text-align: center;
  padding: 40px;
  color: #555;
}

.hint-icon { font-size: 48px; margin-bottom: 12px; }
.hint-text { font-size: 16px; color: #8b9dc3; margin-bottom: 6px; }
.hint-sub { font-size: 12px; color: #555; }

/* 棋盘网格 */
.wild-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 4px;
}

.wild-cell {
  background: #1a1a2e;
  border: 1px solid #2a3a5a;
  border-radius: 10px;
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  transition: all 0.2s;
  min-height: 140px;
}

.wild-cell.wild-locked { opacity: 0.5; }
.wild-cell.wild-near { border-top: 3px solid #4ade80; }
.wild-cell.wild-mid { border-top: 3px solid #fbbf24; }
.wild-cell.wild-far { border-top: 3px solid #ef4444; }

.wild-cell-near-label { font-size: 11px; color: #8b9dc3; }
.wild-cell-name { font-size: 14px; font-weight: bold; color: #e8d5a3; }
.wild-cell-level { font-size: 11px; background: #2a3a5a; color: #c9a758; padding: 2px 8px; border-radius: 4px; }
.wild-cell-monsters { font-size: 11px; color: #8b9dc3; flex: 1; }

.back-btn {
  font-size: 12px;
  color: #4ade80;
  cursor: pointer;
  padding: 4px 8px;
  background: #1a2a1a;
  border: 1px solid #2a4a2a;
  border-radius: 6px;
}

.wild-enter-btn {
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
  border: none;
  border-radius: 6px;
  color: #0a1a0a;
  font-weight: bold;
  font-size: 13px;
  padding: 6px 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.wild-enter-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.4);
}

.wild-lock-info { font-size: 12px; color: #ef4444; }
.wild-empty { grid-column: 1 / -1; text-align: center; padding: 30px; color: #555; }
</style>

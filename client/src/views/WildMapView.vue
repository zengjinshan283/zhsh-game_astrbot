<template>
  <div class="wild-page">
    <div class="wild-bg"></div>

    <!-- 顶部 HUD -->
    <div class="top-hud">
      <div class="hud-left">
        <div class="hud-icon">🌿</div>
        <div class="hud-title">{{ cityName }}</div>
      </div>
      <div class="hud-sub">野外探索</div>
    </div>

    <!-- 方向选择 tabs -->
    <div class="dir-tabs">
      <div
        v-for="d in directions"
        :key="d.key"
        class="dir-btn"
        :class="{ active: activeDir === d.key }"
        @click="selectDir(d.key)"
      >
        <span class="dir-icon">{{ d.icon }}</span>
        <span class="dir-label">{{ d.label }}</span>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-card">
      <div class="loading-spinner"></div>
      <div class="loading-text">加载中...</div>
    </div>

    <!-- 棋盘网格：3×1，每行一个区域 -->
    <div class="wild-grid" v-else-if="activeDir">
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
        <div class="wc-label">{{ w.level === 1 ? '🌱 近' : w.level === 2 ? '🌲 中' : '🔥 深' }}</div>
        <div class="wc-name">{{ w.name }}</div>
        <div class="wc-level">Lv.{{ w.level_req }}+</div>
        <div class="wc-desc">{{ w.description || '有怪物出没' }}</div>
        <button
          v-if="userLevel >= w.level_req"
          class="wc-enter-btn"
          @click="goWild(w)"
        >
          进入探索
        </button>
        <div v-else class="wc-lock">🔒 需 Lv.{{ w.level_req }}</div>
      </div>

      <div v-if="!wildsByDir.length" class="wild-empty">此方向暂无野外区域</div>
    </div>

    <!-- 提示 -->
    <div v-if="!activeDir && !loading" class="hint-card">
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

const urlDir = route.query.dir;
if (['n', 's', 'e', 'w'].includes(urlDir)) { activeDir.value = urlDir; }

const directions = [
  { key: 'n', label: '北', icon: '⬆️' },
  { key: 's', label: '南', icon: '⬇️' },
  { key: 'e', label: '东', icon: '➡️' },
  { key: 'w', label: '西', icon: '⬅️' }
];

const wildsByDir = computed(() => wilds.value[activeDir.value] || []);

function selectDir(dir) {
  activeDir.value = dir;
}

async function goWild(w) {
  if (w.level === 1) {
    router.push(`/map?wild=${w.id}`);
  } else {
    router.push(`/map?wild=${w.id}`);
  }
}

async function load() {
  loading.value = true;
  try {
    cityId.value = parseInt(route.params.cityId) || 0;
    const d = await Api.get(`/user/wild/${cityId.value}`);
    cityName.value = d.cityName || '';
    wilds.value = d.wilds || { n: [], s: [], e: [], w: [] };
    if (activeDir.value && !wildsByDir.value.length) {
      // auto switch to first available
      for (const dir of directions) {
        if (wilds.value[dir.key]?.length) { activeDir.value = dir.key; break; }
      }
    }
  } catch (e) {}
  loading.value = false;
}

onMounted(load);
</script>

<style scoped>
.wild-page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 10px;
  min-height: 100%;
  overflow-y: auto;
}

.wild-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  background: linear-gradient(160deg, #0d1117 0%, #0a1a0a 50%, #0d1117 100%);
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
.hud-sub { font-size: 11px; color: #7f8c8d; background: rgba(255,255,255,0.06); padding: 2px 10px; border-radius: 10px; }

.dir-tabs {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.dir-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 4px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}
.dir-btn.active {
  background: rgba(74, 222, 128, 0.1);
  border-color: rgba(74, 222, 128, 0.3);
}
.dir-icon { font-size: 20px; }
.dir-label { font-size: 11px; color: #7f8c8d; }
.dir-btn.active .dir-label { color: #4ade80; }

.loading-card {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px;
}
.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255,255,255,0.1);
  border-top-color: #4ade80;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 13px; color: #7f8c8d; }

.wild-grid {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.wild-cell {
  background: rgba(26, 26, 46, 0.9);
  border: 1px solid rgba(42, 58, 90, 0.5);
  border-top: 3px solid;
  border-radius: 12px;
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  min-height: 140px;
  transition: all 0.2s;
}
.wild-cell:hover:not(.wild-locked) { transform: translateY(-2px); }
.wild-cell.wild-locked { opacity: 0.5; }
.wild-cell.wild-near { border-top-color: #4ade80; }
.wild-cell.wild-mid { border-top-color: #fbbf24; }
.wild-cell.wild-far { border-top-color: #ef4444; }

.wc-label { font-size: 10px; color: #8b9dc3; }
.wc-name { font-size: 14px; font-weight: 700; color: #e8d5a3; }
.wc-level { font-size: 10px; background: #2a3a5a; color: #c9a758; padding: 2px 8px; border-radius: 4px; }
.wc-desc { font-size: 11px; color: #8b9dc3; flex: 1; }

.wc-enter-btn {
  background: linear-gradient(135deg, #4ade80, #22c55e);
  border: none;
  border-radius: 6px;
  color: #0a1a0a;
  font-weight: 700;
  font-size: 12px;
  padding: 6px 16px;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: auto;
}
.wc-enter-btn:hover { transform: scale(1.05); box-shadow: 0 4px 12px rgba(74, 222, 128, 0.4); }

.wc-lock { font-size: 11px; color: #ef4444; margin-top: auto; }

.wild-empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 30px;
  color: #555;
  font-size: 13px;
}

.hint-card {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 50px 30px;
  text-align: center;
}
.hint-icon { font-size: 48px; }
.hint-text { font-size: 16px; color: #8b9dc3; }
.hint-sub { font-size: 12px; color: #555; }
</style>
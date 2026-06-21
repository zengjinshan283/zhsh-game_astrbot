<template>
  <div class="page-wrap wild-page">

  <div class="page-hud"><div class="page-hud-title">🧭 野外探索</div></div>
    <!-- 顶部 HUD -->
    <div class="top-hud">
      <div class="hud-left">
        <a href="javascript:void(0)" @click.prevent="$router.back()" class="hud-back">←</a>
        <div class="hud-icon">🧭</div>
        <div class="hud-title">{{ cityName }} · 城外</div>
      </div>
      <div class="hud-sub">选方向</div>
    </div>

    <!-- 2D 罗盘 -->
    <div class="compass-wrap" v-if="!loading">
      <div class="compass-center">
        <div class="cc-icon">📍</div>
        <div class="cc-label">{{ cityName }}</div>
        <div class="cc-hint">选方向出发</div>
      </div>
      <div
        v-for="d in directions"
        :key="d.key"
        class="compass-dir"
        :class="['cd-' + d.key, { active: activeDir === d.key, disabled: !getWildCount(d.key) }]"
        @click="getWildCount(d.key) && selectDir(d.key)"
      >
        <div class="cd-arrow">{{ d.icon }}</div>
        <div class="cd-label">{{ d.label }}</div>
        <div class="cd-count">{{ getWildCount(d.key) || '·' }}</div>
      </div>
    </div>

    <!-- 加载 -->
    <div v-if="loading" class="loading-card">
      <div class="loading-spinner"></div>
      <div class="loading-text">加载中...</div>
    </div>

    <!-- 当前方向 2D 野区缩略图 -->
    <div class="wild-map" v-if="activeDir && wildsByDir.length">
      <div class="wm-title">🗺️ {{ dirLabel(activeDir) }} · {{ wildsByDir.length }} 区域</div>
      <div class="wm-grid">
        <div
          v-for="(w, idx) in wildsByDir"
          :key="w.id"
          class="wm-cell"
          :class="[
            'wm-l' + w.level,
            { 'wm-locked': userLevel < w.level_req, 'wm-hover': userLevel >= w.level_req }
          ]"
          @click="goWild(w)"
        >
          <div class="wm-header">
            <div class="wm-tier">
              <span v-if="w.level === 1">🌱 近郊</span>
              <span v-else-if="w.level === 2">🌲 中域</span>
              <span v-else>🔥 深处</span>
            </div>
            <div class="wm-lv">Lv.{{ w.level_req }}+</div>
          </div>
          <div class="wm-name">{{ w.name }}</div>
          <div class="wm-desc">{{ w.description || '怪物出没' }}</div>
          <!-- 2D 缩略图：3x3 网格，怪物散布 -->
          <div class="wm-thumb">
            <div class="wmt-grid" :style="{gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)'}">
              <div
                v-for="(cell, ci) in thumbCells(w)"
                :key="ci"
                class="wmt-cell"
                :class="cell.cls"
              >{{ cell.icon }}</div>
            </div>
            <div class="wmt-fog"></div>
          </div>
          <div class="wm-monsters" v-if="w.monster_ids">
            👹 {{ w.monster_ids.split(',').length }} 类怪物
          </div>
          <button
            v-if="userLevel >= w.level_req"
            class="wm-btn"
            @click.stop="goWild(w)"
          >进入探索 →</button>
          <div v-else class="wm-lock">🔒 需 Lv.{{ w.level_req }}</div>
        </div>
      </div>
    </div>

    <div v-else-if="activeDir && !loading" class="hint-card">
      <div class="hint-icon">🌫️</div>
      <div class="hint-text">{{ dirLabel(activeDir) }}暂无野外区域</div>
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

function dirLabel(d) { return directions.find(x => x.key === d)?.label || d; }
function getWildCount(dir) { return wilds.value[dir]?.length || 0; }

function selectDir(dir) { activeDir.value = dir; }

// 2D 缩略图：3x3 网格，怪物散布
function thumbCells(w) {
  const cells = [];
  const tier = w.level;
  const monsterCount = w.monster_ids ? Math.min(w.monster_ids.split(',').length, 4) : 0;
  for (let i = 0; i < 9; i++) {
    if (i < monsterCount) {
      // 怪物位置（左上散布）
      const row = Math.floor(i / 3);
      const col = i % 3;
      const isElite = i === 0;
      cells.push({
        cls: 'wmt-monster' + (isElite ? ' wmt-elite' : ''),
        icon: isElite ? (tier === 1 ? '🐺' : tier === 2 ? '🐗' : '👹') : (tier === 1 ? '🐇' : tier === 2 ? '🦌' : '🗡️')
      });
    } else if (i === 8) {
      // 玩家位置（右下）
      cells.push({ cls: 'wmt-player', icon: '🚶' });
    } else {
      // 地形
      const terrain = tier === 1 ? '🌿' : tier === 2 ? '🌲' : '⛰️';
      cells.push({ cls: 'wmt-terrain', icon: terrain });
    }
  }
  return cells;
}

async function goWild(w) {
  router.push(`/map?wild=${w.id}`);
}

async function load() {
  loading.value = true;
  try {
    cityId.value = parseInt(route.params.cityId) || 0;
    const d = await Api.get(`/api/wild/list/${cityId.value}`);
    cityName.value = d.city?.name || '';
    wilds.value = d.wilds || { n: [], s: [], e: [], w: [] };
    if (activeDir.value && !wildsByDir.value.length) {
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
.hud-back {
  font-size: 18px; color: #bdc3c7; text-decoration: none;
  padding: 2px 6px; border-radius: 6px; transition: all 0.2s;
}
.hud-back:hover { background: rgba(255,255,255,0.08); color: #f0f0f0; }
.hud-icon { font-size: 20px; }
.hud-title { font-size: 16px; font-weight: 700; color: #f0f0f0; }
.hud-sub { font-size: 11px; color: #7f8c8d; background: rgba(255,255,255,0.06); padding: 2px 10px; border-radius: 10px; }

/* ===== 2D 罗盘 ===== */
.compass-wrap {
  position: relative; z-index: 2;
  width: 100%;
  max-width: 360px;
  aspect-ratio: 1 / 1;
  margin: 0 auto;
  background: radial-gradient(circle at center, #1a2a1a 0%, #0a1a0a 100%);
  border: 2px solid rgba(74, 222, 128, 0.3);
  border-radius: 50%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  padding: 12px;
  gap: 8px;
  box-shadow: 0 0 24px rgba(74, 222, 128, 0.2), inset 0 0 24px rgba(0,0,0,0.4);
}
.compass-center {
  grid-column: 2; grid-row: 2;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: linear-gradient(135deg, rgba(201,167,88,0.2), rgba(139,120,78,0.1));
  border: 1.5px solid rgba(201,167,88,0.5);
  border-radius: 50%;
  aspect-ratio: 1 / 1;
  z-index: 2;
  box-shadow: 0 0 16px rgba(201,167,88,0.4);
  animation: pulse-center 2s infinite;
}
@keyframes pulse-center {
  0%, 100% { box-shadow: 0 0 16px rgba(201,167,88,0.4); }
  50% { box-shadow: 0 0 24px rgba(201,167,88,0.7); }
}
.cc-icon { font-size: 26px; }
.cc-label { font-size: 11px; font-weight: 700; color: #c9a758; margin-top: 1px; }
.cc-hint { font-size: 8px; color: #8b9a7c; }

.compass-dir {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: rgba(74, 222, 128, 0.08);
  border: 1.5px solid rgba(74, 222, 128, 0.3);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  gap: 2px;
  aspect-ratio: 1 / 1;
}
.compass-dir.disabled { opacity: 0.3; cursor: not-allowed; }
.compass-dir:not(.disabled):hover { transform: scale(1.05); background: rgba(74, 222, 128, 0.15); }
.compass-dir.active {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.3), rgba(34, 197, 94, 0.2)) !important;
  border-color: #4ade80 !important;
  box-shadow: 0 0 16px rgba(74, 222, 128, 0.6);
  animation: pulse-dir 1s infinite;
}
@keyframes pulse-dir {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
}
.cd-n { grid-column: 2; grid-row: 1; }
.cd-s { grid-column: 2; grid-row: 3; }
.cd-w { grid-column: 1; grid-row: 2; }
.cd-e { grid-column: 3; grid-row: 2; }
.cd-arrow { font-size: 24px; }
.cd-label { font-size: 11px; color: #4ade80; font-weight: 600; }
.cd-count { font-size: 9px; color: #8b9dc3; background: rgba(0,0,0,0.3); padding: 1px 6px; border-radius: 6px; }
.compass-dir.active .cd-count { color: #fff; background: rgba(74,222,128,0.3); }

/* ===== 2D 野区缩略图 ===== */
.wild-map {
  position: relative; z-index: 2;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 10px;
}
.wm-title {
  font-size: 12px; font-weight: 700; color: #4ade80; padding: 0 4px 8px;
  border-bottom: 1px solid rgba(74, 222, 128, 0.2);
  margin-bottom: 10px;
}
.wm-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.wm-cell {
  display: flex; flex-direction: column; gap: 6px;
  background: rgba(26, 26, 46, 0.9);
  border: 1.5px solid rgba(42, 58, 90, 0.5);
  border-top: 3px solid;
  border-radius: 12px;
  padding: 10px 8px;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 220px;
}
.wm-cell.wm-locked { opacity: 0.5; cursor: not-allowed; }
.wm-cell.wm-hover:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(74, 222, 128, 0.2); }
.wm-cell.wm-l1 { border-top-color: #4ade80; }
.wm-cell.wm-l2 { border-top-color: #fbbf24; }
.wm-cell.wm-l3 { border-top-color: #ef4444; }

.wm-header {
  display: flex; align-items: center; justify-content: space-between;
}
.wm-tier { font-size: 10px; color: #8b9dc3; font-weight: 600; }
.wm-lv { font-size: 9px; background: #2a3a5a; color: #c9a758; padding: 1px 6px; border-radius: 4px; }
.wm-name { font-size: 13px; font-weight: 700; color: #e8d5a3; line-height: 1.2; }
.wm-desc { font-size: 10px; color: #8b9dc3; line-height: 1.3; min-height: 26px; }

.wm-thumb {
  position: relative;
  width: 100%; aspect-ratio: 1 / 1;
  background: linear-gradient(180deg, #1a2a1a 0%, #0a1a0a 100%);
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 8px;
  overflow: hidden;
}
.wmt-grid {
  display: grid; gap: 1px; width: 100%; height: 100%;
  padding: 2px;
}
.wmt-cell {
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; line-height: 1;
  background: rgba(74, 222, 128, 0.05);
  border-radius: 3px;
}
.wmt-terrain { background: transparent; opacity: 0.6; }
.wmt-monster {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  animation: monster-roam 2.5s ease-in-out infinite;
  font-size: 13px;
}
.wmt-monster.wmt-elite {
  background: rgba(251, 191, 36, 0.2);
  border-color: rgba(251, 191, 36, 0.5);
  font-size: 16px;
  animation: monster-roam 2s ease-in-out infinite, monster-glow 1.5s infinite;
}
@keyframes monster-roam {
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(1px, -1px); }
  50% { transform: translate(-1px, 0); }
  75% { transform: translate(0, 1px); }
}
@keyframes monster-glow {
  0%, 100% { box-shadow: 0 0 4px rgba(251, 191, 36, 0.4); }
  50% { box-shadow: 0 0 10px rgba(251, 191, 36, 0.8); }
}
.wmt-player {
  background: rgba(201, 167, 88, 0.3);
  border: 1.5px solid #c9a758;
  font-size: 14px;
  animation: player-walk 1s ease-in-out infinite;
}
@keyframes player-walk {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}
.wmt-fog {
  position: absolute; inset: 0;
  background: radial-gradient(circle at 70% 70%, transparent 30%, rgba(0,0,0,0.4) 100%);
  pointer-events: none;
}

.wm-monsters { font-size: 10px; color: #8b9dc3; }
.wm-btn {
  background: linear-gradient(135deg, #4ade80, #22c55e);
  border: none;
  border-radius: 6px;
  color: #0a1a0a;
  font-weight: 700;
  font-size: 12px;
  padding: 6px 12px;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: auto;
}
.wm-btn:hover { transform: scale(1.05); box-shadow: 0 4px 12px rgba(74, 222, 128, 0.4); }
.wm-lock { font-size: 11px; color: #ef4444; text-align: center; margin-top: auto; padding: 6px; }

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
  width: 32px; height: 32px;
  border: 3px solid rgba(74, 222, 128, 0.1);
  border-top-color: #4ade80;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 13px; color: #7f8c8d; }

.hint-card {
  position: relative; z-index: 2;
  display: flex; flex-direction: column;
  align-items: center; gap: 8px;
  padding: 30px;
  text-align: center;
}
.hint-icon { font-size: 40px; opacity: 0.6; }
.hint-text { font-size: 13px; color: #8b9dc3; }
</style>

<template>
  <div class="page-wrap achievement-page">

  <div class="page-hud"><div class="page-hud-title">🏆 成就</div></div>    <!-- 顶部 HUD -->
    <div class="top-hud">
      <div class="hud-left">
        <div class="hud-icon">🏆</div>
        <div class="hud-title">成就</div>
      </div>
      <div class="hud-right">
        <span class="hud-count">{{ achievedCount }}</span>
        <span class="hud-unit">/ {{ list.length }}</span>
      </div>
    </div>

    <!-- 总体进度环 + 分类小计 -->
    <div class="overall-card">
      <div class="oc-ring">
        <svg viewBox="0 0 80 80" class="oc-svg">
          <circle cx="40" cy="40" r="34" class="oc-bg"/>
          <circle cx="40" cy="40" r="34" class="oc-fg"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="ringOffset"/>
        </svg>
        <div class="oc-center">
          <div class="oc-pct">{{ overallPct }}%</div>
          <div class="oc-sub">{{ achievedCount }}/{{ list.length }}</div>
        </div>
      </div>
      <div class="oc-info">
        <div class="oc-title">🏆 成就完成度</div>
        <div class="oc-subtitle">{{ ringHint }}</div>
        <div class="oc-cats">
          <div class="oc-cat"><span class="oc-cat-dot" style="background:#c9a84c"></span>寻宝 {{ achievedCountOfKey('treasure_dig_') }}/5</div>
          <div class="oc-cat"><span class="oc-cat-dot" style="background:#3498db"></span>等级 {{ achievedCountOfKey('lv') }}/6</div>
          <div class="oc-cat"><span class="oc-cat-dot" style="background:#e74c3c"></span>战斗 {{ achievedCountOfKey('battle_') }}/3</div>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-card">
      <div class="loading-spinner"></div>
      <div class="loading-text">加载中...</div>
    </div>

    <div v-else class="card-area">

      <!-- 筛选 Tab -->
      <div class="filter-bar">
        <div v-for="f in filters" :key="f.key" :class="['filter-btn', { active: activeFilter === f.key }]" @click="activeFilter = f.key">
          {{ f.label }}
        </div>
      </div>

      <!-- 成就列表 -->
      <div class="ach-grid">
        <div v-for="a in filteredList" :key="a.key" :class="['ach-card', { achieved: a.achieved }]">
          <div class="ac-emoji">{{ a.achieved ? '🏆' : '📜' }}</div>
          <div class="ac-body">
            <div class="ac-name">{{ a.name }}</div>
            <div class="ac-desc">{{ a.description }}</div>
            <div class="ac-target">
              <span class="act-text" :class="actClass(a)">
                {{ a.achieved ? a.target : (a.progress || 0) }} / {{ a.target }}
              </span>
              <span class="act-pct" :class="actClass(a)">{{ progressPct(a) }}%</span>
            </div>
            <div class="ac-progress-bar" v-if="!a.achieved">
              <div class="ac-progress-fill" :class="actClass(a)" :style="{ width: progressPct(a) + '%' }"></div>
            </div>
            <div v-if="a.title" class="ac-title">🏅 称号：{{ a.title }}</div>
          </div>
          <div class="ac-reward">
            <div class="acr-label">奖励</div>
            <div class="acr-val">
              <span class="acr-icon">{{ rewardIcon(a.reward_type) }}</span>
              <span class="acr-num">+{{ a.reward_value }}</span>
              <span class="acr-unit">{{ rewardUnit(a.reward_type) }}</span>
            </div>
            <div v-if="a.achieved" class="acr-done">✅ 奖励已发放</div>
            <div v-else class="acr-btn">🔓 努力中</div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredList.length === 0" class="empty-card">
        <div class="empty-emoji">📭</div>
        <div class="empty-text">暂无此类成就</div>
      </div>
    </div>

    <button @click="$router.back()" class="back-btn">返回</button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Api } from '../composables/useApi';

const loading = ref(true);
const list = ref([]);
const activeFilter = ref('all');

const filters = [
  { key: 'all', label: '🏆 全部' },
  { key: 'achieved', label: '✅ 已完成' },
  { key: 'unachieved', label: '🔒 进行中' },
  { key: 'treasure', label: '🗺️ 寻宝' }
];

const achievedCount = computed(() => list.value.filter(a => a.achieved).length);

const overallPct = computed(() => {
  if (!list.value.length) return 0;
  return Math.round(achievedCount.value / list.value.length * 100);
});

const circumference = 2 * Math.PI * 34;
const ringOffset = computed(() => {
  if (!list.value.length) return 0;
  return circumference * (1 - achievedCount.value / list.value.length);
});

const ringHint = computed(() => {
  const left = list.value.length - achievedCount.value;
  if (left === 0) return '🎉 已完成全部成就！';
  if (left <= 3) return `还差 ${left} 个就圆满啦！`;
  if (overallPct.value >= 50) return '已完成过半，继续加油！';
  return '努力完成更多成就解锁称号';
});

function achievedCountOfKey(prefix) {
  return list.value.filter(a => a.achieved && a.key?.startsWith(prefix)).length;
}

const filteredList = computed(() => {
  if (activeFilter.value === 'achieved') return list.value.filter(a => a.achieved);
  if (activeFilter.value === 'unachieved') return list.value.filter(a => !a.achieved);
  if (activeFilter.value === 'treasure') return list.value.filter(a => a.key?.startsWith('treasure_dig_'));
  return list.value;
});

function rewardIcon(t) {
  if (t === 'money') return '💰';
  if (t === 'exp') return '✨';
  if (t === 'title') return '🏅';
  if (t === 'item') return '🎁';
  if (t === 'silver') return '🪙';
  return '🎯';
}
function rewardUnit(t) {
  if (t === 'money') return '铜币';
  if (t === 'exp') return '经验';
  if (t === 'title') return '称号';
  if (t === 'item') return '物品';
  if (t === 'silver') return '银币';
  return '';
}
function progressPct(a) {
  if (a.achieved) return 100;
  return Math.min(Math.round((a.progress || 0) / a.target * 100), 100);
}
function actClass(a) {
  if (a.achieved) return 'pct-done';
  const p = progressPct(a);
  if (p >= 80) return 'pct-near';
  if (p >= 30) return 'pct-mid';
  return 'pct-low';
}

async function load() {
  try {
    const d = await Api.get('/achievement/list');
    list.value = d.list || [];
  } catch (e) {} finally {
    loading.value = false;
  }
}

onMounted(() => load());
</script>

<style scoped>
.achievement-page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 10px;
  min-height: 100%;
  overflow-y: auto;
}
.top-hud {
  position: relative; z-index: 2;
  background: rgba(13,17,23,0.88); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 14px;
  padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;
}
.hud-left { display: flex; align-items: center; gap: 8px; }
.hud-icon { font-size: 20px; }
.hud-title { font-size: 16px; font-weight: 700; color: #f0f0f0; }
.hud-right { font-size: 14px; color: #c9a84c; font-weight: 700; }
.hud-unit { font-size: 12px; color: #555; font-weight: 400; }

.progress-bar-wrap {
  position: relative; z-index: 2;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px; padding: 10px 14px;
}
.pb-label { font-size: 11px; color: #7f8c8d; margin-bottom: 6px; }
.pb-bar {
  height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden;
}
.pb-fill {
  height: 100%; background: linear-gradient(90deg, #c9a84c, #f1c40f);
  border-radius: 3px; transition: width 0.5s ease;
}

/* ====== 总体进度环 + 分类 ====== */
.overall-card {
  position: relative; z-index: 2;
  display: flex; align-items: center; gap: 14px;
  background: rgba(13,17,23,0.88);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 14px 16px;
}
.oc-ring {
  position: relative; flex-shrink: 0;
  width: 80px; height: 80px;
}
.oc-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.oc-bg { fill: none; stroke: rgba(255,255,255,0.06); stroke-width: 6; }
.oc-fg {
  fill: none;
  stroke: url(#oc-grad);
  stroke: #c9a84c;
  stroke-width: 6;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  filter: drop-shadow(0 0 6px rgba(201,168,76,0.4));
}
.oc-center {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  pointer-events: none;
}
.oc-pct {
  font-size: 20px; font-weight: 700; color: #f1c40f;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.oc-sub { font-size: 10px; color: #7f8c8d; }

.oc-info { flex: 1; min-width: 0; }
.oc-title { font-size: 14px; font-weight: 700; color: #f0f0f0; margin-bottom: 2px; }
.oc-subtitle { font-size: 11px; color: #c9a84c; margin-bottom: 6px; }
.oc-cats { display: flex; flex-direction: column; gap: 2px; }
.oc-cat {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; color: #bdc3c7;
}
.oc-cat-dot {
  display: inline-block; width: 6px; height: 6px;
  border-radius: 50%; flex-shrink: 0;
  box-shadow: 0 0 4px currentColor;
}

.loading-card { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px; }
.loading-spinner { width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #c9a84c; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 13px; color: #7f8c8d; }

.card-area { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 10px; }

.filter-bar { display: flex; gap: 6px; }
.filter-btn {
  flex: 1; text-align: center; padding: 7px 6px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; font-size: 11px; color: #7f8c8d; cursor: pointer; transition: all 0.2s;
}
.filter-btn.active { background: rgba(201,168,76,0.15); border-color: rgba(201,168,76,0.3); color: #c9a84c; }

.ach-grid { display: flex; flex-direction: column; gap: 8px; }
.ach-card {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 12px 14px;
  display: flex; align-items: flex-start; gap: 10px;
  transition: border-color 0.2s;
}
.ach-card.achieved { border-color: rgba(201,168,76,0.3); background: rgba(201,168,76,0.05); }
.ac-emoji { font-size: 28px; flex-shrink: 0; }
.ac-body { flex: 1; min-width: 0; }
.ac-name { font-size: 13px; font-weight: 700; color: #f0f0f0; margin-bottom: 2px; }
.ac-desc { font-size: 11px; color: #7f8c8d; margin-bottom: 4px; }
.ac-target {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  font-size: 10px; margin-bottom: 4px;
}
.act-text { color: #7f8c8d; font-weight: 600; }
.act-pct { font-weight: 700; font-size: 11px; }

/* 进度文字/条颜色档 */
.act-text.pct-low, .act-pct.pct-low, .ac-progress-fill.pct-low { color: #7f8c8d; background: #7f8c8d; }
.act-text.pct-mid, .act-pct.pct-mid, .ac-progress-fill.pct-mid { color: #c9a84c; background: linear-gradient(90deg, #c9a84c, #f1c40f); }
.act-text.pct-near, .act-pct.pct-near, .ac-progress-fill.pct-near { color: #27ae60; background: linear-gradient(90deg, #27ae60, #2ecc71); }
.act-text.pct-done, .act-pct.pct-done, .ac-progress-fill.pct-done { color: #f1c40f; background: linear-gradient(90deg, #c9a84c, #f1c40f); }

.ac-progress-bar { height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; margin-bottom: 4px; }
.ac-progress-fill { height: 100%; border-radius: 2px; transition: width 0.4s; }
.ac-title { font-size: 10px; color: #c9a84c; }
.ac-reward { text-align: right; flex-shrink: 0; }
.acr-label { font-size: 9px; color: #555; }
.acr-val { display: flex; flex-direction: column; align-items: center; gap: 1px; margin-top: 2px; }
.acr-icon { font-size: 16px; line-height: 1; }
.acr-num { font-size: 12px; color: #f1c40f; font-weight: 700; }
.acr-unit { font-size: 9px; color: #7f8c8d; }
.acr-done { font-size: 10px; color: #27ae60; margin-top: 2px; }
.acr-btn { font-size: 10px; color: #555; margin-top: 2px; }

.empty-card { text-align: center; padding: 40px; }
.empty-emoji { font-size: 40px; }
.empty-text { font-size: 13px; color: #555; margin-top: 8px; }

.back-btn {
  position: relative; z-index: 2;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; color: #7f8c8d; font-size: 13px;
  padding: 10px; width: 100%; cursor: pointer; transition: all 0.2s;
}
.back-btn:hover { background: rgba(255,255,255,0.08); }
</style>
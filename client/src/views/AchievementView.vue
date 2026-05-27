<template>
  <div class="achievement-page">
    <div class="ach-bg"></div>

    <!-- 顶部 HUD -->
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

    <!-- 进度条 -->
    <div class="progress-bar-wrap">
      <div class="pb-label">已完成</div>
      <div class="pb-bar">
        <div class="pb-fill" :style="{ width: (achievedCount / Math.max(list.length, 1) * 100) + '%' }"></div>
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
            <div class="ac-target">进度：{{ a.achieved ? a.target : (a.progress || 0) }} / {{ a.target }}</div>
            <div class="ac-progress-bar" v-if="!a.achieved">
              <div class="ac-progress-fill" :style="{ width: (Math.min((a.progress || 0) / a.target, 1) * 100) + '%' }"></div>
            </div>
            <div v-if="a.title" class="ac-title">称号：{{ a.title }}</div>
          </div>
          <div class="ac-reward">
            <div class="acr-label">奖励</div>
            <div class="acr-val">{{ rewardText(a) }}</div>
            <div v-if="a.achieved" class="acr-done">✅ 已达成</div>
            <div v-else class="acr-btn">🔒 未解锁</div>
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
  { key: 'unachieved', label: '🔒 进行中' }
];

const achievedCount = computed(() => list.value.filter(a => a.achieved).length);

const filteredList = computed(() => {
  if (activeFilter.value === 'achieved') return list.value.filter(a => a.achieved);
  if (activeFilter.value === 'unachieved') return list.value.filter(a => !a.achieved);
  return list.value;
});

function rewardText(a) {
  if (a.reward_type === 'money') return `💰 ${a.reward_value} 铜币`;
  if (a.reward_type === 'exp') return `✨ ${a.reward_value} 经验`;
  if (a.reward_type === 'item') return `🎁 物品×${a.reward_value}`;
  return '—';
}

async function load() {
  try {
    const d = await Api.get('/achievement/list');
    list.value = d.list || [];
  } catch (e) {
    console.error('[成就]', e.message);
  } finally {
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
.ach-bg {
  position: fixed; inset: 0; z-index: 0;
  background: linear-gradient(160deg, #0d1117 0%, #1a1000 50%, #0d1117 100%);
  pointer-events: none;
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
.ac-target { font-size: 10px; color: #555; margin-bottom: 4px; }
.ac-progress-bar { height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; margin-bottom: 4px; }
.ac-progress-fill { height: 100%; background: #c9a84c; border-radius: 2px; transition: width 0.4s; }
.ac-title { font-size: 10px; color: #c9a84c; }
.ac-reward { text-align: right; flex-shrink: 0; }
.acr-label { font-size: 9px; color: #555; }
.acr-val { font-size: 11px; color: #f1c40f; font-weight: 600; }
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
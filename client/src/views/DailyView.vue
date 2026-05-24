<template>
  <div class="daily-page">
    <div class="daily-bg"></div>

    <!-- 顶部 HUD -->
    <div class="top-hud">
      <div class="hud-left">
        <div class="hud-icon">📅</div>
        <div class="hud-title">每日活跃</div>
      </div>
      <div class="hud-active">{{ status.total_active_point || 0 }}<span class="hud-unit">点</span></div>
    </div>

    <div v-if="loading" class="loading-card">
      <div class="loading-spinner"></div>
      <div class="loading-text">加载中...</div>
    </div>

    <div v-else class="card-area">

      <!-- 活跃度进度 -->
      <div class="active-card">
        <div class="ac-top">
          <div class="ac-label">今日活跃度</div>
          <div class="ac-num">{{ status.total_active_point || 0 }}<span class="ac-total">/100</span></div>
        </div>
        <div class="ac-bar-wrap">
          <div class="ac-bar">
            <div class="ac-fill" :style="{ width: Math.min((status.total_active_point || 0), 100) + '%' }"></div>
          </div>
        </div>
        <div class="ac-tip">再获得 {{ Math.max(0, 100 - (status.total_active_point || 0)) }} 点即可领取全部宝箱</div>
      </div>

      <!-- 任务列表 -->
      <div class="tasks-card">
        <div class="tasks-header">📋 今日任务</div>
        <div class="tasks-list">
          <div
            v-for="task in status.tasks"
            :key="task.key"
            class="task-item"
            :class="{ completed: task.completed }"
          >
            <div class="ti-info">
              <div class="ti-name">{{ task.name }}</div>
              <div class="ti-desc">{{ task.description }}</div>
            </div>
            <div class="ti-right">
              <span class="ti-progress" :class="task.completed ? 'done' : 'pending'">
                {{ task.completed ? '✓' : task.progress + '/' + task.target }}
              </span>
              <span class="ti-point">+{{ task.active_point }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 宝箱奖励 -->
      <div class="boxes-card">
        <div class="boxes-header">🎁 活跃宝箱</div>
        <div class="boxes-grid">
          <div
            v-for="box in status.reward_boxes"
            :key="box.id"
            class="reward-box"
            :class="{
              'can-claim': box.can_claim,
              'claimed': box.claimed
            }"
            @click="claimBox(box)"
          >
            <div class="rb-icon">
              <span v-if="box.claimed">✅</span>
              <span v-else-if="box.can_claim">🎁</span>
              <span v-else>🔒</span>
            </div>
            <div class="rb-point">{{ box.active_point }}点</div>
            <div class="rb-reward">{{ getRewardText(box) }}</div>
            <div class="rb-status" :class="box.claimed ? 'status-claimed' : box.can_claim ? 'status-can' : 'status-locked'">
              {{ box.claimed ? '已领取' : box.can_claim ? '可领取' : '未达成' }}
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { Api } from '../composables/useApi';
import { globalAlert } from '../composables/useConfirm';

const loading = ref(true);
const status = ref({});
let refreshTimer = null;

async function load() {
  try { const d = await Api.get('/daily/status'); status.value = d; }
  catch (e) {} finally { loading.value = false; }
}

function getRewardText(box) {
  if (box.reward_type === 'money') return `${box.quantity}铜币`;
  const itemNames = { 3001: '千银矿石', 96: '体力宝', 94: '龙泉水', 2001: '月华密令', 2002: '龙门镖旗' };
  return itemNames[box.reward_value] || `物品×${box.quantity}`;
}

async function claimBox(box) {
  if (box.claimed) return;
  if (!box.can_claim) { globalAlert(`活跃度不足，需要${box.active_point}点`); return; }
  try {
    const d = await Api.post(`/daily/claim/${box.id}`);
    globalAlert(d.msg);
    await load();
  } catch (e) { globalAlert(e.message); }
}

onMounted(() => { load(); refreshTimer = setInterval(load, 15000); });
onUnmounted(() => { if (refreshTimer) clearInterval(refreshTimer); });
</script>

<style scoped>
.daily-page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 10px;
  min-height: 100%;
  overflow-y: auto;
}
.daily-bg {
  position: fixed; inset: 0; z-index: 0;
  background: linear-gradient(160deg, #0d1117 0%, #1a1a00 50%, #0d1117 100%);
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
.hud-active { font-size: 20px; font-weight: 700; color: #e2b70a; }
.hud-unit { font-size: 12px; color: #7f8c8d; margin-left: 2px; }
.loading-card {
  position: relative; z-index: 2;
  display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px;
}
.loading-spinner {
  width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.1);
  border-top-color: #e2b70a; border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 13px; color: #7f8c8d; }
.card-area { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 10px; }
.active-card {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; padding: 16px; text-align: center;
}
.ac-top { display: flex; justify-content: center; align-items: baseline; gap: 4px; margin-bottom: 8px; }
.ac-label { font-size: 12px; color: #7f8c8d; }
.ac-num { font-size: 28px; font-weight: 700; color: #e2b70a; }
.ac-total { font-size: 14px; color: #555; }
.ac-bar-wrap { margin-bottom: 8px; }
.ac-bar {
  height: 10px; background: rgba(255,255,255,0.08); border-radius: 5px; overflow: hidden;
}
.ac-fill {
  height: 100%; background: linear-gradient(90deg, #e2b70a, #f5d742);
  border-radius: 5px; transition: width 0.3s;
}
.ac-tip { font-size: 11px; color: #555; }
.tasks-card {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; padding: 14px 16px;
}
.tasks-header { font-size: 14px; font-weight: 700; color: #f0f0f0; margin-bottom: 10px; }
.tasks-list { display: flex; flex-direction: column; gap: 8px; }
.task-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 12px; background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
  transition: all 0.2s;
}
.task-item.completed { border-color: rgba(39,174,96,0.3); background: rgba(39,174,96,0.05); }
.ti-info { flex: 1; }
.ti-name { font-size: 13px; color: #ddd; font-weight: 600; }
.ti-desc { font-size: 11px; color: #555; margin-top: 2px; }
.ti-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; margin-left: 12px; }
.ti-progress { font-size: 13px; font-weight: 700; }
.ti-progress.done { color: #27ae60; }
.ti-progress.pending { color: #e2b70a; }
.ti-point { font-size: 11px; color: #555; }
.boxes-card {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; padding: 14px 16px;
}
.boxes-header { font-size: 14px; font-weight: 700; color: #f0f0f0; margin-bottom: 12px; }
.boxes-grid {
  display: flex; flex-wrap: wrap; gap: 8px;
}
.reward-box {
  width: calc(33% - 6px);
  min-width: 75px;
  padding: 10px 6px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}
.reward-box:hover:not(.claimed) { transform: translateY(-2px); }
.reward-box.can-claim { border-color: rgba(226,183,10,0.4); background: rgba(226,183,10,0.05); }
.reward-box.claimed { opacity: 0.5; cursor: default; }
.rb-icon { font-size: 22px; margin-bottom: 4px; }
.rb-point { font-size: 12px; color: #e2b70a; font-weight: 700; }
.rb-reward { font-size: 10px; color: #7f8c8d; margin-top: 2px; }
.rb-status { font-size: 10px; margin-top: 4px; }
.status-claimed { color: #27ae60; }
.status-can { color: #e2b70a; }
.status-locked { color: #555; }
</style>
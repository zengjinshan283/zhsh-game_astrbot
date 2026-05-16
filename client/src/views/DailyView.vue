<template>
  <div class="page">
    <div class="location-bar">
      <div class="location-name">📅 每日活跃</div>
    </div>

    <div v-if="loading" class="card" style="text-align:center;color:#888;padding:20px;">加载中...</div>
    <div v-else>

      <!-- 活跃度进度条 -->
      <div class="card" style="margin-bottom:12px;text-align:center;">
        <div style="font-size:13px;color:#888;margin-bottom:8px;">今日活跃度</div>
        <div style="font-size:28px;font-weight:bold;color:#e2b70a;">{{ status.total_active_point || 0 }}</div>
        <div style="font-size:12px;color:#666;margin-bottom:10px;">/ 100 点</div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: Math.min((status.total_active_point || 0), 100) + '%' }"></div>
        </div>
        <div style="font-size:11px;color:#555;margin-top:6px;">
          再获得 {{ Math.max(0, 100 - (status.total_active_point || 0)) }} 点即可领取全部宝箱
        </div>
      </div>

      <!-- 任务列表 -->
      <div class="card" style="margin-bottom:12px;">
        <div class="card-title">📋 今日任务</div>
        <div class="task-list">
          <div
            v-for="task in status.tasks"
            :key="task.key"
            :class="['task-item', { completed: task.completed }]"
          >
            <div class="task-info">
              <div class="task-name">{{ task.name }}</div>
              <div class="task-desc">{{ task.description }}</div>
            </div>
            <div class="task-progress">
              <span :class="{ 'text-success': task.completed, 'text-warning': !task.completed }">
                {{ task.completed ? '✓' : task.progress + '/' + task.target }}
              </span>
              <span class="task-point">+{{ task.active_point }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 宝箱奖励 -->
      <div class="card" style="margin-bottom:12px;">
        <div class="card-title">🎁 活跃宝箱</div>
        <div class="reward-grid">
          <div
            v-for="box in status.reward_boxes"
            :key="box.id"
            :class="['reward-box', {
              'can-claim': box.can_claim,
              'claimed': box.claimed
            }]"
            @click="claimBox(box)"
          >
            <div class="reward-icon">
              <span v-if="box.claimed">✅</span>
              <span v-else-if="box.can_claim">🎁</span>
              <span v-else>🔒</span>
            </div>
            <div class="reward-point">{{ box.active_point }}点</div>
            <div class="reward-reward">{{ getRewardText(box) }}</div>
            <div v-if="box.claimed" class="reward-status">已领取</div>
            <div v-else-if="box.can_claim" class="reward-status can">可领取</div>
            <div v-else class="reward-status locked">未达成</div>
          </div>
        </div>
      </div>

      <button @click="$router.back()" class="btn btn-secondary btn-block">返回</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { Api } from '../composables/useApi';

const loading = ref(true);
const status = ref({});
let refreshTimer = null;

async function load() {
  try {
    const d = await Api.get('/daily/status');
    status.value = d;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

function getRewardText(box) {
  if (box.reward_type === 'money') {
    return `${box.quantity}铜币`;
  }
  const itemNames = {
    3001: '千银矿石',
    96: '体力宝',
    94: '龙泉水',
    2001: '月华密令',
    2002: '龙门镖旗'
  };
  return itemNames[box.reward_value] || `物品×${box.quantity}`;
}

async function claimBox(box) {
  if (box.claimed) return;
  if (!box.can_claim) {
    alert(`活跃度不足，需要${box.active_point}点`);
    return;
  }
  try {
    const d = await Api.post(`/daily/claim/${box.id}`);
    alert(d.msg);
    await load();
  } catch (e) {
    alert(e.message);
  }
}

onMounted(() => {
  load();
  // 每15秒刷新一次
  refreshTimer = setInterval(load, 15000);
});

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer);
});
</script>

<style scoped>
.progress-bar {
  height: 12px;
  background: #1a1a2e;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #333;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #e2b70a, #f5d742);
  border-radius: 6px;
  transition: width 0.3s;
}
.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}
.task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #1a1a2e;
  border-radius: 8px;
  border: 1px solid #333;
}
.task-item.completed {
  border-color: #4caf50;
  background: #1a2e1a;
}
.task-info {
  flex: 1;
}
.task-name {
  font-size: 14px;
  color: #ddd;
  font-weight: 500;
}
.task-desc {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
}
.task-progress {
  text-align: right;
  margin-left: 12px;
}
.task-progress .text-success { color: #4caf50; font-size: 14px; font-weight: bold; }
.task-progress .text-warning { color: #e2b70a; font-size: 14px; }
.task-point {
  display: block;
  font-size: 11px;
  color: #888;
  margin-top: 2px;
}
.reward-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
  justify-content: space-between;
}
.reward-box {
  width: calc(33% - 8px);
  min-width: 80px;
  padding: 10px 6px;
  background: #1a1a2e;
  border-radius: 8px;
  border: 1px solid #333;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}
.reward-box.can-claim {
  border-color: #e2b70a;
  background: #1f1a0e;
}
.reward-box.can-claim:active {
  transform: scale(0.95);
}
.reward-box.claimed {
  opacity: 0.5;
  cursor: default;
}
.reward-icon {
  font-size: 24px;
  margin-bottom: 4px;
}
.reward-point {
  font-size: 12px;
  color: #e2b70a;
  font-weight: bold;
}
.reward-reward {
  font-size: 11px;
  color: #888;
  margin-top: 2px;
}
.reward-status {
  font-size: 10px;
  color: #555;
  margin-top: 4px;
}
.reward-status.can {
  color: #4caf50;
}
.reward-status.locked {
  color: #555;
}
</style>
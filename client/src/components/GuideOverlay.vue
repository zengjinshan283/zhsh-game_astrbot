<template>
  <Teleport to="body">
    <div v-if="active" class="guide-overlay" @click.self="close">
      <div class="guide-modal">
        <div class="guide-header">🌟 新手引导</div>
        <div class="guide-step-badge">第 {{ step }} 步 / 共 6 步</div>
        <div class="guide-content">{{ msg }}</div>
        <div class="guide-actions">
          <button @click="skip" class="btn btn-secondary btn-sm">跳过引导</button>
          <button @click="close" class="btn btn-primary btn-sm">我知道了</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue';
import { Api } from '../composables/useApi';
import { useUserStore } from '../stores/user';

const userStore = useUserStore();
const active = ref(false);
const msg = ref('');
const step = ref(0);
let pollTimer = null;

async function loadGuide() {
  if (!userStore.isLoggedIn) return;
  try {
    const d = await Api.get('/guide/status');
    if (d.active) {
      active.value = true;
      msg.value = d.msg;
      step.value = d.step;
      stopPoll();
    } else {
      active.value = false;
      // 未完成时继续轮询
      if (d.step !== 99 && d.step !== 0) {
        startPoll();
      } else {
        stopPoll();
      }
    }
  } catch (e) {
    stopPoll();
  }
}

function startPoll() {
  stopPoll();
  pollTimer = setInterval(loadGuide, 3000);
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function skip() {
  if (!confirm('确定跳过新手引导？跳过后可前往"福利中心"领取注册礼包。')) return;
  try {
    await Api.post('/guide/skip');
    active.value = false;
    stopPoll();
  } catch (e) {
    alert(e.message);
  }
}

function close() {
  active.value = false;
  // 3秒后重新检查（如果还没完成引导）
  setTimeout(loadGuide, 3000);
}

// 监听登录状态，登录后立即检查
watch(() => userStore.isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    setTimeout(loadGuide, 800); // 延迟加载避免抢首屏
  } else {
    active.value = false;
    stopPoll();
  }
}, { immediate: true });
</script>

<style scoped>
.guide-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.75);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.guide-modal {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 2px solid #c9a84c;
  border-radius: 16px;
  max-width: 360px;
  width: 100%;
  padding: 24px;
  box-shadow: 0 0 40px rgba(201, 168, 76, 0.2);
}
.guide-header {
  font-size: 20px;
  font-weight: bold;
  color: #c9a84c;
  text-align: center;
  margin-bottom: 8px;
}
.guide-step-badge {
  text-align: center;
  font-size: 12px;
  color: #888;
  margin-bottom: 16px;
}
.guide-content {
  font-size: 14px;
  color: #ddd;
  line-height: 1.7;
  text-align: center;
  margin-bottom: 20px;
  padding: 14px;
  background: rgba(201, 168, 76, 0.08);
  border-radius: 8px;
  border: 1px solid rgba(201, 168, 76, 0.2);
}
.guide-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
</style>
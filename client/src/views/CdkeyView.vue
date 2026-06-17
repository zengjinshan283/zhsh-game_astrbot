<template>
  <div class="page-wrap cdkey-page">

  <div class="page-hud"><div class="page-hud-title">🎫 兑换码</div></div>    <!-- 顶部 HUD -->
    <div class="top-hud">
      <div class="hud-left">
        <div class="hud-icon">🎁</div>
        <div class="hud-title">礼包兑换</div>
      </div>
      <div class="hud-sub">输入CDKEY领取豪华奖励</div>
    </div>

    <!-- 提示消息 -->
    <div class="msg-card" v-if="msg" :class="{ error: msgType === 'error' }">
      {{ msgType === 'error' ? '❌' : '✅' }} {{ msg }}
    </div>

    <!-- 礼包预览 -->
    <div class="preview-card" v-if="preview && preview.canClaim">
      <div class="preview-header">📦 {{ preview.reward_desc || '礼包内容' }}</div>
      <div class="preview-items">
        <div v-for="r in preview.rewards" :key="r.id" class="preview-item">
          <span class="pi-name">{{ r.item_name || '铜币' }}</span>
          <span class="pi-qty">x{{ r.quantity || r.money || r.coupon }}</span>
        </div>
      </div>
    </div>

    <!-- 兑换表单 -->
    <div class="redeem-card">
      <div class="redeem-header">🔑 兑换码</div>
      <form @submit.prevent="redeemCode" class="redeem-form">
        <input
          v-model="codeInput"
          type="text"
          class="code-input"
          placeholder="请输入兑换码"
          @input="codeInput = codeInput.toUpperCase().replace(/[^A-Z0-9]/g, '')"
        />
        <button type="submit" class="redeem-btn" :disabled="!codeInput">兑换</button>
      </form>
      <div class="redeem-tip">CDKEY格式：8-12位字母数字组合，不区分大小写</div>
    </div>

    <!-- 礼包类型说明 -->
    <div class="info-card">
      <div class="info-header">📋 礼包类型说明</div>
      <div class="info-list">
        <div class="info-item">
          <span class="info-tag">🆕</span>
          <span class="info-text">新手礼包 - 新注册玩家专属</span>
        </div>
        <div class="info-item">
          <span class="info-tag">⭐</span>
          <span class="info-text">升级礼包 - 达到指定等级领取</span>
        </div>
        <div class="info-item">
          <span class="info-tag">🎉</span>
          <span class="info-text">节日礼包 - 节日活动发放</span>
        </div>
        <div class="info-item">
          <span class="info-tag">💰</span>
          <span class="info-text">金币礼包 - 直接获得铜币</span>
        </div>
      </div>
    </div>

    <!-- 兑换历史 -->
    <div class="history-card" v-if="history.length">
      <div class="history-header">📜 兑换历史</div>
      <div class="history-list">
        <div v-for="h in history" :key="h.id" class="history-item">
          <span class="hi-code">{{ h.code }}</span>
          <span class="hi-arrow">→</span>
          <span class="hi-reward">{{ h.reward_desc }}</span>
          <span class="hi-time">{{ formatTime(h.created_at) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Api } from '../composables/useApi';

const codeInput = ref('');
const msg = ref('');
const msgType = ref('success');
const preview = ref(null);
const history = ref([]);

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

async function redeemCode() {
  msg.value = '';
  if (!codeInput.value.trim()) return;
  try {
    const d = await Api.post('/cdkey/redeem', { code: codeInput.value.trim() });
    msg.value = d.msg;
    msgType.value = 'success';
    codeInput.value = '';
    preview.value = null;
    await loadHistory();
  } catch (e) {
    msg.value = e.message;
    msgType.value = 'error';
  }
}

async function loadHistory() {}
</script>

<style scoped>
.cdkey-page {
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
.hud-sub { font-size: 11px; color: #7f8c8d; background: rgba(255,255,255,0.06); padding: 2px 10px; border-radius: 10px; }
.msg-card {
  position: relative; z-index: 2;
  border-radius: 10px; padding: 8px 14px;
  font-size: 12px; font-weight: 600; text-align: center;
}
.msg-card.error { background: rgba(184,90,58,0.1); border: 1px solid rgba(184,90,58,0.3); color: #e74c3c; }
.msg-card:not(.error) { background: rgba(39,174,96,0.1); border: 1px solid rgba(39,174,96,0.3); color: #27ae60; }
.preview-card {
  position: relative; z-index: 2;
  background: rgba(201,168,76,0.05); border: 1px solid rgba(201,168,76,0.3);
  border-radius: 12px; padding: 12px 14px;
}
.preview-header { font-size: 13px; font-weight: 700; color: #f0f0f0; margin-bottom: 8px; }
.preview-items { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.preview-item {
  background: rgba(201,168,76,0.1); border-radius: 6px;
  padding: 6px 8px; display: flex; justify-content: space-between;
}
.pi-name { font-size: 11px; color: #c9a84c; font-weight: 600; }
.pi-qty { font-size: 11px; color: #cfc19e; }
.redeem-card {
  position: relative; z-index: 2;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; padding: 14px 16px;
}
.redeem-header { font-size: 14px; font-weight: 700; color: #f0f0f0; margin-bottom: 10px; }
.redeem-form { display: flex; gap: 8px; margin-bottom: 8px; }
.code-input {
  flex: 1;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; padding: 10px 12px;
  font-size: 14px; font-family: monospace; letter-spacing: 2px;
  color: #f0f0f0; outline: none; text-transform: uppercase;
}
.code-input:focus { border-color: rgba(201,168,76,0.4); }
.redeem-btn {
  background: linear-gradient(135deg, #c9a84c, #8b6914); border: none;
  border-radius: 8px; color: #fff; font-weight: 700;
  font-size: 13px; padding: 10px 16px; cursor: pointer; transition: all 0.2s;
}
.redeem-btn:hover:not(:disabled) { transform: scale(1.05); box-shadow: 0 4px 12px rgba(201,168,76,0.4); }
.redeem-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.redeem-tip { font-size: 11px; color: #555; }
.info-card {
  position: relative; z-index: 2;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; padding: 14px 16px;
}
.info-header { font-size: 14px; font-weight: 700; color: #f0f0f0; margin-bottom: 10px; }
.info-list { display: flex; flex-direction: column; gap: 6px; }
.info-item { display: flex; align-items: center; gap: 8px; }
.info-tag { font-size: 14px; }
.info-text { font-size: 12px; color: #7f8c8d; }
.history-card {
  position: relative; z-index: 2;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; padding: 14px 16px;
}
.history-header { font-size: 14px; font-weight: 700; color: #f0f0f0; margin-bottom: 10px; }
.history-list { display: flex; flex-direction: column; gap: 6px; }
.history-item {
  display: flex; align-items: center; gap: 6px;
  padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
  font-size: 11px;
}
.history-item:last-child { border-bottom: none; }
.hi-code { font-family: monospace; color: #c9a84c; font-weight: 600; letter-spacing: 1px; }
.hi-arrow { color: #555; }
.hi-reward { color: #7f8c8d; flex: 1; }
.hi-time { color: #555; }
</style>
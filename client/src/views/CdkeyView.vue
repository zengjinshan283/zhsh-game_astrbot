<template>
<div class="page">
<div class="location-bar">
  <div class="location-name">🎁 礼包兑换</div>
  <div class="location-path">输入CDKEY领取豪华奖励</div>
</div>

<div v-if="msg" class="card" :style="{borderColor:msgType==='error'?'#73281c':'#2e5a3b',padding:'3px 8px',marginBottom:'8px'}">
  <p :style="{color:msgType==='error'?'#b85a3a':'#2e5a3b',fontSize:'11px',margin:0}">{{ msgType==='error'?'❌':'✅' }} {{ msg }}</p>
</div>

<div v-if="preview && preview.canClaim" class="card" style="margin-bottom:8px;border-color:#8b6914;">
  <div class="card-title">📦 {{ preview.reward_desc || '礼包内容' }}</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;">
    <div v-for="r in preview.rewards" :key="r.id" style="background:rgba(139,105,20,0.1);padding:6px;border-radius:4px;font-size:11px;">
      <span style="color:#c9a84c;">{{ r.item_name || '铜币' }}</span>
      <span style="color:#cfc19e;margin-left:4px;">x{{ r.quantity || r.money || r.coupon }}</span>
    </div>
  </div>
</div>

<div class="card">
  <div class="card-title">🔑 兑换码</div>
  <form @submit.prevent="redeemCode" style="display:flex;gap:6px;margin-top:8px;">
    <input v-model="codeInput" type="text" class="form-input" placeholder="请输入兑换码" style="flex:1;font-family:monospace;letter-spacing:1px;text-transform:uppercase;" @input="codeInput=codeInput.toUpperCase().replace(/[^A-Z0-9]/g,'')">
    <button type="submit" class="btn btn-primary" style="white-space:nowrap;" :disabled="!codeInput">兑换</button>
  </form>
  <div style="margin-top:6px;font-size:11px;color:#8a7350;">
    CDKEY格式：8-12位字母数字组合，不区分大小写
  </div>
</div>

<div class="card" style="margin-top:8px;">
  <div class="card-title">📋 礼包类型说明</div>
  <div style="font-size:11px;color:#8a7350;margin-top:4px;">
    <div style="display:flex;align-items:center;gap:6px;padding:3px 0;">
      <span style="color:#c9a84c;">🆕</span><span>新手礼包 - 新注册玩家专属</span>
    </div>
    <div style="display:flex;align-items:center;gap:6px;padding:3px 0;">
      <span style="color:#c9a84c;">⭐</span><span>升级礼包 - 达到指定等级领取</span>
    </div>
    <div style="display:flex;align-items:center;gap:6px;padding:3px 0;">
      <span style="color:#c9a84c;">🎉</span><span>节日礼包 - 节日活动发放</span>
    </div>
    <div style="display:flex;align-items:center;gap:6px;padding:3px 0;">
      <span style="color:#c9a84c;">💰</span><span>金币礼包 - 直接获得铜币</span>
    </div>
  </div>
</div>

<div v-if="history.length" class="card" style="margin-top:8px;">
  <div class="card-title">📜 兑换历史</div>
  <div v-for="h in history" :key="h.id" style="padding:4px 0;border-bottom:1px solid rgba(169,119,78,0.05);font-size:11px;color:#8a7350;">
    {{ h.code }} → {{ h.reward_desc }}
    <span style="color:#5a4a30;">{{ formatTime(h.created_at) }}</span>
  </div>
</div>

<router-link to="/map" class="btn btn-secondary btn-block mt-10">← 返回地图</router-link>
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

async function loadHistory() {
  // history loaded on demand via redeemCode response
}
</script>

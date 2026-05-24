<template>
<div class="bank-page">
  <div class="bank-bg"></div>

  <!-- HUD -->
  <div class="bank-hud">
    <div class="bh-title">🏦 银行</div>
    <div class="bh-sub">最安全的资金保管</div>
  </div>

  <!-- 消息 -->
  <div v-if="msg" class="bank-toast" :class="msgType === 'error' ? 'toast-err' : 'toast-ok'">
    {{ msgType === 'error' ? '❌' : '✅' }} {{ msg }}
  </div>

  <!-- 资产总览 -->
  <div class="asset-card">
    <div class="ac-icon">🏦</div>
    <div class="ac-trio">
      <div class="ac-item">
        <div class="aci-label">携带 💰</div>
        <div class="aci-val text-gold">{{ formatMoney(info.money) }}</div>
      </div>
      <div class="ac-divider"></div>
      <div class="ac-item">
        <div class="aci-label">存款 🏦</div>
        <div class="aci-val" style="color:#2ecc71">{{ formatMoney(info.bank_money) }}</div>
      </div>
      <div class="ac-divider"></div>
      <div class="ac-item">
        <div class="aci-label">总资产</div>
        <div class="aci-val text-gold" style="font-size:16px;">{{ formatMoney((info.money||0)+(info.bank_money||0)) }}</div>
      </div>
    </div>
  </div>

  <!-- 存款/取款 -->
  <div class="tx-grid">
    <div class="tx-card tx-deposit">
      <div class="tx-title">💰 存入</div>
      <div class="tx-input-row">
        <input v-model.number="amount" type="number" class="tx-input" placeholder="输入金额" min="1">
        <button class="tx-btn tx-btn-deposit" @click="deposit">存入</button>
      </div>
      <div class="tx-quick">
        <button class="tx-quick-btn" @click="quickDeposit(Math.floor((info.money||0)*0.5))">存50%</button>
        <button class="tx-quick-btn" @click="quickDeposit(info.money||0)">全存</button>
      </div>
    </div>
    <div class="tx-card tx-withdraw">
      <div class="tx-title">💰 取款</div>
      <div class="tx-input-row">
        <input v-model.number="amount" type="number" class="tx-input" placeholder="输入金额" min="1">
        <button class="tx-btn tx-btn-withdraw" @click="withdraw">取出</button>
      </div>
      <div class="tx-quick">
        <button class="tx-quick-btn" @click="quickWithdraw(Math.floor((info.bank_money||0)*0.5))">取50%</button>
        <button class="tx-quick-btn" @click="quickWithdraw(info.bank_money||0)">全取</button>
      </div>
    </div>
  </div>

  <!-- 交易记录 -->
  <div class="log-card" v-if="logs.length">
    <div class="lc-title">📜 最近交易</div>
    <div class="lc-list">
      <div v-for="log in logs" :key="log.id" class="lc-item">
        <div class="lci-type">{{ logTypeName(log.type) }}</div>
        <div class="lci-amount" :style="{color: (log.type===1||log.type===3) ? '#2ecc71' : '#e74c3c'}">
          {{ (log.type===1||log.type===3) ? '+' : '−' }}{{ formatMoney(log.amount) }}
        </div>
      </div>
    </div>
  </div>

  <router-link to="/map" class="bank-back">← 返回地图</router-link>
</div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Api } from '../composables/useApi';

const info = ref({ money: 0, bank_money: 0 });
const amount = ref(null);
const msg = ref('');
const msgType = ref('success');
const logs = ref([]);

function formatMoney(n) { if (!n) return '0'; if (n >= 100000000) return (n/100000000).toFixed(1)+'亿'; if (n >= 10000) return (n/10000).toFixed(1)+'万'; return n.toLocaleString(); }
function logTypeName(t) { return {1:'存入',2:'取出',3:'利息',4:'转帐'}[t]||'交易'; }

async function loadBank() { try { const d = await Api.get('/npc/1/bank'); info.value = d; logs.value = d.logs||[]; } catch(e) { msg.value = e.message; msgType.value='error'; } }

async function deposit() {
  msg.value='';
  const amt = parseInt(amount.value);
  if (!amt || amt <= 0) return;
  try { const d = await Api.post('/npc/deposit', {amount: amt}); msg.value=`存入 ${formatMoney(amt)} 铜币`; msgType.value='success'; info.value.money = d.money; info.value.bank_money = d.bank_money; amount.value=null; await loadBank(); }
  catch(e) { msg.value = e.message; msgType.value='error'; }
}
async function withdraw() {
  msg.value='';
  const amt = parseInt(amount.value);
  if (!amt || amt <= 0) return;
  try { const d = await Api.post('/npc/withdraw', {amount: amt}); msg.value=`取出 ${formatMoney(amt)} 铜币`; msgType.value='success'; info.value.money = d.money; info.value.bank_money = d.bank_money; amount.value=null; await loadBank(); }
  catch(e) { msg.value = e.message; msgType.value='error'; }
}
async function quickDeposit(amt) { if (!amt || amt <= 0) return; try { await Api.post('/npc/deposit', {amount: amt}); await loadBank(); } catch(e) {} }
async function quickWithdraw(amt) { if (!amt || amt <= 0) return; try { await Api.post('/npc/withdraw', {amount: amt}); await loadBank(); } catch(e) {} }

onMounted(loadBank);
</script>

<style scoped>
.bank-page {
  position: relative; display: flex; flex-direction: column; gap: 10px;
  padding: 8px 10px; min-height: 100%; overflow-y: auto;
}
.bank-bg {
  position: fixed; inset: 0; z-index: 0;
  background: linear-gradient(160deg, #0d1117 0%, #0d1a1a 50%, #0d1117 100%);
  pointer-events: none;
}

/* HUD */
.bank-hud {
  position: relative; z-index: 2;
  display: flex; justify-content: space-between; align-items: center;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 10px 14px;
}
.bh-title { font-size: 16px; font-weight: 700; color: #f0f0f0; }
.bh-sub { font-size: 11px; color: #7f8c8d; }

/* Toast */
.bank-toast { position: relative; z-index: 2; border-radius: 8px; padding: 7px 12px; font-size: 11px; }
.toast-err { background: rgba(231,76,60,0.1); border: 1px solid rgba(231,76,60,0.3); color: #e74c3c; }
.toast-ok { background: rgba(39,174,96,0.1); border: 1px solid rgba(39,174,96,0.3); color: #2ecc71; }

/* 资产卡 */
.asset-card {
  position: relative; z-index: 2;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; padding: 16px;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}
.ac-icon { font-size: 32px; }
.ac-trio { display: flex; align-items: center; width: 100%; gap: 8px; }
.ac-item { flex: 1; text-align: center; }
.aci-label { font-size: 10px; color: #7f8c8d; margin-bottom: 3px; }
.aci-val { font-size: 13px; font-weight: 700; color: #f0f0f0; }
.ac-divider { width: 1px; height: 28px; background: rgba(255,255,255,0.08); }

/* 交易卡片 */
.tx-grid { position: relative; z-index: 2; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.tx-card {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 12px;
}
.tx-deposit { border-color: rgba(39,174,96,0.3); background: rgba(39,174,96,0.04); }
.tx-withdraw { border-color: rgba(52,152,219,0.3); background: rgba(52,152,219,0.04); }
.tx-title { font-size: 12px; font-weight: 700; color: #f0f0f0; margin-bottom: 8px; }
.tx-input-row { display: flex; gap: 6px; margin-bottom: 6px; }
.tx-input {
  flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; padding: 7px 10px; font-size: 12px; color: #f0f0f0; outline: none;
}
.tx-input:focus { border-color: rgba(255,255,255,0.2); }
.tx-btn {
  padding: 7px 12px; border: none; border-radius: 8px; font-size: 11px; font-weight: 600;
  cursor: pointer; transition: opacity 0.2s; white-space: nowrap;
}
.tx-btn-deposit { background: linear-gradient(135deg, #1a4a2a, #27ae60); color: #fff; }
.tx-btn-withdraw { background: linear-gradient(135deg, #1a3a5a, #2980b9); color: #fff; }
.tx-btn:hover { opacity: 0.9; }
.tx-quick { display: flex; gap: 4px; }
.tx-quick-btn {
  flex: 1; padding: 5px; border-radius: 6px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  color: #7f8c8d; font-size: 10px; cursor: pointer; transition: all 0.2s;
}
.tx-quick-btn:hover { background: rgba(255,255,255,0.1); }

/* 交易记录 */
.log-card {
  position: relative; z-index: 2;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 12px;
}
.lc-title { font-size: 11px; font-weight: 600; color: #7f8c8d; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
.lc-list {}
.lc-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
}
.lc-item:last-child { border-bottom: none; }
.lci-type { font-size: 11px; color: #7f8c8d; }
.lci-amount { font-size: 12px; font-weight: 700; }

.bank-back {
  position: relative; z-index: 2; text-align: center;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  color: #95a5a6; padding: 10px; border-radius: 10px;
  font-size: 12px; text-decoration: none; transition: all 0.2s;
}
.bank-back:hover { background: rgba(255,255,255,0.08); color: #bdc3c7; }
</style>
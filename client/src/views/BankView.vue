<template>
<div class="page">
<div class="location-bar"><div class="location-name">🏦 银行</div><div class="location-path">最安全的资金保管</div></div>
<div v-if="msg" class="card" :style="{borderColor:msgType==='error'?'#73281c':'#2e5a3b',padding:'3px 8px'}">
<p :style="{color:msgType==='error'?'#b85a3a':'#2e5a3b',fontSize:'11px',margin:0}">{{ msgType==='error'?'❌':'✅' }} {{ msg }}</p>
</div>
<div class="card">
<div class="card-title">📊 资产</div>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:2px;font-size:12px;text-align:center;">
<div><span style="color:#cfc19e;">携带</span><br><span class="text-gold" style="font-weight:bold;">{{ formatMoney(info.money) }}</span></div>
<div><span style="color:#cfc19e;">存款</span><br><span style="color:#2e5a3b;font-weight:bold;">{{ formatMoney(info.bank_money) }}</span></div>
<div><span style="color:#cfc19e;">总资产</span><br><span class="text-gold" style="font-weight:bold;font-size:14px;">{{ formatMoney((info.money||0)+(info.bank_money||0)) }}</span></div>
</div>
</div>
<div class="card" style="padding:8px;">
<div class="card-title">💰 存款</div>
<form @submit.prevent="deposit" style="display:flex;gap:6px;">
<input v-model.number="amount" type="number" class="form-input" placeholder="金额" min="1">
<button type="submit" class="btn btn-primary" style="white-space:nowrap;">存入</button>
</form>
<div style="display:flex;gap:6px;margin-top:6px;">
<button class="btn btn-secondary btn-small" @click="quickDeposit(Math.floor((info.money||0)*0.5))" style="flex:1;font-size:11px;">存50%</button>
<button class="btn btn-secondary btn-small" @click="quickDeposit(info.money||0)" style="flex:1;font-size:11px;">全存</button>
</div>
</div>
<div class="card" style="padding:8px;">
<div class="card-title">💰 取款</div>
<form @submit.prevent="withdraw" style="display:flex;gap:6px;">
<input v-model.number="amount" type="number" class="form-input" placeholder="金额" min="1">
<button type="submit" class="btn btn-secondary" style="white-space:nowrap;">取出</button>
</form>
<div style="display:flex;gap:6px;margin-top:6px;">
<button class="btn btn-secondary btn-small" @click="quickWithdraw(Math.floor((info.bank_money||0)*0.5))" style="flex:1;font-size:11px;">取50%</button>
<button class="btn btn-secondary btn-small" @click="quickWithdraw(info.bank_money||0)" style="flex:1;font-size:11px;">全取</button>
</div>
</div>
<div v-if="logs.length" class="card">
<div class="card-title">📜 最近交易</div>
<div v-for="log in logs" :key="log.id" style="padding:4px 0;border-bottom:1px solid rgba(169,119,78,0.05);font-size:11px;display:flex;justify-content:space-between;">
<span style="color:#cfc19e;">{{ logTypeName(log.type) }}</span>
<span :style="{color:(log.type==1||log.type==3)?'#2e5a3b':'#73281c'}">{{ (log.type==1||log.type==3)?'+':'−' }}{{ formatMoney(log.amount) }}</span>
</div>
</div>
<router-link to="/map" class="btn btn-secondary btn-block mt-10">← 返回地图</router-link>
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
function formatMoney(n){if(!n)return'0';if(n>=100000000)return(n/100000000).toFixed(1)+'亿';if(n>=10000)return(n/10000).toFixed(1)+'万';return n.toLocaleString();}
function logTypeName(t){return{1:'存入',2:'取出',3:'利息',4:'转帐'}[t]||'交易';}
async function loadBank(){try{const d=await Api.get('/npc/1/bank');info.value=d;logs.value=d.logs||[];}catch(e){msg.value=e.message;msgType.value='error';}}
async function deposit(){msg.value='';const amt=parseInt(amount.value);if(!amt||amt<=0)return;try{const d=await Api.post('/npc/deposit',{amount:amt});msg.value=`存入 ${formatMoney(amt)} 铜币`;msgType.value='success';info.value.money=d.money;info.value.bank_money=d.bank_money;amount.value=null;await loadBank();}catch(e){msg.value=e.message;msgType.value='error';}}
async function withdraw(){msg.value='';const amt=parseInt(amount.value);if(!amt||amt<=0)return;try{const d=await Api.post('/npc/withdraw',{amount:amt});msg.value=`取出 ${formatMoney(amt)} 铜币`;msgType.value='success';info.value.money=d.money;info.value.bank_money=d.bank_money;amount.value=null;await loadBank();}catch(e){msg.value=e.message;msgType.value='error';}}
async function quickDeposit(amt){if(!amt||amt<=0)return;try{await Api.post('/npc/deposit',{amount:amt});await loadBank();}catch(e){}}
async function quickWithdraw(amt){if(!amt||amt<=0)return;try{await Api.post('/npc/withdraw',{amount:amt});await loadBank();}catch(e){}}
onMounted(loadBank);
</script>

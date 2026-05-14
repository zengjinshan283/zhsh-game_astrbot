<template>
<div class="page">
<div class="location-bar"><div class="location-name">🎰 赌场</div><div class="location-path">💰铜币：<span class="text-gold">{{ formatMoney(money) }}</span></div></div>
<div v-if="msg" class="card" :style="{borderColor:msgType==='error'?'#73281c':'#2e5a3b',padding:'3px 8px',textAlign:'center'}">
<p :style="{color:msgType==='error'?'#b85a3a':'#2e5a3b',fontSize:'14px',fontWeight:'bold',margin:0}">{{ msgType==='error'?'😞':'🎉' }} {{ msg }}</p>
</div>
<div v-if="result" class="card" :style="{borderColor:result.isWin?'#2e5a3b':'#73281c',textAlign:'center',padding:'8px'}">
<div style="font-size:40px;">{{ diceFaces[result.dice1] }} + {{ diceFaces[result.dice2] }} = <span style="font-size:22px;color:#c9a758;font-weight:bold;">{{ result.total }}</span></div>
<div style="font-size:14px;margin:4px 0;">{{ result.isBig?'🔵大':'🔵小' }} · 你选了{{ result.choice==='big'?'大':'小' }}
<span v-if="result.isWin" style="color:#2e5a3b;"> → 猜对了！</span><span v-else style="color:#73281c;"> → 猜错了</span></div>
</div>
<div class="card" style="padding:8px 10px;">
<div class="card-title">🎲 猜大小</div>
<div style="font-size:11px;color:#cfc19e;margin-bottom:6px;">🎲 两个骰子 ⚬小(2~6) ⚬大(7~12) · 猜对赢双倍</div>
<div style="display:flex;gap:6px;margin-bottom:8px;">
<div :class="'choice-btn choice-big'+(choice==='big'?' active':'')" @click="choice='big'">⬤ 大 (7-12)</div>
<div :class="'choice-btn choice-small'+(choice==='small'?' active':'')" @click="choice='small'">⬤ 小 (2-6)</div>
</div>
<div style="display:flex;gap:6px;">
<input v-model.number="betAmount" type="number" min="1" placeholder="下注金额" class="form-input" style="flex:1;padding:8px 10px;">
<button class="btn btn-success btn-small" @click="bet" style="white-space:nowrap;">下注</button>
</div>
<div style="display:flex;gap:6px;margin-top:6px;">
<button class="btn btn-secondary btn-small" @click="betAmount=100;bet()" style="flex:1;">⚡ 快捷100</button>
<button class="btn btn-secondary btn-small" @click="betAmount=500;bet()" style="flex:1;">⚡ 快捷500</button>
<button class="btn btn-secondary btn-small" @click="betAmount=Math.min(1000,money);bet()" style="flex:1;">⚡ 全押</button>
</div>
</div>
<router-link to="/map" class="btn btn-secondary btn-block mt-10">← 返回地图</router-link>
</div>
</template>
<style>
.choice-btn{flex:1;cursor:pointer;border-radius:8px;padding:12px 0;text-align:center;font-size:16px;font-weight:bold;transition:all 0.2s;border:3px solid transparent;opacity:0.5;}
.choice-btn.active{opacity:1;transform:scale(1.03);}
.choice-big{background:linear-gradient(135deg,#73281c,#5c1f15);color:#fff;}
.choice-big.active{border-color:#b85a3a;box-shadow:0 0 20px rgba(115,40,28,0.5);}
.choice-small{background:linear-gradient(135deg,#3f6a4a,#35573f);color:#fff;}
.choice-small.active{border-color:#5f8a6f;box-shadow:0 0 20px rgba(63,106,74,0.5);}
</style>
<script setup>
import { ref, onMounted } from 'vue';
import { useUserStore } from '../stores/user';
import { Api } from '../composables/useApi';
const userStore=useUserStore();
const money=ref(0);const choice=ref('');const betAmount=ref(null);
const result=ref(null);const msg=ref('');const msgType=ref('');
const diceFaces={1:'⚀',2:'⚁',3:'⚂',4:'⚃',5:'⚄',6:'⚅'};
function formatMoney(n){if(!n)return'0';if(n>=100000000)return(n/100000000).toFixed(1)+'亿';if(n>=10000)return(n/10000).toFixed(1)+'万';return n.toLocaleString();}
async function bet(){
if(!choice.value){return;}
if(!betAmount.value||betAmount.value<=0){msg.value='请输入有效金额';msgType.value='error';return;}
try{const d=await Api.post('/casino/bet',{amount:betAmount.value,choice:choice.value});result.value={dice1:d.dice1,dice2:d.dice2,total:d.total,isBig:d.isBig,choice:d.choice,isWin:d.isWin};msg.value=d.msg;msgType.value=d.success?'success':'error';const me=await Api.get('/auth/me');userStore.updateUser(me.user);money.value=me.user.money;}catch(e){msg.value=e.message;msgType.value='error';}
}
onMounted(async()=>{try{const me=await Api.get('/auth/me');userStore.updateUser(me.user);money.value=me.user.money;}catch(e){}});
</script>

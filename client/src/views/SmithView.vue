<template>
<div class="page">
<div class="location-bar"><div class="location-name">🔨 铁匠铺</div><div class="location-path">💰铜币：<span class="text-gold">{{ formatMoney(userStore.money) }}</span></div></div>
<div v-if="msg" class="card" :style="{borderColor:msgType==='error'?'#73281c':'#2e5a3b',padding:'3px 8px',textAlign:'center'}">
<p :style="{color:msgType==='error'?'#b85a3a':'#2e5a3b',fontSize:'13px',fontWeight:'bold',margin:0}">{{ msg }}</p>
</div>
<div class="card" style="border-color:#6f5632;padding:3px 8px;">
<div style="font-size:11px;color:#cfc19e;">+1~5成功率<span style="color:#2e5a3b;">90%</span> · +6~8<span style="color:#6f5632;">70%</span> · +9~10<span style="color:#73281c;">30%</span> · ⚠️+7以上失败<span style="color:#73281c;">降级</span> · 💰费用=(等级+1)×200</div>
</div>
<div v-if="!items.length" class="card"><div class="empty-state">背包中没有可强化的装备</div></div>
<div v-for="item in items" :key="item.inv_id" class="card" :style="{borderColor:getEnhColor(item.enhance_level),padding:'4px 8px'}">
<div style="display:flex;justify-content:space-between;align-items:center;">
<span class="item-name" style="font-size:12px;">{{ item.subtype==='weapon'?'🗡️':'🛡️' }} {{ item.name }}<span v-if="item.enhance_level>0" :style="{color:getEnhColor(item.enhance_level),fontWeight:'bold'}">+{{ item.enhance_level }}</span></span>
<span style="font-size:11px;">⚔️{{ item.atk||0 }}→{{ calcStat(item.atk,item.enhance_level) }} {{ item.def_val?'🛡️'+item.def_val+'→'+calcStat(item.def_val,item.enhance_level):'' }}</span>
</div>
<div v-if="item.enhance_level<10" style="display:flex;justify-content:space-between;align-items:center;margin-top:3px;font-size:11px;">
<span style="color:#cfc19e;">💰{{ getCost(item.enhance_level) }}铜 · 成功率<span :style="{color:getRate(item.enhance_level)>=70?'#2e5a3b':'#73281c'}">{{ getRate(item.enhance_level) }}%</span></span>
<button class="btn btn-primary btn-small" @click="enhance(item.inv_id,item.name,item.enhance_level)" style="font-size:10px;padding:3px 10px;">🔨 强化</button>
</div>
<div v-else style="text-align:center;margin-top:2px;"><span style="color:#c9a758;font-weight:bold;font-size:12px;">👑 已满级</span></div>
</div>
<router-link to="/map" class="btn btn-secondary btn-block mt-10">← 返回地图</router-link>
</div>
</template>
<script setup>
import { globalConfirm, globalAlert } from '../composables/useConfirm';
import { ref, onMounted } from 'vue';
import { useUserStore } from '../stores/user';
import { Api } from '../composables/useApi';
const userStore = useUserStore();
const items = ref([]);
const msg = ref(''); const msgType = ref('');
function formatMoney(n){if(!n)return'0';if(n>=100000000)return(n/100000000).toFixed(1)+'亿';if(n>=10000)return(n/10000).toFixed(1)+'万';return n.toLocaleString();}
function getRate(l){return l>=9?30:l>=6?70:90;}
function getCost(l){return(l+1)*200;}
function getEnhColor(l){return l>=9?'#b85a3a':l>=7?'#6f5632':l>=5?'#9b59b6':l>=3?'#3f6a4a':'#2e5a3b';}
function calcStat(base,level){return Math.round((base||0)*(1+level*0.03));}
async function load(){try{const d=await Api.get('/smith/items');items.value=d.items||[];}catch(e){msg=e.message;msgType='error';}}
async function enhance(id,name,level){
if(level>=10)return;
if(!(await globalConfirm('花费'+getCost(level)+'铜强化? 成功率'+getRate(level)+'%'+(level>=7?' 失败降级':''))))return;
try{const d=await Api.post('/smith/enhance',{inventory_id:id});msg=d.msg;msgType=d.success?'success':'error';const me=await Api.get('/auth/me');userStore.updateUser(me.user);await load();}catch(e){msg=e.message;msgType='error';}
}
onMounted(load);
</script>

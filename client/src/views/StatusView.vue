<template>
<div class="page">
<div class="location-bar"><div class="location-name">{{ data.user?.sex===2?'♀':'♂' }} {{ data.user?.username }}</div><div class="location-path">Lv.{{ data.user?.level }} · {{ data.user?.sex===2?'女':'男' }}{{ data.pet?' · 🐾'+data.pet.nickname:'' }}</div></div>
<div class="card">
<div class="status-bar bar-hp" :class="{'bar-low':data.user?.hp/data.user?.hp_max<0.3}">
<div class="bar-label"><span>❤️ HP</span><span>{{ data.user?.hp }}/{{ data.user?.hp_max }}</span></div>
<div class="bar-track"><div class="bar-fill" :style="{width:hpPct+'%'}"></div></div>
</div>
<div class="status-bar bar-exp mt-4">
<div class="bar-label"><span>✨ EXP</span><span>{{ data.user?.exp }}/{{ data.user?.exp_max }}</span></div>
<div class="bar-track"><div class="bar-fill" :style="{width:expPct+'%'}"></div></div>
</div>
</div>
<div class="card">
<div class="card-title">📊 属性</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;font-size:12px;">
<span style="color:#cfc19e;">⚔️ 攻击力</span><span style="text-align:right;">{{ data.stats?.atk_min }}-{{ data.stats?.atk_max }} <span v-if="data.stats?.bonusAtk>0" style="color:#2e5a3b;font-size:10px;">(+{{ data.stats.bonusAtk }})</span></span>
<span style="color:#cfc19e;">🛡️ 防御力</span><span style="text-align:right;">{{ data.stats?.def }} <span v-if="data.stats?.bonusDef>0" style="color:#2e5a3b;font-size:10px;">(+{{ data.stats.bonusDef }})</span></span>
<span style="color:#cfc19e;">💨 敏捷</span><span style="text-align:right;">{{ data.user?.agility }}</span>
<span style="color:#cfc19e;">🚚 铜币</span><span style="text-align:right;" class="text-gold">{{ formatMoney(data.user?.money) }}</span>
<span style="color:#cfc19e;">🏦 存款</span><span style="text-align:right;color:#2e5a3b;">{{ formatMoney(data.user?.bank_money) }}</span>
<span style="color:#cfc19e;">🚚 金币</span><span style="text-align:right;" class="text-gold">{{ data.user?.gold }}</span>
</div>
</div>
<div v-if="data.equips?.length" class="card">
<div class="card-title">⚔️ 已装备</div>
<div v-for="eq in data.equips" :key="eq.inv_id" class="compact-row">
<span class="item-name">{{ eq.name }}<span v-if="eq.enhance_level>0" style="color:#c9a758;">+{{ eq.enhance_level }}</span></span>
<span class="text-green" style="font-size:11px;">{{ eq.atk>0?'攻+'+Math.round(eq.atk*(1+eq.enhance_level*0.03)):'' }}{{ eq.def_val>0?' 防+'+Math.round(eq.def_val*(1+eq.enhance_level*0.03)):'' }}</span>
</div>
</div>
<div class="card">
<div class="card-title">⚡ 战斗快捷栏</div>
<div style="display:flex;gap:6px;justify-content:center;">
<template v-for="i in 3" :key="i">
<router-link v-if="shortcuts[i-1]" :to="{}" @click.prevent="clearSlot(i)" style="display:flex;flex-direction:column;align-items:center;width:56px;padding:4px 2px;border-radius:6px;border:1px solid rgba(169,119,78,0.3);background:rgba(169,119,78,0.06);text-decoration:none;color:#f7efdb;">
<span style="font-size:16px;">💊</span>
<span style="font-size:9px;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:52px;">{{ shortcuts[i-1].name }}</span>
<span style="font-size:8px;color:#8b784e;">×{{ shortcuts[i-1].quantity }}</span>
</router-link>
<a v-else href="javascript:void(0)" @click="openSlotPicker(i)" style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:56px;height:48px;border-radius:6px;border:1px dashed rgba(169,119,78,0.2);background:rgba(255,255,255,0.02);text-decoration:none;color:#8b784e;cursor:pointer;">
<span style="font-size:16px;">＋</span><span style="font-size:8px;margin-top:1px;">槽{{ i }}</span>
</a>
</template>
</div>
</div>
<!-- Slot picker -->
<Teleport to="body">
<div v-if="showPicker" class="slot-picker-overlay" @click.self="showPicker=false">
<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:300;" @click="showPicker=false"></div>
<div style="position:fixed;bottom:48px;left:50%;transform:translateX(-50%);width:100%;max-width:480px;max-height:50vh;background:rgba(26,26,46,0.97);border-radius:12px 12px 0 0;overflow-y:auto;z-index:301;">
<div style="width:36px;height:4px;background:rgba(169,119,78,0.3);border-radius:2px;margin:8px auto 4px;"></div>
<div style="font-size:13px;color:#cfc19e;text-align:center;padding:4px 0 8px;border-bottom:1px solid rgba(255,255,255,0.06);">选择消耗品 - 槽位{{ pickerSlot }}</div>
<div style="padding:6px 8px;">
<a v-for="c in consumables" :key="c.inv_id" href="javascript:void(0)" @click="setSlot(pickerSlot,c.inv_id)" style="display:flex;align-items:center;gap:8px;padding:10px 8px;border-radius:8px;text-decoration:none;color:#f7efdb;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);margin-bottom:4px;">
<span style="font-size:18px;">💊</span><span style="flex:1;font-size:13px;">{{ c.name }}</span><span style="font-size:11px;color:#8b784e;">×{{ c.quantity }}</span>
</a>
<div v-if="!consumables.length" style="text-align:center;color:#8b784e;font-size:12px;padding:24px 0;">背包中没有可用的消耗品</div>
</div>
</div>
</div>
</Teleport>
<div class="card" style="padding:6px 10px;">
<div style="display:flex;justify-content:space-between;font-size:11px;flex-wrap:wrap;gap:2px 12px;">
<span>⚔️ {{ data.battleCount }}战 <span class="text-green">{{ data.winCount }}胜</span></span>
<span>🎒 {{ data.invCount }}种</span>
<span>📍 {{ data.place?.name||'未知' }}</span>
<span class="text-gold">距升级 {{ (data.user?.exp_max||0)-(data.user?.exp||0) }}exp</span>
</div>
</div>
<div style="display:flex;gap:4px;">
<router-link to="/inventory" class="btn btn-secondary" style="flex:1;">🎒 背包</router-link>
<router-link to="/equipment" class="btn btn-secondary" style="flex:1;">⚔️ 装备</router-link>
</div>
</div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue';
import { Api } from '../composables/useApi';
const data=ref({user:{},stats:{},equips:[],battleCount:0,winCount:0,pet:null,invCount:0,shortcuts:[],consumables:[],place:{}});
const shortcuts=ref([]);const consumables=ref([]);const showPicker=ref(false);const pickerSlot=ref(1);
const hpPct=computed(()=>data.value.user?.hp_max>0?Math.round(data.value.user.hp/data.value.user.hp_max*100):0);
const expPct=computed(()=>data.value.user?.exp_max>0?Math.round(data.value.user.exp/data.value.user.exp_max*100):0);
function formatMoney(n){if(!n)return'0';if(n>=100000000)return(n/100000000).toFixed(1)+'亿';if(n>=10000)return(n/10000).toFixed(1)+'万';return n.toLocaleString();}
async function load(){try{const d=await Api.get('/user/status');data.value=d;shortcuts.value=d.shortcuts||[];consumables.value=d.consumables||[];}catch(e){}}
function openSlotPicker(i){pickerSlot.value=i;showPicker.value=true;}
async function setSlot(slot,invId){try{await Api.post('/user/shortcut',{slot,inv_id:invId});showPicker.value=false;await load();}catch(e){}}
async function clearSlot(slot){try{await Api.post('/user/shortcut',{slot,inv_id:0});await load();}catch(e){}}
onMounted(load);
</script>

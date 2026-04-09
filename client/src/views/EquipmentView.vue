<template>
<div class="page">
<div class="location-bar"><div class="location-name">⚔️ 装备管理</div><div class="location-path">已装备 {{ equipped.length }} 件</div></div>
<div class="card">
<div class="card-title">📊 总属性</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;font-size:12px;">
<span style="color:#cfc19e;">⚔️ 攻击力</span><span style="text-align:right;">{{ stats.atk_min }}-{{ stats.atk_max }} <span v-if="stats.bonusAtk>0" style="color:#2e5a3b;font-size:10px;">(+{{ stats.bonusAtk }})</span></span>
<span style="color:#cfc19e;">🛡️ 防御力</span><span style="text-align:right;">{{ stats.def }} <span v-if="stats.bonusDef>0" style="color:#2e5a3b;font-size:10px;">(+{{ stats.bonusDef }})</span></span>
</div>
</div>
<div v-if="!equipped.length" class="card"><div class="empty-state">没有装备任何物品</div></div>
<div v-for="eq in equipped" :key="eq.inv_id" class="card" style="padding:4px 8px;">
<div style="display:flex;justify-content:space-between;align-items:center;">
<span class="item-name">{{ eq.subtype==='weapon'?'🗡️':'🛡️' }} {{ eq.name }}<span v-if="eq.enhance_level>0" style="color:#c9a758;font-weight:bold;">+{{ eq.enhance_level }}</span></span>
<a href="javascript:void(0)" class="btn btn-danger btn-small" @click="unequip(eq.inv_id)" style="font-size:10px;">卸下</a>
</div>
<div class="item-desc" style="margin-top:2px;">
{{ eq.atk>0?'⚔️攻+'+Math.round(eq.atk*(1+eq.enhance_level*0.03)):'' }}
{{ eq.def_val>0?'🛡️防+'+Math.round(eq.def_val*(1+eq.enhance_level*0.03)):'' }}
</div>
</div>
<div style="display:flex;gap:4px;" class="mt-4">
<router-link to="/inventory" class="btn btn-secondary" style="flex:1;">🎒 背包</router-link>
<router-link to="/status" class="btn btn-secondary" style="flex:1;">👤 状态</router-link>
</div>
</div>
</template>
<script setup>
import { globalConfirm, globalAlert } from '../composables/useConfirm';
import { ref, onMounted } from 'vue';
import { useUserStore } from '../stores/user';
import { Api } from '../composables/useApi';
const userStore=useUserStore();
const equipped=ref([]);const stats=ref({atk_min:0,atk_max:0,def:0,bonusAtk:0,bonusDef:0});
async function load(){try{const d=await Api.get('/user/equipment');equipped.value=d.equipped||[];stats.value=d.stats||{};}catch(e){}}
async function unequip(invId){if(!(await globalConfirm('确认卸下?')))return;try{await Api.post('/user/equip',{inventory_id:invId});const me=await Api.get('/auth/me');userStore.updateUser(me.user);await load();}catch(e){}}
onMounted(load);
</script>

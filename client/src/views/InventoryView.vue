<template>
<div class="page">
<div class="location-bar"><div class="location-name">🎒 背包</div><div class="location-path">物品：{{ items.length }}种</div></div>
<div v-if="useMsg" class="card" :style="{borderColor:'#2e5a3b',padding:'3px 8px'}">
<p style="color:#2e5a3b;font-size:11px;margin:0;">✅ {{ useMsg }}</p>
</div>
<div v-if="!items.length" class="card"><div class="empty-state">🎒 背包空空如也</div></div>
<template v-for="cat in categories" :key="cat.key">
<template v-if="filterItems(cat.key).length">
<div style="font-size:12px;color:#cfc19e;padding:6px 0 2px;font-weight:bold;">{{ cat.icon }} {{ cat.name }}（{{ filterItems(cat.key).length }}）</div>
<div v-for="item in filterItems(cat.key)" :key="item.inv_id" class="card" style="padding:4px 8px;">
<div style="display:flex;justify-content:space-between;align-items:center;">
<div style="display:flex;align-items:center;gap:4px;">
<span class="item-name">{{ item.name }}<span v-if="item.enhance_level>0" style="color:#c9a758;font-size:11px;">+{{ item.enhance_level }}</span></span>
<span v-if="item.quantity>1" class="text-gold" style="font-size:11px;">×{{ item.quantity }}</span>
</div>
<span style="font-size:10px;" :style="{color:cat.color}">{{ cat.icon }} {{ cat.name }}</span>
</div>
<div style="display:flex;justify-content:space-between;align-items:center;margin-top:2px;">
<span class="item-desc">
<template v-if="item.subtype==='weapon'||item.subtype==='armor'">⚔️{{ calcStat(item.atk,item.enhance_level) }} 🛡️{{ calcStat(item.def_val,item.enhance_level) }}</template>
<template v-else-if="item.atk>0">⚔️+{{ item.atk }}</template>
<template v-if="item.def_val>0"> 🛡️+{{ item.def_val }}</template>
<template v-if="item.hp>0"> ❤️+{{ item.hp }}</template>
</span>
<span style="display:flex;gap:4px;">
<button v-if="item.subtype==='consumable'" class="btn btn-success btn-small" @click="useItem(item.inv_id)" style="font-size:10px;">使用</button>
<button v-if="item.subtype==='weapon'||item.subtype==='armor'" class="btn btn-primary btn-small" @click="equip(item.inv_id)" style="font-size:10px;">装备</button>
<button class="btn btn-danger btn-small" @click="discard(item.inv_id)" style="font-size:10px;">丢弃</button>
</span>
</div>
</div>
</template>
</template>
<div style="display:flex;gap:4px;" class="mt-4">
<router-link to="/equipment" class="btn btn-secondary" style="flex:1;">⚔️ 查看装备</router-link>
<router-link to="/map" class="btn btn-secondary" style="flex:1;">← 返回</router-link>
</div>
</div>
</template>
<script setup>
import { globalConfirm, globalAlert } from '../composables/useConfirm';
import { ref, onMounted } from 'vue';
import { useUserStore } from '../stores/user';
import { Api } from '../composables/useApi';
const userStore=useUserStore();
const items=ref([]);const useMsg=ref('');
const categories=[
{key:'weapon',name:'武器',icon:'🗡️',color:'#73281c'},
{key:'armor',name:'防具',icon:'🛡️',color:'#3f6a4a'},
{key:'consumable',name:'消耗',icon:'🧪',color:'#2e5a3b'},
{key:'material',name:'材料',icon:'📦',color:'#c9a758'},
{key:'other',name:'其他',icon:'📋',color:'#8b784e'}
];
function filterItems(subtype){return items.value.filter(i=>i.subtype===subtype);}
function calcStat(base,level){if(!base)return 0;return Math.round(base*(1+(level||0)*0.03));}
async function load(){try{const d=await Api.get('/user/inventory');items.value=(d.items||[]).filter(i=>!i.equipped);}catch(e){}}
async function equip(invId){try{await Api.post('/user/equip',{inventory_id:invId});const me=await Api.get('/auth/me');userStore.updateUser(me.user);await load();}catch(e){}}
async function useItem(invId){try{const d=await Api.post('/user/use',{inventory_id:invId});useMsg.value=`恢复 ${d.heal} HP`;const me=await Api.get('/auth/me');userStore.updateUser(me.user);setTimeout(()=>useMsg.value='',2000);await load();}catch(e){}}
async function discard(invId){if(!(await globalConfirm('确定丢弃？')))return;try{await Api.post('/user/discard',{inventory_id:invId});await load();}catch(e){}}
onMounted(load);
</script>

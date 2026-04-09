<template>
<div class="page">
<div class="location-bar"><div class="location-name">🏆 排行榜</div><div class="location-path">{{ userStore.username }} · Lv.{{ userStore.level }}</div></div>
<div style="display:flex;margin-bottom:12px;gap:0;">
<a href="javascript:void(0)" v-for="t in tabs" :key="t.key" :class="'btn '+(tab===t.key?'btn-primary':'btn-secondary')" @click="loadTab(t.key)" :style="{flex:1,borderRadius:t.radius,fontSize:'13px'}">{{ t.icon }} {{ t.label }}</a>
</div>
<template v-if="tab==='level'">
<div class="card"><div class="card-title">⭐ 等级排行榜 TOP20</div>
<div v-for="(p,idx) in levelList" :key="p.id" style="padding:8px 0;border-bottom:1px solid rgba(169,119,78,0.05);display:flex;justify-content:space-between;align-items:center;" :style="isMe(p.id)?'background:rgba(169,119,78,0.08);border-radius:6px;padding:8px;margin:0 -4px;':''">
<div style="display:flex;align-items:center;gap:8px;">
<span style="width:28px;text-align:center;" :style="{fontSize:idx<3?'18px':'14px'}">{{ idx<3?['🥇','🥈','🥉'][idx]:idx+1 }}</span>
<span :style="isMe(p.id)?'color:#c9a758;font-weight:bold;':''">{{ p.sex===2?'♀':'♂' }} {{ p.username }}<span v-if="isMe(p.id)" style="font-size:11px;color:#c9a758;">[我]</span></span>
</div>
<span style="color:#c9a758;font-weight:bold;font-size:14px;">Lv.{{ p.level }}</span>
</div>
</div>
</template>
<template v-if="tab==='wealth'">
<div class="card"><div class="card-title">💰 财富排行榜 TOP20</div>
<div v-for="(p,idx) in wealthList" :key="p.id" style="padding:8px 0;border-bottom:1px solid rgba(169,119,78,0.05);display:flex;justify-content:space-between;align-items:center;" :style="isMe(p.id)?'background:rgba(169,119,78,0.08);border-radius:6px;padding:8px;margin:0 -4px;':''">
<div style="display:flex;align-items:center;gap:8px;">
<span style="width:28px;text-align:center;" :style="{fontSize:idx<3?'18px':'14px'}">{{ idx<3?['🥇','🥈','🥉'][idx]:idx+1 }}</span>
<span :style="isMe(p.id)?'color:#c9a758;font-weight:bold;':''">{{ p.sex===2?'♀':'♂' }} {{ p.username }}<span v-if="isMe(p.id)" style="font-size:11px;color:#c9a758;">[我]</span></span>
</div>
<span style="color:#c9a758;font-weight:bold;font-size:14px;">{{ formatMoney((p.money||0)+(p.bank_money||0)) }}</span>
</div>
</div>
</template>
<template v-if="tab==='power'">
<div class="card"><div class="card-title">⚔️ 战力排行榜 TOP20</div>
<div v-for="(p,idx) in powerList" :key="p.id" style="padding:8px 0;border-bottom:1px solid rgba(169,119,78,0.05);display:flex;justify-content:space-between;align-items:center;" :style="isMe(p.id)?'background:rgba(169,119,78,0.08);border-radius:6px;padding:8px;margin:0 -4px;':''">
<div style="display:flex;align-items:center;gap:8px;">
<span style="width:28px;text-align:center;" :style="{fontSize:idx<3?'18px':'14px'}">{{ idx<3?['🥇','🥈','🥉'][idx]:idx+1 }}</span>
<span :style="isMe(p.id)?'color:#c9a758;font-weight:bold;':''">{{ p.sex===2?'♀':'♂' }} {{ p.username }}<span v-if="isMe(p.id)" style="font-size:11px;color:#c9a758;">[我]</span></span>
<span class="text-muted" style="font-size:11px;">Lv.{{ p.level }}</span>
</div>
<span style="color:#73281c;font-weight:bold;font-size:14px;">{{ (p.atk_max||0)+(p.def||0)+(p.agility||0)+(p.equip_bonus||0) }}</span>
</div>
</div>
</template>
<template v-if="tab==='guild'">
<div class="card"><div class="card-title">🏰 帮会排行榜 TOP10</div>
<div v-for="(g,idx) in guildList" :key="g.id" style="padding:8px 0;border-bottom:1px solid rgba(169,119,78,0.05);display:flex;justify-content:space-between;align-items:center;">
<div style="display:flex;align-items:center;gap:8px;">
<span style="width:28px;text-align:center;" :style="{fontSize:idx<3?'18px':'14px'}">{{ idx<3?['🥇','🥈','🥉'][idx]:idx+1 }}</span>
<span style="font-weight:bold;">{{ g.name }}</span>
</div>
<div style="text-align:right;">
<div style="font-size:13px;color:#c9a758;">Lv.{{ g.level }} · {{ g.member_count }}人</div>
<div style="font-size:11px;color:#8b784e;">总等级:{{ g.total_level||0 }}</div>
</div>
</div>
</div>
</template>
<div class="text-center text-muted mt-20" style="font-size:11px;">排行榜数据实时更新</div>
<router-link to="/map" class="btn btn-secondary btn-block mt-10">← 返回地图</router-link>
</div>
</template>
<script setup>
import { ref, onMounted } from 'vue';
import { useUserStore } from '../stores/user';
import { Api } from '../composables/useApi';
const userStore=useUserStore();
const tab=ref('level');
const levelList=ref([]);const wealthList=ref([]);const powerList=ref([]);const guildList=ref([]);
const tabs=[
{key:'level',label:'等级',icon:'⭐',radius:'6px 0 0 6px'},
{key:'wealth',label:'财富',icon:'💰',radius:'0'},
{key:'power',label:'战力',icon:'⚔️',radius:'0'},
{key:'guild',label:'帮会',icon:'🏰',radius:'0 6px 6px 0'}
];
function isMe(id){return userStore.user?.id===id;}
function formatMoney(n){if(!n)return'0';if(n>=100000000)return(n/100000000).toFixed(1)+'亿';if(n>=10000)return(n/10000).toFixed(1)+'万';return n.toLocaleString();}
async function loadTab(t){
tab.value=t;
try{
if(t==='level'){const d=await Api.get('/rank/level');levelList.value=d.list||[];}
else if(t==='wealth'){const d=await Api.get('/rank/wealth');wealthList.value=d.list||[];}
else if(t==='power'){const d=await Api.get('/rank/power');powerList.value=d.list||[];}
else if(t==='guild'){const d=await Api.get('/rank/guild');guildList.value=d.list||[];}
}catch(e){}
}
onMounted(()=>loadTab('level'));
</script>

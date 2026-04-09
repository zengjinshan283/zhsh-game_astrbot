<template>
<div class="page">
<div class="location-bar"><div class="location-name">📋 任务面板</div><div class="location-path">进行中 {{ active.length }} · 可接 {{ available.length }}</div></div>
<div v-if="msg" class="card" :style="{borderColor:msgType==='error'?'#73281c':'#2e5a3b',padding:'3px 8px'}">
<p :style="{color:msgType==='error'?'#b85a3a':'#2e5a3b',fontSize:'11px',margin:0}">{{ msgType==='error'?'❌':'✅' }} {{ msg }}</p>
</div>
<div class="tab-bar">
<a href="javascript:void(0)" :class="'btn '+(tab==='active'?'btn-primary':'btn-secondary')" @click="tab='active'">🔄 进行中</a>
<a href="javascript:void(0)" :class="'btn '+(tab==='available'?'btn-primary':'btn-secondary')" @click="tab='available'">📋 可接</a>
<a href="javascript:void(0)" :class="'btn '+(tab==='completed'?'btn-primary':'btn-secondary')" @click="tab='completed'">✅ 已完成</a>
</div>
<template v-if="tab==='active'">
<div v-if="!active.length" class="card"><div class="empty-state">没有进行中的任务</div></div>
<div v-for="q in active" :key="q.id" class="card" :style="{borderColor:q.status===1?'#2e5a3b':'#c9a758',padding:'4px 8px'}">
<div style="display:flex;justify-content:space-between;align-items:center;">
<span class="item-name" style="font-size:12px;">{{ q.status===1?'✅':'🔄' }} {{ q.name }}</span>
<span style="font-size:11px;" :style="{color:q.status===1?'#2e5a3b':'#c9a758'}">{{ q.status===1?'已完成':q.progress+'/'+q.require_value }}</span>
</div>
<div class="item-desc" style="margin-top:2px;">{{ q.description }}</div>
<div class="item-desc">{{ questTypes[q.type]||'📋任务' }} · {{ q.npc_name||'未知' }}</div>
<div v-if="q.status===0" class="mt-4">
<div style="height:6px;background:#080c08;border-radius:3px;overflow:hidden;margin:4px 0;"><div :style="{height:'100%',width:Math.min(100,Math.round(q.progress/Math.max(1,q.require_value)*100))+'%',background:'#c9a758'}"></div></div>
<button class="btn btn-secondary btn-small" @click="abandon(q.id)" style="font-size:10px;">🗑️ 放弃</button>
</div>
<div v-else style="margin-top:3px;">
<button class="btn btn-primary btn-small" @click="claim(q.id)" style="font-size:10px;">🎁 领取奖励</button>
<span class="text-gold" style="font-size:10px;">经验+{{ q.reward_exp }} 铜+{{ q.reward_money }}</span>
</div>
</div>
</template>
<template v-if="tab==='available'">
<div v-if="!available.length" class="card"><div class="empty-state">暂无可接任务</div></div>
<div v-for="q in available.slice(0,5)" :key="q.id" class="card" style="padding:4px 8px;">
<div style="display:flex;justify-content:space-between;align-items:center;">
<span class="item-name" style="font-size:12px;">📋 {{ q.name }}</span><span class="text-muted" style="font-size:10px;">Lv.{{ q.level_req }}</span>
</div>
<div class="item-desc">{{ q.description }}</div>
<div class="item-desc text-gold">奖励：经验+{{ q.reward_exp }} 铜+{{ q.reward_money }}</div>
<button class="btn btn-success btn-small" @click="accept(q.id)" style="margin-top:3px;font-size:10px;">✅ 接取</button>
</div>
</template>
<template v-if="tab==='completed'">
<div v-if="!completed.length" class="card"><div class="empty-state">还没有完成任何任务</div></div>
<div v-for="q in completed" :key="q.id" class="card" style="opacity:0.7;padding:4px 8px;">
<div style="display:flex;justify-content:space-between;align-items:center;">
<span class="item-name" style="color:#2e5a3b;font-size:12px;">✅ {{ q.name }}</span>
<span class="text-muted" style="font-size:10px;">{{ fmtTime(q.completed_at) }}</span>
</div>
</div>
</template>
</div>
</template>
<script setup>
import { globalConfirm, globalAlert } from '../composables/useConfirm';
import { ref, onMounted } from 'vue';
import { Api } from '../composables/useApi';
const tab=ref('active'); const active=ref([]); const completed=ref([]); const available=ref([]);
const msg=ref(''); const msgType=ref('');
const questTypes={0:'⚔️杀怪',1:'📦收集',2:'📍到达',3:'💬对话',4:'🛡️护送'};
function fmtTime(t){if(!t)return'';const d=new Date(t*1000);return(d.getMonth()+1)+'/'+d.getDate()+' '+d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0');}
async function load(){try{const d=await Api.get('/quest/list');active.value=d.active||[];completed.value=d.completed||[];available.value=d.available||[];}catch(e){}}
async function accept(id){try{const d=await Api.post('/quest/accept',{quest_id:id});msg=d.msg;msgType='success';await load();}catch(e){msg=e.message;msgType='error';}}
async function claim(id){try{const d=await Api.post('/quest/claim',{quest_id:id});msg=d.msg;msgType='success';await load();}catch(e){msg=e.message;msgType='error';}}
async function abandon(id){if(!(await globalConfirm('确定放弃?')))return;try{await Api.post('/quest/abandon',{quest_id:id});await load();}catch(e){}}
onMounted(load);
</script>

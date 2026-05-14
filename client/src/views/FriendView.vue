<template>
<div class="page">
<div class="location-bar"><div class="location-name">👥 好友</div><div class="location-path">好友 {{ friends.length }} · 请求 {{ requests.length }}</div></div>
<div v-if="msg" class="card" :style="{borderColor:msgType==='error'?'#73281c':'#2e5a3b',padding:'3px 8px'}">
<p :style="{color:msgType==='error'?'#b85a3a':'#2e5a3b',fontSize:'11px',margin:0}">{{ msg }}</p>
</div>
<div class="card" style="padding:4px 8px;">
<div style="display:flex;gap:6px;">
<input v-model="friendName" type="text" maxlength="20" placeholder="输入角色名" class="form-input" style="flex:1;font-size:12px;padding:6px 10px;">
<button class="btn btn-primary" @click="addFriend" style="font-size:12px;">添加</button>
</div>
</div>
<div class="tab-bar">
<a href="javascript:void(0)" :class="'btn '+(tab==='list'?'btn-primary':'btn-secondary')" @click="tab='list'">👥 好友({{ friends.length }})</a>
<a href="javascript:void(0)" :class="'btn '+(tab==='requests'?'btn-primary':'btn-secondary')" @click="tab='requests'">📨 请求({{ requests.length }})</a>
</div>
<template v-if="tab==='list'">
<div v-if="!friends.length" class="card"><div class="empty-state">还没有好友</div></div>
<div v-else class="card">
<div v-for="f in friends" :key="f.uid" class="compact-row">
<div><span style="font-size:9px;" :style="{color:isOnline(f.lastdate)?'#2e5a3b':'#8b784e'}">● </span>{{ f.sex===2?'♀':'♂' }} <span style="font-size:12px;">{{ f.username }}</span> <span class="player-level">Lv.{{ f.level }}</span></div>
<button class="btn btn-danger btn-small" @click="deleteFriend(f.uid)" style="font-size:10px;">删</button>
</div>
</div>
</template>
<template v-if="tab==='requests'">
<div v-if="!requests.length" class="card"><div class="empty-state">没有待处理的请求</div></div>
<div v-for="r in requests" :key="r.id" class="card" style="border-color:#3f6a4a;padding:4px 8px;">
<div style="display:flex;justify-content:space-between;align-items:center;">
<span style="font-size:12px;">{{ r.sex===2?'♀':'♂' }} {{ r.username }} <span class="player-level">Lv.{{ r.level }}</span></span>
<span class="text-muted" style="font-size:10px;">{{ fmtTime(r.created_at) }}</span>
</div>
<div style="display:flex;gap:4px;margin-top:3px;">
<button class="btn btn-success btn-small" @click="accept(r.id)" style="font-size:10px;">✅ 接受</button>
<button class="btn btn-danger btn-small" @click="reject(r.id)" style="font-size:10px;">❌ 拒绝</button>
</div>
</div>
</template>
</div>
</template>
<script setup>
import { globalConfirm, globalAlert } from '../composables/useConfirm';
import { ref, onMounted } from 'vue';
import { Api } from '../composables/useApi';
const tab=ref('list');const friends=ref([]);const requests=ref([]);
const friendName=ref('');const msg=ref('');const msgType=ref('');
function isOnline(t){return t>Date.now()/1000-900;}
function fmtTime(t){if(!t)return'';const d=new Date(t*1000);return(d.getMonth()+1)+'/'+d.getDate()+' '+d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0');}
async function load(){try{const d=await Api.get('/friend/list');friends.value=d.friends||[];requests.value=d.requests||[];}catch(e){}}
async function addFriend(){if(!friendName.value)return;try{const d=await Api.post('/friend/add',{username:friendName.value});msg.value=d.msg;msgType.value='success';friendName.value='';await load();}catch(e){msg.value=e.message;msgType.value='error';}}
async function accept(id){try{await Api.post('/friend/accept',{friend_row_id:id});await load();}catch(e){}}
async function reject(id){try{await Api.post('/friend/reject',{friend_row_id:id});await load();}catch(e){}}
async function deleteFriend(uid){if(!(await globalConfirm('确定删除?')))return;try{await Api.post('/friend/delete',{friend_id:uid});await load();}catch(e){}}
onMounted(load);
</script>

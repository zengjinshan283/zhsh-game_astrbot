<template>
<div class="page">
<div class="location-bar"><div class="location-name">🏰 帮会</div><div class="location-path">{{ myGuild?'「'+myGuild.guild_name+'」'+roleNames[myGuild.role]:'未加入帮会' }}</div></div>
<div v-if="msg" class="card" :style="{borderColor:msgType==='error'?'#73281c':'#2e5a3b',padding:'3px 8px'}">
<p :style="{color:msgType==='error'?'#b85a3a':'#2e5a3b',fontSize:'11px',margin:0}">{{ msg }}</p>
</div>
<template v-if="myGuild">
<div class="card" style="border-color:#c9a758;">
<div class="card-title">🏰 {{ myGuild.guild_name }}</div>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:2px;font-size:11px;text-align:center;">
<div><span style="color:#cfc19e;">⭐等级</span><br><span class="text-gold" style="font-weight:bold;">Lv.{{ myGuild.guild_level }}</span></div>
<div><span style="color:#cfc19e;">👥人数</span><br>{{ members.length }}/{{ myGuild.member_max }}</div>
<div><span style="color:#cfc19e;">📋职位</span><br><span :style="{color:roleColors[myGuild.role],fontWeight:'bold'}">{{ roleNames[myGuild.role] }}</span></div>
<div><span style="color:#cfc19e;">💰贡献</span><br>{{ myGuild.contribution }}</div>
</div>
<div v-if="myGuild.notice" style="margin-top:4px;padding:4px;background:rgba(169,119,78,0.05);border-radius:4px;border-left:2px solid #c9a758;font-size:11px;color:#f7efdb;">📢 {{ myGuild.notice }}</div>
</div>
<div class="tab-bar">
<a href="javascript:void(0)" :class="'btn '+(tab==='members'?'btn-primary':'btn-secondary')" @click="tab='members'">👥 成员</a>
<a href="javascript:void(0)" :class="'btn '+(tab==='list'?'btn-primary':'btn-secondary')" @click="loadGuilds();tab='list'">🏰 列表</a>
</div>
<template v-if="tab==='members'">
<div class="card">
<div v-for="m in members" :key="m.user_id" class="compact-row">
<div><span style="font-size:9px;" :style="{color:isOnline(m.lastdate)?'#2e5a3b':'#8b784e'}">●</span> {{ m.sex===2?'♀':'♂' }} <span :style="{color:roleColors[m.role],fontWeight:m.role>=2?'bold':'normal'}">{{ m.username }}</span> <span class="text-muted">Lv.{{ m.level }}[{{ roleNames[m.role] }}]</span></div>
<button v-if="isLeader&&m.user_id!==userStore.user.id" class="btn btn-danger btn-small" @click="kick(m.user_id)" style="font-size:10px;padding:1px 4px;">踢</button>
</div>
</div>
<div v-if="isViceLeader" class="card" style="padding:4px 8px;">
<div style="display:flex;gap:6px;">
<input v-model="noticeText" type="text" maxlength="200" placeholder="帮会公告..." class="form-input" style="flex:1;font-size:12px;padding:6px 10px;">
<button class="btn btn-primary btn-small" @click="saveNotice" style="font-size:11px;">保存</button>
</div>
</div>
<div style="display:flex;gap:4px;">
<button v-if="!isLeader" class="btn btn-danger btn-small" @click="leave" style="font-size:11px;">🚪 退出</button>
<button v-else class="btn btn-danger btn-small" @click="disband" style="font-size:11px;">⚠️ 解散</button>
</div>
</template>
<template v-if="tab==='list'">
<div v-for="g in guildList" :key="g.id" class="card" :style="{padding:'4px 8px',borderColor:g.id===myGuild.guild_id?'#c9a758':''}">
<div class="compact-row">
<span class="item-name" style="font-size:12px;">{{ g.id===myGuild.guild_id?'⭐ ':'' }}{{ g.name }}</span>
<span class="text-muted" style="font-size:11px;">Lv.{{ g.level }} · {{ g.member_count }}人</span>
</div>
</div>
</template>
</template>
<template v-else>
<div class="card" style="border-color:#c9a758;padding:4px 8px;">
<div class="card-title">🏗️ 创建帮会</div>
<div class="text-muted" style="font-size:11px;margin-bottom:4px;">等级≥5，花费5000铜币</div>
<div style="display:flex;gap:6px;">
<input v-model="createName" type="text" maxlength="12" placeholder="帮会名称(2-12字)" class="form-input" style="flex:1;font-size:12px;padding:6px 10px;">
<button class="btn btn-primary btn-small" @click="create" style="font-size:11px;">创建(5000铜)</button>
</div>
</div>
<div class="card" style="padding:4px 8px;">
<div class="card-title">🔍 加入帮会</div>
<div style="display:flex;gap:6px;">
<input v-model="joinName" type="text" maxlength="12" placeholder="输入帮会名称" class="form-input" style="flex:1;font-size:12px;padding:6px 10px;">
<button class="btn btn-success btn-small" @click="join" style="font-size:11px;">申请</button>
</div>
</div>
</template>
</div>
</template>
<script setup>
import { globalConfirm, globalAlert } from '../composables/useConfirm';
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '../stores/user';
import { Api } from '../composables/useApi';
const userStore = useUserStore();
const myGuild=ref(null); const members=ref([]); const guildList=ref([]);
const tab=ref('members'); const msg=ref(''); const msgType=ref('');
const createName=ref(''); const joinName=ref(''); const noticeText=ref('');
const roleNames={0:'成员',1:'长老',2:'副会长',3:'会长'};
const roleColors={0:'#cfc19e',1:'#3f6a4a',2:'#6f5632',3:'#c9a758'};
const isLeader=computed(()=>myGuild.value?.role===3);
const isViceLeader=computed(()=>myGuild.value?.role>=2);
function isOnline(t){return t>Date.now()/1000-900;}
async function load(){try{const d=await Api.get('/guild/my');myGuild.value=d.myGuild;members.value=d.members||[];guildList.value=d.guildList||[];}catch(e){}}
async function create(){try{const d=await Api.post('/guild/create',{name:createName.value});msg=d.msg;msgType='success';createName.value='';await load();}catch(e){msg=e.message;msgType='error';}}
async function join(){try{const d=await Api.post('/guild/join',{name:joinName.value});msg=d.msg;msgType='success';joinName.value='';await load();}catch(e){msg=e.message;msgType='error';}}
async function leave(){if(!(await globalConfirm('确定退出?')))return;try{const d=await Api.post('/guild/leave');msg=d.msg;msgType='success';await load();}catch(e){msg=e.message;msgType='error';}}
async function disband(){if(!(await globalConfirm('确定解散？不可恢复！')))return;try{const d=await Api.post('/guild/disband');msg=d.msg;msgType='success';await load();}catch(e){msg=e.message;msgType='error';}}
async function saveNotice(){try{await Api.post('/guild/notice',{notice:noticeText.value});msg='公告已更新';msgType='success';}catch(e){msg=e.message;msgType='error';}}
async function kick(uid){if(!(await globalConfirm('踢出?')))return;try{await Api.post('/guild/kick',{user_id:uid});await load();}catch(e){msg=e.message;msgType='error';}}
async function loadGuilds(){try{const d=await Api.get('/guild/my');guildList.value=d.guildList||[];}catch(e){}}
onMounted(load);
</script>

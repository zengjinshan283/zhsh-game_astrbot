<template>
<div class="page chat-page" style="display:flex;flex-direction:column;height:100%;overflow:hidden;">
<div class="location-bar"><div class="location-name">💬 世界频道</div><div class="location-path">在线：<span class="online-count">{{ gameStore.onlineCount || messages.length }}</span> 人</div></div>
<div class="chat-messages" ref="chatContainer" style="flex:1;min-height:0;">
<div v-if="!messages.length" class="empty-state">还没有消息</div>
<div v-for="m in messages" :key="m.id" class="chat-msg">
<span class="chat-sender">{{ m.sex===2?'♀':'♂' }}{{ m.username }} <span class="text-muted" style="font-weight:normal;font-size:10px;">Lv.{{ m.level }}</span></span>
<span class="chat-time">{{ fmtTime(m.created_at||m.time) }}</span>
<span class="chat-text">{{ m.message }}</span>
</div>
</div>
<div style="flex-shrink:0;margin-top:4px;">
<div style="display:flex;gap:6px;">
<input ref="chatInput" v-model="inputMsg" type="text" maxlength="200" placeholder="输入消息..." class="form-input" style="flex:1;font-size:13px;padding:8px 10px;" @keydown.enter="send">
<button class="btn btn-primary" @click="send" style="padding:8px 14px;font-size:13px;">发送</button>
</div>
</div>
</div>
</template>
<script setup>
import { ref, onMounted, nextTick, watch } from 'vue';
import { useGameStore } from '../stores/game';
import { Api } from '../composables/useApi';
import { getGameWS } from '../composables/useGameWS';
const gameStore = useGameStore();
const messages = ref([]);
const inputMsg = ref('');
const chatContainer = ref(null);
const chatInput = ref(null);
function fmtTime(t){if(!t)return'';const d=new Date(typeof t==='string'?t:t*1000);return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0');}
async function loadMessages(){try{const d=await Api.get('/chat/messages');messages.value=d.messages||[];await nextTick();if(chatContainer.value)chatContainer.value.scrollTop=chatContainer.value.scrollHeight;}catch(e){}}
function send(){const msg=inputMsg.value.trim();if(!msg)return;const ws=getGameWS();ws.send({type:'chat_send',message:msg});inputMsg.value='';}
onMounted(()=>{loadMessages();setInterval(loadMessages,5000);});
</script>

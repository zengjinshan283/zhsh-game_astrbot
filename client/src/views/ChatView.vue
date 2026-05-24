<template>
<div class="page chat-page">
  <!-- 顶部HUD毛玻璃条 -->
  <div class="chat-hud">
    <div class="hud-title">💬 世界频道</div>
    <div class="hud-online">在线：<span class="online-count">{{ gameStore.onlineCount || messages.length }}</span> 人</div>
  </div>

  <!-- 消息列表区域 -->
  <div class="chat-messages" ref="chatContainer">
    <div v-if="!messages.length" class="empty-state">暂无消息，快来聊天吧</div>
    <div v-for="m in messages" :key="m.id" class="chat-msg">
      <div class="msg-header">
        <span class="chat-sender" :class="m.sex === 2 ? 'female' : 'male'">
          {{ m.sex === 2 ? '♀' : '♂' }}{{ m.username }}
          <span class="level">Lv.{{ m.level }}</span>
        </span>
        <span class="chat-time">{{ fmtTime(m.created_at || m.time) }}</span>
      </div>
      <div class="chat-text">{{ m.message }}</div>
    </div>
  </div>

  <!-- 输入区 -->
  <div class="chat-input-bar">
    <input ref="chatInput" v-model="inputMsg" type="text" maxlength="200" placeholder="输入消息..." class="chat-input" @keydown.enter="send">
    <button class="btn-send" @click="send">发送</button>
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
function fmtTime(t) {
  if (!t) return '';
  const d = new Date(typeof t === 'string' ? t : t * 1000);
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
}
async function loadMessages() {
  try {
    const d = await Api.get('/chat/messages');
    messages.value = d.messages || [];
    await nextTick();
    if (chatContainer.value) chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  } catch (e) {}
}
function send() {
  const msg = inputMsg.value.trim();
  if (!msg) return;
  const ws = getGameWS();
  ws.send({ type: 'chat_send', message: msg });
  inputMsg.value = '';
}
onMounted(() => { loadMessages(); setInterval(loadMessages, 5000); });
</script>

<style scoped>
.page.chat-page {
  position: fixed;
  inset: 0;
  background: #0d1117;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* 顶部HUD毛玻璃条 */
.chat-hud {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.hud-title {
  font-size: 15px;
  font-weight: 600;
  color: #f0f0f0;
}
.hud-online {
  font-size: 12px;
  color: #7f8c8d;
}
.online-count {
  color: #27ae60;
  font-weight: 600;
}

/* 消息列表区域 */
.chat-messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px;
  background: linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%);
}

/* 消息卡片 */
.chat-msg {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 10px 12px;
  margin-bottom: 8px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.msg-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.chat-sender {
  font-size: 13px;
  font-weight: 600;
}
.chat-sender.female {
  color: #27ae60;
}
.chat-sender.male {
  color: #e74c3c;
}
.level {
  font-weight: normal;
  font-size: 10px;
  color: #7f8c8d;
  margin-left: 4px;
}
.chat-time {
  font-size: 11px;
  color: #7f8c8d;
}
.chat-text {
  font-size: 14px;
  color: #f0f0f0;
  line-height: 1.5;
  word-break: break-all;
}

/* 空状态 */
.empty-state {
  text-align: center;
  color: #7f8c8d;
  font-size: 14px;
  padding: 40px 0;
}

/* 输入区 */
.chat-input-bar {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.chat-input {
  flex: 1;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
  color: #f0f0f0;
  outline: none;
  transition: border-color 0.2s;
}
.chat-input::placeholder {
  color: #7f8c8d;
}
.chat-input:focus {
  border-color: rgba(39, 174, 96, 0.5);
}
.btn-send {
  padding: 10px 18px;
  background: linear-gradient(135deg, #1a4a2a, #27ae60);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
}
.btn-send:hover {
  opacity: 0.9;
}
.btn-send:active {
  transform: scale(0.97);
}
</style>
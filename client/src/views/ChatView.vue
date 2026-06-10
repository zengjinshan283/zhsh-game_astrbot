<template>
<div class="chat-page">
  <div class="chat-bg"></div>

  <div class="chat-header">
    <div class="ch-title">💬 聊天</div>
    <div class="ch-meta">
      <button class="ch-refresh" @click="load" :disabled="loading">{{ loading ? '加载中...' : '🔄 刷新' }}</button>
    </div>
  </div>

  <!-- 频道 Tabs -->
  <div class="chat-tabs">
    <button :class="{active: channel === 'world'}" @click="switchChannel('world')">🌍 世界</button>
    <button :class="{active: channel === 'chat'}" @click="switchChannel('chat')">💬 聊天</button>
    <button :class="{active: channel === 'system'}" @click="switchChannel('system')">📢 系统</button>
  </div>

  <!-- 频道说明 -->
  <div class="chat-banner">
    <template v-if="channel === 'world'">🌍 世界频道：宝图发掘、世界广播（自动 90 秒冷却）</template>
    <template v-else-if="channel === 'chat'">💬 全服聊天：畅所欲言</template>
    <template v-else>📢 系统频道：活动公告、官方通知</template>
  </div>

  <!-- 消息列表 -->
  <div ref="msgList" class="chat-list">
    <div v-if="loading && !messages.length" class="chat-loading">加载中...</div>
    <div v-else-if="!messages.length" class="chat-empty">
      <template v-if="channel === 'world'">🌍 还没有世界消息，去挖宝分享吧！</template>
      <template v-else-if="channel === 'chat'">💬 还没有聊天消息</template>
      <template v-else>📢 暂无系统公告</template>
    </div>
    <div v-for="m in messages" :key="m.id" class="msg-row" :class="'msg-' + msgTypeKey(m.type)">
      <div class="msg-avatar" :class="{sys: m.type === 2}">{{ m.type === 2 ? '📢' : (m.sex === 2 ? '♀' : '♂') }}</div>
      <div class="msg-body">
        <div class="msg-meta">
          <span class="msg-name" :style="{color: msgNameColor(m)}">{{ m.type === 2 ? '系统' : m.username }}</span>
          <span class="msg-lv">Lv.{{ m.level }}</span>
          <span v-if="m.type === 3" class="msg-tag tag-share">宝图分享</span>
          <span v-else-if="m.type === 1" class="msg-tag tag-world">世界</span>
          <span class="msg-time">{{ formatTime(m.created_at) }}</span>
        </div>
        <div class="msg-text" :class="{share: m.type === 3, world: m.type === 1, system: m.type === 2}">
          {{ m.message }}
        </div>
      </div>
    </div>
  </div>

  <!-- 输入区 -->
  <div v-if="channel !== 'system'" class="chat-input-bar">
    <input v-model="text" type="text" maxlength="200" :placeholder="inputPlaceholder" class="ci-input" @keyup.enter="send">
    <button v-if="channel === 'world'" class="ci-btn ci-btn-world" :disabled="sending || cooldown > 0" @click="send">
      {{ cooldown > 0 ? `${cooldown}s` : (sending ? '发送中...' : '🌍 广播') }}
    </button>
    <button v-else class="ci-btn" :disabled="sending" @click="send">
      {{ sending ? '发送中...' : '发送' }}
    </button>
  </div>
</div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';

const messages = ref([]);
const loading = ref(false);
const sending = ref(false);
const text = ref('');
const channel = ref('world'); // world / chat / system
const msgList = ref(null);
const cooldown = ref(0);
let cooldownTimer = null;
let pollTimer = null;

const inputPlaceholder = computed(() => {
  if (channel.value === 'world') return '说点什么到世界频道...';
  return '说点什么...';
});

function msgTypeKey(t) {
  if (t === 1) return 'world';
  if (t === 2) return 'system';
  if (t === 3) return 'share';
  return 'chat';
}

function msgNameColor(m) {
  if (m.type === 2) return '#f1c40f';
  if (m.type === 3) return '#e67e22';
  if (m.type === 1) return '#5dade2';
  return m.sex === 2 ? '#e91e63' : '#3498db';
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  return `${(d.getMonth()+1)}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

async function load() {
  loading.value = true;
  try {
    const { Api } = await import('../composables/useApi');
    const d = await Api.get(`/chat/messages?scope=${channel.value}`);
    messages.value = d.messages || [];
    await nextTick();
    if (msgList.value) msgList.value.scrollTop = msgList.value.scrollHeight;
  } catch(e) { console.error('load chat error:', e); }
  finally { loading.value = false; }
}

async function switchChannel(ch) {
  if (ch === channel.value) return;
  channel.value = ch;
  messages.value = [];
  await load();
}

async function send() {
  const msg = text.value.trim();
  if (!msg) return;
  if (sending.value) return;
  sending.value = true;
  try {
    const { Api } = await import('../composables/useApi');
    const body = { message: msg };
    if (channel.value === 'world') body.type = 1;
    await Api.post('/chat/send', body);
    text.value = '';
    // 世界广播进入冷却
    if (channel.value === 'world') {
      cooldown.value = 90;
      cooldownTimer = setInterval(() => {
        cooldown.value--;
        if (cooldown.value <= 0) clearInterval(cooldownTimer);
      }, 1000);
    }
    await load();
  } catch(e) {
    alert(e.message || '发送失败');
  } finally { sending.value = false; }
}

onMounted(() => {
  load();
  // 每 15s 轮询（世界频道尤其需要）
  pollTimer = setInterval(load, 15000);
});

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer);
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<style scoped>
.chat-page { position: relative; display: flex; flex-direction: column; height: 100%; min-height: 100vh; }
.chat-bg { position: fixed; inset: 0; z-index: 0; background: linear-gradient(160deg, #0d1117 0%, #1a0d1a 50%, #0d1117 100%); pointer-events: none; }

/* Header */
.chat-header { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: rgba(0,0,0,0.3); }
.ch-title { font-size: 16px; font-weight: 700; color: #f0f0f0; }
.ch-refresh { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #f0f0f0; padding: 4px 10px; border-radius: 6px; font-size: 11px; cursor: pointer; }
.ch-refresh:disabled { opacity: 0.5; }

/* Tabs */
.chat-tabs { position: relative; z-index: 2; display: flex; gap: 6px; padding: 8px 12px 0; }
.chat-tabs button { flex: 1; padding: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #7f8c8d; font-size: 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.chat-tabs button.active { background: rgba(52,152,219,0.15); border-color: rgba(52,152,219,0.4); color: #5dade2; font-weight: 700; }

/* Banner */
.chat-banner { position: relative; z-index: 2; padding: 8px 14px; background: rgba(255,255,255,0.02); color: rgba(255,255,255,0.5); font-size: 10px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05); }

/* 消息列表 */
.chat-list { position: relative; z-index: 2; flex: 1; overflow-y: auto; padding: 8px 12px; display: flex; flex-direction: column; gap: 8px; }
.chat-loading, .chat-empty { text-align: center; padding: 40px 20px; color: rgba(255,255,255,0.4); font-size: 12px; }
.msg-row { display: flex; gap: 8px; padding: 8px 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; }
.msg-row.msg-world { background: rgba(93,173,226,0.06); border-color: rgba(93,173,226,0.2); }
.msg-row.msg-share { background: rgba(230,126,34,0.06); border-color: rgba(230,126,34,0.25); }
.msg-row.msg-system { background: rgba(241,196,15,0.06); border-color: rgba(241,196,15,0.25); }
.msg-avatar { width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
.msg-avatar.sys { background: rgba(241,196,15,0.2); }
.msg-body { flex: 1; min-width: 0; }
.msg-meta { display: flex; align-items: center; gap: 6px; font-size: 10px; flex-wrap: wrap; }
.msg-name { font-weight: 700; font-size: 12px; }
.msg-lv { color: #7f8c8d; font-size: 9px; padding: 1px 4px; background: rgba(255,255,255,0.04); border-radius: 3px; }
.msg-tag { font-size: 9px; padding: 1px 5px; border-radius: 3px; }
.tag-share { background: rgba(230,126,34,0.2); color: #e67e22; }
.tag-world { background: rgba(93,173,226,0.2); color: #5dade2; }
.msg-time { color: #7f8c8d; font-size: 9px; margin-left: auto; }
.msg-text { color: rgba(255,255,255,0.85); font-size: 13px; margin-top: 4px; word-break: break-word; line-height: 1.5; }
.msg-text.share { color: #f39c12; }
.msg-text.world { color: #5dade2; font-weight: 600; }
.msg-text.system { color: #f1c40f; font-style: italic; }

/* 输入 */
.chat-input-bar { position: relative; z-index: 2; display: flex; gap: 6px; padding: 8px 12px; background: rgba(0,0,0,0.4); border-top: 1px solid rgba(255,255,255,0.08); }
.ci-input { flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 10px 12px; font-size: 13px; color: #f0f0f0; outline: none; }
.ci-input:focus { border-color: rgba(255,255,255,0.2); }
.ci-btn { background: linear-gradient(135deg, #2980b9, #3498db); color: #fff; border: 0; border-radius: 8px; padding: 0 16px; font-size: 12px; font-weight: 600; cursor: pointer; }
.ci-btn-world { background: linear-gradient(135deg, #c0392b, #e74c3c); }
.ci-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>

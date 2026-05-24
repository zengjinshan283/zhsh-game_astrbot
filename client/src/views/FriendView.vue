<template>
  <div class="friend-page">
    <div class="friend-bg"></div>

    <!-- 顶部 HUD -->
    <div class="top-hud">
      <div class="hud-left">
        <div class="hud-icon">👥</div>
        <div class="hud-title">好友</div>
      </div>
      <div class="hud-badge">好友 {{ friends.length }} · 请求 {{ requests.length }}</div>
    </div>

    <!-- 提示 -->
    <div class="msg-card" v-if="msg" :class="{ error: msgType === 'error' }">
      {{ msg }}
    </div>

    <!-- 搜索添加 -->
    <div class="search-card">
      <input v-model="friendName" type="text" maxlength="20" placeholder="输入角色名" class="search-input" />
      <button class="search-btn" @click="addFriend">添加</button>
    </div>

    <!-- Tab 切换 -->
    <div class="tab-bar">
      <div class="tab-btn" :class="{ active: tab === 'list' }" @click="tab = 'list'">
        👥 好友({{ friends.length }})
      </div>
      <div class="tab-btn" :class="{ active: tab === 'requests' }" @click="tab = 'requests'">
        📨 请求({{ requests.length }})
      </div>
    </div>

    <!-- 好友列表 -->
    <div class="list-area" v-if="tab === 'list'">
      <div v-if="!friends.length" class="empty-card">
        <div class="empty-icon">🤝</div>
        <div class="empty-text">还没有好友</div>
      </div>
      <div v-else class="friend-list">
        <div v-for="f in friends" :key="f.uid" class="friend-card">
          <div class="fc-left">
            <div class="fc-avatar">{{ f.sex === 2 ? '♀' : '♂' }}</div>
            <div class="fc-info">
              <div class="fc-name">{{ f.username }}</div>
              <div class="fc-meta">
                <span class="fc-lv">Lv.{{ f.level }}</span>
                <span class="fc-online" :class="isOnline(f.lastdate) ? 'online' : 'offline'">
                  ● {{ isOnline(f.lastdate) ? '在线' : '离线' }}
                </span>
              </div>
            </div>
          </div>
          <button class="fc-del" @click="deleteFriend(f.uid)">删</button>
        </div>
      </div>
    </div>

    <!-- 请求列表 -->
    <div class="list-area" v-if="tab === 'requests'">
      <div v-if="!requests.length" class="empty-card">
        <div class="empty-icon">📭</div>
        <div class="empty-text">没有待处理的请求</div>
      </div>
      <div v-else class="req-list">
        <div v-for="r in requests" :key="r.id" class="req-card">
          <div class="rc-info">
            <div class="rc-name">{{ r.sex === 2 ? '♀' : '♂' }} {{ r.username }}</div>
            <div class="rc-meta">
              <span class="rc-lv">Lv.{{ r.level }}</span>
              <span class="rc-time">{{ fmtTime(r.created_at) }}</span>
            </div>
          </div>
          <div class="rc-actions">
            <button class="rc-accept" @click="accept(r.id)">✅</button>
            <button class="rc-reject" @click="reject(r.id)">❌</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { globalConfirm, globalAlert } from '../composables/useConfirm';
import { ref, onMounted } from 'vue';
import { Api } from '../composables/useApi';

const tab = ref('list');
const friends = ref([]);
const requests = ref([]);
const friendName = ref('');
const msg = ref('');
const msgType = ref('');

function isOnline(t) { return t > Date.now() / 1000 - 900; }
function fmtTime(t) {
  if (!t) return '';
  const d = new Date(t * 1000);
  return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
}

async function load() {
  try { const d = await Api.get('/friend/list'); friends.value = d.friends || []; requests.value = d.requests || []; }
  catch (e) {}
}

async function addFriend() {
  if (!friendName.value) return;
  try {
    const d = await Api.post('/friend/add', { username: friendName.value });
    msg.value = d.msg; msgType.value = 'success';
    friendName.value = ''; await load();
  } catch (e) { msg.value = e.message; msgType.value = 'error'; }
}

async function accept(id) {
  try { await Api.post('/friend/accept', { friend_row_id: id }); await load(); }
  catch (e) {}
}

async function reject(id) {
  try { await Api.post('/friend/reject', { friend_row_id: id }); await load(); }
  catch (e) {}
}

async function deleteFriend(uid) {
  if (!(await globalConfirm('确定删除?'))) return;
  try { await Api.post('/friend/delete', { friend_id: uid }); await load(); }
  catch (e) {}
}

onMounted(load);
</script>

<style scoped>
.friend-page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 10px;
  min-height: 100%;
  overflow-y: auto;
}

.friend-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  background: linear-gradient(160deg, #0d1117 0%, #0a1628 50%, #0d1117 100%);
  pointer-events: none;
}

.top-hud {
  position: relative;
  z-index: 2;
  background: rgba(13, 17, 23, 0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.hud-left { display: flex; align-items: center; gap: 8px; }
.hud-icon { font-size: 20px; }
.hud-title { font-size: 16px; font-weight: 700; color: #f0f0f0; }
.hud-badge { font-size: 11px; color: #7f8c8d; background: rgba(255,255,255,0.06); padding: 2px 10px; border-radius: 10px; }

.msg-card {
  position: relative;
  z-index: 2;
  background: rgba(39, 174, 96, 0.08);
  border: 1px solid rgba(39, 174, 96, 0.3);
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #27ae60;
  text-align: center;
}
.msg-card.error {
  background: rgba(184, 90, 58, 0.08);
  border-color: rgba(184, 90, 58, 0.3);
  color: #e74c3c;
}

.search-card {
  position: relative;
  z-index: 2;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  gap: 8px;
}
.search-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: #f0f0f0;
  outline: none;
}
.search-input:focus { border-color: rgba(39, 174, 96, 0.4); }
.search-btn {
  background: linear-gradient(135deg, #1a4a2a, #27ae60);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}
.search-btn:hover { opacity: 0.9; }

.tab-bar {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  background: rgba(13, 17, 23, 0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 4px;
}
.tab-btn {
  padding: 10px;
  text-align: center;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #7f8c8d;
  cursor: pointer;
  transition: all 0.2s;
}
.tab-btn.active { background: rgba(39, 174, 96, 0.2); color: #27ae60; }

.list-area {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.empty-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.empty-icon { font-size: 32px; }
.empty-text { font-size: 12px; color: #7f8c8d; }

.friend-list, .req-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.friend-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.fc-left { display: flex; align-items: center; gap: 10px; }
.fc-avatar {
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #bdc3c7;
}
.fc-info { display: flex; flex-direction: column; gap: 2px; }
.fc-name { font-size: 14px; font-weight: 600; color: #f0f0f0; }
.fc-meta { display: flex; align-items: center; gap: 6px; }
.fc-lv { font-size: 10px; color: #7f8c8d; }
.fc-online { font-size: 10px; }
.fc-online.online { color: #27ae60; }
.fc-online.offline { color: #555; }

.fc-del {
  background: rgba(184, 90, 58, 0.12);
  border: 1px solid rgba(184, 90, 58, 0.25);
  color: #e74c3c;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}
.fc-del:hover { background: rgba(184, 90, 58, 0.2); }

.req-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(63, 106, 74, 0.3);
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.rc-info { display: flex; flex-direction: column; gap: 2px; }
.rc-name { font-size: 14px; font-weight: 600; color: #f0f0f0; }
.rc-meta { display: flex; align-items: center; gap: 6px; }
.rc-lv { font-size: 10px; color: #7f8c8d; }
.rc-time { font-size: 10px; color: #555; }
.rc-actions { display: flex; gap: 6px; }
.rc-accept {
  background: rgba(39, 174, 96, 0.12);
  border: 1px solid rgba(39, 174, 96, 0.25);
  color: #27ae60;
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.rc-accept:hover { background: rgba(39, 174, 96, 0.2); }
.rc-reject {
  background: rgba(184, 90, 58, 0.12);
  border: 1px solid rgba(184, 90, 58, 0.25);
  color: #e74c3c;
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.rc-reject:hover { background: rgba(184, 90, 58, 0.2); }
</style>
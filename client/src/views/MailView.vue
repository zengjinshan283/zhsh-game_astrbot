<template>
<div class="mail-page">
  <div class="mail-bg"></div>
  <div class="mail-header">
    <div class="mh-title">📬 邮件</div>
    <div class="mh-meta">
      <span v-if="unreadCount > 0" class="mh-badge">{{ unreadCount }} 未读</span>
      <span v-else class="mh-ok">✓ 全部已读</span>
    </div>
  </div>

  <!-- 过滤 Tabs -->
  <div class="mail-tabs">
    <button :class="{active: filter === 'all'}" @click="setFilter('all')">全部</button>
    <button :class="{active: filter === 'unread'}" @click="setFilter('unread')">未读</button>
    <button :class="{active: filter === 'reward'}" @click="setFilter('reward')">有附件</button>
  </div>

  <!-- 顶部操作 -->
  <div class="mail-actions">
    <button class="ma-btn" @click="loadList">🔄 刷新</button>
    <button class="ma-btn ma-btn-primary" @click="claimAll">🎁 一键领取</button>
  </div>

  <!-- 邮件列表 -->
  <div v-if="loading" class="mail-loading">📭 加载中...</div>
  <div v-else-if="!list.length" class="mail-empty">📭 收件箱空空的</div>
  <div v-else class="mail-list">
    <div v-for="m in list" :key="m.id"
         class="mail-item"
         :class="{unread: m.read_at === 0, claimed: m.claimed}"
         @click="openMail(m)">
      <div class="mi-left">
        <div class="mi-icon" :class="{unread: m.read_at === 0}">📧</div>
        <div v-if="m.rewards && !m.claimed" class="mi-attached-dot">🎁</div>
      </div>
      <div class="mi-body">
        <div class="mi-title-row">
          <span class="mi-from">{{ m.from_name }}</span>
          <span class="mi-time">{{ formatTime(m.created_at) }}</span>
        </div>
        <div class="mi-title">{{ m.title }}</div>
        <div v-if="m.rewards" class="mi-rewards">
          🎁 附件
          <span v-if="m.claimed" class="mi-claimed">已领取</span>
          <span v-else class="mi-unclaimed">待领取</span>
        </div>
      </div>
    </div>
  </div>

  <!-- 详情弹窗 -->
  <div v-if="current" class="mail-modal" @click.self="current = null">
    <div class="modal-card">
      <div class="mc-header">
        <div class="mc-from">来自：{{ current.from_name }}</div>
        <div class="mc-time">{{ formatTime(current.created_at) }}</div>
      </div>
      <div class="mc-title">{{ current.title }}</div>
      <div class="mc-content">{{ current.content }}</div>

      <div v-if="current.rewards" class="mc-rewards">
        <div class="mcr-title">📎 附件</div>
        <div class="mcr-list">
          <div v-for="(r, i) in parseRewards(current.rewards)" :key="i" class="mcr-item">
            <span class="mcr-icon">{{ rewardIcon(r.type) }}</span>
            <span class="mcr-text">{{ rewardText(r) }}</span>
          </div>
        </div>
      </div>

      <div class="mc-actions">
        <button v-if="current.rewards && !current.claimed" class="mc-btn mc-claim" @click="claimOne(current.id)">🎁 领取附件</button>
        <button class="mc-btn mc-close" @click="current = null">关闭</button>
        <button class="mc-btn mc-del" @click="delOne(current.id)">🗑️ 删除</button>
      </div>
    </div>
  </div>
</div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { Api } from '../composables/useApi';
import { useUserStore } from '../stores/user';

const userStore = useUserStore();
const list = ref([]);
const unreadCount = ref(0);
const filter = ref('all');
const loading = ref(false);
const current = ref(null);

let pollTimer = null;

async function loadList() {
  loading.value = true;
  try {
    const d = await Api.get('/mail/list', { params: { filter: filter.value } });
    list.value = d.list || [];
    unreadCount.value = d.unread_count || 0;
  } catch (e) {}
  finally { loading.value = false; }
}

function setFilter(f) { filter.value = f; loadList(); }

async function openMail(m) {
  current.value = m;
  if (m.read_at === 0) {
    try {
      const d = await Api.get(`/mail/read/${m.id}`);
      current.value = d.mail;
      m.read_at = d.mail.read_at;
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    } catch (e) {}
  }
}

async function claimOne(id) {
  try {
    const d = await Api.post(`/mail/claim/${id}`);
    if (d.success) {
      current.value = { ...current.value, claimed: 1 };
      const item = list.value.find(x => x.id === id);
      if (item) item.claimed = 1;
      // 刷新 user 钱币
      const me = await Api.get('/auth/me');
      userStore.updateUser(me.user);
    }
  } catch (e) { alert(e.message); }
}

async function claimAll() {
  try {
    const d = await Api.post('/mail/claim-all');
    if (d.claimed_count > 0) {
      await loadList();
      const me = await Api.get('/auth/me');
      userStore.updateUser(me.user);
      if (current.value) current.value.claimed = 1;
    }
  } catch (e) { alert(e.message); }
}

async function delOne(id) {
  try {
    await Api.post(`/mail/delete/${id}`);
    current.value = null;
    await loadList();
  } catch (e) { alert(e.message); }
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function parseRewards(rewards) {
  if (Array.isArray(rewards)) return rewards;
  try { return JSON.parse(rewards); } catch (e) { return []; }
}

function rewardIcon(type) {
  return { money: '💰', silver: '💎', item: '🎁' }[type] || '🎁';
}

function rewardText(r) {
  if (r.type === 'money') return `铜币 × ${r.amount.toLocaleString()}`;
  if (r.type === 'silver') return `银币 × ${r.amount.toLocaleString()}`;
  if (r.type === 'item') return `物品 × ${r.amount || 1}`;
  return '奖励';
}

onMounted(() => {
  loadList();
  // 30s 轮询收新邮件
  pollTimer = setInterval(() => {
    if (!current.value) loadList();
  }, 30000);
});

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<style scoped>
.mail-page { position: relative; display: flex; flex-direction: column; gap: 10px; padding: 8px 10px; min-height: 100%; overflow-y: auto; }
.mail-bg { position: absolute; inset: 0; background: linear-gradient(180deg, #0a0e1a 0%, #1a0a1a 100%); z-index: 0; }

.mail-header { position: relative; z-index: 2; display: flex; justify-content: space-between; align-items: center; padding: 8px 4px; }
.mh-title { font-size: 20px; font-weight: 700; color: #fff; }
.mh-meta { font-size: 12px; }
.mh-badge { background: #e74c3c; color: #fff; padding: 3px 8px; border-radius: 10px; font-weight: 700; }
.mh-ok { color: #2ecc71; }

.mail-tabs { position: relative; z-index: 2; display: flex; gap: 6px; }
.mail-tabs button { flex: 1; padding: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); border-radius: 8px; font-size: 12px; cursor: pointer; transition: all 0.15s; }
.mail-tabs button.active { background: linear-gradient(135deg, #3498db, #2980b9); color: #fff; border-color: transparent; }

.mail-actions { position: relative; z-index: 2; display: flex; gap: 8px; }
.ma-btn { flex: 1; padding: 8px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); border-radius: 8px; font-size: 12px; cursor: pointer; }
.ma-btn-primary { background: linear-gradient(135deg, #f39c12, #e67e22); border-color: transparent; color: #fff; }

.mail-loading, .mail-empty { position: relative; z-index: 2; text-align: center; padding: 40px; color: rgba(255,255,255,0.5); }

.mail-list { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 8px; }
.mail-item { display: flex; gap: 12px; padding: 12px 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; cursor: pointer; transition: all 0.15s; }
.mail-item:hover { background: rgba(255,255,255,0.08); }
.mail-item.unread { border-left: 3px solid #3498db; background: rgba(52,152,219,0.08); }
.mail-item.claimed { opacity: 0.7; }

.mi-left { position: relative; flex-shrink: 0; }
.mi-icon { font-size: 32px; filter: grayscale(0.5); }
.mi-icon.unread { filter: none; animation: bounceIn 0.4s ease-out; }
@keyframes bounceIn { 0% { transform: scale(0.5); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
.mi-attached-dot { position: absolute; top: -4px; right: -4px; font-size: 12px; animation: pulse 1.5s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }

.mi-body { flex: 1; min-width: 0; }
.mi-title-row { display: flex; justify-content: space-between; align-items: center; }
.mi-from { font-size: 11px; color: rgba(255,255,255,0.6); }
.mi-time { font-size: 10px; color: rgba(255,255,255,0.4); }
.mi-title { color: #fff; font-size: 14px; font-weight: 600; margin: 4px 0; }
.mi-rewards { font-size: 11px; }
.mi-claimed { color: rgba(255,255,255,0.4); }
.mi-unclaimed { color: #f39c12; font-weight: 700; }

/* 弹窗 */
.mail-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px; }
.modal-card { width: 100%; max-width: 420px; max-height: 80vh; background: linear-gradient(180deg, #1a1f2e, #0d1117); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 18px 20px; overflow-y: auto; }
.mc-header { display: flex; justify-content: space-between; font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 10px; }
.mc-title { color: #fff; font-size: 17px; font-weight: 700; margin-bottom: 14px; }
.mc-content { color: rgba(255,255,255,0.85); font-size: 13px; line-height: 1.6; white-space: pre-wrap; }
.mc-rewards { margin-top: 16px; padding: 12px; background: rgba(243,156,18,0.1); border: 1px solid rgba(243,156,18,0.3); border-radius: 8px; }
.mcr-title { color: #f39c12; font-size: 12px; font-weight: 700; margin-bottom: 8px; }
.mcr-list { display: flex; flex-direction: column; gap: 6px; }
.mcr-item { display: flex; gap: 8px; align-items: center; color: #fff; font-size: 13px; }
.mcr-icon { font-size: 18px; }

.mc-actions { display: flex; gap: 8px; margin-top: 18px; }
.mc-btn { flex: 1; padding: 10px; border: 0; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; }
.mc-claim { background: linear-gradient(135deg, #f39c12, #e67e22); color: #fff; }
.mc-close { background: rgba(255,255,255,0.08); color: #fff; }
.mc-del { background: rgba(231,76,60,0.2); color: #e74c3c; }
</style>

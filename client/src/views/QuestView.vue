<template>
<div class="quest-page">
  <div class="quest-bg"></div>

  <!-- 引导提示 -->
  <div v-if="guideStep !== 99 && guideStep !== 0" class="guide-block">
    <div class="gb-emoji">🗺️</div>
    <div class="gb-title">新手引导未完成</div>
    <div class="gb-sub">请先完成引导任务，再查看所有任务</div>
    <router-link to="/quest-guide" class="gb-btn">📜 前往引导任务</router-link>
  </div>

  <!-- 顶部 HUD -->
  <div class="quest-hud" v-if="guideStep === 99">
    <div class="qh-title">📋 任务面板</div>
    <div class="qh-count">
      <span class="qc-badge" :class="{active: active.length > 0}">{{ active.length }}</span>
      进行中
    </div>
  </div>

  <div v-if="msg" class="quest-toast" :class="msgType === 'error' ? 'toast-err' : 'toast-ok'">
    {{ msgType === 'error' ? '❌' : '✅' }} {{ msg }}
  </div>

  <!-- Tab 栏 -->
  <div class="quest-tabs" v-if="guideStep === 99">
    <button v-for="t in tabs" :key="t.key" class="qt-btn" :class="{active: tab === t.key}" @click="tab = t.key">
      <span class="qt-icon">{{ t.icon }}</span>
      <span class="qt-label">{{ t.label }}</span>
      <span v-if="t.key === 'active' && active.length" class="qt-count">{{ active.length }}</span>
    </button>
  </div>

  <!-- 进行中 -->
  <template v-if="tab === 'active' && guideStep === 99">
    <div v-if="!active.length" class="q-empty">没有进行中的任务</div>
    <div v-for="q in active" :key="q.id" class="q-card" :class="{claimable: q.status === 1}">
      <div class="qc-header">
        <div class="qc-cat-tag" :style="{background: catColor(q.category)+'22', borderColor: catColor(q.category)+'55', color: catColor(q.category)}">
          {{ catTag(q.category) }}
        </div>
        <div class="qc-name">{{ q.status === 1 ? '✅' : '🔄' }} {{ q.name }}</div>
        <div class="qc-status" :style="{color: q.status === 1 ? '#2ecc71' : '#f39c12'}">
          {{ q.status === 1 ? '可领取' : q.progress + '/' + q.require_value }}
        </div>
      </div>
      <div class="qc-body">
        <div class="qc-desc">{{ q.description }}</div>
        <div class="qc-meta">
          <span>{{ questTypes[q.type] || '📋任务' }}</span>
          <span>📍 {{ q.npc_name || '未知' }}</span>
          <span>Lv.{{ q.level_req }}</span>
        </div>
        <div class="qc-progress" v-if="q.status === 0">
          <div class="qp-bar">
            <div class="qp-fill" :style="{width: Math.min(100, Math.round(q.progress/Math.max(1,q.require_value)*100))+'%', background: catColor(q.category)}"></div>
          </div>
          <div class="qp-pct">{{ Math.round(q.progress/Math.max(1,q.require_value)*100) }}%</div>
        </div>
      </div>
      <div class="qc-actions">
        <template v-if="q.status === 0">
          <button class="q-btn q-btn-ghost" @click="abandon(q.id)">🗑️ 放弃</button>
        </template>
        <template v-else>
          <div class="q-reward-info">
            <span>✨ +{{ q.reward_exp }}</span>
            <span>💰 +{{ q.reward_money }}</span>
            <span v-if="q.reward_gold">🪙 +{{ q.reward_gold }}</span>
          </div>
          <button class="q-btn q-btn-primary" @click="claim(q.id)">🎁 领取</button>
        </template>
      </div>
    </div>
  </template>

  <!-- 可接 -->
  <template v-if="tab === 'available' && guideStep === 99">
    <div v-if="!filtered.length" class="q-empty">暂无可接任务</div>
    <div v-for="q in filtered" :key="q.id" class="q-card q-card-avail">
      <div class="qc-header">
        <div class="qc-cat-tag" :style="{background: catColor(q.category)+'22', borderColor: catColor(q.category)+'55', color: catColor(q.category)}">
          {{ catTag(q.category) }}
        </div>
        <div class="qc-name">{{ q.name }}</div>
        <div class="qc-level">Lv.{{ q.level_req }}</div>
      </div>
      <div class="qc-body">
        <div class="qc-desc">{{ q.description }}</div>
        <div class="qc-meta">
          <span>{{ questTypes[q.type] || '📋任务' }}</span>
          <span>📍 {{ q.npc_name || '未知' }}</span>
        </div>
        <div class="q-reward-line">
          ✨ {{ q.reward_exp }} 经验 · 💰 {{ q.reward_money }} 铜
          <span v-if="q.reward_gold">· 🪙 {{ q.reward_gold }} 金</span>
          <span v-if="q.category === 2" class="q-daily-tag">🔄 每日</span>
        </div>
      </div>
      <div class="qc-actions">
        <button class="q-btn q-btn-primary" @click="accept(q.id)">📋 接取</button>
      </div>
    </div>
  </template>

  <!-- 已完成 -->
  <template v-if="tab === 'completed' && guideStep === 99">
    <div v-if="!completed.length" class="q-empty">还没有完成任何任务</div>
    <div v-for="q in completed" :key="q.id" class="q-card q-card-done">
      <div class="qc-header">
        <div class="qc-cat-tag" :style="{background: '#27ae6022', borderColor: '#27ae6055', color: '#27ae60'}">
          {{ catTag(q.category) }}
        </div>
        <div class="qc-name">✅ {{ q.name }}</div>
        <div class="qc-time">{{ fmtTime(q.completed_at) }}</div>
      </div>
    </div>
  </template>
</div>
</template>

<script setup>
import { globalConfirm, globalAlert } from '../composables/useConfirm';
import { ref, computed, onMounted } from 'vue';
import { Api } from '../composables/useApi';
import { useUserStore } from '../stores/user';

const userStore = useUserStore();
const tab = ref('active');
const active = ref([]);
const completed = ref([]);
const available = ref([]);
const msg = ref('');
const msgType = ref('');
const guideStep = ref(99);
const questTypes = {0:'⚔️杀怪',1:'📦收集',2:'📍到达',3:'💬对话',4:'🛡️护送'};
const tabs = [
  { key: 'active', label: '进行中', icon: '🔄' },
  { key: 'available', label: '可接', icon: '📋' },
  { key: 'completed', label: '已完成', icon: '✅' },
];

const filtered = computed(() => {
  if (!available.value.length) return [];
  const done = new Set([...active.value.map(q=>q.id), ...completed.value.map(q=>q.id)]);
  return available.value.filter(q => !done.has(q.id));
});

function catTag(c) { return c===1?'📜主线':c===2?'🔄日常':'📋支线'; }
function catColor(c) { return c===1?'#c9a758':c===2?'#4a90d9':'#2ecc71'; }
function fmtTime(t) {
  if (!t) return '';
  const d = new Date(t * 1000);
  return (d.getMonth()+1) + '/' + d.getDate() + ' ' +
    d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
}
function showMsg(text, type='success') { msg.value=text; msgType.value=type; setTimeout(()=>msg.value='',3000); }

async function loadGuideStep() {
  try {
    const d = await Api.get('/auth/me');
    guideStep.value = d.user?.guide_step ?? 99;
  } catch(e) { guideStep.value = 99; }
}

async function load() {
  if (guideStep.value !== 99) return;
  try {
    const d = await Api.get('/quest/list');
    active.value = d.active || [];
    completed.value = d.completed || [];
    available.value = d.available || [];
  } catch(e) {}
}

async function accept(id) {
  try {
    const d = await Api.post('/quest/accept', { quest_id: id });
    showMsg(d.msg); load();
  } catch(e) { showMsg(e.response?.data?.error || '接取失败', 'error'); }
}

async function claim(id) {
  try {
    const d = await Api.post('/quest/claim', { quest_id: id });
    showMsg(d.msg); load();
  } catch(e) { showMsg(e.response?.data?.error || '领取失败', 'error'); }
}

async function abandon(id) {
  const ok = await globalConfirm('确定放弃这个任务吗？');
  if (!ok) return;
  try { await Api.post('/quest/abandon', { quest_id: id }); load(); }
  catch(e) { showMsg('放弃失败', 'error'); }
}

onMounted(async () => { await loadGuideStep(); await load(); });
</script>

<style scoped>
.quest-page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 10px;
  min-height: 100%;
  overflow-y: auto;
}
.quest-bg {
  position: fixed; inset: 0; z-index: 0;
  background: linear-gradient(160deg, #0d1117 0%, #0d1a0d 50%, #0d1117 100%);
  pointer-events: none;
}

/* 引导提示 */
.guide-block {
  position: relative; z-index: 2;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 30px 20px;
  text-align: center;
}
.gb-emoji { font-size: 40px; }
.gb-title { font-size: 15px; font-weight: 700; color: #f0f0f0; }
.gb-sub { font-size: 11px; color: #7f8c8d; }
.gb-btn {
  background: linear-gradient(135deg, #1a4a2a, #27ae60);
  color: #fff; padding: 8px 20px; border-radius: 8px;
  font-size: 12px; font-weight: 600; text-decoration: none;
}

/* HUD */
.quest-hud {
  position: relative; z-index: 2;
  display: flex; justify-content: space-between; align-items: center;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 10px 14px;
}
.qh-title { font-size: 16px; font-weight: 700; color: #f0f0f0; }
.qh-count { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #7f8c8d; }
.qc-badge {
  background: rgba(255,255,255,0.08); border-radius: 10px; padding: 1px 6px;
  font-size: 10px; transition: all 0.2s;
}
.qc-badge.active { background: rgba(39,174,96,0.2); color: #2ecc71; }

/* Toast */
.quest-toast {
  position: relative; z-index: 2;
  border-radius: 8px; padding: 7px 12px; font-size: 11px;
}
.toast-err { background: rgba(231,76,60,0.1); border: 1px solid rgba(231,76,60,0.3); color: #e74c3c; }
.toast-ok { background: rgba(39,174,96,0.1); border: 1px solid rgba(39,174,96,0.3); color: #2ecc71; }

/* Tab */
.quest-tabs {
  position: relative; z-index: 2;
  display: flex; gap: 6px;
}
.qt-btn {
  display: flex; align-items: center; gap: 5px;
  flex: 1; justify-content: center;
  padding: 8px 6px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  font-size: 12px; color: #7f8c8d; cursor: pointer; transition: all 0.2s;
}
.qt-btn.active {
  background: rgba(39,174,96,0.12);
  border-color: rgba(39,174,96,0.4);
  color: #2ecc71;
}
.qt-icon { font-size: 13px; }
.qt-label { font-weight: 500; }
.qt-count {
  background: rgba(39,174,96,0.2); color: #2ecc71;
  border-radius: 10px; padding: 1px 5px; font-size: 10px;
}

/* 任务卡片 */
.q-empty {
  position: relative; z-index: 2;
  text-align: center; font-size: 11px; color: #555; padding: 24px;
}
.q-card {
  position: relative; z-index: 2;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 10px 12px;
  transition: all 0.2s;
}
.q-card:hover { background: rgba(255,255,255,0.06); }
.q-card.claimable { border-color: rgba(39,174,96,0.3); background: rgba(39,174,96,0.05); }
.q-card-avail {}
.q-card-done { opacity: 0.55; }

.qc-header {
  display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
}
.qc-cat-tag {
  font-size: 9px; font-weight: 600;
  padding: 2px 6px; border-radius: 4px;
  border: 1px solid; white-space: nowrap;
}
.qc-name { flex: 1; font-size: 13px; font-weight: 600; color: #f0f0f0; }
.qc-status { font-size: 11px; font-weight: 600; }
.qc-level { font-size: 10px; color: #7f8c8d; background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; }
.qc-time { font-size: 10px; color: #555; }

.qc-body { margin-bottom: 6px; }
.qc-desc { font-size: 11px; color: #95a5a6; margin-bottom: 4px; }
.qc-meta { display: flex; gap: 8px; font-size: 10px; color: #7f8c8d; margin-bottom: 4px; }
.qc-progress { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
.qp-bar { flex: 1; height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; }
.qp-fill { height: 100%; border-radius: 2px; transition: width 0.4s ease; }
.qp-pct { font-size: 9px; color: #7f8c8d; }

.q-reward-line { font-size: 10px; color: #f1c40f; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.q-daily-tag { background: rgba(74,144,217,0.15); border: 1px solid rgba(74,144,217,0.3); color: #4a90d9; padding: 1px 5px; border-radius: 4px; font-size: 9px; }

.qc-actions { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
.q-reward-info { display: flex; gap: 8px; font-size: 11px; color: #f1c40f; margin-right: auto; }
.q-btn {
  padding: 5px 10px; border-radius: 6px;
  border: none; font-size: 11px; font-weight: 600; cursor: pointer;
  transition: opacity 0.2s;
}
.q-btn-primary { background: linear-gradient(135deg, #1a4a2a, #27ae60); color: #fff; }
.q-btn-ghost { background: rgba(255,255,255,0.06); color: #7f8c8d; }
.q-btn:hover { opacity: 0.9; }
</style>
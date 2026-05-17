<template>
<div class="page">
  <!-- 引导未完成时显示提示 -->
  <div v-if="guideStep !== 99 && guideStep !== 0" class="card" style="text-align:center;padding:24px;background:linear-gradient(135deg,#1a1a2e,#16213e);">
    <div style="font-size:36px;margin-bottom:10px;">🗺️</div>
    <div style="color:#c9a758;font-size:14px;margin-bottom:8px;">新手引导未完成</div>
    <div style="color:#888;font-size:12px;margin-bottom:14px;">请先完成引导任务，再查看所有任务</div>
    <router-link to="/quest-guide" class="btn btn-primary">📜 前往引导任务</router-link>
  </div>

  <div class="location-bar">
    <div class="location-name">📋 任务面板</div>
    <div class="location-path">进行中 {{ active.length }}</div>
  </div>
  <div v-if="msg" class="card" :style="{borderColor:msgType==='error'?'#73281c':'#2e5a3b',padding:'3px 8px'}">
    <p :style="{color:msgType==='error'?'#b85a3a':'#2e5a3b',fontSize:'11px',margin:0}">{{ msgType==='error'?'❌':'✅' }} {{ msg }}</p>
  </div>
  <div class="tab-bar">
    <a href="javascript:void(0)" :class="'btn '+(tab==='active'?'btn-primary':'btn-secondary')" @click="tab='active'">🔄 进行中</a>
    <a href="javascript:void(0)" :class="'btn '+(tab==='available'?'btn-primary':'btn-secondary')" @click="tab='available'">📋 可接</a>
    <a href="javascript:void(0)" :class="'btn '+(tab==='completed'?'btn-primary':'btn-secondary')" @click="tab='completed'">✅ 已完成</a>
  </div>

  <!-- 进行中 -->
  <template v-if="tab==='active'">
    <div v-if="!active.length" class="card"><div class="empty-state">没有进行中的任务</div></div>
    <div v-for="q in active" :key="q.id" class="card" :style="{borderColor:q.status===1?'#2e5a3b':catColor(q.category),padding:'4px 8px'}">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span class="item-name" style="font-size:12px;">{{ q.status===1?'✅':'🔄' }} {{ catTag(q.category) }} {{ q.name }}</span>
        <span style="font-size:11px;" :style="{color:q.status===1?'#2e5a3b':'#c9a758'}">{{ q.status===1?'已完成':q.progress+'/'+q.require_value }}</span>
      </div>
      <div class="item-desc" style="margin-top:2px;">{{ q.description }}</div>
      <div class="item-desc">{{ questTypes[q.type]||'📋任务' }} · {{ q.npc_name||'未知' }} · Lv.{{ q.level_req }}</div>
      <div v-if="q.status===0" class="mt-4">
        <div style="height:6px;background:#080c08;border-radius:3px;overflow:hidden;margin:4px 0;">
          <div :style="{height:'100%',width:Math.min(100,Math.round(q.progress/Math.max(1,q.require_value)*100))+'%',background:catColor(q.category)}"></div>
        </div>
        <button class="btn btn-secondary btn-small" @click="abandon(q.id)" style="font-size:10px;">🗑️ 放弃</button>
      </div>
      <div v-else style="margin-top:3px;">
        <button class="btn btn-primary btn-small" @click="claim(q.id)" style="font-size:10px;">🎁 领取奖励</button>
        <span class="text-gold" style="font-size:10px;"> 经验+{{ q.reward_exp }} 铜+{{ q.reward_money }}{{ q.reward_gold?' 金+'+q.reward_gold:'' }}</span>
      </div>
    </div>
  </template>

  <!-- 可接任务 -->
  <template v-if="tab==='available'">
    <div v-if="!filtered.length" class="card"><div class="empty-state">暂无可接任务</div></div>
    <div v-for="q in filtered" :key="q.id" class="card" :style="{borderColor:catColor(q.category),padding:'4px 8px'}">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span class="item-name" style="font-size:12px;">{{ catTag(q.category) }} {{ q.name }}</span>
        <span style="font-size:10px;color:#888;">Lv.{{ q.level_req }}</span>
      </div>
      <div class="item-desc" style="margin-top:2px;">{{ q.description }}</div>
      <div class="item-desc">{{ questTypes[q.type]||'📋任务' }} · {{ q.npc_name||'未知' }} · <span class="text-gold">经验+{{ q.reward_exp }} 铜+{{ q.reward_money }}{{ q.reward_gold?' 金+'+q.reward_gold:'' }}</span>{{ q.category===2?' · 🔄每日':'' }}</div>
      <button class="btn btn-primary btn-small" @click="accept(q.id)" style="font-size:10px;margin-top:3px;">📋 接取</button>
    </div>
  </template>

  <!-- 已完成 -->
  <template v-if="tab==='completed'">
    <div v-if="!completed.length" class="card"><div class="empty-state">还没有完成任何任务</div></div>
    <div v-for="q in completed" :key="q.id" class="card" style="opacity:0.7;padding:4px 8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span class="item-name" style="color:#2e5a3b;font-size:12px;">✅ {{ catTag(q.category) }} {{ q.name }}</span>
        <span class="text-muted" style="font-size:10px;">{{ fmtTime(q.completed_at) }}</span>
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
const guideStep = ref(99); // 99=引导完成，显示完整任务
const questTypes = {0:'⚔️杀怪',1:'📦收集',2:'📍到达',3:'💬对话',4:'🛡️护送'};

const filtered = computed(() => {
  if (!available.value.length) return [];
  const done = new Set([...active.value.map(q=>q.id), ...completed.value.map(q=>q.id)]);
  return available.value.filter(q => !done.has(q.id));
});

function catTag(c) { return c===1?'📜主线':c===2?'🔄日常':'📋支线'; }
function catColor(c) { return c===1?'#c9a758':c===2?'#4a90d9':'#2e5a3b'; }

function fmtTime(t) {
  if (!t) return '';
  const d = new Date(t * 1000);
  return (d.getMonth()+1) + '/' + d.getDate() + ' ' +
    d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
}

async function loadGuideStep() {
  try {
    const d = await Api.get('/auth/me');
    guideStep.value = d.user?.guide_step ?? 99;
    // 引导未完成时 redirect to QuestGuideView
    if (guideStep.value !== 99 && guideStep.value !== 0) {
      // Show only guide quests (no full list loading needed)
    }
  } catch(e) {
    guideStep.value = 99;
  }
}

async function load() {
  // guide_step < 99 时只显示引导任务，不加载完整列表
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
  try {
    await Api.post('/quest/abandon', { quest_id: id });
    load();
  } catch(e) { showMsg('放弃失败', 'error'); }
}

function showMsg(text, type='success') { msg.value=text; msgType.value=type; setTimeout(()=>msg.value='',3000); }

onMounted(async () => { await loadGuideStep(); await load(); });
</script>

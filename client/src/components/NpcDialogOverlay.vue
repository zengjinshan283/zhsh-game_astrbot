<template>
  <div class="npc-overlay" @click.self="close">
    <div class="npc-card">
      <!-- 头部：NPC信息 -->
      <div class="npc-header">
        <div class="npc-avatar">{{ npcIcon }}</div>
        <div class="npc-info">
          <div class="npc-name">{{ npc?.name || '???' }}</div>
          <div class="npc-place">{{ placeName }}</div>
        </div>
        <button class="npc-close" @click="close">✕</button>
      </div>

      <!-- 对话内容 -->
      <div class="npc-dialog">{{ currentDialog }}</div>

      <!-- 闲聊话题 -->
      <div v-if="chatTopics.length" class="topics-row">
        <button v-for="topic in chatTopics" :key="topic.key" class="topic-btn"
          @click="currentDialog = topic.text">💬 {{ topic.text.substring(0, 8) }}{{ topic.text.length > 8 ? '…' : '' }}</button>
        <button v-if="npc?.type === 5" class="topic-btn shop-topic" @click="openShop">💎 查看商品</button>
      </div>

      <!-- 任务区域 -->
      <div v-if="availableQuests.length" class="npc-section">
        <div class="ns-title">📋 可接任务</div>
        <div v-for="q in availableQuests" :key="q.id" class="quest-card">
          <div class="qc-name">{{ q.name }}</div>
          <div class="qc-desc">{{ q.desc }}</div>
          <div class="qc-reward">🎁 {{ q.reward }}</div>
          <button class="qc-btn" @click="acceptQuest(q)">接取</button>
        </div>
      </div>

      <div v-if="activeQuests.length" class="npc-section">
        <div class="ns-title">🔄 进行中</div>
        <div v-for="q in activeQuests" :key="q.id" class="quest-card">
          <div class="qc-name">
            {{ q.status === 1 ? '✅' : '🔄' }} {{ q.name }}
            <span v-if="q.status === 1" class="qc-ready">可提交</span>
          </div>
          <div class="qc-desc">{{ q.description }}</div>
          <div class="qc-progress">
            <span v-if="q.status === 0">{{ q.progress }}/{{ q.require_value }}</span>
            <span v-else class="qc-done">已完成</span>
          </div>
          <button v-if="q.status === 1" class="qc-btn primary" @click="claimQuest(q)">提交任务</button>
        </div>
      </div>

      <!-- 闲聊无任务 -->
      <div v-if="!availableQuests.length && !activeQuests.length && chatTopics.length" class="npc-section">
        <div class="ns-title">💬 闲聊</div>
        <div v-for="topic in chatTopics" :key="topic.key" class="chat-row" @click="currentDialog = topic.text">{{ topic.text }}</div>
      </div>

      <!-- 商店商品 -->
      <div v-if="shopItems.length || showShop" class="npc-section">
        <div class="ns-title">💎 商品</div>
        <div v-if="!shopItems.length && showShop" class="ns-loading">加载中...</div>
        <div v-for="item in shopItems" :key="item.id" class="shop-item">
          <div class="si-top">
            <div class="si-name">{{ item.name }}</div>
            <div class="si-level">Lv.{{ item.level_req || 1 }}</div>
          </div>
          <div class="si-desc">{{ item.description || '来自远方的珍贵货物' }}</div>
          <div class="si-prices">售价: {{ item.price_buy }} | 回收: {{ item.price_sell }}</div>
          <div class="si-actions">
            <input v-model.number="buyQty[item.id]" type="number" min="1" max="999" class="si-qty">
            <button class="si-buy-btn" @click="buyItem(item, buyQty[item.id] || 1)">购买 ×{{ buyQty[item.id] || 1 }}</button>
          </div>
        </div>
      </div>

      <button class="npc-close-btn" @click="close">关闭</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { Api } from '../composables/useApi';

const props = defineProps({
  npcId: { type: Number, required: true },
  placeName: { type: String, default: '' }
});

const emit = defineEmits(['close']);

const npc = ref(null);
const currentDialog = ref('');
const chatTopics = ref([]);
const availableQuests = ref([]);
const activeQuests = ref([]);
const completedTalkQuests = ref([]);
const shopItems = ref([]);
const showShop = ref(false);
const buyQty = ref({});

const npcIcon = computed(() => {
  if (!npc.value) return '👤';
  const t = npc.value.type;
  if (t === 1) return '🍺';
  if (t === 2) return '⚒️';
  if (t === 3) return '🏦';
  if (t === 4) return '🎰';
  if (t === 5) return '💎';
  return '👤';
});

async function load() {
  try {
    const d = await Api.get(`/npc/${props.npcId}/chat`);
    npc.value = d.npc || { name: '???', type: 0 };
    currentDialog.value = d.dialog || npc.value.dialog || '你好！';
    chatTopics.value = d.chat_topics || [];
    availableQuests.value = d.available_quests || [];
    activeQuests.value = (d.active_quests || []).filter(q => q.status < 2);
    completedTalkQuests.value = d.completed_talk_quests || [];
    shopItems.value = [];
  } catch (e) { currentDialog.value = '……（无法连接）'; }
}

async function loadShop() {
  try {
    const d = await Api.get(`/npc/${props.npcId}/shop`);
    shopItems.value = d.items || [];
  } catch (e) { shopItems.value = []; }
}

function openShop() { showShop.value = true; loadShop(); }

async function buyItem(item, qty) {
  try {
    await Api.post(`/npc/${props.npcId}/buy`, { item_id: item.id, quantity: qty });
    alert(`购买成功！`);
  } catch (e) { alert(e.message); }
}

async function acceptQuest(q) {
  try {
    await Api.post(`/quest/${q.id}/accept`);
    alert('接取成功！');
    load();
  } catch (e) { alert(e.message); }
}

async function claimQuest(q) {
  try {
    await Api.post(`/quest/${q.id}/claim`);
    alert('提交成功！');
    load();
  } catch (e) { alert(e.message); }
}

function close() { emit('close'); }

watch(() => props.npcId, (id) => { if (id) load(); }, { immediate: true });
</script>

<style scoped>
.npc-overlay {
  position: fixed; inset: 0; z-index: 500;
  background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(6px);
  display: flex; align-items: flex-end; justify-content: center;
  padding: 0 0 env(safe-area-inset-bottom);
}
.npc-card {
  width: 100%; max-width: 480px; max-height: 85vh;
  background: rgba(20, 25, 35, 0.96); backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px 18px 0 0;
  padding: 16px 16px env(safe-area-inset-bottom);
  overflow-y: auto;
  display: flex; flex-direction: column; gap: 10px;
}
.npc-header {
  display: flex; align-items: center; gap: 12px;
  padding-bottom: 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.npc-avatar { font-size: 40px; }
.npc-info { flex: 1; }
.npc-name { font-size: 18px; font-weight: 800; color: #f0f0f0; }
.npc-place { font-size: 11px; color: #7f8c8d; margin-top: 2px; }
.npc-close {
  width: 32px; height: 32px; border-radius: 50%;
  background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.08);
  color: #7f8c8d; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.npc-dialog {
  background: rgba(201, 167, 88, 0.08); border: 1px solid rgba(201, 167, 88, 0.15);
  border-radius: 12px; padding: 12px 14px;
  font-size: 13px; color: #d4c4a0; line-height: 1.6;
}
.topics-row { display: flex; flex-wrap: wrap; gap: 6px; }
.topic-btn {
  padding: 5px 10px; border-radius: 20px;
  background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08);
  color: #7f8c8d; font-size: 11px; cursor: pointer; transition: all 0.2s;
}
.topic-btn:hover { background: rgba(255, 255, 255, 0.09); color: #ddd; }
.shop-topic { border-color: rgba(201, 167, 88, 0.3); color: #c9a758; }
.npc-section { display: flex; flex-direction: column; gap: 8px; }
.ns-title { font-size: 12px; font-weight: 700; color: #7f8c8d; margin-bottom: 2px; }
.ns-loading { font-size: 12px; color: #555; padding: 8px 0; }
.quest-card {
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px;
}
.qc-name { font-size: 13px; font-weight: 700; color: #f0f0f0; display: flex; align-items: center; gap: 6px; }
.qc-ready { font-size: 10px; color: #27ae60; background: rgba(39, 174, 96, 0.1); padding: 1px 6px; border-radius: 8px; }
.qc-desc { font-size: 11px; color: #7f8c8d; }
.qc-reward { font-size: 11px; color: #c9a758; }
.qc-progress { font-size: 11px; color: #7f8c8d; }
.qc-done { color: #27ae60; }
.qc-btn {
  margin-top: 4px; padding: 6px 12px; border-radius: 8px;
  background: rgba(201, 167, 88, 0.1); border: 1px solid rgba(201, 167, 88, 0.2);
  color: #c9a758; font-size: 12px; font-weight: 700; cursor: pointer; align-self: flex-start;
}
.qc-btn.primary { background: rgba(39, 174, 96, 0.1); border-color: rgba(39, 174, 96, 0.2); color: #27ae60; }
.chat-row {
  font-size: 12px; color: #7f8c8d; padding: 6px 8px;
  border-radius: 8px; cursor: pointer; transition: all 0.2s;
}
.chat-row:hover { background: rgba(255, 255, 255, 0.04); color: #ddd; }
.shop-item {
  background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px;
}
.si-top { display: flex; align-items: center; justify-content: space-between; }
.si-name { font-size: 13px; font-weight: 700; color: #f0f0f0; }
.si-level { font-size: 10px; color: #7f8c8d; background: rgba(255, 255, 255, 0.05); padding: 1px 6px; border-radius: 6px; }
.si-desc { font-size: 11px; color: #7f8c8d; }
.si-prices { font-size: 11px; color: #c9a758; }
.si-actions { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
.si-qty {
  width: 50px; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px; color: #d4c4a0; font-size: 12px; padding: 4px 6px; text-align: center;
}
.si-buy-btn {
  flex: 1; padding: 6px 10px; border-radius: 8px;
  background: linear-gradient(135deg, #c9a758, #e2b714); border: none;
  color: #1a1a1a; font-size: 12px; font-weight: 700; cursor: pointer;
}
.npc-close-btn {
  width: 100%; padding: 12px; border-radius: 12px;
  background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08);
  color: #7f8c8d; font-size: 14px; font-weight: 700; cursor: pointer; margin-top: 4px;
}
.npc-close-btn:hover { background: rgba(255, 255, 255, 0.09); }
</style>
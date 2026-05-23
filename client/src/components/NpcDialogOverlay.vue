<template>
  <div class="npc-overlay" @click.self="close">
    <div class="npc-card">
      <!-- 头部：NPC信息 -->
      <div class="npc-header">
        <div class="npc-avatar">{{ npcIcon }}</div>
        <div class="npc-info">
          <div class="npc-name">{{ npc?.name || '???'.name }}</div>
          <div class="npc-place">{{ placeName }}</div>
        </div>
        <button class="npc-close" @click="close">✕</button>
      </div>

      <!-- 对话内容 -->
      <div class="npc-dialog-text">{{ currentDialog }}</div>

      <!-- 闲聊话题（横滚） -->
      <div v-if="chatTopics.length" class="npc-topics">
        <button
          v-for="topic in chatTopics"
          :key="topic.key"
          class="topic-btn"
          @click="currentDialog = topic.text"
        >💬 {{ topic.key.replace('chat', '话题') }}</button>
        <button v-if="npc && (npc.type === 5)" class="topic-btn" style="border-color:#c9a758;color:#c9a758;" @click="openShop">💎 查看商品</button>
      </div>

      <!-- 可接任务 -->
      <div v-if="availableQuests.length" class="npc-section">
        <div class="section-title">📋 可接任务</div>
        <div v-for="q in availableQuests" :key="q.id" class="quest-item">
          <div class="quest-name">{{ q.name }}</div>
          <div class="quest-desc">{{ q.desc }}</div>
          <div class="quest-reward">奖励: {{ q.reward }}</div>
          <button class="btn btn-primary btn-small" @click="acceptQuest(q)">接取</button>
        </div>
      </div>

      <!-- 进行中任务 -->
      <div v-if="activeQuests.length" class="npc-section">
        <div class="section-title">🔄 进行中</div>
        <div v-for="q in activeQuests" :key="q.id" class="quest-item">
          <div class="quest-name">
            {{ q.status === 1 ? '✅' : '🔄' }} {{ q.name }}
            <span v-if="q.status === 1" class="quest-ready">可提交！</span>
          </div>
          <div class="quest-desc">{{ q.description }}</div>
          <div class="quest-progress">
            <span v-if="q.status === 0">{{ q.progress }}/{{ q.require_value }}</span>
            <span v-else class="text-gold">已完成！</span>
          </div>
          <button v-if="q.status === 1" class="btn btn-primary btn-small" @click="claimQuest(q)">提交任务</button>
        </div>
      </div>

      <!-- 无任务时显示闲聊 -->
      <div v-if="!availableQuests.length && !activeQuests.length && chatTopics.length" class="npc-section">
        <div class="section-title">💬 闲聊</div>
        <div v-for="topic in chatTopics" :key="topic.key" class="chat-item" @click="currentDialog = topic.text">
          {{ topic.text }}
        </div>
      </div>

      <!-- 商店商品（type=5珠宝商/商人） -->
      <div v-if="shopItems.length || showShop" class="npc-section">
        <div class="section-title">💎 商品</div>
        <div v-if="!shopItems.length && showShop" class="empty-state" style="font-size:12px;">加载中...</div>
        <div v-for="item in shopItems" :key="item.id" class="quest-item">
          <div class="quest-name">{{ item.name }} <span style="color:#888;font-size:10px;">Lv.{{ item.level_req || 1 }}</span></div>
          <div class="quest-desc">{{ item.description || '来自东方的珍贵饰品' }}</div>
          <div class="quest-reward">售价: {{ item.price_buy }} 铜币 | 回收: {{ item.price_sell }} 铜币</div>
          <div style="display:flex;gap:6px;margin-top:4px;">
            <button class="btn btn-primary btn-small" @click="buyItem(item)">购买</button>
            <button class="btn btn-secondary btn-small" @click="sellItem(item)">出售</button>
          </div>
        </div>
      </div>

      <!-- 关闭按钮 -->
      <button class="btn btn-secondary" style="width:100%;margin-top:8px;" @click="close">关闭</button>
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

const npcIcon = computed(() => {
  if (!npc.value) return '👤';
  const t = npc.value.type;
  if (t === 1) return '🍺'; // 酒馆老板
  if (t === 2) return '⚒️'; // 铁匠
  if (t === 3) return '🏦'; // 银行
  if (t === 4) return '🎰'; // 赌场
  if (t === 5) return '💎'; // 珠宝商/商人
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
    // 商店NPC加载商品
    shopItems.value = [];
  } catch (e) {
    currentDialog.value = '……（无法连接）';
  }
}

// 加载商店商品
async function loadShop() {
  try {
    const d = await Api.get(`/npc/${props.npcId}/shop`);
    shopItems.value = d.items || [];
  } catch (e) {
    shopItems.value = [];
  }
}

async function acceptQuest(q) {
  try {
    const d = await Api.post('/quest/accept', { quest_id: q.id });
    currentDialog.value = d.msg || '任务已接取！';
    await load();
  } catch (e) {
    currentDialog.value = e.response?.data?.error || '接取失败';
  }
}

async function claimQuest(q) {
  try {
    const d = await Api.post('/quest/claim', { quest_id: q.id });
    currentDialog.value = d.msg || '任务已完成，奖励已发放！';
    await load();
  } catch (e) {
    currentDialog.value = e.response?.data?.error || '提交失败';
  }
}

async function sellItem(item) {
  try {
    const d = await Api.post('/npc/sell', { inventory_id: item.inv_id || 0, quantity: 1 });
    currentDialog.value = `出售成功！获得 ${d.earn} 铜币`;
  } catch (e) {
    currentDialog.value = e.response?.data?.error || '出售失败';
  }
}

function close() {
  showShop.value = false;
  shopItems.value = [];
  emit('close');
}

watch(() => props.npcId, load, { immediate: true });
</script>

<style scoped>
.npc-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 9000;
  padding: 0 0 60px;
}
.npc-card {
  background: linear-gradient(160deg, #1c2a1a 0%, #141e12 100%);
  border: 2px solid #4a6a3a;
  border-radius: 16px 16px 0 0;
  width: 100%;
  max-width: 480px;
  max-height: 75vh;
  overflow-y: auto;
  padding: 12px 14px;
}
.npc-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.npc-avatar { font-size: 36px; line-height: 1; }
.npc-info { flex: 1; }
.npc-name { font-size: 16px; color: #c9a758; font-weight: bold; }
.npc-place { font-size: 11px; color: #8b9a7c; }
.npc-close {
  background: none; border: none; color: #8b9a7c;
  font-size: 18px; cursor: pointer; padding: 4px 8px;
}
.npc-dialog-text {
  background: #0f1a0e;
  border: 1px solid #2a3a2a;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  color: #d4c4a0;
  line-height: 1.5;
  margin-bottom: 8px;
}
.npc-topics {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.topic-btn {
  background: #1a2a1e;
  border: 1px solid #3a5a3a;
  color: #8b9a7c;
  border-radius: 20px;
  padding: 3px 10px;
  font-size: 11px;
  cursor: pointer;
}
.topic-btn:hover { border-color: #c9a758; color: #c9a758; }
.npc-section { margin-top: 8px; }
.section-title {
  font-size: 12px;
  color: #c9a758;
  margin-bottom: 6px;
  padding-bottom: 3px;
  border-bottom: 1px solid #2a3a2a;
}
.quest-item {
  background: #0f1a0e;
  border: 1px solid #2a3a2a;
  border-radius: 8px;
  padding: 6px 8px;
  margin-bottom: 6px;
}
.quest-name { font-size: 12px; color: #d4c4a0; font-weight: bold; }
.quest-desc { font-size: 11px; color: #8b9a7c; margin: 2px 0; }
.quest-reward { font-size: 10px; color: #c9a758; margin-bottom: 4px; }
.quest-progress { font-size: 11px; color: #8b9a7c; margin-bottom: 4px; }
.quest-ready { color: #4a9a4a; font-size: 11px; }
.chat-item {
  background: #0f1a0e;
  border: 1px solid #2a3a2a;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 12px;
  color: #8b9a7c;
  margin-bottom: 4px;
  cursor: pointer;
}
.chat-item:hover { border-color: #4a6a3a; color: #d4c4a0; }
</style>

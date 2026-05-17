<!--
  任务引导面板 - 主线任务专属引导视图
  入口：QuestView.vue 内的"主线" tab，或从底部导航"任务"进入时首屏
  功能：展示当前主线任务目标 + 一键导航 + 进度追踪
-->
<template>
<div class="page">
  <div class="location-bar">
    <div class="location-name">📜 主线任务</div>
    <div class="location-path" v-if="currentQuest">Lv.{{ currentQuest.level_req }} · {{ questTypes[currentQuest.type] || '任务' }}</div>
  </div>

  <!-- 无引导状态 -->
  <div v-if="guideStep === 99" class="card" style="text-align:center;padding:32px 20px;">
    <div style="font-size:40px;margin-bottom:12px;">🎉</div>
    <div style="color:#c9a758;font-size:16px;font-weight:bold;margin-bottom:8px;">新手引导已完成</div>
    <div style="color:#888;font-size:12px;">去探索广阔的世界吧！查看"可接任务"获取更多任务</div>
    <router-link to="/quest" class="btn btn-primary" style="margin-top:16px;display:inline-block;">📋 查看所有任务</router-link>
  </div>

  <!-- 开场剧情（step=0） -->
  <div v-else-if="guideStep === 0" class="card intro-card" style="padding:20px;">
    <div style="font-size:24px;text-align:center;margin-bottom:12px;">⚓</div>
    <div style="text-align:center;font-size:15px;color:#c9a758;font-weight:bold;margin-bottom:10px;">欢迎来到纵横四海</div>
    <div style="font-size:13px;color:#8b7355;line-height:1.7;text-align:center;margin-bottom:16px;">
      大航海时代的冒险即将开始<br>在开始之前，让我们先了解一下这个世界的故事……
    </div>
    <button class="btn btn-primary btn-block" @click="startIntro">📖 观看开场剧情</button>
    <button class="btn btn-secondary btn-block" style="margin-top:8px;" @click="skipIntro">跳过，直接开始</button>
  </div>

  <!-- 主线引导进行中 -->
  <template v-else>
    <!-- 当前任务卡片 -->
    <div v-if="currentQuest" class="quest-guide-card" :style="{borderColor: progressColor}">
      <div class="quest-guide-tag">
        <span class="tag-main">📜 主线</span>
        <span class="tag-step">第 {{ guideStep }} / 6 步</span>
      </div>

      <div class="quest-name">{{ currentQuest.name }}</div>
      <div class="quest-desc">{{ currentQuest.description }}</div>

      <!-- 进度条（杀怪类型） -->
      <div v-if="currentQuest.type === 0" class="progress-section">
        <div class="progress-label">
          <span>击杀进度</span>
          <span :style="{color: progressColor}">{{ questProgress }}/{{ currentQuest.require_value }}</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" :style="{width: progressPct + '%', background: progressColor}"></div>
        </div>
      </div>

      <!-- 奖励信息 -->
      <div class="quest-rewards">
        <span class="reward-item" v-if="currentQuest.reward_exp">⭐ 经验 +{{ currentQuest.reward_exp }}</span>
        <span class="reward-item" v-if="currentQuest.reward_money">💰 铜币 +{{ currentQuest.reward_money }}</span>
        <span class="reward-item" v-if="currentQuest.reward_item_id">🎁 物品 ×{{ currentQuest.reward_item_qty || 1 }}</span>
      </div>

      <!-- 操作按钮 -->
      <div class="quest-actions">
        <!-- 对话NPC类型：直接显示"前往对话"按钮 -->
        <button v-if="currentQuest.type === 2" class="btn btn-primary btn-nav" @click="goToNpc">
          💬 前往与马可对话
        </button>
        <!-- 到达地点类型 -->
        <button v-else-if="currentQuest.type === 3" class="btn btn-primary btn-nav" @click="goToPlace">
          📍 {{ goBtnText }}
        </button>
        <!-- 杀怪类型 -->
        <button v-else class="btn btn-primary btn-nav" @click="goToHunt">
          ⚔️ {{ huntBtnText }}
        </button>
        <button class="btn btn-secondary btn-skip" @click="skipGuide">⏭️ 跳过引导</button>
      </div>
    </div>

    <!-- 无进行中任务，显示下一步引导提示 -->
    <div v-else class="card" style="text-align:center;padding:24px;">
      <div style="font-size:36px;margin-bottom:10px;">🗺️</div>
      <div style="color:#c9a758;font-size:14px;margin-bottom:8px;">当前无进行中的引导任务</div>
      <div style="color:#888;font-size:12px;margin-bottom:14px;">前往威尼斯城中心找马可接取任务</div>
      <button class="btn btn-primary" @click="goToNpc">💬 前往马可</button>
    </div>

    <!-- 任务目标追踪 -->
    <div v-if="currentQuest" class="guide-tips">
      <div class="tip-icon">💡</div>
      <div class="tip-content">
        <div class="tip-title">提示</div>
        <div class="tip-text">{{ currentTip }}</div>
      </div>
    </div>

    <!-- 任务链预览（显示接下来2个任务） -->
    <div v-if="nextQuests.length" class="card" style="margin-top:10px;">
      <div class="card-title" style="color:#8b9dc3;">📋 后续任务</div>
      <div v-for="(q, i) in nextQuests" :key="q.id" class="next-quest-item">
        <span class="next-quest-num">{{ i + 1 }}</span>
        <div>
          <div style="font-size:12px;color:#c9a758;">{{ q.name }}</div>
          <div style="font-size:11px;color:#666;">{{ q.description }}</div>
        </div>
      </div>
    </div>
  </template>
</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Api } from '../composables/useApi';
import { useUserStore } from '../stores/user';

const router = useRouter();
const userStore = useUserStore();

const guideStep = ref(99);
const currentQuest = ref(null);
const questProgress = ref(0);
const introStories = ref([]);
const introStep = ref(1);

// 主线任务链（从 DB 或硬编码读取）
const MAIN_QUEST_CHAIN = [
  { id: 1, name: '清理城郊野狗', type: 0, target_id: 1, require_value: 3, level_req: 1, reward_exp: 100, reward_money: 200, npc_id: 1, description: '在威尼斯城郊击败3只野狗，将皮毛带回去给马可' },
  { id: 2, name: '初识航海', type: 2, target_id: 1, require_value: 1, level_req: 5, reward_exp: 120, reward_money: 300, npc_id: 1, description: '向马可请教航海知识，了解船只购买方法' },
  { id: 3, name: '雅典之行', type: 3, target_id: 202, require_value: 1, level_req: 10, reward_exp: 200, reward_money: 500, npc_id: 1, description: '从威尼斯码头出发，航行前往雅典' },
];

const questTypes = { 0: '⚔️杀怪', 1: '📦收集', 2: '💬对话', 3: '📍到达', 4: '🛡️护送' };

// guideStep → 当前任务
const stepToQuestId = { 1: 1, 2: 1, 3: 2, 4: 3, 5: 3, 6: 3 };

const progressPct = computed(() => {
  if (!currentQuest.value) return 0;
  return Math.min(100, Math.round(questProgress.value / currentQuest.value.require_value * 100));
});

const progressColor = computed(() => {
  const p = progressPct.value;
  if (p >= 100) return '#4fc3f7';
  if (p >= 50) return '#c9a758';
  return '#e85a5a';
});

const goBtnText = computed(() => {
  const q = currentQuest.value;
  if (!q) return '前往';
  if (q.target_id === 1022) return '前往威尼斯码头';
  return '前往目的地';
});

const huntBtnText = computed(() => {
  return questProgress.value >= (currentQuest.value?.require_value || 0) ? '✅ 已完成，回去交任务' : '⚔️ 出城战斗';
});

const currentTip = computed(() => {
  const tips = {
    1: '在城中心找到马可（头顶有❗标识的NPC），与他对话开始任务。',
    2: '出城后会自动遇到野狗，点击"攻击"按钮击败它们！',
    3: '回去找马可对话，领取任务奖励和下一步指引。',
    4: '前往威尼斯码头，在码头可以和船只商人对话，了解如何购买船只。',
    5: '找码头船只商人购买一艘小帆船，有了船才能出海航行。',
    6: '起航前往雅典！航行过程中可能会有海盗出没，做好战斗准备！',
  };
  return tips[guideStep.value] || '';
});

const nextQuests = computed(() => {
  if (!currentQuest.value) return [];
  const currentId = currentQuest.value.id;
  return MAIN_QUEST_CHAIN.filter(q => q.id > currentId).slice(0, 2);
});

async function loadGuideInfo() {
  try {
    const d = await Api.get('/guide/status');
    guideStep.value = d.step;

    if (d.step === 0) {
      // 需要开场剧情
      try {
        const s = await Api.get('/guide/intro-stories');
        introStories.value = s.stories || [];
      } catch(e) {}
      return;
    }

    if (d.step === 99 || d.step === 0) {
      currentQuest.value = null;
      return;
    }

    // 获取当前步骤对应的任务
    const questId = stepToQuestId[d.step];
    if (questId) {
      currentQuest.value = MAIN_QUEST_CHAIN.find(q => q.id === questId) || null;
      // 获取实际进度
      if (currentQuest.value) {
        await loadQuestProgress(questId);
      }
    }
  } catch (e) {}
}

async function loadQuestProgress(questId) {
  try {
    const d = await Api.get('/quest/list');
    const active = d.active || [];
    const q = active.find(q => q.id === questId);
    if (q) {
      questProgress.value = q.progress || 0;
    }
  } catch (e) {}
}

function goToNpc() {
  if (currentQuest.value?.npc_id) {
    router.push({ name: 'citymap', params: { cityId: 101 } });
  }
}

function goToPlace() {
  const q = currentQuest.value;
  if (q?.target_id) {
    // 如果是航海任务(雅典202)，导航到码头
    if (q.target_id === 202) {
      router.push({ name: 'citymap', params: { cityId: 101 } });
    } else {
      router.push({ name: 'map' });
    }
  }
}

function goToHunt() {
  router.push({ name: 'map' });
}

async function startIntro() {
  router.push({ name: 'story' });
}

async function skipIntro() {
  try {
    await Api.post('/guide/intro-complete');
    await loadGuideInfo();
  } catch (e) {}
}

async function skipGuide() {
  if (!confirm('确定跳过新手引导？跳过后可前往"福利中心"领取注册礼包。')) return;
  try {
    await Api.post('/guide/skip');
    guideStep.value = 99;
    currentQuest.value = null;
  } catch (e) {}
}

onMounted(loadGuideInfo);
</script>

<style scoped>
.quest-guide-card {
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  border: 2px solid;
  border-radius: 14px;
  padding: 18px 16px 14px;
  margin-bottom: 10px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}

.quest-guide-tag {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.tag-main {
  background: rgba(201, 168, 76, 0.15);
  color: #c9a84c;
  font-size: 11px;
  font-weight: bold;
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px solid rgba(201, 168, 76, 0.3);
}
.tag-step {
  font-size: 11px;
  color: #8b7355;
}

.quest-name {
  font-size: 16px;
  font-weight: bold;
  color: #f3e1b3;
  margin-bottom: 6px;
}
.quest-desc {
  font-size: 12px;
  color: #8b9dc3;
  line-height: 1.6;
  margin-bottom: 12px;
}

.progress-section { margin-bottom: 12px; }
.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #8b9dc3;
  margin-bottom: 5px;
}
.progress-track {
  height: 6px;
  background: #1a1a2e;
  border-radius: 3px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.quest-rewards {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
}
.reward-item {
  font-size: 11px;
  color: #c9a84c;
  background: rgba(201, 168, 76, 0.08);
  padding: 3px 8px;
  border-radius: 4px;
}

.quest-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.btn-nav {
  flex: 1;
  padding: 10px 12px;
  font-size: 13px;
}
.btn-skip {
  font-size: 11px;
  padding: 8px 10px;
  opacity: 0.7;
}

.guide-tips {
  display: flex;
  gap: 10px;
  background: rgba(79, 195, 247, 0.05);
  border: 1px solid rgba(79, 195, 247, 0.15);
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 10px;
}
.tip-icon { font-size: 18px; flex-shrink: 0; }
.tip-title {
  font-size: 12px;
  color: #4fc3f7;
  font-weight: bold;
  margin-bottom: 4px;
}
.tip-text {
  font-size: 12px;
  color: #8b9dc3;
  line-height: 1.6;
}

.next-quest-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.next-quest-item:last-child { border-bottom: none; }
.next-quest-num {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  background: rgba(139, 115, 85, 0.2);
  color: #8b7355;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  margin-top: 2px;
}

.intro-card {
  text-align: center;
  padding: 28px 20px;
}
</style>
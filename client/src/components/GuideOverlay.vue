<!--
  新手引导遮罩组件 v2
  - 支持 targeting 高亮指定元素
  - 支持 QuestGuidePanel 任务指引卡片
  - 支持 intro story 引导（step=0）
-->
<template>
  <Teleport to="body">
    <!-- Intro Story 全屏遮罩 -->
    <div v-if="introActive" class="guide-intro-overlay">
      <div class="intro-progress-bar">
        <div class="intro-progress-fill" :style="{ width: (introStep / INTRO_STEPS * 100) + '%' }"></div>
      </div>
      <div class="intro-step-indicator">{{ introStep }} / {{ INTRO_STEPS }}</div>
      <div class="intro-card">
        <h2 class="intro-title">{{ currentStory.title }}</h2>
        <p class="intro-text">{{ currentStory.text }}</p>
        <p class="intro-bg" v-if="currentStory.bg">{{ currentStory.bg }}</p>
        <div class="intro-actions">
          <button v-if="introStep > 1" class="btn btn-secondary" @click="introPrev">← 上一页</button>
          <button class="btn btn-primary" :style="{ flex: introStep > 1 ? 1 : 'unset', width: introStep === 1 ? '100%' : '' }" @click="introNext">
            {{ introStep >= INTRO_STEPS ? '⚓ 进入游戏' : '继续 →' }}
          </button>
        </div>
        <a href="javascript:void(0)" class="intro-skip" @click.prevent="skipIntro">跳过剧情 →</a>
      </div>
    </div>

    <!-- 引导步骤遮罩（非 intro） -->
    <div v-if="active && !introActive" class="guide-overlay">
      <!-- 高亮遮罩层 -->
      <div v-if="target" class="guide-spotlight" :style="spotlightStyle"></div>

      <!-- 指引卡片 -->
      <div class="guide-card" :style="cardPositionStyle">
        <div class="guide-card-header">
          <span class="guide-card-icon">🌟</span>
          <span class="guide-card-title">新手引导 · 第 {{ step }} 步</span>
          <button class="guide-skip-btn" @click="skip">✕ 跳过</button>
        </div>
        <div class="guide-card-body">
          <p class="guide-quest-name" v-if="questName">📋 {{ questName }}</p>
          <p class="guide-msg">{{ msg }}</p>
          <div class="guide-hint" v-if="hint">
            <span class="guide-hint-icon">💡</span> {{ hint }}
          </div>
        </div>
        <div class="guide-card-footer">
          <button class="btn btn-secondary btn-sm" @click="skip">跳过</button>
          <button class="btn btn-primary btn-sm" @click="acknowledge">我知道了</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { Api } from '../composables/useApi';
import { globalAlert } from '../composables/useConfirm';
import { useUserStore } from '../stores/user';

const userStore = useUserStore();

const INTRO_STEPS = 7;

// Intro 状态
const introActive = ref(false);
const introStep = ref(1);
const introStories = ref([]);

// 引导步骤状态
const active = ref(false);
const step = ref(1);
const msg = ref('');
const questName = ref('');
const target = ref(null);   // 高亮目标 CSS 选择器
const hint = ref('');

let pollTimer = null;

const currentStory = computed(() => {
  return introStories.value[introStep.value - 1] || { title: '', text: '', bg: '' };
});

// 根据 target 生成聚光灯/高亮样式
const spotlightStyle = computed(() => {
  if (!target.value) return {};
  // 动态获取元素位置（由 watchTarget 调用）
  return {
    // left/top/width/height 由 JS 实时计算
  };
});

const cardPositionStyle = computed(() => {
  // 居中偏下的默认位置
  return {
    position: 'fixed',
    bottom: '100px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10000
  };
});

async function loadGuide() {
  if (!userStore.isLoggedIn) return;
  try {
    const d = await Api.get('/guide/status');
    if (d.active) {
      step.value = d.step;
      msg.value = d.msg || '';
      questName.value = d.questName || '';
      target.value = d.target || null;
      hint.value = d.hint || '';

      // step=0 表示需要看 intro
      if (d.step === 0) {
        introActive.value = true;
        introStep.value = 1;
        active.value = false;
        // 获取 intro stories
        await loadIntroStories();
      } else {
        introActive.value = false;
        active.value = true;
        introStories.value = [];
      }
      stopPoll();
    } else {
      introActive.value = false;
      active.value = false;
      stopPoll();
    }
  } catch (e) {
    stopPoll();
  }
}

async function loadIntroStories() {
  try {
    const d = await Api.get('/guide/intro-stories');
    introStories.value = d.stories || [];
  } catch (e) {
    // fallback 硬编码
    introStories.value = [];
  }
}

function startPoll() {
  stopPoll();
  pollTimer = setInterval(loadGuide, 3000);
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function introNext() {
  if (introStep.value >= INTRO_STEPS) {
    finishIntro();
  } else {
    introStep.value++;
  }
}

function introPrev() {
  if (introStep.value > 1) introStep.value--;
}

async function finishIntro() {
  try {
    await Api.post('/guide/intro-complete');
  } catch (e) {}
  introActive.value = false;
  active.value = false;
  stopPoll();
  // 刷新状态，进入 step=1 引导
  await loadGuide();
}

async function skipIntro() {
  try {
    await Api.post('/guide/intro-complete');
  } catch (e) {}
  introActive.value = false;
  active.value = false;
  stopPoll();
  await loadGuide();
}

async function skip() {
  if (!confirm('确定跳过新手引导？跳过后可前往"福利中心"领取注册礼包。')) return;
  try {
    await Api.post('/guide/skip');
    introActive.value = false;
    active.value = false;
    stopPoll();
  } catch (e) {
    await globalAlert(e.message);
  }
}

function acknowledge() {
  active.value = false;
  setTimeout(loadGuide, 3000);
}

watch(() => userStore.isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    setTimeout(loadGuide, 800);
  } else {
    introActive.value = false;
    active.value = false;
    stopPoll();
  }
}, { immediate: true });

onUnmounted(stopPoll);
</script>

<style scoped>
/* Intro 全屏遮罩 */
.guide-intro-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.88);
  z-index: 99998;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.intro-progress-bar {
  width: 100%;
  max-width: 360px;
  height: 4px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  margin-bottom: 8px;
}
.intro-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #c9a758, #e8c97a);
  border-radius: 2px;
  transition: width 0.3s ease;
}
.intro-step-indicator {
  font-size: 12px;
  color: #8b7355;
  margin-bottom: 20px;
}

.intro-card {
  background: linear-gradient(145deg, #1a1a2e, #0f1a2e);
  border: 2px solid #c9a758;
  border-radius: 20px;
  max-width: 420px;
  width: 100%;
  padding: 28px 24px 20px;
  box-shadow: 0 0 60px rgba(201, 168, 76, 0.15), 0 20px 40px rgba(0,0,0,0.5);
}
.intro-title {
  font-size: 18px;
  color: #c9a84c;
  text-align: center;
  margin: 0 0 16px;
  font-weight: bold;
}
.intro-text {
  font-size: 14px;
  color: #ddd0b6;
  line-height: 1.8;
  margin: 0 0 12px;
  text-indent: 2em;
}
.intro-bg {
  font-size: 12px;
  color: #8b7355;
  line-height: 1.7;
  padding: 10px 12px;
  background: rgba(201, 168, 76, 0.06);
  border-left: 3px solid rgba(201, 168, 76, 0.3);
  border-radius: 0 6px 6px 0;
  margin: 0 0 20px;
}
.intro-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}
.intro-skip {
  display: block;
  text-align: center;
  color: #8b784e;
  font-size: 12px;
  text-decoration: none;
}
.intro-skip:hover { color: #c9a84c; }

/* 引导遮罩 */
.guide-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
}

.guide-spotlight {
  position: fixed;
  border: 3px solid #c9a84c;
  border-radius: 12px;
  box-shadow: 0 0 0 4px rgba(201,168,76,0.3), 0 0 20px rgba(201,168,76,0.4);
  pointer-events: none;
  transition: all 0.3s ease;
  z-index: 9999;
}

.guide-card {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 2px solid #c9a84c;
  border-radius: 16px;
  width: 340px;
  max-width: calc(100vw - 40px);
  box-shadow: 0 0 40px rgba(201, 168, 76, 0.2), 0 15px 30px rgba(0,0,0,0.5);
  overflow: hidden;
}
.guide-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(201, 168, 76, 0.08);
  border-bottom: 1px solid rgba(201, 168, 76, 0.2);
}
.guide-card-icon { font-size: 16px; }
.guide-card-title {
  flex: 1;
  font-size: 13px;
  font-weight: bold;
  color: #c9a84c;
}
.guide-skip-btn {
  background: none;
  border: none;
  color: #8b7355;
  font-size: 14px;
  cursor: pointer;
  padding: 0 4px;
}
.guide-skip-btn:hover { color: #c9a84c; }

.guide-card-body {
  padding: 14px 16px;
}
.guide-quest-name {
  font-size: 12px;
  color: #4fc3f7;
  margin: 0 0 8px;
}
.guide-msg {
  font-size: 14px;
  color: #ddd;
  line-height: 1.7;
  margin: 0;
}
.guide-hint {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 10px;
  padding: 8px 10px;
  background: rgba(79, 195, 247, 0.06);
  border-radius: 6px;
  font-size: 12px;
  color: #8b9dc3;
}
.guide-hint-icon { flex-shrink: 0; }

.guide-card-footer {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid rgba(201, 168, 76, 0.1);
}
</style>
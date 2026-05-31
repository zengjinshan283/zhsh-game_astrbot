<template>
  <div class="quiz-page">
    <div class="quiz-bg"></div>

    <!-- 顶部 HUD -->
    <div class="top-hud">
      <div class="hud-left">
        <div class="hud-icon">🔮</div>
        <div class="hud-title">星座答题</div>
      </div>
      <div class="hud-right">
        <div class="hud-info">挑战 {{ currentCategory || '综合' }}</div>
      </div>
    </div>

    <!-- 开始界面 -->
    <div v-if="phase === 'idle'" class="card-area">
      <div class="intro-card">
        <div class="intro-icon">🔮</div>
        <div class="intro-name">占星师 塔薇尔</div>
        <div class="intro-desc">星星的奥秘藏在十二星座之中。来挑战答题，证明你对星座的了解吧！</div>
        <div class="intro-rules">
          <div class="rule-item">📋 每次10题选择题</div>
          <div class="rule-item">🎁 答对越多奖励越丰厚</div>
          <div class="rule-item">⏰ 每天可挑战3次</div>
        </div>
        <div class="today-count">今日剩余次数：{{ todayRemaining }} / 3</div>
      </div>

      <!-- 星座选择 -->
      <div class="zodiac-grid">
        <div
          v-for="cat in categories"
          :key="cat.id"
          class="zodiac-item"
          :class="{ selected: selectedCategory === cat.id }"
          @click="selectedCategory = cat.id"
        >
          <div class="zi-icon">{{ cat.icon }}</div>
          <div class="zi-name">{{ cat.name }}</div>
        </div>
        <div
          class="zodiac-item"
          :class="{ selected: selectedCategory === 0 }"
          @click="selectedCategory = 0"
        >
          <div class="zi-icon">🌌</div>
          <div class="zi-name">综合</div>
        </div>
      </div>

      <button class="start-btn" @click="startQuiz" :disabled="todayRemaining <= 0">
        {{ todayRemaining > 0 ? '开始答题' : '今日次数已用完' }}
      </button>

      <!-- 历史记录 -->
      <div v-if="history.length > 0" class="history-card">
        <div class="history-header">📜 历史答题</div>
        <div class="history-list">
          <div v-for="h in history.slice(0, 5)" :key="h.id" class="history-item">
            <span class="hi-cat">{{ h.category_name || '综合' }}</span>
            <span class="hi-score">{{ h.correct_count }}/{{ h.total_count }}</span>
            <span class="hi-reward">+{{ h.reward_money }}铜</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 答题中 -->
    <div v-else-if="phase === 'quiz'" class="card-area">
      <div class="quiz-progress">
        <div class="qp-info">第 {{ currentIndex + 1 }} / {{ questions.length }} 题</div>
        <div class="qp-bar">
          <div class="qp-fill" :style="{ width: ((currentIndex + 1) / questions.length * 100) + '%' }"></div>
        </div>
        <div class="qp-score">当前得分：{{ currentScore }}</div>
      </div>

      <div class="question-card" :class="{ correct: lastResult === true, wrong: lastResult === false }">
        <div class="qc-difficulty">
          <span :class="'diff-' + questions[currentIndex]?.difficulty">
            {{ ['', '基础', '进阶', '挑战'][questions[currentIndex]?.difficulty] || '基础' }} · {{ questions[currentIndex]?.points }}分
          </span>
        </div>
        <div class="qc-text">{{ questions[currentIndex]?.question }}</div>

        <div class="qc-options">
          <div
            v-for="opt in ['A', 'B', 'C', 'D']"
            :key="opt"
            class="qc-option"
            :class="{
              selected: selectedAnswer === opt,
              correct: showResult && opt === questions[currentIndex]?.correct,
              wrong: showResult && selectedAnswer === opt && opt !== questions[currentIndex]?.correct
            }"
            @click="selectAnswer(opt)"
          >
            <span class="qo-letter">{{ opt }}</span>
            <span class="qo-text">{{ questions[currentIndex]?.[`option_${opt.toLowerCase()}`] }}</span>
          </div>
        </div>

        <!-- 结果反馈 -->
        <div v-if="showResult" class="qc-result">
          <div class="qr-msg">{{ lastResult ? '✅ 回答正确！' : `❌ 正确答案是 ${questions[currentIndex]?.correct}` }}</div>
          <div v-if="lastResult" class="qr-points">+{{ questions[currentIndex]?.points }}分</div>
          <button class="qr-next-btn" @click="nextQuestion">下一题</button>
        </div>
      </div>
    </div>

    <!-- 完成界面 -->
    <div v-else-if="phase === 'result'" class="card-area">
      <div class="result-card">
        <div class="rc-icon">🌟</div>
        <div class="rc-title">答题完成！</div>
        <div class="rc-summary">
          <div class="rs-item">
            <div class="rsi-label">答对题数</div>
            <div class="rsi-val">{{ resultData.correct_count }} / {{ resultData.total_count }}</div>
          </div>
          <div class="rs-item">
            <div class="rsi-label">获得奖励</div>
            <div class="rsi-val gold">+{{ resultData.reward_money }} 铜币</div>
          </div>
        </div>
        <div class="rc-stars">{{ starsEarned }}</div>
      </div>

      <button class="return-btn" @click="returnToIdle">再来一次</button>
      <button class="back-btn" @click="$router.back()">返回</button>
    </div>

    <button v-if="phase !== 'idle'" class="exit-btn" @click="exitQuiz">退出答题</button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Api } from '../composables/useApi';
import { globalAlert } from '../composables/useConfirm';

const phase = ref('idle'); // idle | quiz | result
const categories = ref([]);
const selectedCategory = ref(0); // 0 = 综合
const currentCategory = ref('');
const questions = ref([]);
const currentIndex = ref(0);
const currentScore = ref(0);
const selectedAnswer = ref('');
const showResult = ref(false);
const lastResult = ref(null);
const sessionId = ref(null);
const todayRemaining = ref(3);
const history = ref([]);
const resultData = ref({});
const starsEarned = ref('');

async function loadCategories() {
  try {
    const data = await Api.get('/quiz/categories');
    categories.value = data.categories || [];
  } catch (e) {
    console.error('loadCategories error:', e);
  }
}

async function loadHistory() {
  try {
    const data = await Api.get('/quiz/history');
    history.value = data.sessions || [];
  } catch (e) {
    console.error('loadHistory error:', e);
  }
}

async function loadTodayStatus() {
  try {
    const data = await Api.get('/quiz/status');
    todayRemaining.value = Math.max(0, 3 - (data.today_count || 0));
  } catch (e) {
    console.error('loadTodayStatus error:', e);
  }
}

async function startQuiz() {
  try {
    const catId = selectedCategory.value === 0 ? null : selectedCategory.value;
    const res = await Api.post('/quiz/start', { category_id: catId });
    sessionId.value = res.session_id;
    currentCategory.value = selectedCategory.value === 0 ? '综合题库' : (categories.value.find(c => c.id === selectedCategory.value)?.name || '综合');

    // 获取题目
    const qData = await Api.get(`/quiz/questions?category_id=${selectedCategory.value === 0 ? 'all' : selectedCategory.value}&limit=10`);
    questions.value = qData.questions || [];
    currentIndex.value = 0;
    currentScore.value = 0;
    selectedAnswer.value = '';
    showResult.value = false;
    phase.value = 'quiz';
  } catch (e) {
    globalAlert(e.message || '创建答题失败');
  }
}

function selectAnswer(opt) {
  if (showResult.value) return;
  selectedAnswer.value = opt;
}

async function confirmAnswer() {
  if (!selectedAnswer.value || showResult.value) return;

  try {
    const res = await Api.post('/quiz/answer', {
      session_id: sessionId.value,
      question_id: questions.value[currentIndex.value].id,
      user_answer: selectedAnswer.value
    });

    lastResult.value = res.is_correct === 1;
    if (lastResult.value) {
      currentScore.value += questions.value[currentIndex.value].points;
    }

    showResult.value = true;
  } catch (e) {
    globalAlert(e.message);
  }
}

async function nextQuestion() {
  selectedAnswer.value = '';
  showResult.value = false;

  if (currentIndex.value < questions.value.length - 1) {
    currentIndex.value++;
  } else {
    // 答题结束，结束会话
    await finishQuiz();
  }
}

async function finishQuiz() {
  try {
    const res = await Api.post('/quiz/finish', { session_id: sessionId.value });
    resultData.value = res;
    starsEarned.value = getStars(res.correct_count, res.total_count);
    phase.value = 'result';
    await loadHistory();
    await loadTodayStatus();
  } catch (e) {
    globalAlert(e.message);
  }
}

function getStars(correct, total) {
  const ratio = total > 0 ? correct / total : 0;
  if (ratio === 1) return '⭐⭐⭐⭐⭐';
  if (ratio >= 0.8) return '⭐⭐⭐⭐';
  if (ratio >= 0.6) return '⭐⭐⭐';
  if (ratio >= 0.4) return '⭐⭐';
  return '⭐';
}

function exitQuiz() {
  phase.value = 'idle';
  sessionId.value = null;
  questions.value = [];
  selectedAnswer.value = '';
  showResult.value = false;
}

function returnToIdle() {
  phase.value = 'idle';
  sessionId.value = null;
  questions.value = [];
  selectedAnswer.value = '';
  showResult.value = false;
}

// watch selectedAnswer to auto confirm when selected
import { watch } from 'vue';
watch(selectedAnswer, (val) => {
  if (val && phase.value === 'quiz' && !showResult.value) {
    confirmAnswer();
  }
});

onMounted(async () => {
  await loadCategories();
  await loadHistory();
  await loadTodayStatus();
});
</script>

<style scoped>
.quiz-page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 10px;
  min-height: 100%;
  overflow-y: auto;
}
.quiz-bg {
  position: fixed; inset: 0; z-index: 0;
  background: linear-gradient(160deg, #0d1117 0%, #1a0a2e 50%, #0d1117 100%);
  pointer-events: none;
}
.top-hud {
  position: relative; z-index: 2;
  background: rgba(13,17,23,0.88); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 14px;
  padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;
}
.hud-left { display: flex; align-items: center; gap: 8px; }
.hud-icon { font-size: 20px; }
.hud-title { font-size: 16px; font-weight: 700; color: #f0f0f0; }
.hud-right { display: flex; align-items: center; gap: 8px; }
.hud-info { font-size: 12px; color: #c9a758; }
.card-area { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 10px; }
.loading-card { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px; }
.loading-spinner { width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #c9a758; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 13px; color: #7f8c8d; }

/* 开始界面 */
.intro-card {
  background: rgba(201,168,76,0.05); border: 1px solid rgba(201,168,76,0.25);
  border-radius: 14px; padding: 18px 16px; text-align: center;
}
.intro-icon { font-size: 40px; margin-bottom: 8px; }
.intro-name { font-size: 16px; font-weight: 700; color: #c9a758; margin-bottom: 6px; }
.intro-desc { font-size: 12px; color: #7f8c8d; line-height: 1.6; margin-bottom: 12px; }
.intro-rules { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.rule-item { font-size: 12px; color: #aaa; }
.today-count { font-size: 13px; color: #c9a758; font-weight: 600; }

/* 星座选择 */
.zodiac-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.zodiac-item {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; padding: 10px 6px; text-align: center;
  cursor: pointer; transition: all 0.2s;
}
.zodiac-item:hover { background: rgba(255,255,255,0.08); }
.zodiac-item.selected { background: rgba(201,168,76,0.15); border-color: rgba(201,168,76,0.4); }
.zi-icon { font-size: 24px; margin-bottom: 4px; }
.zi-name { font-size: 11px; color: #aaa; }
.zodiac-item.selected .zi-name { color: #c9a758; }

.start-btn {
  width: 100%; background: linear-gradient(135deg, #c9a84c, #8b6914); border: none;
  border-radius: 8px; color: #fff; font-weight: 700; font-size: 15px; padding: 12px;
  cursor: pointer; transition: all 0.2s;
}
.start-btn:hover:not(:disabled) { transform: scale(1.02); }
.start-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* 历史记录 */
.history-card {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 12px 14px;
}
.history-header { font-size: 13px; color: #7f8c8d; margin-bottom: 8px; }
.history-list { display: flex; flex-direction: column; gap: 6px; }
.history-item { display: flex; justify-content: space-between; align-items: center; font-size: 12px; }
.hi-cat { color: #aaa; }
.hi-score { color: #ddd; }
.hi-reward { color: #c9a758; }

/* 答题进度 */
.quiz-progress {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; padding: 10px 12px;
}
.qp-info { font-size: 12px; color: #7f8c8d; margin-bottom: 6px; }
.qp-bar { height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; margin-bottom: 6px; }
.qp-fill { height: 100%; background: linear-gradient(90deg, #c9a84c, #e2b70a); border-radius: 3px; transition: width 0.3s; }
.qp-score { font-size: 12px; color: #c9a758; }

/* 题目卡片 */
.question-card {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; padding: 16px;
  transition: border-color 0.3s;
}
.question-card.correct { border-color: rgba(39,174,96,0.5); }
.question-card.wrong { border-color: rgba(231,76,60,0.5); }
.qc-difficulty { text-align: center; margin-bottom: 10px; }
.qc-difficulty span { font-size: 11px; padding: 3px 10px; border-radius: 12px; }
.diff-1 { background: rgba(46,204,113,0.15); color: #2ecc71; }
.diff-2 { background: rgba(241,196,15,0.15); color: #f1c40f; }
.diff-3 { background: rgba(231,76,60,0.15); color: #e74c3c; }
.qc-text { font-size: 14px; color: #f0f0f0; line-height: 1.6; margin-bottom: 14px; text-align: center; }
.qc-options { display: flex; flex-direction: column; gap: 8px; }
.qc-option {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; cursor: pointer; transition: all 0.2s;
}
.qc-option:hover:not(.correct):not(.wrong) { background: rgba(255,255,255,0.08); }
.qc-option.selected:not(.correct):not(.wrong) { background: rgba(201,168,76,0.1); border-color: rgba(201,168,76,0.3); }
.qc-option.correct { background: rgba(39,174,96,0.15); border-color: rgba(39,174,96,0.4); }
.qc-option.wrong { background: rgba(231,76,60,0.15); border-color: rgba(231,76,60,0.4); }
.qo-letter { font-size: 13px; font-weight: 700; color: #c9a758; width: 20px; }
.qo-text { font-size: 13px; color: #ddd; flex: 1; }

/* 结果反馈 */
.qc-result { margin-top: 14px; text-align: center; }
.qr-msg { font-size: 14px; margin-bottom: 4px; }
.qr-points { font-size: 16px; font-weight: 700; color: #f1c40f; margin-bottom: 10px; }
.qr-next-btn {
  background: linear-gradient(135deg, #c9a84c, #8b6914); border: none;
  border-radius: 8px; color: #fff; font-weight: 600; font-size: 13px; padding: 8px 28px;
  cursor: pointer;
}

/* 完成界面 */
.result-card {
  background: rgba(201,168,76,0.05); border: 1px solid rgba(201,168,76,0.25);
  border-radius: 14px; padding: 24px 16px; text-align: center;
}
.rc-icon { font-size: 48px; margin-bottom: 10px; }
.rc-title { font-size: 18px; font-weight: 700; color: #c9a758; margin-bottom: 16px; }
.rc-summary { display: flex; gap: 16px; justify-content: center; margin-bottom: 16px; }
.rs-item { text-align: center; }
.rsi-label { font-size: 11px; color: #7f8c8d; margin-bottom: 4px; }
.rsi-val { font-size: 20px; font-weight: 700; color: #ddd; }
.rsi-val.gold { color: #f1c40f; }
.rc-stars { font-size: 24px; margin-top: 10px; }

.return-btn {
  width: 100%; background: linear-gradient(135deg, #c9a84c, #8b6914); border: none;
  border-radius: 8px; color: #fff; font-weight: 700; font-size: 14px; padding: 12px;
  cursor: pointer; transition: all 0.2s;
}
.back-btn, .exit-btn {
  display: block; text-align: center;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; color: #7f8c8d; font-size: 14px; padding: 10px;
  cursor: pointer; transition: all 0.2s;
}
.back-btn:hover, .exit-btn:hover { background: rgba(255,255,255,0.1); color: #f0f0f0; }
</style>
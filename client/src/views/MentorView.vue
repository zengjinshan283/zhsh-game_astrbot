<template>
<div class="mentor-page">
  <div class="mentor-bg"></div>

  <!-- 消息 -->
  <div v-if="msg" class="mentor-toast" :class="msgType === 'error' ? 'toast-err' : 'toast-ok'">
    {{ msgType === 'error' ? '❌' : '✅' }} {{ msg }}
  </div>

  <!-- 我的师徒状态 -->
  <div class="mentor-status-card">
    <div class="msc-icon">{{ myMentor ? '👨‍🏫' : (isMentor ? '👨‍🏫' : '🎓') }}</div>
    <div class="msc-info">
      <template v-if="myMentor">
        <div class="msc-title">我的师父</div>
        <div class="msc-name">{{ myMentor.username }} <span class="msc-lv">Lv.{{ myMentor.level }}</span></div>
        <div class="msc-meta">
          <span v-if="myMentor.mentor_contribution">贡献度 {{ myMentor.mentor_contribution }}</span>
          <span class="msc-hint">等级达到30级即可出师</span>
        </div>
        <button class="msc-graduate" @click="doGraduate" :disabled="loading">
          {{ loading ? '处理中...' : '申请出师' }}
        </button>
      </template>
      <template v-else-if="isMentor">
        <div class="msc-title">认证师父</div>
        <div class="msc-meta">
          <span>👥 徒弟 {{ apprenticeCount }}/5</span>
          <span>🏆 贡献度 {{ mentorContribution }}</span>
        </div>
      </template>
      <template v-else>
        <div class="msc-title">尚未拜师</div>
        <div class="msc-meta">
          <span>达到50级可成为认证师父</span>
        </div>
        <button v-if="userStore.level >= 50" class="msc-btn" @click="doBecomeMentor" :disabled="loading">
          {{ loading ? '申请中...' : '成为认证师父' }}
        </button>
      </template>
    </div>
  </div>

  <!-- Tab -->
  <div class="mentor-tabs">
    <button class="mt-btn" :class="{active: tab==='apprentices'}" @click="switchTab('apprentices')">👥 我的徒弟</button>
    <button class="mt-btn" :class="{active: tab==='search'}" @click="switchTab('search')">🔍 寻找师父</button>
    <button class="mt-btn" :class="{active: tab==='ranking'}" @click="switchTab('ranking')">🏆 排行</button>
  </div>

  <!-- 徒弟列表 -->
  <template v-if="tab === 'apprentices'">
    <div v-if="apprentices.length === 0" class="mentor-empty">
      还没有徒弟，去"寻找师父"推广自己吧！
    </div>
    <div v-else class="apprentice-list">
      <div v-for="a in apprentices" :key="a.id" class="apprentice-card">
        <div class="ac-avatar">{{ a.sex === 2 ? '♀' : '♂' }}</div>
        <div class="ac-info">
          <div class="ac-name">{{ a.username }} <span class="ac-lv">Lv.{{ a.level }}</span></div>
          <div class="ac-time" v-if="a.mentor_join_time">拜师 {{ formatTime(a.mentor_join_time) }}</div>
        </div>
        <div class="ac-status" :class="getApprenticeStatus(a)">
          {{ getApprenticeStatus(a) === 'ready' ? '可出师' : `还差${30 - a.level}级` }}
        </div>
      </div>
    </div>
  </template>

  <!-- 寻找师父 / 成为师父 -->
  <template v-if="tab === 'search'">
    <div class="search-box">
      <input v-model="searchId" type="number" placeholder="输入玩家ID寻找师父" class="search-input">
      <button class="search-btn" @click="doSearch" :disabled="!searchId || loading">
        {{ loading ? '查找中...' : '查找' }}
      </button>
    </div>

    <!-- 搜索结果 -->
    <div v-if="searchResult" class="search-result-card">
      <div class="src-avatar">{{ searchResult.sex === 2 ? '♀' : '♂' }}</div>
      <div class="src-info">
        <div class="src-name">{{ searchResult.username }} <span class="src-lv">Lv.{{ searchResult.level }}</span></div>
        <div class="src-meta">
          <span>{{ searchResult.is_mentor ? '✅ 认证师父' : '❌ 非认证师父' }}</span>
          <span v-if="searchResult.is_mentor">👥 {{ searchResult.apprentice_count }}/5</span>
        </div>
      </div>
      <button v-if="searchResult.is_mentor && !searchResult.apprentice_id && searchResult.apprentice_count < 5"
              class="src-btn" @click="doApprentice(searchResult.id)" :disabled="loading">
        拜师
      </button>
      <span v-else-if="searchResult.apprentice_id" class="src-tag">已有师父</span>
      <span v-else-if="searchResult.apprentice_count >= 5" class="src-tag">徒弟已满</span>
    </div>

    <div v-if="!myMentor && !isMentor && userStore.level >= 50" class="become-mentor-hint">
      <span>等级达到50级，可以</span>
      <button class="bm-btn" @click="doBecomeMentor" :disabled="loading">成为认证师父</button>
    </div>
    <div v-if="!myMentor && !isMentor && userStore.level < 50" class="become-mentor-hint">
      🎓 再升{{ 50 - userStore.level }}级即可成为认证师父（50级）
    </div>
  </template>

  <!-- 师徒排行榜 -->
  <template v-if="tab === 'ranking'">
    <div v-if="ranking.length === 0" class="mentor-empty">暂无排行数据</div>
    <div v-else class="ranking-list">
      <div v-for="(r, idx) in ranking" :key="r.id" class="ranking-card">
        <div class="rc-rank" :class="idx<3?'top':''">{{ idx+1 }}</div>
        <div class="rc-avatar">👨‍🏫</div>
        <div class="rc-info">
          <div class="rc-name">{{ r.username }} <span class="rc-lv">Lv.{{ r.level }}</span></div>
          <div class="rc-meta">👥 {{ r.apprentice_count }} 徒弟 | 🏆 {{ r.mentor_contribution }} 贡献度</div>
        </div>
      </div>
    </div>
  </template>
</div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useUserStore } from '../stores/user';
import { Api } from '../composables/useApi';

const userStore = useUserStore();
const tab = ref('apprentices');
const msg = ref('');
const msgType = ref('ok');
const loading = ref(false);
const searchId = ref('');
const searchResult = ref(null);
const myMentor = ref(null);
const isMentor = ref(false);
const apprenticeCount = ref(0);
const mentorContribution = ref(0);
const apprentices = ref([]);
const ranking = ref([]);

function showMsg(text, type='ok') {
  msg.value = text; msgType.value = type;
  setTimeout(() => msg.value = '', 3000);
}

async function switchTab(t) {
  tab.value = t;
  if (t === 'apprentices') await loadApprentices();
  if (t === 'ranking') await loadRanking();
  if (t === 'search') searchResult.value = null;
}

async function loadApprentices() {
  try {
    const res = await Api.get('/mentor/apprentices');
    apprentices.value = res.apprentices || [];
    isMentor.value = apprentices.value.length > 0 || false;
  } catch(e) { apprentices.value = []; }
}

async function loadMentorInfo() {
  try {
    const res = await Api.get('/mentor/mentor');
    if (res.has_mentor) {
      myMentor.value = res.mentor;
    } else {
      myMentor.value = null;
      // 检查自己是否是师父
      const me = await Api.get('/auth/me');
      isMentor.value = !!(me.user?.is_mentor);
      apprenticeCount.value = me.user?.apprentice_count || 0;
      mentorContribution.value = me.user?.mentor_contribution || 0;
    }
  } catch(e) { myMentor.value = null; }
}

async function loadRanking() {
  try {
    const res = await Api.get('/mentor/ranking');
    ranking.value = res.ranking || [];
  } catch(e) { ranking.value = []; }
}

async function doBecomeMentor() {
  if (userStore.level < 50) { showMsg('需要达到50级才能成为师父', 'error'); return; }
  loading.value = true;
  try {
    const res = await Api.post('/mentor/become-mentor');
    showMsg(res.msg || '已成为认证师父！');
    isMentor.value = true;
    const me = await Api.get('/auth/me');
    if (me.user) userStore.updateUser(me.user);
  } catch(e) { showMsg(e.message, 'error'); }
  finally { loading.value = false; }
}

async function doApprentice(mentorId) {
  if (!mentorId) return;
  loading.value = true;
  try {
    const res = await Api.post('/mentor/apprentice', { mentor_id: mentorId });
    showMsg(res.msg || '拜师成功！');
    myMentor.value = searchResult.value;
    const me = await Api.get('/auth/me');
    if (me.user) userStore.updateUser(me.user);
  } catch(e) { showMsg(e.message, 'error'); }
  finally { loading.value = false; }
}

async function doGraduate() {
  loading.value = true;
  try {
    const res = await Api.post('/mentor/graduate');
    showMsg(res.msg || '出师成功！');
    myMentor.value = null;
    const me = await Api.get('/auth/me');
    if (me.user) userStore.updateUser(me.user);
  } catch(e) { showMsg(e.message, 'error'); }
  finally { loading.value = false; }
}

async function doSearch() {
  if (!searchId.value) return;
  loading.value = true;
  searchResult.value = null;
  try {
    const res = await Api.get('/user/view/' + searchId.value);
    if (res.user) {
      searchResult.value = res.user;
    } else {
      showMsg('未找到该玩家', 'error');
    }
  } catch(e) { showMsg('未找到该玩家', 'error'); }
  finally { loading.value = false; }
}

function getApprenticeStatus(a) {
  return a.level >= 30 ? 'ready' : 'learning';
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getMonth()+1}/${d.getDate()}`;
}

onMounted(async () => {
  await loadMentorInfo();
  if (tab.value === 'apprentices') await loadApprentices();
  if (tab.value === 'ranking') await loadRanking();
});
</script>

<style scoped>
.mentor-page { position: relative; min-height: 100vh; padding: 16px; }
.mentor-bg {
  position: fixed; inset: 0; z-index: -1;
  background: linear-gradient(160deg, #0a1628 0%, #1a0a2e 50%, #0d1f3c 100%);
}
.mentor-toast {
  position: fixed; top: 60px; left: 50%; transform: translateX(-50%);
  padding: 10px 20px; border-radius: 20px; font-size: 13px; z-index: 999;
  animation: fadeIn 0.3s;
}
.toast-ok { background: rgba(39,174,96,0.9); color: #fff; }
.toast-err { background: rgba(231,76,60,0.9); color: #fff; }
@keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(-10px); } to { opacity: 1; } }

/* 状态卡片 */
.mentor-status-card {
  display: flex; align-items: flex-start; gap: 14px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px; padding: 16px; margin-bottom: 16px;
}
.msc-icon { font-size: 32px; flex-shrink: 0; }
.msc-info { flex: 1; }
.msc-title { font-size: 15px; font-weight: 700; color: #f0f0f0; margin-bottom: 4px; }
.msc-name { font-size: 14px; font-weight: 600; color: #f8d87a; margin-bottom: 4px; }
.msc-lv { font-size: 11px; color: #7f8c8d; margin-left: 4px; }
.msc-meta { font-size: 12px; color: #888; display: flex; gap: 8px; flex-wrap: wrap; }
.msc-hint { color: #555; font-size: 11px; }
.msc-btn {
  margin-top: 8px; background: linear-gradient(135deg, #1a4a2a, #27ae60);
  color: #fff; border: none; border-radius: 8px; padding: 8px 16px; font-size: 12px; cursor: pointer;
}
.msc-graduate {
  margin-top: 8px; background: linear-gradient(135deg, #4a1a1a, #c0392b);
  color: #fff; border: none; border-radius: 8px; padding: 8px 16px; font-size: 12px; cursor: pointer;
}
.msc-graduate:disabled { opacity: 0.5; }

/* Tab */
.mentor-tabs { display: flex; gap: 6px; margin-bottom: 16px; }
.mt-btn {
  flex: 1; padding: 10px; border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04); border-radius: 10px;
  font-size: 12px; color: #888; cursor: pointer; transition: all 0.2s;
}
.mt-btn.active { background: rgba(226,183,20,0.1); border-color: rgba(226,183,20,0.4); color: #e2b714; }

/* 空状态 */
.mentor-empty {
  text-align: center; padding: 40px; color: #555; font-size: 13px;
}

/* 徒弟列表 */
.apprentice-list { display: flex; flex-direction: column; gap: 8px; }
.apprentice-card {
  display: flex; align-items: center; gap: 10px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; padding: 12px 14px;
}
.ac-avatar { width: 36px; height: 36px; border-radius: 10px; background: rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center; font-size: 16px; }
.ac-info { flex: 1; }
.ac-name { font-size: 13px; font-weight: 600; color: #f0f0f0; }
.ac-lv { font-size: 10px; color: #7f8c8d; margin-left: 4px; }
.ac-time { font-size: 10px; color: #555; margin-top: 2px; }
.ac-status { font-size: 10px; padding: 3px 8px; border-radius: 6px; }
.ac-status.ready { background: rgba(39,174,96,0.15); color: #2ecc71; }
.ac-status.learning { background: rgba(255,255,255,0.05); color: #555; }

/* 搜索 */
.search-box { display: flex; gap: 6px; margin-bottom: 12px; }
.search-input {
  flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #f0f0f0; outline: none;
}
.search-input:focus { border-color: rgba(226,183,20,0.3); }
.search-btn {
  background: linear-gradient(135deg, #1a3a5c, #2980b9); color: #fff;
  border: none; border-radius: 10px; padding: 10px 16px; font-size: 12px; cursor: pointer;
}
.search-btn:disabled { opacity: 0.5; }
.search-result-card {
  display: flex; align-items: center; gap: 10px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px; padding: 14px;
}
.src-avatar { width: 40px; height: 40px; border-radius: 12px; background: rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center; font-size: 18px; }
.src-info { flex: 1; }
.src-name { font-size: 14px; font-weight: 600; color: #f0f0f0; }
.src-lv { font-size: 11px; color: #7f8c8d; margin-left: 4px; }
.src-meta { font-size: 11px; color: #888; margin-top: 2px; display: flex; gap: 8px; }
.src-btn {
  background: linear-gradient(135deg, #1a4a2a, #27ae60); color: #fff;
  border: none; border-radius: 8px; padding: 8px 14px; font-size: 11px; cursor: pointer;
}
.src-tag { font-size: 11px; color: #555; }
.become-mentor-hint {
  text-align: center; margin-top: 16px; font-size: 12px; color: #555;
}
.bm-btn {
  background: linear-gradient(135deg, #1a4a2a, #27ae60); color: #fff;
  border: none; border-radius: 8px; padding: 8px 14px; font-size: 11px; cursor: pointer; margin-left: 6px;
}

/* 排行榜 */
.ranking-list { display: flex; flex-direction: column; gap: 6px; }
.ranking-card {
  display: flex; align-items: center; gap: 10px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; padding: 10px 12px;
}
.rc-rank { width: 24px; height: 24px; border-radius: 6px; background: rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center; font-size: 11px; color: #555; flex-shrink: 0; }
.rc-rank.top { background: rgba(226,183,20,0.2); color: #e2b714; }
.rc-avatar { font-size: 20px; }
.rc-info { flex: 1; }
.rc-name { font-size: 13px; font-weight: 600; color: #f0f0f0; }
.rc-lv { font-size: 10px; color: #7f8c8d; margin-left: 4px; }
.rc-meta { font-size: 10px; color: #555; margin-top: 2px; }
</style>
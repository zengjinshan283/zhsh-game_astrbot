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
        <div class="msc-name">{{ myMentor.username }} <span class="msc-lv">Lv.{{ myMentor.level }}</span><span v-if="myMentor.vip_level > 0" class="msc-vip">V{{ myMentor.vip_level }}</span></div>
        <div class="msc-meta">
          <span v-if="myMentor.mentor_contribution">🏆 贡献度 {{ myMentor.mentor_contribution }}</span>
          <span class="msc-hint">等级达到{{ graduateLevel }}级即可出师</span>
        </div>
        <button class="msc-graduate" @click="doGraduate" :disabled="loading || userStore.level < graduateLevel">
          {{ loading ? '处理中...' : (userStore.level >= graduateLevel ? '申请出师' : `还差${graduateLevel - userStore.level}级`) }}
        </button>
      </template>
      <template v-else-if="isMentor">
        <div class="msc-title">认证师父</div>
        <div class="msc-meta">
          <span>👥 徒弟 {{ stats.active_apprentices }}/{{ maxApprentices }}</span>
          <span>🏆 贡献度 {{ stats.total_contribution }}</span>
          <span v-if="stats.graduated_apprentices > 0">✨ 已出师 {{ stats.graduated_apprentices }} 人</span>
        </div>
        <div class="msc-progress">
          <div class="msc-progress-bar" :style="{width: (stats.active_apprentices / maxApprentices * 100) + '%'}"></div>
        </div>
      </template>
      <template v-else>
        <div class="msc-title">尚未拜师</div>
        <div class="msc-meta">
          <span>达到{{ mentorMinLevel }}级可成为认证师父</span>
        </div>
        <button v-if="userStore.level >= mentorMinLevel" class="msc-btn" @click="doBecomeMentor" :disabled="loading">
          {{ loading ? '申请中...' : '成为认证师父' }}
        </button>
        <div v-else class="msc-level-progress">
          <span>🎓 再升{{ mentorMinLevel - userStore.level }}级即可成为认证师父</span>
          <div class="msc-progress-bar" :style="{width: (userStore.level / mentorMinLevel * 100) + '%'}"></div>
        </div>
      </template>
    </div>
  </div>

  <!-- Tab -->
  <div class="mentor-tabs">
    <button class="mt-btn" :class="{active: tab==='apprentices'}" @click="switchTab('apprentices')">
      👥 我的徒弟 <span v-if="stats.active_apprentices > 0" class="mt-badge">{{ stats.active_apprentices }}</span>
    </button>
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
        <div class="ac-avatar">{{ '♂' }}</div>
        <div class="ac-info">
          <div class="ac-name">{{ a.username }} <span class="ac-lv">Lv.{{ a.level }}</span><span v-if="a.vip_level > 0" class="ac-vip">V{{ a.vip_level }}</span></div>
          <div class="ac-time" v-if="a.created_at">拜师 {{ formatTime(a.created_at) }}</div>
          <div class="ac-time" v-if="a.status === 2">已出师 {{ formatTime(a.graduated_at) }}</div>
        </div>
        <div class="ac-status" :class="getApprenticeStatus(a)">
          {{ a.status === 2 ? '已出师' : (getApprenticeStatus(a) === 'ready' ? '可出师' : `还差${graduateLevel - a.level}级`) }}
        </div>
      </div>
    </div>

    <!-- 贡献历史 -->
    <div v-if="contributionHistory.length > 0" class="contribution-section">
      <div class="cs-title">贡献记录</div>
      <div v-for="h in contributionHistory" :key="h.id" class="cs-item">
        <span>{{ h.username }}</span>
        <span>出师 +{{ h.mentor_contribution }} 贡献度</span>
      </div>
    </div>
  </template>

  <!-- 寻找师父 / 成为师父 -->
  <template v-if="tab === 'search'">
    <div class="search-box">
      <input v-model="searchKeyword" type="text" placeholder="输入关键词搜索师父" class="search-input">
      <button class="search-btn" @click="doSearch" :disabled="loading">搜索</button>
    </div>

    <div v-if="searchLoading" class="mentor-empty">加载中...</div>
    <div v-else-if="searchResults.length === 0 && hasSearched" class="mentor-empty">未找到可拜师的师父</div>
    <div v-else class="search-results">
      <div v-for="m in searchResults" :key="m.id" class="search-result-card">
        <div class="src-avatar">👨‍🏫</div>
        <div class="src-info">
          <div class="src-name">{{ m.username }} <span class="src-lv">Lv.{{ m.level }}</span><span v-if="m.vip_level > 0" class="src-vip">V{{ m.vip_level }}</span></div>
          <div class="src-meta">
            <span>👥 {{ m.active_count }}/{{ maxApprentices }}</span>
            <span v-if="m.remaining_slots > 0" class="src-slots">剩余 {{ m.remaining_slots }} 位</span>
          </div>
        </div>
        <button v-if="m.can_apprentice && !myMentor && !isMentor"
                class="src-btn" @click="doApprentice(m.id)" :disabled="loading">
          拜师
        </button>
        <span v-else-if="myMentor" class="src-tag">已有师父</span>
        <span v-else-if="!m.can_apprentice" class="src-tag">徒弟已满</span>
      </div>
    </div>

    <div v-if="!myMentor && !isMentor && userStore.level >= mentorMinLevel" class="become-mentor-hint">
      <span>等级达到{{ mentorMinLevel }}级，可以</span>
      <button class="bm-btn" @click="doBecomeMentor" :disabled="loading">成为认证师父</button>
    </div>
    <div v-if="!myMentor && !isMentor && userStore.level < mentorMinLevel" class="become-mentor-hint">
      🎓 再升{{ mentorMinLevel - userStore.level }}级即可成为认证师父（{{ mentorMinLevel }}级）
    </div>
  </template>

  <!-- 师徒排行榜 -->
  <template v-if="tab === 'ranking'">
    <div v-if="ranking.length === 0" class="mentor-empty">暂无排行数据</div>
    <div v-else class="ranking-list">
      <div v-for="(r, idx) in ranking" :key="r.id" class="ranking-card">
        <div class="rc-rank" :class="idx<3?'top':''">{{ idx+1 }}</div>
        <div class="rc-avatar">{{ idx < 3 ? '🥇🥈🥉'[idx] : '👨‍🏫' }}</div>
        <div class="rc-info">
          <div class="rc-name">{{ r.username }} <span class="rc-lv">Lv.{{ r.level }}</span><span v-if="r.vip_level > 0" class="rc-vip">V{{ r.vip_level }}</span></div>
          <div class="rc-meta">
            👥 在徒 {{ r.active_count }} | ✨ 已出师 {{ r.graduate_count }} | 🏆 {{ r.mentor_contribution }} 贡献度
          </div>
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
const searchLoading = ref(false);
const searchKeyword = ref('');
const hasSearched = ref(false);
const searchResults = ref([]);
const myMentor = ref(null);
const isMentor = ref(false);
const apprenticeCount = ref(0);
const mentorContribution = ref(0);
const apprentices = ref([]);
const contributionHistory = ref([]);
const ranking = ref([]);
const stats = ref({
  active_apprentices: 0,
  graduated_apprentices: 0,
  total_contribution: 0,
  is_mentor: false
});
const maxApprentices = ref(5);
const graduateLevel = ref(30);
const mentorMinLevel = ref(50);

function showMsg(text, type='ok') {
  msg.value = text; msgType.value = type;
  setTimeout(() => msg.value = '', 3000);
}

async function switchTab(t) {
  tab.value = t;
  if (t === 'apprentices') await loadApprentices();
  if (t === 'ranking') await loadRanking();
  if (t === 'search') {
    searchResults.value = [];
    hasSearched.value = false;
    await doSearch();
  }
}

async function loadStats() {
  try {
    const res = await Api.get('/mentor/stats');
    stats.value = res;
    isMentor.value = res.is_mentor;
  } catch(e) {}
}

async function loadApprentices() {
  try {
    const res = await Api.get('/mentor/apprentices');
    apprentices.value = res.apprentices || [];

    // 加载贡献历史
    const histRes = await Api.get('/mentor/contribution-history');
    contributionHistory.value = histRes.history || [];
  } catch(e) { apprentices.value = []; }
}

async function loadMentorInfo() {
  try {
    const res = await Api.get('/mentor/mentor');
    if (res.has_mentor) {
      myMentor.value = res.relation;
    } else {
      myMentor.value = null;
      await loadStats();
    }
  } catch(e) { myMentor.value = null; }
}

async function loadRanking() {
  try {
    const res = await Api.get('/mentor/ranking');
    ranking.value = res.ranking || [];
    maxApprentices.value = res.max_apprentices || 5;
  } catch(e) { ranking.value = []; }
}

async function doBecomeMentor() {
  if (userStore.level < mentorMinLevel.value) { showMsg(`需要达到${mentorMinLevel.value}级才能成为师父`, 'error'); return; }
  loading.value = true;
  try {
    const res = await Api.post('/mentor/become-mentor');
    showMsg(res.msg || '已成为认证师父！');
    isMentor.value = true;
    stats.value.is_mentor = true;
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
    myMentor.value = searchResults.value.find(s => s.id === mentorId);
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
    await loadStats();
  } catch(e) { showMsg(e.message, 'error'); }
  finally { loading.value = false; }
}

async function doSearch() {
  searchLoading.value = true;
  hasSearched.value = true;
  searchResults.value = [];
  try {
    const res = await Api.get('/mentor/search-mentors?keyword=' + encodeURIComponent(searchKeyword.value || ''));
    searchResults.value = res.mentors || [];
  } catch(e) { searchResults.value = []; }
  finally { searchLoading.value = false; }
}

function getApprenticeStatus(a) {
  if (a.status === 2) return 'graduated';
  return a.level >= graduateLevel.value ? 'ready' : 'learning';
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`;
}

onMounted(async () => {
  await loadMentorInfo();
  await loadStats();
  if (tab.value === 'apprentices') await loadApprentices();
  if (tab.value === 'ranking') await loadRanking();
  if (tab.value === 'search') await doSearch();
});
</script>

<style scoped>
.mentor-page { position: relative; min-height: 100vh; padding: 16px; padding-bottom: 80px; }
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
.msc-vip { font-size: 10px; color: #ff6b6b; margin-left: 4px; background: rgba(255,107,107,0.15); padding: 1px 4px; border-radius: 4px; }
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
.msc-graduate:disabled { opacity: 0.5; cursor: not-allowed; }
.msc-progress { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; margin-top: 8px; overflow: hidden; }
.msc-progress-bar { height: 100%; background: linear-gradient(90deg, #27ae60, #2ecc71); transition: width 0.3s; }
.msc-level-progress { font-size: 11px; color: #555; margin-top: 8px; }

/* Tab */
.mentor-tabs { display: flex; gap: 6px; margin-bottom: 16px; }
.mt-btn {
  flex: 1; padding: 10px; border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04); border-radius: 10px;
  font-size: 12px; color: #888; cursor: pointer; transition: all 0.2s;
}
.mt-btn.active { background: rgba(226,183,20,0.1); border-color: rgba(226,183,20,0.4); color: #e2b714; }
.mt-badge {
  background: #e2b714; color: #000; border-radius: 10px;
  padding: 1px 6px; font-size: 10px; margin-left: 4px;
}

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
.ac-vip { font-size: 9px; color: #ff6b6b; margin-left: 3px; background: rgba(255,107,107,0.15); padding: 0 3px; border-radius: 3px; }
.ac-time { font-size: 10px; color: #555; margin-top: 2px; }
.ac-status { font-size: 10px; padding: 3px 8px; border-radius: 6px; }
.ac-status.ready { background: rgba(39,174,96,0.15); color: #2ecc71; }
.ac-status.learning { background: rgba(255,255,255,0.05); color: #555; }
.ac-status.graduated { background: rgba(226,183,20,0.15); color: #e2b714; }

/* 贡献记录 */
.contribution-section { margin-top: 16px; }
.cs-title { font-size: 12px; color: #888; margin-bottom: 8px; }
.cs-item {
  display: flex; justify-content: space-between; font-size: 11px; color: #666;
  padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05);
}

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
.search-results { display: flex; flex-direction: column; gap: 8px; }
.search-result-card {
  display: flex; align-items: center; gap: 10px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px; padding: 14px;
}
.src-avatar { width: 40px; height: 40px; border-radius: 12px; background: rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center; font-size: 18px; }
.src-info { flex: 1; }
.src-name { font-size: 14px; font-weight: 600; color: #f0f0f0; }
.src-lv { font-size: 11px; color: #7f8c8d; margin-left: 4px; }
.src-vip { font-size: 9px; color: #ff6b6b; margin-left: 3px; background: rgba(255,107,107,0.15); padding: 0 3px; border-radius: 3px; }
.src-meta { font-size: 11px; color: #888; margin-top: 2px; display: flex; gap: 8px; }
.src-slots { color: #27ae60; }
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
.rc-vip { font-size: 9px; color: #ff6b6b; margin-left: 3px; background: rgba(255,107,107,0.15); padding: 0 3px; border-radius: 3px; }
.rc-meta { font-size: 10px; color: #555; margin-top: 2px; }
</style>

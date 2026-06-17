<template>
  <div class="page-wrap arena-page">

  <div class="page-hud"><div class="page-hud-title">⚔️ 竞技场</div></div>    <!-- 顶部 HUD -->
    <div class="top-hud">
      <div class="hud-left">
        <div class="hud-icon">⚔️</div>
        <div class="hud-title">竞技场</div>
      </div>
      <div class="hud-season">赛季 {{ status.season_id || 1 }}</div>
    </div>

    <!-- 状态概览 -->
    <div class="stats-card">
      <div class="stat-item">
        <div class="stat-val gold">{{ status.rank || '--' }}</div>
        <div class="stat-key">我的排名</div>
      </div>
      <div class="stat-item">
        <div class="stat-val" :style="{ color: tierColor }">{{ status.tier_label || '青铜' }}</div>
        <div class="stat-key">段位</div>
      </div>
      <div class="stat-item">
        <div class="stat-val">{{ status.score || 1000 }}</div>
        <div class="stat-key">积分</div>
      </div>
      <div class="stat-item">
        <div class="stat-val win">{{ status.win_count || 0 }}胜</div>
        <div class="stat-key">{{ status.lose_count || 0 }}负</div>
      </div>
      <div class="stat-item">
        <div class="stat-val" :class="(status.daily_challenge_count || 0) >= (status.daily_limit || 5) ? 'lose' : 'win'">
          {{ (status.daily_limit || 5) - (status.daily_challenge_count || 0) }}/{{ status.daily_limit || 5 }}
        </div>
        <div class="stat-key">剩余挑战</div>
      </div>
    </div>

    <div class="season-hint">赛季结束于 {{ fmtSeasonEnd(status.season_end) }}</div>

    <!-- Tab 切换 -->
    <div class="tab-bar">
      <div :class="['tab-btn', { active: activeTab === 'challenge' }]" @click="activeTab = 'challenge'">⚔️ 挑战</div>
      <div :class="['tab-btn', { active: activeTab === 'rankings' }]" @click="switchToRankings">🏆 排行榜</div>
    </div>

    <!-- 挑战列表 -->
    <div v-if="activeTab === 'challenge'" class="tab-content">
      <div class="fee-hint">每次挑战消耗 <span class="gold">{{ status.entry_fee || 100 }}</span> 铜币</div>

      <div v-if="opponents.length > 0" class="opponents-list">
        <div v-for="op in opponents" :key="op.opponent_id" class="opponent-card" :class="{ bot: op.is_bot }">
          <div class="oc-left">
            <div class="oc-avatar">{{ op.is_bot ? '🤖' : '👤' }}</div>
            <div class="oc-info">
              <div class="oc-name">{{ op.username }}<span class="oc-lv">Lv.{{ op.level }}</span><span v-if="op.rank > 0" class="oc-rank">#{{ op.rank }}</span></div>
              <div class="oc-stats">⚔️ {{ op.atk_min }}-{{ op.atk_max }} · 🛡️ {{ op.def }} · 💨 {{ op.agility }}</div>
            </div>
          </div>
          <button class="oc-challenge-btn" @click="showChallengeConfirm(op)">挑战</button>
        </div>
      </div>
      <div v-else-if="loading" class="content-hint">加载中...</div>
      <div v-else class="content-hint">暂无可挑战对手</div>
    </div>

    <!-- 排行榜 -->
    <div v-if="activeTab === 'rankings'" class="tab-content">
      <div v-if="rankings.length > 0" class="rankings-list">
        <div v-for="player in rankings" :key="player.user_id" :class="['rank-card', { me: player.is_me, top: player.rank <= 3 }]">
          <div class="rc-medal">
            <span v-if="player.rank === 1">🥇</span>
            <span v-else-if="player.rank === 2">🥈</span>
            <span v-else-if="player.rank === 3">🥉</span>
            <span v-else class="rc-num">#{{ player.rank }}</span>
          </div>
          <div class="rc-info">
            <div class="rc-name">{{ player.is_me ? '👑 ' : '' }}{{ player.username }}<span class="rc-lv">Lv.{{ player.level }}</span></div>
            <div class="rc-detail">积分: {{ player.score }} · {{ player.win_count }}胜 {{ player.lose_count }}负 · 胜率: {{ player.win_rate }}%</div>
          </div>
        </div>
      </div>
      <div v-else-if="loadingRank" class="content-hint">加载中...</div>
      <div v-else class="content-hint">暂无排名数据</div>

      <!-- 分页 -->
      <div v-if="rankings.length > 0" class="pagination">
        <button class="page-btn" :disabled="rankPage <= 1" @click="loadRankings(rankPage - 1)">◀ 上一页</button>
        <span class="page-info">{{ rankPage }}/{{ rankTotalPages || 1 }}</span>
        <button class="page-btn" :disabled="rankPage >= rankTotalPages" @click="loadRankings(rankPage + 1)">下一页 ▶</button>
      </div>
    </div>

    <!-- 挑战确认弹窗 -->
    <Teleport to="body">
      <div v-if="showConfirm" class="overlay" @click.self="showConfirm = false">
        <div class="confirm-card">
          <div class="cc-title">⚔️ 发起挑战</div>
          <div class="cc-body">
            <div class="cc-op">{{ selectedOpponent?.username }}</div>
            <div class="cc-fee">消耗 <span class="gold">{{ status.entry_fee || 100 }}</span> 铜币作为门票</div>
          </div>
          <div class="cc-actions">
            <button class="cc-cancel" @click="showConfirm = false">取消</button>
            <button class="cc-confirm" :disabled="challenging" @click="doChallenge">{{ challenging ? '挑战中...' : '确认挑战' }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 战斗结算 -->
    <Teleport to="body">
      <div v-if="showBattleResult" class="overlay" @click.self="closeBattleResult">
        <div class="result-card">
          <div v-if="battleResult.result === 'win'" class="result-win">
            <div class="result-title">🏆 胜利！</div>
            <div class="result-sub">击败了 {{ battleResult.opponent_name }}！</div>
            <div class="result-divider"></div>
            <div class="result-items">✨ 积分 +20</div>
            <div class="result-items">💰 获得银币：<span class="gold">+{{ battleResult.reward?.silver || 0 }}</span></div>
            <div v-if="battleResult.reward?.is_first_win" class="result-items gold">🌟 首胜奖励：+{{ arenaConfig.first_win_silver }}银币！</div>
            <div class="result-items">⭐ 声望 +{{ battleResult.reward?.reputation || 0 }}</div>
          </div>
          <div v-else class="result-lose">
            <div class="result-title lose">💀 战败</div>
            <div class="result-sub">被 {{ battleResult.opponent_name }} 击败了...</div>
            <div class="result-divider"></div>
            <div class="result-items">💰 参与奖励：<span class="gold">+{{ battleResult.reward?.silver || 0 }}</span> 银币</div>
          </div>
          <div class="battle-log">
            <div class="bl-title">📜 战斗回顾</div>
            <div class="bl-box">
              <div v-for="(log, i) in battleResult.log" :key="i" :class="['bl-line', 'log-' + log.type]">{{ log.text }}</div>
            </div>
          </div>
          <button class="result-close" @click="closeBattleResult">确定</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { Api } from '../composables/useApi';
import { useGameStore } from '../stores/game';
import { useRouter } from 'vue-router';

const status = ref({});
const opponents = ref([]);
const rankings = ref([]);
const activeTab = ref('challenge');
const loading = ref(true);
const loadingRank = ref(false);
const showConfirm = ref(false);
const selectedOpponent = ref(null);
const challenging = ref(false);
const showBattleResult = ref(false);
const battleResult = ref({});
const rankPage = ref(1);
const rankTotalPages = ref(1);

const arenaConfig = { first_win_silver: 50 };
const gameStore = useGameStore();
const router = useRouter();

const tierColor = computed(() => {
  const t = status.value.tier_label || '青铜';
  const m = { '青铜': '#8b6914', '白银': '#c0c0c0', '黄金': '#ffd700', '钻石': '#4fc3f7', '大师': '#9b59b6' };
  return m[t] || '#8b6914';
});

function fmtSeasonEnd(ts) {
  if (!ts) return '--';
  const d = new Date(ts * 1000);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

async function load() {
  try { const d = await Api.get('/arena/status'); status.value = d; opponents.value = d.opponents || []; } catch (e) {} finally { loading.value = false; }
}

async function switchToRankings() { activeTab.value = 'rankings'; loadRankings(1); }

async function loadRankings(page) {
  loadingRank.value = true;
  try { const d = await Api.get(`/arena/rankings?page=${page}`); rankings.value = d.list || []; rankPage.value = d.page || 1; rankTotalPages.value = d.total_pages || 1; }
  catch (e) {} finally { loadingRank.value = false; }
}

function showChallengeConfirm(op) { selectedOpponent.value = op; showConfirm.value = true; }

async function doChallenge() {
  if (!selectedOpponent.value) return;
  challenging.value = true;
  showConfirm.value = false;
  try {
    const b = await Api.post('/arena/challenge', { opponent_id: selectedOpponent.value.opponent_id });
    gameStore.setBattle(b);
    router.push('/citymap');
  } catch (e) {
    if (e.message?.includes('挑战') || e.message?.includes('铜币') || e.message?.includes('次数')) {
      battleResult.value = { result: 'lose', opponent_name: selectedOpponent.value.username, reward: { silver: 0 }, log: [] };
      showBattleResult.value = true;
    } else { globalAlert(e.message); }
  } finally { challenging.value = false; }
}

function closeBattleResult() { showBattleResult.value = false; load(); }

onMounted(load);
</script>

<style scoped>
.arena-page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 10px;
  min-height: 100%;
  overflow-y: auto;
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
.hud-season { font-size: 11px; color: #7f8c8d; background: rgba(255,255,255,0.06); padding: 2px 10px; border-radius: 10px; }
.stats-card {
  position: relative; z-index: 2;
  display: grid; grid-template-columns: 1fr 1fr 1fr 1fr 1fr; gap: 6px;
}
.stat-item {
  background: rgba(255,255,255,0.04); border-radius: 10px; padding: 10px 6px; text-align: center;
}
.stat-val { font-size: 16px; font-weight: 700; color: #f0f0f0; }
.stat-val.gold { color: #c9a758; }
.stat-val.win { color: #27ae60; }
.stat-val.lose { color: #e74c3c; }
.stat-key { font-size: 9px; color: #7f8c8d; margin-top: 2px; }
.season-hint { position: relative; z-index: 2; font-size: 10px; color: #555; text-align: center; }
.tab-bar { position: relative; z-index: 2; display: flex; gap: 6px; }
.tab-btn {
  flex: 1; text-align: center; padding: 8px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; font-size: 12px; color: #7f8c8d; cursor: pointer; transition: all 0.2s;
}
.tab-btn.active { background: rgba(220,80,80,0.1); border-color: rgba(220,80,80,0.3); color: #e74c3c; }
.tab-content { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 8px; }
.fee-hint { font-size: 12px; color: #7f8c8d; text-align: center; padding: 8px; }
.gold { color: #c9a758; font-weight: 700; }
.opponents-list { display: flex; flex-direction: column; gap: 8px; }
.opponent-card {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;
}
.opponent-card.bot { border-color: rgba(79,195,247,0.15); }
.oc-left { display: flex; align-items: center; gap: 10px; }
.oc-avatar { font-size: 28px; }
.oc-info { display: flex; flex-direction: column; gap: 3px; }
.oc-name { font-size: 14px; font-weight: 600; color: #ddd; }
.oc-lv, .oc-rank { font-size: 10px; color: #7f8c8d; margin-left: 4px; }
.oc-stats { font-size: 11px; color: #555; }
.oc-challenge-btn {
  background: linear-gradient(135deg, #8b1a1a, #b22222); border: none;
  border-radius: 8px; color: #fff; font-size: 13px; font-weight: 700; padding: 8px 16px; cursor: pointer;
}
.content-hint { text-align: center; color: #555; font-size: 13px; padding: 20px; }
.rankings-list { display: flex; flex-direction: column; gap: 8px; }
.rank-card {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;
}
.rank-card.me { border-color: rgba(201,168,76,0.3); background: rgba(201,168,76,0.05); }
.rank-card.top { border-color: rgba(201,168,76,0.2); }
.rc-medal { font-size: 20px; min-width: 36px; text-align: center; }
.rc-num { font-size: 12px; color: #7f8c8d; }
.rc-info { flex: 1; }
.rc-name { font-size: 13px; font-weight: 600; color: #ddd; }
.rc-lv { font-size: 10px; color: #7f8c8d; margin-left: 4px; }
.rc-detail { font-size: 10px; color: #555; margin-top: 2px; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 10px; padding: 8px 0; }
.page-btn {
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; color: #7f8c8d; font-size: 12px; padding: 6px 12px; cursor: pointer;
}
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-size: 12px; color: #7f8c8d; }
.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; backdrop-filter: blur(4px);
}
.confirm-card {
  background: rgba(13,17,23,0.97); border: 1px solid rgba(220,80,80,0.3);
  border-radius: 16px; padding: 24px 20px; width: 280px;
}
.cc-title { font-size: 16px; font-weight: 700; color: #f0f0f0; margin-bottom: 12px; text-align: center; }
.cc-body { text-align: center; margin-bottom: 16px; }
.cc-op { font-size: 16px; color: #ddd; font-weight: 600; margin-bottom: 8px; }
.cc-fee { font-size: 13px; color: #7f8c8d; }
.cc-actions { display: flex; gap: 8px; }
.cc-cancel {
  flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; color: #7f8c8d; font-size: 14px; padding: 10px; cursor: pointer;
}
.cc-confirm {
  flex: 1; background: linear-gradient(135deg, #8b1a1a, #b22222); border: none;
  border-radius: 8px; color: #fff; font-size: 14px; font-weight: 700; padding: 10px; cursor: pointer;
}
.cc-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
.result-card {
  background: rgba(13,17,23,0.97); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px; padding: 20px; width: 300px; max-height: 80vh; overflow-y: auto;
}
.result-win { text-align: center; }
.result-title { font-size: 22px; font-weight: 700; color: #f1c40f; margin-bottom: 6px; }
.result-title.lose { color: #e74c3c; }
.result-sub { font-size: 14px; color: #7f8c8d; margin-bottom: 10px; }
.result-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 10px 0; }
.result-items { font-size: 13px; color: #ddd; margin-bottom: 6px; }
.result-items.gold { color: #c9a758; }
.result-lose { text-align: center; }
.battle-log { margin-top: 12px; }
.bl-title { font-size: 12px; color: #7f8c8d; margin-bottom: 6px; }
.bl-box { background: rgba(0,0,0,0.3); border-radius: 8px; padding: 8px; max-height: 150px; overflow-y: auto; }
.bl-line { font-size: 11px; color: #7f8c8d; padding: 2px 0; }
.log-damage { color: #e74c3c; }
.result-close {
  width: 100%; margin-top: 12px;
  background: linear-gradient(135deg, #c9a84c, #8b6914); border: none;
  border-radius: 8px; color: #fff; font-size: 14px; font-weight: 700; padding: 10px; cursor: pointer;
}
</style>
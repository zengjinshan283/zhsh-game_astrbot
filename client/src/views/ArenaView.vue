<template>
  <div class="arena-view">
    <!-- 顶部状态栏 -->
    <div class="arena-header">
      <div class="header-title">⚔️ 竞技场</div>
      <div class="header-stats">
        <div class="stat-item">
          <span class="stat-label">我的排名</span>
          <span class="stat-value text-gold">#{{ status.rank || '--' }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">积分</span>
          <span class="stat-value">{{ status.score || 1000 }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">胜/负</span>
          <span class="stat-value text-win">{{ status.win_count || 0 }}胜 {{ status.lose_count || 0 }}负</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">剩余挑战</span>
          <span class="stat-value" :class="status.daily_challenge_count >= status.daily_limit ? 'text-red' : 'text-win'">
            {{ (status.daily_limit || 5) - (status.daily_challenge_count || 0) }}/{{ status.daily_limit || 5 }}
          </span>
        </div>
      </div>
    </div>

    <!-- Tab 切换 -->
    <div class="tab-bar">
      <button class="tab-btn" :class="{ active: activeTab === 'challenge' }" @click="activeTab = 'challenge'">
        ⚔️ 挑战
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'rankings' }" @click="switchToRankings">
        🏆 排行榜
      </button>
    </div>

    <!-- 挑战列表 -->
    <div v-if="activeTab === 'challenge'" class="tab-content">
      <div class="section-title">🎯 可挑战对手</div>

      <!-- 门票提示 -->
      <div class="fee-hint">
        每次挑战消耗 <span class="text-gold">{{ status.entry_fee || 100 }}</span> 铜币
      </div>

      <!-- 对手列表 -->
      <div v-if="opponents.length > 0" class="opponent-list">
        <div v-for="op in opponents" :key="op.opponent_id" class="opponent-card" :class="{ 'is-bot': op.is_bot }">
          <div class="op-info">
            <div class="op-name">
              {{ op.is_bot ? '🤖' : '👤' }} {{ op.username }}
              <span class="op-level">Lv.{{ op.level }}</span>
              <span v-if="op.rank > 0" class="op-rank">#{{ op.rank }}</span>
            </div>
            <div class="op-stats">
              <span>⚔️ {{ op.atk_min }}-{{ op.atk_max }}</span>
              <span>🛡️ {{ op.def }}</span>
              <span>💨 {{ op.agility }}</span>
            </div>
          </div>
          <button class="btn btn-danger btn-sm" @click="showChallengeConfirm(op)">
            挑战
          </button>
        </div>
      </div>

      <div v-else-if="loading" class="loading-hint">加载中...</div>
      <div v-else class="empty-hint">暂无可挑战对手</div>
    </div>

    <!-- 排行榜 -->
    <div v-if="activeTab === 'rankings'" class="tab-content">
      <div class="section-title">🏆 竞技场排行榜</div>

      <div v-if="rankings.length > 0" class="rank-list">
        <div v-for="(player, idx) in rankings" :key="player.user_id"
             class="rank-card"
             :class="{ 'is-me': player.is_me, 'rank-top': player.rank <= 3 }">
          <div class="rank-num">
            <span v-if="player.rank === 1" class="medal">🥇</span>
            <span v-else-if="player.rank === 2" class="medal">🥈</span>
            <span v-else-if="player.rank === 3" class="medal">🥉</span>
            <span v-else class="rank-text">#{{ player.rank }}</span>
          </div>
          <div class="rank-info">
            <div class="rank-name">
              {{ player.is_me ? '👑 ' : '' }}{{ player.username }}
              <span class="rank-level">Lv.{{ player.level }}</span>
            </div>
            <div class="rank-detail">
              <span>积分: {{ player.score }}</span>
              <span>{{ player.win_count }}胜 {{ player.lose_count }}负</span>
              <span>胜率: {{ player.win_rate }}%</span>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="loadingRank" class="loading-hint">加载中...</div>
      <div v-else class="empty-hint">暂无排名数据</div>

      <!-- 分页 -->
      <div v-if="rankings.length > 0" class="pagination">
        <button class="btn btn-secondary btn-sm" :disabled="rankPage <= 1" @click="loadRankings(rankPage - 1)">
          ◀ 上一页
        </button>
        <span class="page-info">{{ rankPage }}/{{ rankTotalPages || 1 }}</span>
        <button class="btn btn-secondary btn-sm" :disabled="rankPage >= rankTotalPages" @click="loadRankings(rankPage + 1)">
          下一页 ▶
        </button>
      </div>
    </div>

    <!-- 挑战确认弹窗 -->
    <div v-if="showConfirm" class="modal-overlay" @click.self="showConfirm = false">
      <div class="modal-box">
        <div class="modal-title">⚔️ 发起挑战</div>
        <div class="modal-body">
          <p>你确定要挑战 <strong>{{ selectedOpponent?.username }}</strong> 吗？</p>
          <p class="text-gold">消耗 {{ status.entry_fee || 100 }} 铜币作为门票</p>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showConfirm = false">取消</button>
          <button class="btn btn-danger" :disabled="challenging" @click="doChallenge">
            {{ challenging ? '挑战中...' : '确认挑战' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 战斗结算 -->
    <div v-if="showBattleResult" class="modal-overlay" @click.self="closeBattleResult">
      <div class="modal-box battle-result-modal">
        <div class="modal-title">⚔️ 战斗结束</div>
        <div class="modal-body">
          <!-- 胜利 -->
          <div v-if="battleResult.result === 'win'" class="result-win">
            <div class="result-title text-win">🏆 胜利！</div>
            <p>你击败了 <strong>{{ battleResult.opponent_name }}</strong>！</p>
            <div class="divider"></div>
            <p>✨ 积分 +20</p>
            <p>💰 获得银币：<span class="text-gold">+{{ battleResult.reward?.silver || 0 }}</span></p>
            <p v-if="battleResult.reward?.is_first_win" class="text-gold">🌟 首胜奖励：+{{ arenaConfig.first_win_silver }}银币！</p>
            <p>⭐ 声望 +{{ battleResult.reward?.reputation || 0 }}</p>
          </div>
          <!-- 失败 -->
          <div v-else class="result-lose">
            <div class="result-title text-red">💀 战败</div>
            <p>你被 <strong>{{ battleResult.opponent_name }}</strong> 击败了...</p>
            <div class="divider"></div>
            <p>💰 参与奖励：<span class="text-gold">+{{ battleResult.reward?.silver || 0 }}</span> 银币</p>
          </div>

          <!-- 战斗回顾 -->
          <div class="battle-log-section">
            <div class="log-title">📜 战斗回顾</div>
            <div class="battle-log-box">
              <div v-for="(log, i) in battleResult.log" :key="i" :class="'log-line log-' + log.type">
                {{ log.text }}
              </div>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-danger" @click="closeBattleResult">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { Api } from '../composables/useApi';
import { globalAlert, globalConfirm } from '../composables/useConfirm';
import { useUserStore } from '../stores/user';
import { useGameStore } from '../stores/game';

const userStore = useUserStore();
const gameStore = useGameStore();

const activeTab = ref('challenge');
const loading = ref(false);
const loadingRank = ref(false);

const status = reactive({
  rank: 0,
  score: 1000,
  win_count: 0,
  lose_count: 0,
  daily_challenge_count: 0,
  daily_limit: 5,
  entry_fee: 100
});

const arenaConfig = {
  first_win_silver: 50
};

const opponents = ref([]);
const rankings = ref([]);
const rankPage = ref(1);
const rankTotalPages = ref(1);

const showConfirm = ref(false);
const selectedOpponent = ref(null);
const challenging = ref(false);

const showBattleResult = ref(false);
const battleResult = ref(null);

onMounted(async () => {
  await loadStatus();
  await loadOpponents();
});

async function loadStatus() {
  try {
    const data = await Api.get('/arena/status');
    Object.assign(status, data);
  } catch (e) {
    console.error('加载竞技场状态失败', e);
  }
}

async function loadOpponents() {
  loading.value = true;
  try {
    const data = await Api.get('/arena/opponents');
    opponents.value = data.opponents || [];
  } catch (e) {
    await globalAlert('加载对手列表失败');
  } finally {
    loading.value = false;
  }
}

function showChallengeConfirm(op) {
  selectedOpponent.value = op;
  showConfirm.value = true;
}

async function doChallenge() {
  if (!selectedOpponent.value) return;

  if (status.daily_challenge_count >= status.daily_limit) {
    await globalAlert('今日挑战次数已用完，请明天再来');
    showConfirm.value = false;
    return;
  }

  if (userStore.user?.money < status.entry_fee) {
    await globalAlert(`铜币不足，需要${status.entry_fee}铜币作为门票`);
    showConfirm.value = false;
    return;
  }

  challenging.value = true;
  showConfirm.value = false;

  try {
    const data = await Api.post(`/arena/challenge/${selectedOpponent.value.opponent_id}`);
    battleResult.value = data;
    showBattleResult.value = true;

    // 刷新状态
    await loadStatus();
    await loadOpponents();

    // 刷新用户数据
    const me = await Api.get('/auth/me');
    userStore.updateUser(me.user);
  } catch (e) {
    await globalAlert(e.message || '挑战失败');
  } finally {
    challenging.value = false;
    selectedOpponent.value = null;
  }
}

async function switchToRankings() {
  activeTab.value = 'rankings';
  await loadRankings(1);
}

async function loadRankings(page = 1) {
  loadingRank.value = true;
  rankPage.value = page;
  try {
    const data = await Api.get(`/arena/rankings?page=${page}&limit=10`);
    rankings.value = data.list || [];
    rankTotalPages.value = data.total_pages || 1;
  } catch (e) {
    await globalAlert('加载排行榜失败');
  } finally {
    loadingRank.value = false;
  }
}

function closeBattleResult() {
  showBattleResult.value = false;
  battleResult.value = null;
}
</script>

<style scoped>
.arena-view {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  background: #0a0a1a;
  color: #f5e6c8;
  padding-bottom: 60px;
}

.arena-header {
  background: linear-gradient(135deg, #1a1a3e 0%, #2d1f4e 100%);
  padding: 12px;
  border-bottom: 2px solid #3d2a6e;
}

.header-title {
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 10px;
  color: #e2b714;
}

.header-stats {
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
  gap: 8px;
}

.stat-item {
  text-align: center;
  min-width: 60px;
}

.stat-label {
  display: block;
  font-size: 10px;
  color: #8a7a5a;
}

.stat-value {
  font-size: 14px;
  font-weight: bold;
}

.text-gold { color: #e2b714; }
.text-win { color: #27ae60; }
.text-red { color: #e74c3c; }

.tab-bar {
  display: flex;
  background: #1a1a3e;
  border-bottom: 1px solid #3d2a6e;
}

.tab-btn {
  flex: 1;
  padding: 12px;
  background: transparent;
  border: none;
  color: #8a7a5a;
  font-size: 14px;
  cursor: pointer;
}

.tab-btn.active {
  color: #e2b714;
  border-bottom: 2px solid #e2b714;
}

.tab-content {
  padding: 12px;
}

.section-title {
  font-size: 14px;
  color: #e2b714;
  margin-bottom: 10px;
  font-weight: bold;
}

.fee-hint {
  text-align: center;
  font-size: 12px;
  color: #8a7a5a;
  margin-bottom: 12px;
}

.opponent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.opponent-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #1a1a3e;
  border: 1px solid #3d2a6e;
  border-radius: 8px;
  padding: 10px 12px;
}

.opponent-card.is-bot {
  border-color: #4a3a6e;
}

.op-name {
  font-size: 14px;
  margin-bottom: 4px;
}

.op-level {
  font-size: 11px;
  color: #8a7a5a;
  margin-left: 6px;
}

.op-rank {
  font-size: 11px;
  color: #27ae60;
  margin-left: 6px;
}

.op-stats {
  font-size: 11px;
  color: #8a7a5a;
  display: flex;
  gap: 8px;
}

.loading-hint, .empty-hint {
  text-align: center;
  padding: 30px;
  color: #8a7a5a;
  font-size: 13px;
}

.rank-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rank-card {
  display: flex;
  align-items: center;
  background: #1a1a3e;
  border: 1px solid #3d2a6e;
  border-radius: 8px;
  padding: 8px 10px;
}

.rank-card.is-me {
  border-color: #e2b714;
  background: #2a2a4e;
}

.rank-card.rank-top {
  border-color: #e2b714;
}

.rank-num {
  width: 40px;
  text-align: center;
  font-size: 14px;
}

.medal {
  font-size: 18px;
}

.rank-text {
  color: #8a7a5a;
}

.rank-info {
  flex: 1;
}

.rank-name {
  font-size: 13px;
  margin-bottom: 2px;
}

.rank-level {
  font-size: 10px;
  color: #8a7a5a;
  margin-left: 6px;
}

.rank-detail {
  font-size: 10px;
  color: #8a7a5a;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

.page-info {
  font-size: 12px;
  color: #8a7a5a;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 13px;
}

.btn-danger {
  background: #c0392b;
  color: #fff;
}

.btn-danger:disabled {
  background: #7f2d2d;
  cursor: not-allowed;
}

.btn-secondary {
  background: #3d2a6e;
  color: #f5e6c8;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  padding: 20px;
}

.modal-box {
  background: #1a1a3e;
  border: 2px solid #3d2a6e;
  border-radius: 12px;
  padding: 20px;
  width: 100%;
  max-width: 360px;
}

.modal-title {
  font-size: 16px;
  font-weight: bold;
  color: #e2b714;
  text-align: center;
  margin-bottom: 16px;
}

.modal-body {
  margin-bottom: 16px;
}

.modal-body p {
  margin-bottom: 8px;
  font-size: 13px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.battle-result-modal {
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
}

.result-win, .result-lose {
  text-align: center;
  margin-bottom: 12px;
}

.result-title {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 8px;
}

.divider {
  border: none;
  border-top: 1px solid rgba(226, 183, 20, 0.2);
  margin: 10px 0;
}

.battle-log-section {
  margin-top: 12px;
}

.log-title {
  font-size: 12px;
  color: #8a7a5a;
  margin-bottom: 6px;
}

.battle-log-box {
  background: #0f0f2e;
  border: 1px solid #2a2a4e;
  border-radius: 6px;
  padding: 8px;
  max-height: 150px;
  overflow-y: auto;
  font-size: 11px;
}

.log-line {
  margin-bottom: 4px;
  line-height: 1.4;
}

.log-info { color: #3498db; }
.log-attack { color: #e74c3c; }
.log-system { color: #8a7a5a; }
</style>
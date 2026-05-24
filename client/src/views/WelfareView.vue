<template>
  <div class="welfare-page">
    <div class="welfare-bg"></div>

    <!-- 顶部 HUD -->
    <div class="top-hud">
      <div class="hud-left">
        <div class="hud-icon">🎁</div>
        <div class="hud-title">福利中心</div>
      </div>
    </div>

    <!-- Tab 切换 -->
    <div class="tab-bar">
      <div v-for="tab in tabs" :key="tab.key" :class="['tab-btn', { active: activeTab === tab.key }]" @click="activeTab = tab.key">
        {{ tab.label }}
      </div>
    </div>

    <div v-if="loading" class="loading-card">
      <div class="loading-spinner"></div>
      <div class="loading-text">加载中...</div>
    </div>

    <div v-else class="card-area">

      <!-- 福利 Tab -->
      <div v-if="activeTab === 'welfare'">
        <!-- 注册礼包 -->
        <div class="gift-card">
          <div class="gift-header">🎁 注册礼包</div>
          <div class="gift-items">5000铜币 + 铁剑×1 + 小HP药×3 + 港口地图×1</div>
          <button v-if="!status.starter_claimed" @click="claimStarter" class="gift-btn" :disabled="claiming">
            {{ claiming ? '领取中...' : '立即领取' }}
          </button>
          <div v-else class="gift-claimed">✅ 已领取</div>
        </div>

        <!-- 7日登录 -->
        <div class="login-card">
          <div class="login-header">📅 7日登录礼包 · 第 {{ status.loginDay || 1 }} 天</div>
          <div class="sign-week">
            <div v-for="d in 7" :key="d" :class="['sign-day', { signed: claimedDays.includes(d), today: d === (status.loginDay || 1), claimable: d === (status.loginDay || 1) && !status.nextLoginClaimed, future: d > (status.loginDay || 1) }]">
              <div class="sd-label">第{{ d }}天</div>
              <div class="sd-reward">💰{{ loginMoney(d) }}</div>
              <div class="sd-status">
                <template v-if="claimedDays.includes(d)">✅</template>
                <template v-else-if="d === (status.loginDay || 1) && !status.nextLoginClaimed">可领</template>
                <template v-else-if="d > (status.loginDay || 1)">🔒</template>
                <template v-else>-</template>
              </div>
            </div>
          </div>
          <button v-if="status.loginDay && !status.nextLoginClaimed" @click="claimLogin" class="login-claim-btn" :disabled="claiming">
            {{ claiming ? '领取中...' : `领取第${status.loginDay}日奖励` }}
          </button>
          <div v-else-if="(status.loginDay || 1) > 7" class="login-done">🎉 7日奖励已全部领取完毕！</div>
          <div v-else class="login-hint">明日再来领取第{{ Math.min((status.loginDay || 1) + 1, 7) }}天奖励</div>
        </div>

        <!-- 成长里程碑 -->
        <div class="milestone-card">
          <div class="ms-header">🏆 成长里程碑</div>
          <div class="ms-list">
            <div v-for="m in status.milestones" :key="m.level" :class="['ms-item', { claimed: m.claimed, can_claim: canClaimMilestone(m) }]">
              <div class="ms-info">
                <div class="ms-name">Lv.{{ m.level }} 里程碑</div>
                <div class="ms-reward">
                  💰{{ m.reward?.money || 0 }}铜币
                  <template v-if="m.reward?.items?.length">+ {{ m.reward.items.map(i => itemName(i.id) + '×' + i.qty).join('、') }}</template>
                </div>
              </div>
              <button v-if="canClaimMilestone(m)" @click="claimMilestone(m.level)" class="ms-btn" :disabled="claiming">领取</button>
              <span v-else-if="m.claimed" class="ms-check">✅</span>
              <span v-else class="ms-lock">升到Lv.{{ m.level }}领取</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 在线奖励 Tab -->
      <div v-else-if="activeTab === 'online'">
        <div class="online-time-card">
          <div class="ot-label">⏱️ 在线时长</div>
          <div class="ot-num">{{ fmtTime(online.totalMinutes) }}</div>
          <div class="ot-sub">已达 / {{ CYCLE_MINUTES }}分钟 循环</div>
          <div v-if="online.remainingSeconds > 0" class="ot-remain">下一档奖励还需：{{ fmtTime(Math.ceil(online.remainingSeconds / 60)) }}</div>
          <div v-else class="ot-ready">✅ 已可领取60分钟奖励！</div>
        </div>

        <!-- 档位进度 -->
        <div class="tiers-card">
          <div class="tiers-header">🎁 在线奖励档位</div>
          <div class="tier-list">
            <div v-for="(tier, idx) in ONLINE_TIERS" :key="idx" :class="['tier-item', { reached: online.totalMinutes >= tier.minutes, current: idx === online.currentTier, claimable: online.canClaim && idx === online.currentTier }]">
              <div class="ti-time">{{ tier.minutes }}分钟</div>
              <div class="ti-icon">
                <template v-if="online.totalMinutes >= tier.minutes">✅</template>
                <template v-else>🔒</template>
              </div>
              <div class="ti-reward">
                <template v-if="tier.reward_type === 'money'">💰{{ tier.reward_value }}铜币</template>
                <template v-else-if="tier.reward_type === 'item'">🎁物品×{{ tier.quantity }}</template>
                <template v-else>💰+{{ tier.reward_value }}铜币+物品×2</template>
              </div>
            </div>
          </div>
        </div>

        <!-- 累计领取 -->
        <div class="claimed-card">
          <div class="cl-label">今日累计领取</div>
          <div class="cl-num">{{ online.totalClaimed }} 次</div>
        </div>

        <!-- 领取按钮 -->
        <div class="claim-card">
          <button v-if="online.canClaim" @click="claimOnline" class="online-claim-btn" :disabled="claiming">
            {{ claiming ? '领取中...' : '🎁 领取当前档位奖励' }}
          </button>
          <div v-else class="online-hint">继续在线达到60分钟即可领取</div>
        </div>
      </div>

      <!-- 每日活跃 Tab -->
      <div v-else-if="activeTab === 'daily'">
        <DailyEmbed />
      </div>

      <!-- 钓鱼 Tab -->
      <div v-else-if="activeTab === 'fishing'">
        <FishingEmbed />
      </div>

    </div>

    <button @click="$router.back()" class="back-btn">返回</button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { Api } from '../composables/useApi';
import { globalAlert } from '../composables/useConfirm';
import DailyEmbed from './DailyView.vue';
import FishingEmbed from './FishingView.vue';

const loading = ref(true);
const claiming = ref(false);
const activeTab = ref('welfare');
const status = ref({});
const claimedDays = ref([]);
const online = ref({});

const tabs = [
  { key: 'welfare', label: '🎁 福利' },
  { key: 'online', label: '⏱️ 在线' },
  { key: 'daily', label: '📅 活跃' },
  { key: 'fishing', label: '🎣 钓鱼' }
];

const CYCLE_MINUTES = 60;
const ONLINE_TIERS = [
  { minutes: 10, reward_type: 'money', reward_value: 100, quantity: 0 },
  { minutes: 30, reward_type: 'item', reward_value: 0, quantity: 1 },
  { minutes: 60, reward_type: 'mixed', reward_value: 200, quantity: 2 }
];

const ITEM_NAMES = { 3001: '千银矿石', 96: '体力宝', 94: '龙泉水', 2001: '月华密令', 2002: '龙门镖旗' };

function itemName(id) { return ITEM_NAMES[id] || `物品${id}`; }
function loginMoney(d) { return [100, 200, 300, 400, 500, 600, 888][d - 1] || 0; }

function fmtTime(mins) {
  const h = Math.floor(mins / 60), m = mins % 60;
  return h > 0 ? `${h}小时${m}分` : `${m}分钟`;
}

function canClaimMilestone(m) { return !m.claimed && (status.value.level || 0) >= m.level; }

async function load() {
  try { const d = await Api.get('/welfare/status'); status.value = d; claimedDays.value = d.claimedDays || []; } catch (e) {} finally { loading.value = false; }
}

async function loadOnline() {
  try { const d = await Api.get('/welfare/online'); online.value = d; } catch (e) {}
}

async function claimStarter() {
  claiming.value = true;
  try { const d = await Api.post('/welfare/claim-starter'); globalAlert(d.msg); await load(); } catch (e) { globalAlert(e.message); }
  finally { claiming.value = false; }
}

async function claimLogin() {
  claiming.value = true;
  try { const d = await Api.post('/welfare/claim-login'); globalAlert(d.msg); await load(); } catch (e) { globalAlert(e.message); }
  finally { claiming.value = false; }
}

async function claimMilestone(level) {
  claiming.value = true;
  try { const d = await Api.post(`/welfare/claim-milestone/${level}`); globalAlert(d.msg); await load(); } catch (e) { globalAlert(e.message); }
  finally { claiming.value = false; }
}

async function claimOnline() {
  claiming.value = true;
  try { const d = await Api.post('/welfare/claim-online'); globalAlert(d.msg); await loadOnline(); } catch (e) { globalAlert(e.message); }
  finally { claiming.value = false; }
}

let refreshTimer = null;
onMounted(() => { load(); if (activeTab.value === 'online') loadOnline(); refreshTimer = setInterval(() => { if (activeTab.value === 'online') loadOnline(); }, 30000); });
onUnmounted(() => { if (refreshTimer) clearInterval(refreshTimer); });
</script>

<style scoped>
.welfare-page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 10px;
  min-height: 100%;
  overflow-y: auto;
}
.welfare-bg {
  position: fixed; inset: 0; z-index: 0;
  background: linear-gradient(160deg, #0d1117 0%, #1a1000 50%, #0d1117 100%);
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
.tab-bar {
  position: relative; z-index: 2;
  display: flex; gap: 6px;
}
.tab-btn {
  flex: 1; text-align: center; padding: 8px 6px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; font-size: 12px; color: #7f8c8d;
  cursor: pointer; transition: all 0.2s;
}
.tab-btn.active { background: rgba(201,168,76,0.15); border-color: rgba(201,168,76,0.3); color: #c9a758; }
.loading-card { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px; }
.loading-spinner { width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #c9a758; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 13px; color: #7f8c8d; }
.card-area { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 10px; }
.gift-card {
  background: rgba(201,168,76,0.05); border: 1px solid rgba(201,168,76,0.25);
  border-radius: 14px; padding: 14px 16px;
}
.gift-header { font-size: 14px; font-weight: 700; color: #f0f0f0; margin-bottom: 8px; }
.gift-items { font-size: 12px; color: #7f8c8d; margin-bottom: 10px; }
.gift-btn {
  width: 100%; background: linear-gradient(135deg, #c9a84c, #8b6914); border: none;
  border-radius: 8px; color: #fff; font-weight: 700; font-size: 14px; padding: 10px; cursor: pointer; transition: all 0.2s;
}
.gift-btn:hover:not(:disabled) { transform: scale(1.02); }
.gift-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.gift-claimed { text-align: center; color: #27ae60; font-size: 14px; padding: 8px; }
.login-card {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; padding: 14px 16px;
}
.login-header { font-size: 14px; font-weight: 700; color: #f0f0f0; margin-bottom: 12px; }
.sign-week { display: flex; gap: 6px; margin-bottom: 10px; }
.sign-day {
  flex: 1; text-align: center; padding: 8px 4px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;
}
.sign-day.today { border-color: rgba(201,168,76,0.4); background: rgba(201,168,76,0.08); }
.sign-day.signed { border-color: rgba(39,174,96,0.3); background: rgba(39,174,96,0.06); }
.sign-day.future { opacity: 0.5; }
.sd-label { font-size: 9px; color: #555; margin-bottom: 3px; }
.sd-reward { font-size: 11px; color: #ddd; margin-bottom: 2px; }
.sd-status { font-size: 9px; color: #7f8c8d; }
.login-claim-btn {
  width: 100%; background: linear-gradient(135deg, #c9a84c, #8b6914); border: none;
  border-radius: 8px; color: #fff; font-weight: 700; font-size: 13px; padding: 10px; cursor: pointer; transition: all 0.2s;
}
.login-claim-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.login-done { text-align: center; color: #27ae60; font-size: 13px; padding: 8px; }
.login-hint { text-align: center; color: #555; font-size: 12px; padding: 8px; }
.milestone-card {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; padding: 14px 16px;
}
.ms-header { font-size: 14px; font-weight: 700; color: #f0f0f0; margin-bottom: 10px; }
.ms-list { display: flex; flex-direction: column; gap: 8px; }
.ms-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px; border-radius: 10px; background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
}
.ms-item.can_claim { border-color: rgba(201,168,76,0.3); background: rgba(201,168,76,0.05); }
.ms-item.claimed { opacity: 0.6; }
.ms-info { flex: 1; }
.ms-name { font-size: 13px; color: #ddd; font-weight: 600; margin-bottom: 3px; }
.ms-reward { font-size: 11px; color: #7f8c8d; }
.ms-btn {
  background: linear-gradient(135deg, #c9a84c, #8b6914); border: none;
  border-radius: 6px; color: #fff; font-size: 12px; font-weight: 600; padding: 6px 14px; cursor: pointer;
}
.ms-check { font-size: 16px; }
.ms-lock { font-size: 11px; color: #555; }
.online-time-card {
  background: rgba(79,195,247,0.05); border: 1px solid rgba(79,195,247,0.2);
  border-radius: 14px; padding: 16px; text-align: center;
}
.ot-label { font-size: 12px; color: #7f8c8d; margin-bottom: 6px; }
.ot-num { font-size: 36px; font-weight: 700; color: #4fc3f7; }
.ot-sub { font-size: 11px; color: #555; margin-top: 4px; }
.ot-remain { font-size: 13px; color: #e2b70a; margin-top: 6px; }
.ot-ready { font-size: 13px; color: #4caf50; margin-top: 6px; }
.tiers-card {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; padding: 14px 16px;
}
.tiers-header { font-size: 14px; font-weight: 700; color: #f0f0f0; margin-bottom: 10px; }
.tier-list { display: flex; flex-direction: column; gap: 6px; }
.tier-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; background: rgba(255,255,255,0.03); border-radius: 8px;
}
.tier-item.current { border: 1px solid rgba(79,195,247,0.3); background: rgba(79,195,247,0.05); }
.tier-item.claimable { border: 1px solid rgba(226,183,10,0.4); background: rgba(226,183,10,0.08); }
.ti-time { font-size: 12px; color: #7f8c8d; width: 50px; }
.ti-icon { font-size: 16px; width: 28px; text-align: center; }
.ti-reward { flex: 1; font-size: 12px; color: #ddd; }
.claimed-card {
  text-align: center; padding: 14px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;
}
.cl-label { font-size: 11px; color: #555; }
.cl-num { font-size: 22px; font-weight: 700; color: #e2b70a; margin-top: 4px; }
.claim-card {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 8px;
}
.online-claim-btn {
  width: 100%; background: linear-gradient(135deg, #4fc3f7, #0288d1); border: none;
  border-radius: 8px; color: #fff; font-weight: 700; font-size: 14px; padding: 12px; cursor: pointer; transition: all 0.2s;
}
.online-claim-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.online-hint { text-align: center; color: #555; font-size: 12px; padding: 10px; }
.back-btn {
  position: relative; z-index: 2;
  display: block; text-align: center;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; color: #7f8c8d; font-size: 14px; padding: 10px;
  text-decoration: none; transition: all 0.2s;
}
.back-btn:hover { background: rgba(255,255,255,0.1); color: #f0f0f0; }
</style>
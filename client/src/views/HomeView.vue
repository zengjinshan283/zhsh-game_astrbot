<template>
  <div class="home-page" v-if="userStore.isLoggedIn">
    <!-- 顶部 HUD -->
    <div class="top-hud">
      <div class="hud-user">
        <div class="hud-avatar">⚓</div>
        <div class="hud-info">
          <div class="hud-name">{{ userStore.user?.username }}</div>
          <div class="hud-lv">Lv.{{ userStore.user?.level }} · {{ userStore.user?.title || '冒险者' }}</div>
        </div>
      </div>
      <div class="hud-stats">
        <div class="hs-item">
          <div class="hs-icon">❤️</div>
          <div class="hs-bar-wrap">
            <div class="hs-bar hs-hp" :style="{width: hpPct+'%'}"></div>
          </div>
          <div class="hs-val">{{ userStore.user?.hp }}/{{ userStore.user?.hp_max }}</div>
        </div>
        <div class="hs-item">
          <div class="hs-icon">⭐</div>
          <div class="hs-bar-wrap">
            <div class="hs-bar hs-exp" :style="{width: expPct+'%'}"></div>
          </div>
          <div class="hs-val">{{ userStore.user?.exp }}/{{ userStore.user?.exp_max }}</div>
        </div>
        <div class="hs-money">
          <span class="hs-icon">💰</span>
          <span class="hs-money-val">{{ formatMoney(userStore.user?.money) }}</span>
        </div>
      </div>
    </div>

    <!-- 动态背景 -->
    <div class="home-bg"></div>

    <!-- 在线奖励悬浮卡 -->
    <div class="online-reward-card" v-if="onlineReward" :class="{claimable: onlineReward.canClaim}">
      <div class="orc-header">
        <span class="orc-icon">⏱️</span>
        <span class="orc-title">在线奖励</span>
        <span class="orc-tier">{{ onlineReward.currentTier + 1 }}/{{ onlineReward.totalTiers }}</span>
      </div>
      <div class="orc-body" v-if="!onlineReward.loading">
        <div class="orc-time">
          在线 <span class="orc-mins">{{ onlineReward.totalMinutes }}</span> 分钟
          <span v-if="!onlineReward.canClaim" class="orc-remain">，还需 {{ Math.ceil(onlineReward.remainingSeconds / 60) }} 分钟</span>
          <span v-else class="orc-ready">—— 可领取！</span>
        </div>
        <div class="orc-reward-box">
          <template v-if="onlineReward.reward.reward_type === 'money'">💰 铜币 × {{ onlineReward.reward.reward_value }}</template>
          <template v-else-if="onlineReward.reward.reward_type === 'item'">📦 {{ onlineReward.reward.itemName }} × {{ onlineReward.reward.quantity }}</template>
          <template v-else>🎁 铜币×5000 + 龙泉水×2</template>
        </div>
        <button v-if="onlineReward.canClaim" @click="claimOnline" class="orc-claim-btn">🎁 立即领取</button>
        <div v-else class="orc-countdown">⏳ {{ Math.ceil(onlineReward.remainingSeconds / 60) }} 分钟后可领取</div>
      </div>
      <div v-else class="orc-loading">加载中...</div>
    </div>

    <!-- 快捷入口网格 -->
    <div class="quick-grid">
      <router-link to="/equipment" class="quick-btn">
        <div class="qb-icon">⚔️</div>
        <div class="qb-label">装备</div>
      </router-link>
      <router-link to="/inventory" class="quick-btn">
        <div class="qb-icon">🎒</div>
        <div class="qb-label">背包</div>
      </router-link>
      <router-link to="/quest" class="quick-btn">
        <div class="qb-icon">📋</div>
        <div class="qb-label">任务</div>
      </router-link>
      <router-link to="/welfare" class="quick-btn">
        <div class="qb-icon">🎁</div>
        <div class="qb-label">福利</div>
      </router-link>
      <router-link to="/daily" class="quick-btn">
        <div class="qb-icon">📅</div>
        <div class="qb-label">每日</div>
      </router-link>
    </div>

    <!-- 每日签到 -->
    <div class="sign-card">
      <div class="sign-header">
        <span>📅 每日签到</span>
        <span v-if="!signLoading && signStatus.signed" class="sign-done">✅ 今日已签到 · 连续 {{ signStatus.consecutive_days }} 天</span>
      </div>
      <div v-if="signLoading" class="sign-loading">加载中...</div>
      <div v-else class="sign-week">
        <div
          v-for="r in rewards"
          :key="r.day"
          class="sign-day"
          :class="{
            'signed': signedDays.has(r.day),
            'today': r.day === todayRewardDay && !signStatus.signed,
            'claimed': r.day === todayRewardDay && signStatus.signed
          }"
        >
          <div class="sd-top">第{{ r.day }}天</div>
          <div class="sd-reward">
            <span v-if="r.reward_type==='money'">💰</span>
            <span v-else-if="r.reward_type==='exp'">⭐</span>
            <span v-else>📦</span>
          </div>
          <div class="sd-status">
            <template v-if="signedDays.has(r.day)">✅</template>
            <template v-else-if="r.day === todayRewardDay">●</template>
            <template v-else>○</template>
          </div>
        </div>
      </div>
      <button v-if="!signStatus.signed" @click="doSign" class="sign-btn">🎯 立即签到（第{{ todayRewardDay }}天奖励）</button>
    </div>

    <!-- 主按钮 -->
    <div class="home-actions">
      <router-link to="/map" class="btn-primary-action">🗺️ 进入游戏</router-link>
      <a href="javascript:void(0)" @click.prevent="logout" class="btn-secondary-action">🚪 退出登录</a>
    </div>
  </div>

  <div class="home-page" v-else>
    <div class="home-bg"></div>
    <div class="guest-hero">
      <div class="guest-logo">⚓</div>
      <h1 class="guest-title">纵横四海</h1>
      <p class="guest-subtitle">大航海时代的冒险</p>
      <p class="guest-version">v2.0.0</p>
    </div>
    <div class="guest-desc-card">
      <div class="gdc-title">📜 游戏简介</div>
      <p class="gdc-text">
        1453年，奥斯曼帝国攻陷君士坦丁堡，东西方贸易路线被切断。<br><br>
        面对危机，欧洲的航海家们纷纷扬帆远航，寻找通往东方的新航线……<br><br>
        在这个大航海时代，你将作为一名年轻的冒险者，从威尼斯出发，横跨地中海，穿越非洲，探索东亚，驶向印度洋，最终到达神秘的新大陆……
      </p>
    </div>
    <div class="home-actions">
      <router-link to="/register" class="btn-primary-action">🚀 创建角色</router-link>
      <router-link to="/login" class="btn-secondary-action">🔑 登录游戏</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';
import { Api } from '../composables/useApi';
import { globalAlert } from '../composables/useConfirm';

const userStore = useUserStore();
const router = useRouter();

const hpPct = computed(() => {
  const u = userStore.user;
  return u?.hp_max > 0 ? Math.round(u.hp / u.hp_max * 100) : 0;
});
const expPct = computed(() => {
  const u = userStore.user;
  return u?.exp_max > 0 ? Math.round(u.exp / u.exp_max * 100) : 0;
});
function formatMoney(n) {
  if (!n) return '0';
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿';
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  return n.toLocaleString();
}

const signLoading = ref(true);
const signStatus = ref({ signed: false, consecutive_days: 0 });
const rewards = ref([]);
const signedDays = ref(new Set());

const onlineReward = ref(null);
const ONLINE_TOTAL_TIERS = 12;
const ITEM_NAMES = { 94: '龙泉水', 96: '体力宝', 97: '大体力宝' };

async function loadOnlineReward() {
  try {
    const data = await Api.get('/welfare/online-status');
    if (data.reward) {
      if (data.reward.reward_type === 'item' || data.reward.reward_type === 'both') {
        data.reward.itemName = ITEM_NAMES[data.reward.reward_value] || '物品';
      }
    }
    data.totalTiers = ONLINE_TOTAL_TIERS;
    onlineReward.value = data;
  } catch (e) { onlineReward.value = { loading: false }; }
}

async function claimOnline() {
  try {
    const res = await Api.post('/welfare/claim-online', {});
    await globalAlert(res.msg || '领取成功！');
    onlineReward.value = null;
    await loadOnlineReward();
  } catch (e) { await globalAlert(e.message); }
}

const todayRewardDay = computed(() => {
  if (signStatus.value.signed) return signStatus.value.reward_day;
  return (signStatus.value.consecutive_days % 7) || 7;
});

onMounted(async () => {
  if (!userStore.isLoggedIn) return;
  try {
    const [statusData, rewardsData] = await Promise.all([
      Api.get('/sign/status'),
      Api.get('/sign/rewards'),
    ]);
    signStatus.value = statusData;
    rewards.value = rewardsData.rewards || [];
    if (statusData.signed) signedDays.value.add(statusData.reward_day);
    await loadOnlineReward();
  } catch (e) { console.error('签到加载失败', e); }
  finally { signLoading.value = false; }
});

async function doSign() {
  try {
    const res = await Api.post('/sign/in', {});
    await globalAlert(res.msg || '签到成功！');
    signStatus.value.signed = true;
    signStatus.value.consecutive_days = res.consecutive_days;
    signedDays.value.add(res.reward_day);
  } catch (e) { await globalAlert(e.message); }
}

function logout() { userStore.logout(); router.push('/'); }
</script>

<style scoped>
.home-page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 10px;
  min-height: 100%;
  overflow-y: auto;
}

/* 背景 */
.home-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  background: linear-gradient(160deg, #0d1117 0%, #0a1628 50%, #0d1117 100%);
  pointer-events: none;
}

/* ===== 顶部 HUD ===== */
.top-hud {
  position: relative;
  z-index: 2;
  background: rgba(13,17,23,0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 12px;
  display: flex;
  gap: 12px;
  align-items: center;
}
.hud-user { display: flex; align-items: center; gap: 8px; }
.hud-avatar {
  width: 40px; height: 40px;
  background: linear-gradient(135deg, #1a3a2a, #0d2a1a);
  border: 2px solid rgba(39,174,96,0.3);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px;
}
.hud-info { display: flex; flex-direction: column; gap: 2px; }
.hud-name { font-size: 14px; font-weight: 700; color: #f0f0f0; }
.hud-lv { font-size: 10px; color: #7f8c8d; }
.hud-stats { flex: 1; display: flex; flex-direction: column; gap: 5px; }
.hs-item { display: flex; align-items: center; gap: 5px; }
.hs-icon { font-size: 12px; width: 16px; text-align: center; }
.hs-bar-wrap {
  flex: 1; height: 4px;
  background: rgba(255,255,255,0.08);
  border-radius: 2px; overflow: hidden;
}
.hs-bar { height: 100%; border-radius: 2px; transition: width 0.4s ease; }
.hs-hp { background: linear-gradient(90deg, #c0392b, #e74c3c); }
.hs-exp { background: linear-gradient(90deg, #1a7a3a, #27ae60); }
.hs-val { font-size: 9px; color: #95a5a6; width: 50px; text-align: right; white-space: nowrap; }
.hs-money { display: flex; align-items: center; gap: 4px; margin-left: 4px; }
.hs-money-val { font-size: 12px; font-weight: 700; color: #f1c40f; }

/* ===== 在线奖励悬浮卡 ===== */
.online-reward-card {
  position: relative;
  z-index: 2;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 10px 12px;
  transition: all 0.3s;
}
.online-reward-card.claimable {
  background: rgba(39,174,96,0.08);
  border-color: rgba(39,174,96,0.3);
}
.orc-header { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.orc-icon { font-size: 14px; }
.orc-title { flex: 1; font-size: 12px; font-weight: 600; color: #bdc3c7; }
.orc-tier { font-size: 10px; color: #7f8c8d; background: rgba(255,255,255,0.06); padding: 1px 6px; border-radius: 10px; }
.orc-body {}
.orc-time { font-size: 11px; color: #95a5a6; margin-bottom: 4px; }
.orc-mins { color: #f1c40f; font-weight: 600; }
.orc-remain { color: #7f8c8d; }
.orc-ready { color: #2ecc71; font-weight: 600; }
.orc-reward-box {
  background: rgba(0,0,0,0.2);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 6px;
  padding: 5px 8px;
  font-size: 11px; color: #bdc3c7; margin-bottom: 6px;
}
.orc-claim-btn {
  width: 100%;
  background: linear-gradient(135deg, #27ae60, #2ecc71);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 7px;
  font-size: 12px; font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}
.orc-claim-btn:hover { opacity: 0.9; }
.orc-countdown { text-align: center; font-size: 10px; color: #7f8c8d; }
.orc-loading { text-align: center; font-size: 11px; color: #555; padding: 8px 0; }

/* ===== 快捷入口 ===== */
.quick-grid {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.quick-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 14px 6px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.2s ease;
}
.quick-btn:hover {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.15);
  transform: translateY(-1px);
}
.quick-btn:active { transform: scale(0.97); }
.qb-icon { font-size: 24px; }
.qb-label { font-size: 11px; color: #bdc3c7; font-weight: 500; }

/* ===== 每日签到 ===== */
.sign-card {
  position: relative;
  z-index: 2;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 12px;
}
.sign-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 12px; font-weight: 600; color: #bdc3c7; }
.sign-done { font-size: 10px; color: #27ae60; font-weight: 500; }
.sign-loading { text-align: center; font-size: 11px; color: #555; padding: 8px 0; }
.sign-week { display: flex; gap: 5px; margin-bottom: 8px; }
.sign-day {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 7px 2px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  transition: all 0.2s;
}
.sign-day.signed { background: rgba(39,174,96,0.12); border-color: rgba(39,174,96,0.3); }
.sign-day.today { background: rgba(241,196,15,0.1); border-color: rgba(241,196,15,0.4); }
.sign-day.claimed { background: rgba(39,174,96,0.12); border-color: rgba(39,174,96,0.3); }
.sd-top { font-size: 9px; color: #7f8c8d; }
.sd-reward { font-size: 14px; }
.sd-status { font-size: 10px; color: #7f8c8d; }
.sign-btn {
  width: 100%;
  background: linear-gradient(135deg, #1a4a2a, #27ae60);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px;
  font-size: 12px; font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}
.sign-btn:hover { opacity: 0.9; }

/* ===== 操作按钮 ===== */
.home-actions {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.btn-primary-action {
  display: block;
  text-align: center;
  background: linear-gradient(135deg, #1a4a2a, #27ae60);
  color: #fff;
  padding: 12px;
  border-radius: 10px;
  font-size: 14px; font-weight: 700;
  text-decoration: none;
  transition: opacity 0.2s;
}
.btn-primary-action:hover { opacity: 0.9; }
.btn-secondary-action {
  display: block;
  text-align: center;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  color: #95a5a6;
  padding: 10px;
  border-radius: 10px;
  font-size: 12px;
  text-decoration: none;
  transition: all 0.2s;
}
.btn-secondary-action:hover { background: rgba(255,255,255,0.08); color: #bdc3c7; }

/* ===== 未登录页 ===== */
.guest-hero {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 40px 20px 16px;
}
.guest-logo { font-size: 56px; margin-bottom: 8px; }
.guest-title { font-size: 28px; font-weight: 800; color: #f0f0f0; margin-bottom: 6px; }
.guest-subtitle { font-size: 13px; color: #7f8c8d; margin-bottom: 4px; }
.guest-version { font-size: 10px; color: #555; }
.guest-desc-card {
  position: relative;
  z-index: 2;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 14px;
  margin: 0 10px;
}
.gdc-title { font-size: 12px; font-weight: 600; color: #bdc3c7; margin-bottom: 8px; }
.gdc-text { font-size: 12px; line-height: 1.8; color: #95a5a6; }
</style>
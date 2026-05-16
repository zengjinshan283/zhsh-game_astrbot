<template>
  <div class="page" v-if="userStore.isLoggedIn">
    <div class="game-title" style="padding:24px 20px 12px;">
      <h1 style="font-size:28px;">⚓ 纵横四海</h1>
      <div class="divider"></div>
      <p class="subtitle">大航海时代的冒险</p>
      <p class="version">v2.0.0</p>
    </div>
    <StatusBar :user="userStore.user" />

    <!-- 在线奖励 -->
    <div class="card" style="margin-top:12px;" v-if="onlineReward">
      <div class="card-title">⏱️ 在线奖励</div>
      <div v-if="onlineReward.loading" style="text-align:center;color:#888;padding:8px;">加载中...</div>
      <div v-else style="font-size:13px;line-height:1.8;">
        <div style="color:#cfc19e;">
          在线 <span style="color:#ffd700;">{{ onlineReward.totalMinutes }}</span> 分钟
          <span v-if="!onlineReward.canClaim" style="color:#888;">
           ，还需 <span style="color:#ff6b6b;">{{ Math.ceil(onlineReward.remainingSeconds / 60) }}</span> 分钟可领取
          </span>
          <span v-else style="color:#4fc3f7;">—— 可领取！</span>
        </div>
        <div style="margin-top:4px;font-size:12px;color:#888;">
          当前档位: {{ onlineReward.currentTier + 1 }}/{{ onlineReward.totalTiers }} &nbsp;|&nbsp;
          累计领取: {{ onlineReward.totalClaimed }} 次
        </div>
        <div style="margin-top:6px;padding:6px 10px;background:#1a1a2e;border-radius:6px;font-size:12px;color:#cfc19e;">
          本档奖励:
          <span v-if="onlineReward.reward.reward_type === 'money'">💰 铜币 × {{ onlineReward.reward.reward_value }}</span>
          <span v-else-if="onlineReward.reward.reward_type === 'item'">📦 {{ onlineReward.reward.itemName || '物品' }} × {{ onlineReward.reward.quantity }}</span>
          <span v-else>🎁 铜币×5000 + 龙泉水×2</span>
        </div>
        <button
          v-if="onlineReward.canClaim"
          @click="claimOnline"
          class="btn btn-primary btn-block"
          style="margin-top:8px;"
        >🎁 立即领取</button>
        <button
          v-else
          disabled
          class="btn btn-secondary btn-block"
          style="margin-top:8px;opacity:0.5;"
        >⏳ {{ Math.ceil(onlineReward.remainingSeconds / 60) }}分钟后可领取</button>
      </div>
    </div>

    <!-- 每日签到 -->
    <div class="card" style="margin-top:12px;">
      <div class="card-title">📅 每日签到</div>
      <div v-if="signLoading" style="text-align:center;color:#888;padding:8px;">加载中...</div>
      <div v-else>
        <div class="sign-week" style="display:flex;gap:6px;justify-content:space-between;margin:10px 0;">
          <div
            v-for="r in rewards"
            :key="r.day"
            :class="['sign-day', {
              'signed': signedDays.has(r.day),
              'today': r.day === todayRewardDay,
              'claimed': r.day === todayRewardDay && signStatus.signed
            }]"
            style="flex:1;text-align:center;padding:6px 2px;border-radius:6px;background:#1a1a2e;border:1px solid #333;font-size:11px;"
          >
            <div style="color:#888;font-size:10px;">第{{ r.day }}天</div>
            <div style="font-size:12px;margin:3px 0;">
              <span v-if="r.reward_type==='money'">💰{{ r.reward_value }}</span>
              <span v-else-if="r.reward_type==='exp'">⭐{{ r.reward_value }}</span>
              <span v-else>📦</span>
            </div>
          </div>
        </div>
        <button
          v-if="!signStatus.signed"
          @click="doSign"
          class="btn btn-primary btn-block"
          style="margin-top:8px;"
        >🎯 立即签到（第{{ todayRewardDay }}天奖励）</button>
        <div v-else style="text-align:center;color:#4fc3f7;padding:8px 0;">
          ✅ 今日已签到！连续 {{ signStatus.consecutive_days }} 天
        </div>
      </div>
    </div>

    <router-link to="/map" class="btn btn-primary btn-block">🗺️ 进入游戏</router-link>
    <a href="#" @click.prevent="logout" class="btn btn-secondary btn-block mt-10">🚪 退出登录</a>
  </div>
  <div class="page" v-else>
    <div class="game-title" style="padding:40px 20px 16px;">
      <h1>⚓ 纵横四海</h1>
      <div class="divider"></div>
      <p class="subtitle">大航海时代的文字冒险</p>
      <p class="version">v2.0.0</p>
    </div>
    <div class="card">
      <div class="card-title">📜 游戏简介</div>
      <p style="font-size:13px;line-height:1.7;color:#cfc19e;">
        1453年，奥斯曼帝国攻陷君士坦丁堡，东西方贸易路线被切断。<br><br>
        面对危机，欧洲的航海家们纷纷扬帆远航，寻找通往东方的新航线……<br><br>
        在这个大航海时代，你将作为一名年轻的冒险者，从威尼斯出发，横跨地中海，穿越非洲，探索东亚，驶向印度洋，最终到达神秘的新大陆……
      </p>
    </div>
    <router-link to="/register" class="btn btn-primary btn-block">🚀 创建角色</router-link>
    <router-link to="/login" class="btn btn-secondary btn-block mt-10">🔑 登录游戏</router-link>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';
import { Api } from '../composables/useApi';
import StatusBar from '../components/StatusBar.vue';

const userStore = useUserStore();
const router = useRouter();
const signLoading = ref(true);
const signStatus = ref({ signed: false, consecutive_days: 0 });
const rewards = ref([]);
const signedDays = ref(new Set());

// 在线奖励
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
  } catch (e) {
    console.error('在线奖励加载失败', e);
  }
}

async function claimOnline() {
  try {
    const res = await Api.post('/welfare/claim-online', {});
    alert(res.msg || '领取成功！');
    onlineReward.value = null;
    await loadOnlineReward();
  } catch (e) {
    alert(e.message);
  }
}

const todayRewardDay = computed(() => {
  if (signStatus.value.signed) {
    return signStatus.value.reward_day;
  }
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
    if (statusData.signed) {
      signedDays.value.add(statusData.reward_day);
    }
    await loadOnlineReward();
  } catch (e) {
    console.error('签到加载失败', e);
  } finally {
    signLoading.value = false;
  }
});

async function doSign() {
  try {
    const res = await Api.post('/sign/in', {});
    alert(res.msg || '签到成功！');
    signStatus.value.signed = true;
    signStatus.value.consecutive_days = res.consecutive_days;
    signedDays.value.add(res.reward_day);
  } catch (e) {
    alert(e.message);
  }
}

function logout() { userStore.logout(); router.push('/'); }
</script>

<template>
  <div class="page">
    <div class="location-bar">
      <div class="location-name">🎁 福利中心</div>
    </div>

    <!-- Tab 切换 -->
    <div class="welfare-tabs">
      <div
        v-for="tab in tabs"
        :key="tab.key"
        :class="['tab-btn', { active: activeTab === tab.key }]"
        @click="activeTab = tab.key"
      >{{ tab.label }}</div>
    </div>

    <div v-if="loading" class="card" style="text-align:center;color:#888;padding:20px;">加载中...</div>
    <div v-else-if="activeTab === 'welfare'">

      <!-- 注册礼包 -->
      <div class="card" style="border-color:#c9a84c;margin-bottom:12px;">
        <div class="card-title">🎁 注册礼包</div>
        <div style="font-size:13px;color:#ddd;margin-bottom:12px;">
          5000铜币 + 铁剑×1 + 小HP药×3 + 港口地图×1
        </div>
        <button
          v-if="!status.starter_claimed"
          @click="claimStarter"
          class="btn btn-primary btn-block"
          :disabled="claiming"
        >{{ claiming ? '领取中...' : '立即领取' }}</button>
        <div v-else style="text-align:center;color:#4fc3f7;padding:8px;">✅ 已领取</div>
      </div>

      <!-- 7日登录 -->
      <div class="card" style="margin-bottom:12px;">
        <div class="card-title">📅 7日登录礼包 · 第 {{ status.loginDay || 1 }} 天</div>
        <div class="sign-week" style="display:flex;gap:6px;justify-content:space-between;margin:12px 0;">
          <div
            v-for="d in 7"
            :key="d"
            :class="['sign-day', {
              'signed': claimedDays.includes(d),
              'today': d === (status.loginDay || 1),
              'claimable': d === (status.loginDay || 1) && !status.nextLoginClaimed,
              'future': d > (status.loginDay || 1)
            }]"
            style="flex:1;text-align:center;padding:8px 2px;border-radius:6px;background:#1a1a2e;border:1px solid #333;font-size:11px;"
          >
            <div style="color:#888;font-size:10px;">第{{ d }}天</div>
            <div style="font-size:12px;margin:3px 0;">
              💰{{ loginMoney(d) }}
            </div>
            <div style="font-size:10px;color:#666;">
              <template v-if="claimedDays.includes(d)">✅</template>
              <template v-else-if="d === (status.loginDay || 1) && !status.nextLoginClaimed">可领</template>
              <template v-else-if="d > (status.loginDay || 1)">🔒</template>
              <template v-else>-</template>
            </div>
          </div>
        </div>
        <button
          v-if="status.loginDay && !status.nextLoginClaimed"
          @click="claimLogin"
          class="btn btn-primary btn-block"
          :disabled="claiming"
        >{{ claiming ? '领取中...' : `领取第${status.loginDay}日奖励` }}</button>
        <div v-else-if="(status.loginDay || 1) > 7" style="text-align:center;color:#4fc3f7;padding:8px;">🎉 7日奖励已全部领取完毕！</div>
        <div v-else style="text-align:center;color:#888;padding:8px;">明日再来领取第{{ Math.min((status.loginDay || 1) + 1, 7) }}天奖励</div>
      </div>

      <!-- 成长里程碑 -->
      <div class="card">
        <div class="card-title">🏆 成长里程碑</div>
        <div style="margin-top:12px;">
          <div
            v-for="m in status.milestones"
            :key="m.level"
            :class="['milestone-item', { claimed: m.claimed, can_claim: canClaimMilestone(m) }]"
            style="padding:12px;border-radius:8px;background:#1a1a2e;border:1px solid #333;margin-bottom:8px;"
          >
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-size:14px;color:#ddd;">Lv.{{ m.level }} 里程碑</div>
                <div style="font-size:12px;color:#888;margin-top:4px;">
                  💰{{ m.reward?.money || 0 }}铜币
                  <template v-if="m.reward?.items?.length">+ {{ m.reward.items.map(i=>itemName(i.id)+'×'+i.qty).join('、') }}</template>
                </div>
              </div>
              <button
                v-if="canClaimMilestone(m)"
                @click="claimMilestone(m.level)"
                class="btn btn-primary"
                style="padding:6px 16px;"
                :disabled="claiming"
              >领取</button>
              <span v-else-if="m.claimed" style="color:#4fc3f7;font-size:13px;">✅</span>
              <span v-else style="color:#555;font-size:12px;">升到Lv.{{ m.level }}领取</span>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- 在线奖励 Tab -->
    <div v-else-if="activeTab === 'online'">
      <div class="card" style="margin-bottom:12px;text-align:center;">
        <div style="font-size:13px;color:#888;margin-bottom:8px;">⏱️ 在线时长</div>
        <div style="font-size:32px;font-weight:bold;color:#4fc3f7;">{{ fmtTime(online.totalMinutes) }}</div>
        <div style="font-size:12px;color:#555;margin-top:4px;">已达 / {{ CYCLE_MINUTES }}分钟 循环</div>
        <div v-if="online.remainingSeconds > 0" style="font-size:13px;color:#e2b70a;margin-top:6px;">
          下一档奖励还需：{{ fmtTime(Math.ceil(online.remainingSeconds / 60)) }}
        </div>
        <div v-else style="font-size:13px;color:#4caf50;margin-top:6px;">
          ✅ 已可领取60分钟奖励！
        </div>
      </div>

      <!-- 档位进度 -->
      <div class="card" style="margin-bottom:12px;">
        <div class="card-title">🎁 在线奖励档位</div>
        <div class="tier-list">
          <div
            v-for="(tier, idx) in ONLINE_TIERS"
            :key="idx"
            :class="['tier-item', {
              reached: online.totalMinutes >= tier.minutes,
              current: idx === online.currentTier,
              claimable: online.canClaim && idx === online.currentTier
            }]"
          >
            <div class="tier-time">{{ tier.minutes }}分钟</div>
            <div class="tier-icon">
              <template v-if="online.totalMinutes >= tier.minutes">✅</template>
              <template v-else>🔒</template>
            </div>
            <div class="tier-reward">
              <template v-if="tier.reward_type === 'money'">💰{{ tier.reward_value }}铜币</template>
              <template v-else-if="tier.reward_type === 'item'">🎁物品×{{ tier.quantity }}</template>
              <template v-else>💰+{{ tier.reward_value }}铜币+物品×2</template>
            </div>
          </div>
        </div>
      </div>

      <!-- 累计领取 -->
      <div class="card" style="margin-bottom:12px;text-align:center;">
        <div style="font-size:12px;color:#666;">今日累计领取</div>
        <div style="font-size:20px;color:#e2b70a;font-weight:bold;">{{ online.totalClaimed }} 次</div>
      </div>

      <!-- 领取按钮 -->
      <div class="card">
        <button
          v-if="online.canClaim"
          @click="claimOnline"
          class="btn btn-primary btn-block"
          :disabled="claiming"
        >{{ claiming ? '领取中...' : '🎁 领取当前档位奖励' }}</button>
        <div v-else style="text-align:center;color:#888;padding:8px;">
          继续在线达到60分钟即可领取
        </div>
      </div>
    </div>

    <button @click="$router.back()" class="btn btn-secondary btn-block mt-10">返回</button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { Api } from '../composables/useApi';
import { globalAlert } from '../composables/useConfirm';

const loading = ref(true);
const claiming = ref(false);
const status = ref({});
const activeTab = ref('welfare');

// 在线奖励数据
const online = ref({ canClaim: false, remainingSeconds: 0, currentTier: 0, totalMinutes: 0, totalClaimed: 0 });
const ONLINE_TIERS = [
  { minutes: 5,  reward_type: 'money', reward_value: 100,  quantity: 1 },
  { minutes: 10, reward_type: 'money', reward_value: 200,  quantity: 1 },
  { minutes: 15, reward_type: 'money', reward_value: 300,  quantity: 1 },
  { minutes: 20, reward_type: 'money', reward_value: 500,  quantity: 1 },
  { minutes: 25, reward_type: 'item',   reward_value: 96,   quantity: 1 },
  { minutes: 30, reward_type: 'money', reward_value: 800,  quantity: 1 },
  { minutes: 35, reward_type: 'money', reward_value: 1000, quantity: 1 },
  { minutes: 40, reward_type: 'money', reward_value: 1500, quantity: 1 },
  { minutes: 45, reward_type: 'item',   reward_value: 97,   quantity: 1 },
  { minutes: 50, reward_type: 'money', reward_value: 2000, quantity: 1 },
  { minutes: 55, reward_type: 'money', reward_value: 2500, quantity: 1 },
  { minutes: 60, reward_type: 'both',  reward_value: 94,   quantity: 2 },
];
const CYCLE_MINUTES = 60;
const tabs = [
  { key: 'welfare', label: '🎁 福利' },
  { key: 'online',  label: '⏱️ 在线奖励' },
];

let refreshTimer = null;
let onlineTimer = null;

// 7日登录每天铜币数（与后端 LOGIN_REWARDS 一致）
const LOGIN_MONEY = { 1: 500, 2: 800, 3: 1200, 4: 1500, 5: 2000, 6: 2500, 7: 5000 };
// 物品ID名字映射（用于显示里程碑奖励）
const ITEM_NAMES = {
  4: '长剑', 5: '钢剑', 6: '锋剑', 7: '精剑',
  8: '宝石剑', 96: '小HP药', 97: '大HP药',
  10: '地图', 12: '戒指', 13: '护符', 14: '项链',
  101: '鉴定卷', 102: '强化石', 200: '藏宝图'
};
function loginMoney(d) { return LOGIN_MONEY[d] || 0; }
function itemName(id) { return ITEM_NAMES[id] || `物品${id}`; }
function canClaimMilestone(m) { return !m.claimed && (status.value.user_level || 0) >= m.level; }
// 已领取的登录天数
const claimedDays = computed(() => {
  const day = status.value.loginDay || 1;
  const claimed = [];
  for (let d = 1; d < day; d++) claimed.push(d);
  if (status.value.nextLoginClaimed) claimed.push(day);
  return claimed;
});

function fmtTime(minutes) {
  if (typeof minutes !== 'number') return '0:00';
  const m = Math.floor(minutes);
  const s = Math.round((minutes - m) * 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

async function loadWelfare() {
  try {
    const d = await Api.get('/welfare/status');
    status.value = d;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

async function loadOnline() {
  try {
    const d = await Api.get('/welfare/online-status');
    online.value = d;
  } catch (e) {
    console.error(e);
  }
}

async function claimStarter() {
  claiming.value = true;
  try {
    const d = await Api.post('/welfare/claim-starter');
    await globalAlert(d.msg);
    await loadWelfare();
  } catch (e) {
    await globalAlert(e.message);
  } finally {
    claiming.value = false;
  }
}

async function claimLogin() {
  claiming.value = true;
  try {
    const d = await Api.post('/welfare/claim-login');
    await globalAlert(d.msg);
    await loadWelfare();
  } catch (e) {
    await globalAlert(e.message);
  } finally {
    claiming.value = false;
  }
}

async function claimMilestone(level) {
  claiming.value = true;
  try {
    const d = await Api.post('/welfare/claim-milestone', { level });
    await globalAlert(d.msg);
    await loadWelfare();
  } catch (e) {
    await globalAlert(e.message);
  } finally {
    claiming.value = false;
  }
}

async function claimOnline() {
  claiming.value = true;
  try {
    const d = await Api.post('/welfare/claim-online');
    await globalAlert(d.msg);
    await loadOnline();
  } catch (e) {
    await globalAlert(e.message);
  } finally {
    claiming.value = false;
  }
}

onMounted(() => {
  loadWelfare();
  loadOnline();
  // 在线状态每10秒刷新
  onlineTimer = setInterval(loadOnline, 10000);
});

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer);
  if (onlineTimer) clearInterval(onlineTimer);
});
</script>

<style scoped>
.welfare-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
}
.tab-btn {
  flex: 1;
  padding: 8px;
  text-align: center;
  background: #1a1a2e;
  border: 1px solid #333;
  border-radius: 6px;
  font-size: 13px;
  color: #888;
  cursor: pointer;
  transition: all 0.2s;
}
.tab-btn.active {
  border-color: #c9a84c;
  color: #c9a84c;
  background: #1f1a0e;
}
.milestone-item.can_claim {
  border-color: #c9a84c !important;
  background: #1f1a0e !important;
}
.milestone-item.claimed {
  opacity: 0.6;
}

.tier-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
}
.tier-item {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  background: #1a1a2e;
  border: 1px solid #333;
  border-radius: 6px;
  font-size: 12px;
  color: #666;
}
.tier-item.reached {
  color: #4caf50;
  border-color: #2e4a2e;
}
.tier-item.current {
  border-color: #e2b70a;
  background: #1f1a0e;
  color: #f7efdb;
}
.tier-item.claimable {
  border-color: #4caf50;
  background: #1a2e1a;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.75; }
}
.tier-time {
  font-weight: bold;
  min-width: 56px;
  font-size: 12px;
}
.tier-icon {
  font-size: 16px;
  margin: 0 8px;
}
.tier-reward {
  flex: 1;
  text-align: right;
  font-size: 11px;
  color: #888;
}
.tier-item.current .tier-reward,
.tier-item.claimable .tier-reward {
  color: #e2b70a;
}
</style>
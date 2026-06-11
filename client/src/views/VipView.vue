<template>
  <div class="vip-page">
    <div class="vip-bg"></div>

    <!-- 顶部 HUD -->
    <div class="top-hud">
      <div class="hud-left">
        <div class="hud-icon">👑</div>
        <div class="hud-title">VIP特权</div>
      </div>
      <div class="hud-coins">
        <span class="coin-silver">💰 {{ silver || 0 }} 银币</span>
        <span class="coin-div">|</span>
        <span class="coin-gold">🪙 {{ gold || 0 }} 金币</span>
      </div>
    </div>

    <!-- 错误/成功提示 -->
    <div class="msg-card" v-if="error" :class="{ error: true }">
      ❌ {{ error }}
    </div>
    <div class="msg-card" v-if="success" :class="{ success: true }">
      ✅ {{ success }}
    </div>

    <div v-if="loading" class="loading-card">
      <div class="loading-spinner"></div>
      <div class="loading-text">加载中...</div>
    </div>

    <div v-else class="card-area">

      <!-- 月卡卡片 -->
      <div class="monthly-card" :class="{ active: hasMonthlyCard }">
        <div class="mc-header">
          <div class="mc-title">🌙 月卡</div>
          <div class="mc-badge" :class="hasMonthlyCard ? 'active' : 'inactive'">
            {{ hasMonthlyCard ? '有效' : '未开通' }}
          </div>
        </div>

        <div v-if="hasMonthlyCard" class="mc-stats">
          <div class="mc-stat">
            <div class="mc-stat-label">剩余天数</div>
            <div class="mc-stat-value">{{ monthlyCardRemainDays }} 天</div>
          </div>
          <div class="mc-stat">
            <div class="mc-stat-label">到期时间</div>
            <div class="mc-stat-value">{{ fmtDate(monthlyCardExpire) }}</div>
          </div>
          <div class="mc-stat">
            <div class="mc-stat-label">每日奖励</div>
            <div class="mc-stat-value silver">+{{ monthlyCardConfig.dailySilver }}银币</div>
          </div>
        </div>

        <div v-else class="mc-desc">
          开通月卡，每日可领取100银币，还有体力恢复加速特权！
        </div>

        <!-- 操作按钮 -->
        <div v-if="!hasMonthlyCard">
          <button class="mc-buy-btn" :disabled="buying" @click="buyMonthlyCard">
            🛒 {{ buying ? '购买中...' : `立即开通月卡 ${monthlyCardConfig.price}金币` }}
          </button>
        </div>
        <div v-else>
          <button v-if="!dailyClaimed" class="mc-claim-btn" :disabled="claiming" @click="claimDaily">
            🎁 {{ claiming ? '领取中...' : '立即领取今日100银币' }}
          </button>
          <div v-else class="mc-claimed">✅ 今日奖励已领取，明日再来！</div>
        </div>
      </div>

      <!-- VIP等级介绍 -->
      <div class="vip-levels-card">
        <div class="vl-header">🏆 VIP等级特权</div>
        <div class="vl-sub">VIP等级越高，特权越多（VIP通过活动/管理员发放）</div>
        <div class="vip-levels">
          <div
            v-for="(cfg, lv) in vipLevels"
            :key="lv"
            class="vip-level-item"
            :class="{
              'vip-level-active': vipLevel >= lv,
              'vip-level-current': vipLevel === lv
            }"
            :style="vipLevel >= lv ? { borderColor: cfg.color } : {}"
          >
            <div class="vip-level-header">
              <span class="vip-level-name" :style="vipLevel >= lv ? { color: cfg.color } : {}">
                {{ cfg.name }}
              </span>
              <span v-if="vipLevel === lv" class="current-badge">当前</span>
            </div>
            <div class="vip-level-desc">{{ cfg.desc }}</div>
            <div class="vip-level-daily">
              <span class="daily-silver">每日+{{ cfg.dailySilver }}银币</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 我的VIP状态 -->
      <div v-if="hasVip" class="my-vip-card" :style="{ borderColor: currentVipColor }">
        <div class="my-vip-header">
          <div class="my-vip-icon">👑</div>
          <div class="my-vip-title">我的VIP</div>
          <div class="my-vip-name" :style="{ color: currentVipColor }">{{ currentVipName }}</div>
        </div>
        <div class="my-vip-stats">
          <div class="mvs-item">
            <span class="mvs-label">VIP等级</span>
            <span class="mvs-value" :style="{ color: currentVipColor }">{{ currentVipName }}</span>
          </div>
          <div class="mvs-item">
            <span class="mvs-label">累计充值</span>
            <span class="mvs-value">{{ chargeTotal }} 金币</span>
          </div>
          <div class="mvs-item">
            <span class="mvs-label">剩余天数</span>
            <span class="mvs-value">{{ vipRemainDays }} 天</span>
          </div>
          <div class="mvs-item">
            <span class="mvs-label">到期时间</span>
            <span class="mvs-value">{{ fmtDate(vipExpire) }}</span>
          </div>
        </div>
      </div>

      <!-- 充值档位 -->
      <div class="charge-card">
        <div class="cc-header">
          <span class="cc-title">💎 充值金币</span>
          <span class="cc-tip">累充解锁VIP</span>
        </div>
        <div class="charge-grid">
          <div v-for="t in chargeTiers" :key="t.rmb" class="charge-item" @click="doCharge(t)" :class="{ charging: chargingTier===t.rmb }">
            <div class="ci-rmb">¥ {{ t.rmb }}</div>
            <div class="ci-gold">{{ t.gold }}🪙</div>
            <div v-if="t.bonus > 0" class="ci-bonus">送 {{ t.bonus }}</div>
            <div class="ci-label">{{ t.label }}</div>
          </div>
        </div>
      </div>

      <!-- 累充奖励 -->
      <div class="charge-reward-card">
        <div class="cc-header">
          <span class="cc-title">🎁 累充福利</span>
          <span class="cc-tip">累计充值领取</span>
        </div>
        <div class="cr-list">
          <div v-for="r in chargeRewards" :key="r.tier" class="cr-item" :class="{ done: r.claimed, active: r.achieved && !r.claimed }">
            <div class="cr-need">{{ r.need }}🪙</div>
            <div class="cr-info">
              <div class="cr-label">{{ r.label }}</div>
              <div class="cr-rewards">
                <span v-if="r.rewards.silver">💰 {{ r.rewards.silver }}银币</span>
                <span v-if="r.rewards.item">📦 {{ r.rewards.item.name }}</span>
              </div>
            </div>
            <button class="cr-btn" :disabled="!r.achieved || r.claimed || claimingTier===r.tier" @click="claimChargeReward(r.tier)">
              {{ r.claimed ? '✓ 已领' : r.achieved ? (claimingTier===r.tier ? '领取中...' : '领取') : '未达' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 充值历史 -->
      <div class="history-card" v-if="history.length > 0">
        <div class="cc-header">
          <span class="cc-title">📜 充值记录</span>
          <span class="cc-tip">最近{{ history.length }}笔</span>
        </div>
        <div class="hc-list">
          <div v-for="h in history" :key="h.id" class="hc-item">
            <div>
              <div class="hc-amt">¥ {{ h.amount_rmb }}</div>
              <div class="hc-time">{{ fmtDateTime(h.created_at) }}</div>
            </div>
            <div class="hc-gold">+{{ h.gold }} 🪙</div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Api } from '../composables/useApi';

const loading = ref(true);
const buying = ref(false);
const claiming = ref(false);
const error = ref('');
const success = ref('');

const gold = ref(0);
const silver = ref(0);
const vipLevel = ref(0);
const vipExpire = ref(0);
const vipRemainDays = ref(0);
const hasVip = ref(false);
const monthlyCard = ref(0);
const monthlyCardExpire = ref(0);
const monthlyCardRemainDays = ref(0);
const hasMonthlyCard = ref(false);
const dailyClaimed = ref(false);
const vipLevels = ref({});
const monthlyCardConfig = ref({});
const chargeTotal = ref(0);
const chargeTiers = ref([]);
const chargeRewards = ref([]);
const history = ref([]);
const chargingTier = ref(0);
const claimingTier = ref(0);

function fmtDate(ts) {
  if (!ts || ts <= 0) return '—';
  return new Date(ts * 1000).toLocaleDateString('zh-CN');
}
function fmtDateTime(ts) {
  if (!ts || ts <= 0) return '—';
  const d = new Date(ts * 1000);
  return `${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

const currentVipColor = computed(() => vipLevels.value[vipLevel.value]?.color || '#888');
const currentVipName = computed(() => vipLevels.value[vipLevel.value]?.name || '无');

async function loadStatus() {
  try {
    const d = await Api.get('/vip/status');
    gold.value = d.gold || 0;
    silver.value = d.silver || 0;
    vipLevel.value = d.vipLevel || 0;
    vipExpire.value = d.vipExpire || 0;
    vipRemainDays.value = d.vipRemainDays || 0;
    hasVip.value = d.hasVip || false;
    monthlyCard.value = d.monthlyCard || 0;
    monthlyCardExpire.value = d.monthlyCardExpire || 0;
    monthlyCardRemainDays.value = d.monthlyCardRemainDays || 0;
    hasMonthlyCard.value = d.hasMonthlyCard || false;
    dailyClaimed.value = d.dailyClaimed || false;
    vipLevels.value = d.vipLevels || {};
    monthlyCardConfig.value = d.monthlyCardConfig || {};
    chargeTotal.value = d.chargeTotal || 0;
    chargeTiers.value = d.chargeTiers || [];
    chargeRewards.value = d.chargeRewards || [];
  } catch (e) { error.value = e.message || '加载失败'; }
  finally { loading.value = false; }
}

async function loadHistory() {
  try {
    const d = await Api.get('/vip/recharge-history');
    history.value = d.list || [];
  } catch (e) { /* ignore */ }
}

async function doCharge(t) {
  if (chargingTier.value) return;
  if (!confirm(`确认充值 ¥${t.rmb} 获得 ${t.gold + t.bonus} 金币？`)) return;
  chargingTier.value = t.rmb;
  error.value = ''; success.value = '';
  try {
    const d = await Api.post('/vip/charge', { tier: t.rmb });
    success.value = d.msg;
    await loadStatus();
    await loadHistory();
  } catch (e) { error.value = e.message || '充值失败'; }
  finally { chargingTier.value = 0; }
}

async function claimChargeReward(tier) {
  if (claimingTier.value) return;
  claimingTier.value = tier;
  error.value = ''; success.value = '';
  try {
    const d = await Api.post('/vip/claim-charge-reward', { tier });
    success.value = d.msg;
    await loadStatus();
} catch (e) { error.value = e.message || '领取失败'; }
  finally { claimingTier.value = 0; }
}

async function buyMonthlyCard() {
  if (buying.value) return;
  buying.value = true; error.value = ''; success.value = '';
  try {
    const d = await Api.post('/vip/buy-monthly');
    success.value = d.msg || '购买成功！';
    await loadStatus();
  } catch (e) { error.value = e.message || '购买失败'; }
  finally { buying.value = false; }
}

async function claimDaily() {
  if (claiming.value) return;
  claiming.value = true; error.value = ''; success.value = '';
  try {
    const d = await Api.post('/vip/claim-daily');
    success.value = d.msg || '领取成功！';
    silver.value = d.silver || silver.value;
    dailyClaimed.value = true;
  } catch (e) { error.value = e.message || '领取失败'; }
  finally { claiming.value = false; }
}

onMounted(() => { loadStatus(); loadHistory(); });
</script>

<style scoped>
.vip-page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 10px;
  min-height: 100%;
  overflow-y: auto;
}

.vip-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  background: linear-gradient(160deg, #0d1117 0%, #1a1000 50%, #0d1117 100%);
  pointer-events: none;
}

.top-hud {
  position: relative;
  z-index: 2;
  background: rgba(13, 17, 23, 0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.hud-left { display: flex; align-items: center; gap: 8px; }
.hud-icon { font-size: 20px; }
.hud-title { font-size: 16px; font-weight: 700; color: #f0f0f0; }
.hud-coins { display: flex; align-items: center; gap: 6px; font-size: 11px; }
.coin-silver { color: #c0c0c0; }
.coin-div { color: #555; }
.coin-gold { color: #e2b714; }

.msg-card {
  position: relative;
  z-index: 2;
  border-radius: 10px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}
.msg-card.error { background: rgba(184,90,58,0.1); border: 1px solid rgba(184,90,58,0.3); color: #e74c3c; }
.msg-card.success { background: rgba(39,174,96,0.1); border: 1px solid rgba(39,174,96,0.3); color: #27ae60; }

.loading-card {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px;
}
.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255,255,255,0.1);
  border-top-color: #c9a758;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 13px; color: #7f8c8d; }

.card-area {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 月卡卡片 */
.monthly-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 16px;
  transition: all 0.3s;
}
.monthly-card.active { border-color: rgba(201,168,76,0.4); }

.mc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.mc-title { font-size: 16px; font-weight: 700; color: #f0f0f0; }
.mc-badge { font-size: 11px; padding: 2px 10px; border-radius: 10px; }
.mc-badge.active { background: rgba(39,174,96,0.15); color: #27ae60; }
.mc-badge.inactive { background: rgba(255,255,255,0.06); color: #7f8c8d; }

.mc-stats { display: flex; flex-direction: column; gap: 0; margin-bottom: 14px; }
.mc-stat { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
.mc-stat:last-child { border-bottom: none; }
.mc-stat-label { font-size: 12px; color: #7f8c8d; }
.mc-stat-value { font-size: 14px; font-weight: 700; color: #f0f0f0; }
.mc-stat-value.silver { color: #c0c0c0; }

.mc-desc { font-size: 13px; color: #7f8c8d; margin-bottom: 14px; line-height: 1.5; }

.mc-buy-btn {
  width: 100%;
  background: linear-gradient(135deg, #c9a84c, #8b6914);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.mc-buy-btn:hover:not(:disabled) { transform: scale(1.02); box-shadow: 0 4px 16px rgba(201,168,76,0.4); }
.mc-buy-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.mc-claim-btn {
  width: 100%;
  background: linear-gradient(135deg, #c9a84c, #a08040);
  border: none;
  border-radius: 8px;
  color: #0a0a1a;
  font-size: 14px;
  font-weight: 700;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.mc-claim-btn:hover:not(:disabled) { transform: scale(1.02); box-shadow: 0 4px 16px rgba(201,168,76,0.4); }
.mc-claim-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.mc-claimed {
  text-align: center;
  padding: 12px;
  background: rgba(39,174,96,0.1);
  border: 1px solid rgba(39,174,96,0.2);
  border-radius: 8px;
  color: #27ae60;
  font-size: 13px;
  font-weight: 600;
}

/* VIP等级列表 */
.vip-levels-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 16px;
}
.vl-header { font-size: 15px; font-weight: 700; color: #f0f0f0; margin-bottom: 6px; }
.vl-sub { font-size: 12px; color: #555; margin-bottom: 14px; }

.vip-levels { display: flex; flex-direction: column; gap: 8px; }
.vip-level-item {
  background: rgba(26,26,46,0.8);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 12px 14px;
  transition: all 0.3s;
}
.vip-level-item.vip-level-active { background: rgba(31,31,53,0.9); }
.vip-level-item.vip-level-current { box-shadow: 0 0 16px rgba(201,168,76,0.2); }

.vip-level-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.vip-level-name { font-size: 15px; font-weight: 700; }
.vip-level-desc { font-size: 12px; color: #7f8c8d; margin-bottom: 6px; }
.vip-level-daily { font-size: 12px; }
.daily-silver { color: #c0c0c0; }

.current-badge {
  font-size: 10px;
  padding: 2px 8px;
  background: rgba(39,174,96,0.15);
  color: #27ae60;
  border-radius: 8px;
}

/* 我的VIP状态 */
.my-vip-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid;
  border-radius: 14px;
  padding: 16px;
}
.my-vip-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.my-vip-icon { font-size: 20px; }
.my-vip-title { font-size: 14px; font-weight: 700; color: #f0f0f0; }
.my-vip-name { font-size: 14px; font-weight: 700; margin-left: auto; }

.my-vip-stats { display: flex; flex-direction: column; gap: 0; }
.mvs-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
.mvs-item:last-child { border-bottom: none; }
.mvs-label { font-size: 12px; color: #7f8c8d; }
.mvs-value { font-size: 13px; font-weight: 600; color: #f0f0f0; }

/* 充值档位 */
.charge-card, .charge-reward-card, .history-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 14px;
}
.cc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.cc-title { font-size: 14px; font-weight: 700; color: #f0f0f0; }
.cc-tip { font-size: 11px; color: #7f8c8d; }
.charge-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.charge-item {
  background: linear-gradient(135deg, rgba(255,215,0,0.08), rgba(255,165,0,0.04));
  border: 1px solid rgba(255,215,0,0.2);
  border-radius: 10px;
  padding: 10px 4px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}
.charge-item:hover { transform: translateY(-2px); border-color: rgba(255,215,0,0.5); }
.charge-item.charging { opacity: 0.5; pointer-events: none; }
.ci-rmb { font-size: 14px; font-weight: 700; color: #ffd700; margin-bottom: 4px; }
.ci-gold { font-size: 13px; font-weight: 600; color: #f0f0f0; }
.ci-bonus { font-size: 10px; color: #ff6b35; margin-top: 2px; font-weight: 600; }
.ci-label { font-size: 10px; color: #7f8c8d; margin-top: 4px; }

/* 累充奖励 */
.cr-list { display: flex; flex-direction: column; gap: 6px; }
.cr-item {
  display: flex; align-items: center; gap: 10px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px;
  padding: 10px 12px;
  transition: all 0.2s;
}
.cr-item.active { border-color: rgba(201,168,76,0.5); background: rgba(201,168,76,0.05); }
.cr-item.done { opacity: 0.55; }
.cr-need { font-size: 13px; font-weight: 700; color: #ffd700; min-width: 56px; }
.cr-info { flex: 1; min-width: 0; }
.cr-label { font-size: 13px; font-weight: 600; color: #f0f0f0; }
.cr-rewards { font-size: 11px; color: #7f8c8d; margin-top: 2px; display: flex; gap: 8px; }
.cr-btn {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  border-radius: 6px;
  background: linear-gradient(135deg, #c9a84c, #8b6914);
  color: #fff;
  cursor: pointer;
}
.cr-btn:disabled { background: rgba(255,255,255,0.08); color: #7f8c8d; cursor: not-allowed; }

/* 充值历史 */
.hc-list { display: flex; flex-direction: column; gap: 4px; }
.hc-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 4px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  font-size: 12px;
}
.hc-item:last-child { border-bottom: none; }
.hc-amt { font-weight: 700; color: #ffd700; }
.hc-time { font-size: 10px; color: #7f8c8d; margin-top: 2px; }
.hc-gold { color: #c0c0c0; font-weight: 600; }
</style>
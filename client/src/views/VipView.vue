<template>
  <div class="page">
    <div class="location-bar">
      <div class="location-name">👑 VIP特权</div>
      <div class="location-path">
        💰银币：<span class="text-silver">{{ silver || 0 }}</span>
        &nbsp;|&nbsp;
        🪙金币：<span class="text-gold">{{ gold || 0 }}</span>
      </div>
    </div>

    <!-- 全局提示 -->
    <div v-if="error" class="card" style="border-color:#73281c;padding:3px 8px;">
      <p style="color:#b85a3a;font-size:11px;margin:0;">❌ {{ error }}</p>
    </div>
    <div v-if="success" class="card" style="border-color:#2e5a3b;padding:3px 8px;">
      <p style="color:#4caf50;font-size:11px;margin:0;">✅ {{ success }}</p>
    </div>

    <div v-if="loading" class="card" style="text-align:center;color:#888;padding:20px;">加载中...</div>
    <div v-else>

      <!-- 月卡状态卡片 -->
      <div class="card vip-card" :style="monthlyCardBorder">
        <div class="card-title">
          🌙 月卡
          <span v-if="hasMonthlyCard" class="badge-active">有效</span>
          <span v-else class="badge-inactive">未开通</span>
        </div>
        <div v-if="hasMonthlyCard">
          <div class="vip-status-row">
            <span class="vip-label">剩余天数</span>
            <span class="vip-value">{{ monthlyCardRemainDays }} 天</span>
          </div>
          <div class="vip-status-row">
            <span class="vip-label">到期时间</span>
            <span class="vip-value">{{ fmtDate(monthlyCardExpire) }}</span>
          </div>
          <div class="vip-status-row">
            <span class="vip-label">每日奖励</span>
            <span class="vip-value text-silver">+{{ monthlyCardConfig.dailySilver }}银币</span>
          </div>
        </div>
        <div v-else style="font-size:13px;color:#888;margin-bottom:12px;">
          开通月卡，每日可领取100银币，还有体力恢复加速特权！
        </div>

        <!-- 购买/领取按钮 -->
        <div v-if="!hasMonthlyCard">
          <button
            class="btn btn-primary btn-block"
            :disabled="buying"
            @click="buyMonthlyCard"
          >
            🛒 {{ buying ? '购买中...' : `立即开通月卡 ${monthlyCardConfig.price}金币` }}
          </button>
        </div>
        <div v-else>
          <button
            v-if="!dailyClaimed"
            class="btn btn-gold btn-block"
            :disabled="claiming"
            @click="claimDaily"
          >
            🎁 {{ claiming ? '领取中...' : '立即领取今日100银币' }}
          </button>
          <div v-else class="claimed-box">
            ✅ 今日奖励已领取，明日再来！
          </div>
        </div>
      </div>

      <!-- VIP等级介绍 -->
      <div class="card" style="margin-top:12px;">
        <div class="card-title">🏆 VIP等级特权</div>
        <div style="font-size:12px;color:#888;margin-bottom:12px;">
          VIP等级越高，特权越多（VIP通过活动/管理员发放）
        </div>
        <div class="vip-levels">
          <div
            v-for="(cfg, lv) in vipLevels"
            :key="lv"
            :class="['vip-level-item', { 'vip-level-active': vipLevel >= lv, 'vip-level-current': vipLevel === lv }]"
            :style="vipLevel >= lv ? { borderColor: cfg.color, '--vip-color': cfg.color } : {}"
          >
            <div class="vip-level-header">
              <span class="vip-level-name" :style="vipLevel >= lv ? { color: cfg.color } : {}">
                {{ cfg.name }}
              </span>
              <span v-if="vipLevel === lv" class="badge-active">当前</span>
            </div>
            <div class="vip-level-desc">{{ cfg.desc }}</div>
            <div class="vip-level-daily">
              <span class="text-silver">每日+{{ cfg.dailySilver }}银币</span>
            </div>
          </div>
        </div>
      </div>

      <!-- VIP状态（如果已有VIP） -->
      <div v-if="hasVip" class="card" style="margin-top:12px;" :style="{ borderColor: currentVipColor }">
        <div class="card-title">
          👑 我的VIP
          <span :style="{ color: currentVipColor }">{{ currentVipName }}</span>
        </div>
        <div class="vip-status-row">
          <span class="vip-label">VIP等级</span>
          <span class="vip-value" :style="{ color: currentVipColor }">{{ currentVipName }}</span>
        </div>
        <div class="vip-status-row">
          <span class="vip-label">剩余天数</span>
          <span class="vip-value">{{ vipRemainDays }} 天</span>
        </div>
        <div class="vip-status-row">
          <span class="vip-label">到期时间</span>
          <span class="vip-value">{{ fmtDate(vipExpire) }}</span>
        </div>
      </div>

    </div>

    <button @click="$router.back()" class="btn btn-secondary btn-block mt-10">← 返回</button>
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

// 状态数据
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

function fmtDate(ts) {
  if (!ts || ts <= 0) return '—';
  return new Date(ts * 1000).toLocaleDateString('zh-CN');
}

const currentVipColor = computed(() => {
  return vipLevels.value[vipLevel.value]?.color || '#888';
});
const currentVipName = computed(() => {
  return vipLevels.value[vipLevel.value]?.name || '无';
});
const monthlyCardBorder = computed(() => {
  if (hasMonthlyCard.value) {
    return { borderColor: '#c9a84c', borderWidth: '2px' };
  }
  return {};
});

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
  } catch (e) {
    error.value = e.message || '加载失败';
  } finally {
    loading.value = false;
  }
}

async function buyMonthlyCard() {
  if (buying.value) return;
  buying.value = true;
  error.value = '';
  success.value = '';
  try {
    const d = await Api.post('/vip/buy-monthly');
    success.value = d.msg || '购买成功！';
    await loadStatus();
  } catch (e) {
    error.value = e.message || '购买失败';
  } finally {
    buying.value = false;
  }
}

async function claimDaily() {
  if (claiming.value) return;
  claiming.value = true;
  error.value = '';
  success.value = '';
  try {
    const d = await Api.post('/vip/claim-daily');
    success.value = d.msg || '领取成功！';
    silver.value = d.silver || silver.value;
    dailyClaimed.value = true;
  } catch (e) {
    error.value = e.message || '领取失败';
  } finally {
    claiming.value = false;
  }
}

onMounted(() => {
  loadStatus();
});
</script>

<style scoped>
.text-silver { color: #c0c0c0; font-weight: bold; }
.text-gold { color: #e2b714; font-weight: bold; }

.vip-card {
  border: 2px solid #333;
  transition: border-color 0.3s;
}

.badge-active {
  display: inline-block;
  padding: 2px 8px;
  background: #2e5a3b;
  color: #4caf50;
  border-radius: 4px;
  font-size: 11px;
  margin-left: 8px;
}
.badge-inactive {
  display: inline-block;
  padding: 2px 8px;
  background: #3a2a2a;
  color: #888;
  border-radius: 4px;
  font-size: 11px;
  margin-left: 8px;
}

.vip-status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #2a2a3a;
  font-size: 13px;
}
.vip-status-row:last-child {
  border-bottom: none;
}
.vip-label {
  color: #888;
}
.vip-value {
  color: #ddd;
  font-weight: 600;
}

.vip-levels {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.vip-level-item {
  padding: 12px;
  background: #1a1a2e;
  border: 1px solid #333;
  border-radius: 8px;
  transition: all 0.3s;
}
.vip-level-item.vip-level-active {
  background: #1f1f35;
}
.vip-level-item.vip-level-current {
  box-shadow: 0 0 10px rgba(201, 168, 76, 0.3);
}
.vip-level-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.vip-level-name {
  font-size: 15px;
  font-weight: bold;
}
.vip-level-desc {
  font-size: 12px;
  color: #888;
  margin-bottom: 6px;
}
.vip-level-daily {
  font-size: 12px;
}

.claimed-box {
  text-align: center;
  padding: 12px;
  background: #1a2e1a;
  border: 1px solid #2e4a2e;
  border-radius: 6px;
  color: #4caf50;
  font-size: 13px;
}

.btn-gold {
  background: linear-gradient(135deg, #c9a84c, #8b6914);
  color: #fff;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 600;
}
.btn-gold:hover:not(:disabled) {
  background: linear-gradient(135deg, #dbb85c, #9b7924);
}
.btn-gold:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
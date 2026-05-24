<template>
  <div class="smith-page">
    <div class="smith-bg"></div>

    <!-- 顶部 HUD -->
    <div class="top-hud">
      <div class="hud-left">
        <div class="hud-icon">🔨</div>
        <div class="hud-title">铁匠铺</div>
      </div>
      <div class="hud-money">💰 {{ formatMoney(userStore.money) }}</div>
    </div>

    <!-- 规则提示 -->
    <div class="rule-card">
      <div class="rule-grid">
        <div class="rule-item">
          <span class="rule-label">+1~5</span>
          <span class="rule-rate rate-high">90%</span>
        </div>
        <div class="rule-item">
          <span class="rule-label">+6~8</span>
          <span class="rule-rate rate-mid">70%</span>
        </div>
        <div class="rule-item">
          <span class="rule-label">+9~10</span>
          <span class="rule-rate rate-low">30%</span>
        </div>
      </div>
      <div class="rule-note">⚠️ +7以上失败会降级 · 💰费用=(等级+1)×200</div>
    </div>

    <!-- 结果提示 -->
    <div class="msg-card" v-if="msg" :class="{ error: msgType === 'error' }">
      {{ msg }}
    </div>

    <!-- 空状态 -->
    <div class="empty-card" v-if="!items.length">
      <div class="empty-icon">🗡️</div>
      <div class="empty-text">背包中没有可强化的装备</div>
    </div>

    <!-- 装备列表 -->
    <div class="equip-list">
      <div
        v-for="item in items"
        :key="item.inv_id"
        class="equip-card"
        :style="{ borderColor: getEnhColor(item.enhance_level) }"
      >
        <div class="ec-top">
          <div class="ec-icon">{{ item.subtype === 'weapon' ? '🗡️' : '🛡️' }}</div>
          <div class="ec-info">
            <div class="ec-name">
              {{ item.name }}
              <span class="ec-enh" v-if="item.enhance_level > 0" :style="{ color: getEnhColor(item.enhance_level) }">
                +{{ item.enhance_level }}
              </span>
            </div>
            <div class="ec-stats">
              <span class="ec-atk" v-if="item.atk">⚔️ {{ item.atk }} → {{ calcStat(item.atk, item.enhance_level) }}</span>
              <span class="ec-def" v-if="item.def_val">🛡️ {{ item.def_val }} → {{ calcStat(item.def_val, item.enhance_level) }}</span>
            </div>
          </div>
        </div>

        <div class="ec-bottom" v-if="item.enhance_level < 10">
          <div class="ec-cost">
            <span class="cost-coin">💰 {{ getCost(item.enhance_level) }}</span>
            <span class="cost-rate" :class="getRate(item.enhance_level) >= 70 ? 'rate-high' : 'rate-low'">
              {{ getRate(item.enhance_level) }}%
            </span>
          </div>
          <button class="ec-btn" @click="enhance(item.inv_id, item.name, item.enhance_level)">
            🔨 强化
          </button>
        </div>
        <div class="ec-max" v-else>
          <span>👑 已满级</span>
        </div>
      </div>
    </div>

    <router-link to="/map" class="back-btn">← 返回地图</router-link>
  </div>
</template>

<script setup>
import { globalConfirm, globalAlert } from '../composables/useConfirm';
import { ref, onMounted } from 'vue';
import { useUserStore } from '../stores/user';
import { Api } from '../composables/useApi';

const userStore = useUserStore();
const items = ref([]);
const msg = ref('');
const msgType = ref('');

function formatMoney(n) {
  if (!n) return '0';
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿';
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  return n.toLocaleString();
}

function getRate(l) { return l >= 9 ? 30 : l >= 6 ? 70 : 90; }
function getCost(l) { return (l + 1) * 200; }
function getEnhColor(l) {
  return l >= 9 ? '#b85a3a' : l >= 7 ? '#6f5632' : l >= 5 ? '#9b59b6' : l >= 3 ? '#3f6a4a' : '#2e5a3b';
}
function calcStat(base, level) { return Math.round((base || 0) * (1 + level * 0.03)); }

async function load() {
  try { const d = await Api.get('/smith/items'); items.value = d.items || []; }
  catch (e) { msg.value = e.message; msgType.value = 'error'; }
}

async function enhance(id, name, level) {
  if (level >= 10) return;
  if (!(await globalConfirm('花费' + getCost(level) + '铜强化? 成功率' + getRate(level) + '%' + (level >= 7 ? ' 失败降级' : '')))) return;
  try {
    const d = await Api.post('/smith/enhance', { inventory_id: id });
    msg.value = d.msg;
    msgType.value = d.success ? 'success' : 'error';
    const me = await Api.get('/auth/me');
    userStore.updateUser(me.user);
    await load();
  } catch (e) { msg.value = e.message; msgType.value = 'error'; }
}

onMounted(load);
</script>

<style scoped>
.smith-page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 10px;
  min-height: 100%;
  overflow-y: auto;
}

.smith-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  background: linear-gradient(160deg, #0d1117 0%, #1a1410 50%, #0d1117 100%);
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
.hud-money { font-size: 14px; font-weight: 700; color: #f1c40f; }

.rule-card {
  position: relative;
  z-index: 2;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.rule-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.rule-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  padding: 6px;
}
.rule-label { font-size: 11px; color: #7f8c8d; }
.rule-rate { font-size: 16px; font-weight: 800; }
.rate-high { color: #27ae60; }
.rate-mid { color: #f1c40f; }
.rate-low { color: #e74c3c; }
.rule-note { font-size: 10px; color: #7f8c8d; text-align: center; }

.msg-card {
  position: relative;
  z-index: 2;
  background: rgba(39, 174, 96, 0.08);
  border: 1px solid rgba(39, 174, 96, 0.3);
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #27ae60;
  text-align: center;
}
.msg-card.error {
  background: rgba(184, 90, 58, 0.08);
  border-color: rgba(184, 90, 58, 0.3);
  color: #e74c3c;
}

.empty-card {
  position: relative;
  z-index: 2;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.empty-icon { font-size: 36px; }
.empty-text { font-size: 13px; color: #7f8c8d; }

.equip-list {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.equip-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-left: 3px solid;
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ec-top { display: flex; gap: 10px; align-items: center; }
.ec-icon { font-size: 28px; flex-shrink: 0; }
.ec-info { flex: 1; min-width: 0; }
.ec-name {
  font-size: 14px;
  font-weight: 600;
  color: #f0f0f0;
  display: flex;
  align-items: center;
  gap: 4px;
}
.ec-enh { font-weight: 800; }
.ec-stats { display: flex; gap: 8px; margin-top: 2px; font-size: 11px; color: #7f8c8d; }
.ec-atk { color: #e74c3c; }
.ec-def { color: #3498db; }

.ec-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.ec-cost { display: flex; align-items: center; gap: 8px; }
.cost-coin { font-size: 12px; color: #f1c40f; font-weight: 600; }
.cost-rate { font-size: 13px; font-weight: 700; }
.ec-btn {
  background: linear-gradient(135deg, #1a4a2a, #27ae60);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 6px 16px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}
.ec-btn:hover { opacity: 0.9; }
.ec-max {
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  color: #c9a758;
}

.back-btn {
  position: relative;
  z-index: 2;
  display: block;
  text-align: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #95a5a6;
  padding: 10px;
  border-radius: 10px;
  font-size: 13px;
  text-decoration: none;
  transition: all 0.2s;
}
.back-btn:hover { background: rgba(255, 255, 255, 0.08); color: #bdc3c7; }
</style>
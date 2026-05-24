<template>
  <div class="status-card">
    <div class="sc-header">
      <div class="sc-avatar">{{ user.sex === 2 ? '♀' : '♂' }}</div>
      <div class="sc-info">
        <div class="sc-name">{{ user.username }}</div>
        <div class="sc-meta">Lv.{{ user.level }} · {{ user.sex === 2 ? '女' : '男' }}</div>
      </div>
    </div>
    <div class="sc-bars">
      <div class="sc-bar-row">
        <div class="sc-bar-label">
          <span class="sc-bar-icon">❤️</span>
          <span class="sc-bar-name">体力</span>
          <span class="sc-bar-val">{{ user.hp }}/{{ user.hp_max }}</span>
        </div>
        <div class="sc-bar-track">
          <div class="sc-bar-fill hp-fill" :class="{ low: hpPercent < 30 }" :style="{ width: hpPercent + '%' }"></div>
        </div>
      </div>
      <div class="sc-bar-row">
        <div class="sc-bar-label">
          <span class="sc-bar-icon">✨</span>
          <span class="sc-bar-name">经验</span>
          <span class="sc-bar-val">{{ user.exp }}/{{ user.exp_max }}</span>
        </div>
        <div class="sc-bar-track">
          <div class="sc-bar-fill exp-fill" :style="{ width: expPercent + '%' }"></div>
        </div>
      </div>
    </div>
    <div class="sc-money">
      💰 <span class="money-val">{{ formatMoney(user.money) }}</span> 铜币
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({ user: { type: Object, required: true } });
const hpPercent = computed(() => props.user.hp_max > 0 ? Math.round(props.user.hp / props.user.hp_max * 100) : 0);
const expPercent = computed(() => props.user.exp_max > 0 ? Math.round(props.user.exp / props.user.exp_max * 100) : 0);

function formatMoney(n) {
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿';
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  return n.toLocaleString();
}
</script>

<style scoped>
.status-card {
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px; padding: 14px;
}
.sc-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.sc-avatar { font-size: 32px; }
.sc-info { flex: 1; }
.sc-name { font-size: 16px; font-weight: 800; color: #f0f0f0; }
.sc-meta { font-size: 11px; color: #7f8c8d; margin-top: 2px; }
.sc-bars { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
.sc-bar-row { display: flex; flex-direction: column; gap: 4px; }
.sc-bar-label { display: flex; align-items: center; gap: 4px; font-size: 11px; }
.sc-bar-icon { font-size: 11px; }
.sc-bar-name { color: #7f8c8d; }
.sc-bar-val { color: #ddd; margin-left: auto; font-weight: 700; }
.sc-bar-track { height: 5px; background: rgba(255, 255, 255, 0.07); border-radius: 3px; overflow: hidden; }
.sc-bar-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
.hp-fill { background: linear-gradient(90deg, #2980b9, #3498db); }
.hp-fill.low { background: linear-gradient(90deg, #8b0000, #ff5544); }
.exp-fill { background: linear-gradient(90deg, #8e44ad, #9b59b6); }
.sc-money { font-size: 13px; color: #7f8c8d; display: flex; align-items: center; gap: 4px; }
.money-val { color: #c9a758; font-weight: 700; }
</style>
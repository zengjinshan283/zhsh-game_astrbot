<template>
  <div class="card">
    <div class="card-title">👤 角色信息</div>
    <p><strong>{{ user.username }}</strong> · {{ user.sex === 2 ? '♀' : '♂' }} · Lv.{{ user.level }}</p>
    <div class="status-bar mt-10 bar-hp">
      <div class="bar-label"><span>❤️ 体力</span><span>{{ user.hp }}/{{ user.hp_max }}</span></div>
      <div class="bar-track"><div class="bar-fill" :style="{ width: hpPercent + '%' }"></div></div>
    </div>
    <div class="status-bar bar-exp">
      <div class="bar-label"><span>✨ 经验</span><span>{{ user.exp }}/{{ user.exp_max }}</span></div>
      <div class="bar-track"><div class="bar-fill" :style="{ width: expPercent + '%' }"></div></div>
    </div>
    <p class="text-gold mt-10">💰 {{ formatMoney(user.money) }} 铜币</p>
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

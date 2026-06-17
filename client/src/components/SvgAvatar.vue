<template>
  <div class="svg-avatar" :class="['rarity-' + rarity, { float: animated }]">
    <svg :viewBox="`0 0 ${size} ${size}`" :width="size" :height="size" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient :id="`g-${uid}`" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" :stop-color="gradFrom" />
          <stop offset="100%" :stop-color="gradTo" />
        </linearGradient>
        <radialGradient :id="`r-${uid}`" cx="50%" cy="50%">
          <stop offset="0%" :stop-color="gradFrom" stop-opacity="0.3" />
          <stop offset="100%" :stop-color="gradFrom" stop-opacity="0" />
        </radialGradient>
      </defs>
      <!-- 光晕背景 -->
      <circle :cx="size/2" :cy="size/2" :r="size*0.45" :fill="`url(#r-${uid})`" />
      <!-- 角色轮廓（兜帽/披风） -->
      <path
        :d="`M ${size*0.5} ${size*0.18} C ${size*0.7} ${size*0.18} ${size*0.8} ${size*0.4} ${size*0.78} ${size*0.7} L ${size*0.86} ${size*0.95} L ${size*0.14} ${size*0.95} L ${size*0.22} ${size*0.7} C ${size*0.2} ${size*0.4} ${size*0.3} ${size*0.18} ${size*0.5} ${size*0.18} Z`"
        :fill="`url(#g-${uid})`"
        opacity="0.85"
      />
      <!-- 头部 -->
      <circle :cx="size*0.5" :cy="size*0.45" :r="size*0.18" :fill="`url(#g-${uid})`" />
      <!-- 眼睛 -->
      <circle :cx="size*0.42" :cy="size*0.45" :r="size*0.02" fill="#fff" />
      <circle :cx="size*0.58" :cy="size*0.45" :r="size*0.02" fill="#fff" />
      <!-- 高光 -->
      <ellipse :cx="size*0.4" :cy="size*0.4" :rx="size*0.06" :ry="size*0.03" fill="rgba(255,255,255,0.4)" />
    </svg>
    <div v-if="badge" class="svg-avatar-badge">
      <span class="gbadge" :class="badgeKind">{{ badge }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({
  size: { type: Number, default: 80 },
  rarity: { type: String, default: 'common' }, // common|rare|epic|legend
  sex: { type: Number, default: 1 }, // 1=男 2=女
  badge: String,
  badgeKind: { type: String, default: '' },
  animated: Boolean,
  uid: { type: [String, Number], default: () => Math.random().toString(36).slice(2, 8) }
});
const RARITY = {
  common: { from: '#7f8c8d', to: '#566573' },
  rare: { from: '#5dade2', to: '#2874a6' },
  epic: { from: '#bb8fce', to: '#7d3c98' },
  legend: { from: '#f1c40f', to: '#b9770e' }
};
const gradFrom = computed(() => RARITY[props.rarity]?.from || '#5dade2');
const gradTo = computed(() => RARITY[props.rarity]?.to || '#2874a6');
</script>

<style scoped>
.svg-avatar {
  position: relative;
  display: inline-block;
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));
}
.svg-avatar-badge {
  position: absolute;
  top: -4px; right: -4px;
  z-index: 2;
}
</style>

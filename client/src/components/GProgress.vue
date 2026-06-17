<template>
  <div class="gprogress" :class="[color, size]">
    <div class="gprogress-fill" :style="{ width: pct + '%' }" />
  </div>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({
  value: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  color: { type: String, default: '' }, // '' | 'gold' | 'green' | 'red' | 'purple'
  size: { type: String, default: '' }   // '' | 'thin' | 'thick'
});
const pct = computed(() => Math.max(0, Math.min(100, (props.value / props.max) * 100)));
</script>

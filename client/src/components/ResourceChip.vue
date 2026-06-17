<template>
  <div class="res-bar" :class="kind">
    <span class="res-icon">{{ icon }}</span>
    <span v-if="label" class="res-label text-muted text-xs">{{ label }}</span>
    <span class="res-value fw-600">{{ format(value) }}</span>
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, required: true },
  label: String,
  value: { type: [Number, String], default: 0 },
  kind: { type: String, default: '' } // '' | 'gold' | 'silver' | 'exp'
});
function format(v) {
  if (typeof v === 'string') return v;
  if (v >= 10000) return (v / 10000).toFixed(1) + '万';
  return v.toLocaleString();
}
</script>

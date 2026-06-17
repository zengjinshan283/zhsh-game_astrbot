<template>
  <div class="glass-card" :class="[variant, { interactive: interactive, elevated: elevated }]">
    <div v-if="title || $slots.title" class="gc-head">
      <div class="gc-head-left">
        <span v-if="icon" class="gc-icon">{{ icon }}</span>
        <slot name="title">
          <span class="gc-title">{{ title }}</span>
        </slot>
      </div>
      <div v-if="$slots.extra" class="gc-head-right">
        <slot name="extra" />
      </div>
    </div>
    <div class="gc-body">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  icon: String,
  variant: { type: String, default: '' }, // '' | 'accent-primary' | 'accent-gold' | 'accent-purple' | 'accent-green' | 'accent-red'
  interactive: Boolean,
  elevated: Boolean
});
</script>

<style scoped>
.glass-card { display: flex; flex-direction: column; gap: 8px; }
.gc-head { display: flex; align-items: center; justify-content: space-between; }
.gc-head-left { display: flex; align-items: center; gap: 6px; }
.gc-head-right { display: flex; align-items: center; gap: 6px; }
.gc-icon { font-size: 16px; }
.gc-title { font-size: 14px; font-weight: 700; color: var(--text-primary); }
.gc-body { color: var(--text-secondary); font-size: 13px; }
</style>

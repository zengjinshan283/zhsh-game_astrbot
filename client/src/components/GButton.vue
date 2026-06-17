<template>
  <button
    :class="['gbtn', variant, size, { 'ripple': ripple }]"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="gbtn-spinner spin" />
    <span v-else-if="icon" class="gbtn-icon">{{ icon }}</span>
    <slot />
  </button>
</template>

<script setup>
defineProps({
  variant: { type: String, default: '' }, // '' | 'gbtn-gold' | 'gbtn-purple' | 'gbtn-green' | 'gbtn-red' | 'gbtn-ghost'
  size: { type: String, default: '' },     // '' | 'gbtn-sm' | 'gbtn-lg'
  icon: String,
  disabled: Boolean,
  loading: Boolean,
  ripple: { type: Boolean, default: true }
});
defineEmits(['click']);
</script>

<style scoped>
.gbtn-spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  display: inline-block;
}
.gbtn-icon { font-size: 14px; }
</style>

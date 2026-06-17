<template>
  <div class="skeleton-bar skeleton" :style="{ width: width, height: height }" />
</template>

<script setup>
defineProps({
  width: { type: String, default: '100%' },
  height: { type: String, default: '12px' }
});
</script>

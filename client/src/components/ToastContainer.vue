<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast" tag="div" style="display: contents">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="gtoast"
          :class="t.type"
        >
          <span class="gtoast-icon">{{ icons[t.type] }}</span>
          <span>{{ t.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { useToast } from '../composables/useToast';
const { toasts } = useToast();
const icons = { success: '✅', error: '❌', warn: '⚠️', info: 'ℹ️' };
</script>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.toast-enter-from { transform: translateY(-20px) scale(0.9); opacity: 0; }
.toast-leave-to { transform: translateY(-20px) scale(0.9); opacity: 0; }
</style>

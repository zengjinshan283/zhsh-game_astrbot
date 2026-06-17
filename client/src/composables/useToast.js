/**
 * 全局 Toast 通知
 * 用法: const toast = useToast(); toast.success('操作成功')
 */
import { ref } from 'vue';

const toasts = ref([]);
let nextId = 1;

function push(message, type = 'info', duration = 2200) {
  const id = nextId++;
  toasts.value.push({ id, message, type });
  setTimeout(() => {
    const idx = toasts.value.findIndex(t => t.id === id);
    if (idx >= 0) toasts.value.splice(idx, 1);
  }, duration);
}

export function useToast() {
  return {
    toasts,
    success: (msg, dur) => push(msg, 'success', dur),
    error: (msg, dur) => push(msg, 'error', dur || 2800),
    warn: (msg, dur) => push(msg, 'warn', dur),
    info: (msg, dur) => push(msg, 'info', dur),
    push
  };
}

/** 全局快捷方法（无需在 setup 中） */
export const toast = {
  success: (msg, dur) => push(msg, 'success', dur),
  error: (msg, dur) => push(msg, 'error', dur || 2800),
  warn: (msg, dur) => push(msg, 'warn', dur),
  info: (msg, dur) => push(msg, 'info', dur)
};

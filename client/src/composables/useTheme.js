/**
 * 全局主题切换：dark / ocean / sunset
 * 持久化到 localStorage
 */
import { ref, watch } from 'vue';

const STORAGE_KEY = 'zhsh-theme';
const themes = ['dark', 'ocean', 'sunset'];

const current = ref(localStorage.getItem(STORAGE_KEY) || 'dark');

function apply(t) {
  document.documentElement.setAttribute('data-theme', t);
  current.value = t;
  localStorage.setItem(STORAGE_KEY, t);
}

// 首次执行
apply(current.value);

watch(current, apply);

export function useTheme() {
  return {
    current,
    themes,
    set: apply,
    next() {
      const idx = themes.indexOf(current.value);
      apply(themes[(idx + 1) % themes.length]);
    }
  };
}

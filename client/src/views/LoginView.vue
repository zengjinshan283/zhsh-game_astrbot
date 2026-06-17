<template>
  <div class="login-page">
    <!-- 装饰光晕层 -->
    <div class="orb-deco o1" />
    <div class="orb-deco o2" />
    <div class="orb-deco o3" />
    <div class="particle-bg" />

    <!-- 顶部主题切换 -->
    <div class="theme-toggle">
      <button class="theme-btn" @click="theme.next()" :title="`主题：${theme.current}`">
        <span class="theme-dot" :class="theme.current"></span>
      </button>
    </div>

    <!-- Logo 区 -->
    <div class="logo-section slide-down">
      <div class="logo-emblem float">
        <svg viewBox="0 0 100 100" width="100" height="100">
          <defs>
            <linearGradient id="logo-g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#5dade2" />
              <stop offset="50%" stop-color="#bb8fce" />
              <stop offset="100%" stop-color="#f1c40f" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="45" fill="url(#logo-g)" opacity="0.2" />
          <path d="M 20 60 Q 35 35 50 45 Q 65 55 80 40 L 75 70 Q 60 75 50 70 Q 40 75 25 70 Z" fill="url(#logo-g)" />
          <circle cx="50" cy="35" r="8" fill="url(#logo-g)" />
          <path d="M 30 75 L 25 85 M 50 75 L 50 85 M 70 75 L 75 85" stroke="url(#logo-g)" stroke-width="2" stroke-linecap="round" />
        </svg>
      </div>
      <h1 class="logo-title">
        <span class="text-grad-primary">纵横</span>
        <span class="text-grad-gold">四海</span>
      </h1>
      <p class="logo-subtitle">SAILING THE SEAS OF FORTUNE</p>
    </div>

    <!-- 登录卡 -->
    <div class="login-card glass-card elevated zoom-in">
      <div class="login-tabs gtabs">
        <button class="gtab" :class="{active: mode === 'login'}" @click="mode = 'login'">登录</button>
        <button class="gtab" :class="{active: mode === 'register'}" @click="mode = 'register'">注册</button>
      </div>

      <form @submit.prevent="submit" class="login-form">
        <div class="form-field">
          <span class="field-icon">👤</span>
          <input v-model="username" class="ginput with-icon" placeholder="请输入账号" maxlength="20" autocomplete="username" required />
        </div>
        <div v-if="mode === 'register'" class="form-field slide-up">
          <span class="field-icon">⚧</span>
          <select v-model="sex" class="ginput with-icon">
            <option :value="1">♂ 男 · 海上剑客</option>
            <option :value="2">♀ 女 · 海洋商女</option>
          </select>
        </div>
        <div v-if="mode === 'register'" class="form-field slide-up">
          <span class="field-icon">🔒</span>
          <input v-model="password2" class="ginput with-icon" type="password" placeholder="再次输入密码" maxlength="32" autocomplete="new-password" required />
        </div>
        <div class="form-field">
          <span class="field-icon">🔑</span>
          <input v-model="password" class="ginput with-icon" type="password" :placeholder="mode === 'register' ? '设置密码 (6-32位)' : '请输入密码'" maxlength="32" autocomplete="current-password" required />
        </div>

        <GButton type="submit" :loading="loading" size="lg" style="width: 100%; margin-top: 8px;">
          {{ mode === 'login' ? '⛵ 启航' : '⚓ 加入航路' }}
        </GButton>
      </form>

      <div class="login-tip text-muted text-xs">
        {{ mode === 'login' ? '首次登入？' : '已有账号？' }}
        <a class="link" @click="mode = mode === 'login' ? 'register' : 'login'">
          {{ mode === 'login' ? '立即注册' : '前往登录' }}
        </a>
      </div>
    </div>

    <!-- 底部水印 -->
    <div class="watermark text-dim text-xs">
      v2.0 · 全新 2D 玻璃拟态
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Api } from '../composables/useApi';
import { useUserStore } from '../stores/user';
import { useToast } from '../composables/useToast';
import { useTheme } from '../composables/useTheme';
import GButton from '../components/GButton.vue';

const router = useRouter();
const auth = useUserStore();
const toast = useToast();
const theme = useTheme();

const mode = ref('login');
const username = ref('');
const password = ref('');
const password2 = ref('');
const sex = ref(1);
const loading = ref(false);

async function submit() {
  if (loading.value) return;
  if (!username.value || !password.value) {
    toast.warn('请填写账号密码');
    return;
  }
  if (mode.value === 'register' && password.value !== password2.value) {
    toast.error('两次输入的密码不一致');
    return;
  }
  loading.value = true;
  try {
    let res;
    if (mode.value === 'login') {
      res = await Api.post('/auth/login', { username: username.value, password: password.value });
      if (res.token) {
        auth.setLogin(res);
        toast.success(`⚓ 欢迎回来，${res.user.username}！`);
        router.push('/home');
      }
    } else {
      res = await Api.post('/auth/register', {
        username: username.value,
        password: password.value,
        password2: password2.value,
        sex: sex.value
      });
      if (res.token) {
        auth.setLogin(res);
        toast.success(`🎉 航海者${res.user.username}启航！获得新手大礼包 ✨`);
        router.push('/home');
      }
    }
  } catch (e) {
    toast.error(e.message || (mode.value === 'login' ? '登录失败' : '注册失败'));
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  // 自动聚焦
  setTimeout(() => {
    const el = document.querySelector('.ginput');
    el && el.focus();
  }, 300);
});
</script>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  overflow: hidden;
}
.theme-toggle { position: absolute; top: 16px; right: 16px; z-index: 5; }
.theme-btn {
  width: 40px; height: 40px;
  background: var(--glass-bg-strong);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all var(--anim-base) var(--ease-smooth);
  backdrop-filter: blur(12px);
}
.theme-btn:hover { transform: scale(1.05); border-color: var(--glass-border-hover); }
.theme-dot { width: 16px; height: 16px; border-radius: 50%; display: block; }
.theme-dot.dark { background: linear-gradient(135deg, #0a0e1a, #1a1028); }
.theme-dot.ocean { background: linear-gradient(135deg, #001a2e, #48c9b0); }
.theme-dot.sunset { background: linear-gradient(135deg, #2c1810, #f5b041); }

.logo-section {
  position: relative; z-index: 1;
  text-align: center;
  margin-bottom: 32px;
}
.logo-emblem {
  width: 110px; height: 110px;
  margin: 0 auto 16px;
  filter: drop-shadow(0 8px 24px rgba(93,173,226,0.4));
}
.logo-title {
  font-size: 42px; font-weight: 900;
  margin: 0 0 4px;
  letter-spacing: 4px;
}
.logo-subtitle {
  font-size: 10px; color: var(--text-muted);
  letter-spacing: 4px; margin: 0;
}

.login-card {
  position: relative; z-index: 1;
  width: 100%; max-width: 380px;
  padding: 24px 22px;
}
.login-tabs { margin-bottom: 18px; }
.login-form { display: flex; flex-direction: column; gap: 12px; }
.form-field { position: relative; }
.field-icon {
  position: absolute;
  left: 14px; top: 50%; transform: translateY(-50%);
  font-size: 16px; z-index: 1; pointer-events: none;
}
.ginput.with-icon { padding-left: 40px; }

.login-tip { text-align: center; margin-top: 16px; }
.link {
  color: var(--accent-primary);
  cursor: pointer;
  font-weight: 600;
  text-decoration: none;
  transition: color var(--anim-base);
}
.link:hover { color: var(--accent-secondary); text-decoration: underline; }

.watermark {
  position: absolute;
  bottom: 20px; left: 50%; transform: translateX(-50%);
  z-index: 1;
}
</style>

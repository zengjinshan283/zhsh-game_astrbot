<template>
  <div class="login-page">
    <div class="login-bg"></div>

    <div class="login-card">
      <div class="login-title">⛵ 登录</div>
      <div class="login-divider"></div>

      <div v-if="error" class="error-card">{{ error }}</div>

      <form @submit.prevent="doLogin" class="login-form">
        <div class="form-group">
          <label class="form-label">角色名</label>
          <input v-model="form.username" class="form-input" placeholder="输入角色名" autocomplete="username">
        </div>
        <div class="form-group">
          <label class="form-label">密码</label>
          <input v-model="form.password" type="password" class="form-input" placeholder="输入密码" autocomplete="current-password">
        </div>
        <button type="submit" class="login-btn" :disabled="loading">
          {{ loading ? '登录中...' : '⚓ 登录' }}
        </button>
      </form>

      <router-link to="/register" class="register-link">✨ 创建新角色</router-link>
      <router-link to="/" class="back-link">← 返回首页</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';
import { Api } from '../composables/useApi';

const userStore = useUserStore();
const router = useRouter();
const form = ref({ username: '', password: '' });
const error = ref('');
const loading = ref(false);

async function doLogin() {
  error.value = '';
  loading.value = true;
  try {
    const data = await Api.post('/auth/login', form.value);
    userStore.setLogin(data);
    router.push('/');
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  overflow: hidden;
}
.login-bg {
  position: fixed; inset: 0; z-index: 0;
  background: linear-gradient(160deg, #0d1117 0%, #0a1628 50%, #0d1117 100%);
  pointer-events: none;
}
.login-card {
  position: relative; z-index: 2;
  background: rgba(13,17,23,0.92); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 20px;
  padding: 32px 28px; width: 320px;
}
.login-title {
  font-size: 24px; font-weight: 700; color: #f0f0f0; text-align: center;
  margin-bottom: 12px;
}
.login-divider {
  height: 1px; background: linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent);
  margin-bottom: 20px;
}
.error-card {
  background: rgba(184,90,58,0.12); border: 1px solid rgba(184,90,58,0.25);
  border-radius: 10px; padding: 8px 12px; font-size: 12px; color: #e74c3c; margin-bottom: 14px;
}
.login-form { display: flex; flex-direction: column; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-label { font-size: 12px; color: #7f8c8d; font-weight: 600; }
.form-input {
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px; padding: 12px 14px;
  font-size: 14px; color: #f0f0f0; outline: none; transition: border-color 0.2s;
}
.form-input:focus { border-color: rgba(201,168,76,0.4); }
.form-input::placeholder { color: #555; }
.login-btn {
  margin-top: 4px;
  background: linear-gradient(135deg, #c9a84c, #8b6914); border: none;
  border-radius: 10px; color: #fff; font-weight: 700; font-size: 15px;
  padding: 14px; cursor: pointer; transition: all 0.2s;
}
.login-btn:hover:not(:disabled) { transform: scale(1.02); box-shadow: 0 4px 20px rgba(201,168,76,0.4); }
.login-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.register-link {
  display: block; text-align: center;
  color: #27ae60; font-size: 13px; font-weight: 600;
  margin-top: 16px; text-decoration: none; transition: color 0.2s;
}
.register-link:hover { color: #2ecc71; }
.back-link {
  display: block; text-align: center;
  color: #555; font-size: 12px;
  margin-top: 10px; text-decoration: none; transition: color 0.2s;
}
.back-link:hover { color: #7f8c8d; }
</style>
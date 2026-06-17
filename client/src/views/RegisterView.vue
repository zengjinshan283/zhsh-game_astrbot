<template>
  <div class="page-wrap register-page">
  <div class="page-hud"><div class="page-hud-title">📝 注册</div></div>
    <div class="register-card">
      <div class="register-title">✨ 创建角色</div>
      <div class="register-divider"></div>

      <div v-if="error" class="error-card">{{ error }}</div>

      <form @submit.prevent="doRegister" class="register-form">
        <div class="form-group">
          <label class="form-label">角色名（2-10字符）</label>
          <input v-model="form.username" class="form-input" placeholder="你的冒险者名字">
        </div>
        <div class="form-group">
          <label class="form-label">密码（4-20字符）</label>
          <input v-model="form.password" type="password" class="form-input" placeholder="设置密码">
        </div>
        <div class="form-group">
          <label class="form-label">确认密码</label>
          <input v-model="form.password2" type="password" class="form-input" placeholder="再次输入密码">
        </div>
        <div class="form-group">
          <label class="form-label">性别</label>
          <div class="sex-options">
            <label :class="['sex-option', { active: form.sex === 1 }]">
              <input type="radio" v-model="form.sex" :value="1">
              <span class="sex-icon">♂</span>
              <span class="sex-label">男</span>
            </label>
            <label :class="['sex-option', { active: form.sex === 2 }]">
              <input type="radio" v-model="form.sex" :value="2">
              <span class="sex-icon">♀</span>
              <span class="sex-label">女</span>
            </label>
          </div>
        </div>
        <button type="submit" class="register-btn" :disabled="loading">
          {{ loading ? '创建中...' : '⚓ 开始冒险' }}
        </button>
      </form>

      <router-link to="/login" class="login-link">已有角色？去登录</router-link>
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
const form = ref({ username: '', password: '', password2: '', sex: 1 });
const error = ref('');
const loading = ref(false);

async function doRegister() {
  error.value = '';
  loading.value = true;
  try {
    const data = await Api.post('/auth/register', form.value);
    userStore.setLogin(data);
    router.push('/story');
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.register-page {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  overflow: hidden;
}
.register-card {
  position: relative; z-index: 2;
  background: rgba(13,17,23,0.92); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 20px;
  padding: 32px 28px; width: 320px;
}
.register-title {
  font-size: 22px; font-weight: 700; color: #f0f0f0; text-align: center;
  margin-bottom: 12px;
}
.register-divider {
  height: 1px; background: linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent);
  margin-bottom: 20px;
}
.error-card {
  background: rgba(184,90,58,0.12); border: 1px solid rgba(184,90,58,0.25);
  border-radius: 10px; padding: 8px 12px; font-size: 12px; color: #e74c3c; margin-bottom: 14px;
}
.register-form { display: flex; flex-direction: column; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-label { font-size: 12px; color: #7f8c8d; font-weight: 600; }
.form-input {
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px; padding: 12px 14px;
  font-size: 14px; color: #f0f0f0; outline: none; transition: border-color 0.2s;
}
.form-input:focus { border-color: rgba(201,168,76,0.4); }
.form-input::placeholder { color: #555; }
.sex-options { display: flex; gap: 10px; }
.sex-option {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 12px; background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
  cursor: pointer; transition: all 0.2s;
}
.sex-option.active { background: rgba(201,168,76,0.1); border-color: rgba(201,168,76,0.3); }
.sex-option input { display: none; }
.sex-icon { font-size: 18px; }
.sex-label { font-size: 14px; color: #7f8c8d; }
.sex-option.active .sex-label { color: #c9a758; }
.register-btn {
  margin-top: 4px;
  background: linear-gradient(135deg, #c9a84c, #8b6914); border: none;
  border-radius: 10px; color: #fff; font-weight: 700; font-size: 15px;
  padding: 14px; cursor: pointer; transition: all 0.2s;
}
.register-btn:hover:not(:disabled) { transform: scale(1.02); box-shadow: 0 4px 20px rgba(201,168,76,0.4); }
.register-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.login-link {
  display: block; text-align: center;
  color: #555; font-size: 12px;
  margin-top: 16px; text-decoration: none; transition: color 0.2s;
}
.login-link:hover { color: #7f8c8d; }
</style>
<template>
  <div class="page">
    <div class="game-title" style="padding:30px 20px 16px;">
      <h1 style="font-size:26px;">⛵ 登录</h1>
      <div class="divider"></div>
    </div>
    <div v-if="error" class="card" style="border-color:#73281c;">
      <p style="color:#b85a3a;">{{ error }}</p>
    </div>
    <div class="card">
      <form @submit.prevent="doLogin">
        <div class="form-group">
          <label class="form-label">角色名</label>
          <input v-model="form.username" class="form-input" placeholder="输入角色名" autocomplete="username">
        </div>
        <div class="form-group">
          <label class="form-label">密码</label>
          <input v-model="form.password" type="password" class="form-input" placeholder="输入密码" autocomplete="current-password">
        </div>
        <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
          {{ loading ? '登录中...' : '⚓ 登录' }}
        </button>
      </form>
    </div>
    <router-link to="/register" class="btn btn-secondary btn-block mt-10">✨ 创建新角色</router-link>
    <router-link to="/" class="text-muted" style="display:block;text-align:center;margin-top:16px;">← 返回首页</router-link>
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
  if (!form.value.username || !form.value.password) { error.value = '请输入角色名和密码'; return; }
  loading.value = true;
  try {
    const data = await Api.post('/auth/login', form.value);
    userStore.setLogin(data);
    router.push('/map');
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

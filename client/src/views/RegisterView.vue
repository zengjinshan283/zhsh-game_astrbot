<template>
  <div class="page">
    <div class="game-title" style="padding:30px 20px 16px;">
      <h1 style="font-size:26px;">✨ 创建角色</h1>
      <div class="divider"></div>
    </div>
    <div v-if="error" class="card" style="border-color:#73281c;">
      <p style="color:#b85a3a;">{{ error }}</p>
    </div>
    <div class="card">
      <form @submit.prevent="doRegister">
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
          <div style="display:flex;gap:10px;">
            <label class="form-radio" :class="{ active: form.sex === 1 }">
              <input type="radio" v-model="form.sex" :value="1"> ♂ 男
            </label>
            <label class="form-radio" :class="{ active: form.sex === 2 }">
              <input type="radio" v-model="form.sex" :value="2"> ♀ 女
            </label>
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
          {{ loading ? '创建中...' : '⚓ 开始冒险' }}
        </button>
      </form>
    </div>
    <router-link to="/login" class="text-muted" style="display:block;text-align:center;margin-top:16px;">已有角色？去登录</router-link>
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

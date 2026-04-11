<template>
  <div class="login-container">
    <div class="login-bg">
      <div class="bg-circle c1" />
      <div class="bg-circle c2" />
      <div class="bg-circle c3" />
    </div>
    <div class="login-card">
      <div class="login-header">
        <div class="login-logo">⚓</div>
        <h1 class="login-title">纵横四海</h1>
        <p class="login-subtitle">游戏管理后台</p>
      </div>
      <el-form ref="loginFormRef" :model="loginForm" :rules="loginRules" size="large">
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入用户名"
            :prefix-icon="User"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            :prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" style="width: 100%" @click="handleLogin">
            登 录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const loginFormRef = ref(null)
const loading = ref(false)

const loginForm = reactive({
  username: '',
  password: ''
})

const loginRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 4, message: '密码不能少于4位', trigger: 'blur' }
  ]
}

async function handleLogin() {
  const valid = await loginFormRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const { login } = await import('@/api/auth')
    const res = await login(loginForm)
    userStore.setToken(res.data.token)
    userStore.setAdminInfo(res.data.admin)
    ElMessage.success('登录成功')
    router.push('/dashboard')
  } catch (e) {
    // error handled by interceptor
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.login-container {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $bg-primary;
  position: relative;
  overflow: hidden;
}

.login-bg {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  pointer-events: none;
}

.bg-circle {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.15;
}

.c1 {
  width: 400px;
  height: 400px;
  background: $color-primary;
  top: -100px;
  right: -100px;
  animation: float 8s ease-in-out infinite;
}

.c2 {
  width: 300px;
  height: 300px;
  background: $color-warning;
  bottom: -80px;
  left: -80px;
  animation: float 10s ease-in-out infinite reverse;
}

.c3 {
  width: 200px;
  height: 200px;
  background: $color-success;
  top: 50%;
  left: 50%;
  animation: float 6s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0) translateX(0); }
  33% { transform: translateY(-30px) translateX(15px); }
  66% { transform: translateY(20px) translateX(-10px); }
}

.login-card {
  width: 380px;
  padding: 40px;
  background: $bg-card;
  border: 1px solid $border-color;
  border-radius: $radius-lg;
  box-shadow: $shadow-lg;
  position: relative;
  z-index: 1;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-logo {
  font-size: 48px;
  margin-bottom: 12px;
}

.login-title {
  font-size: 26px;
  font-weight: 700;
  color: $color-primary;
  letter-spacing: 4px;
}

.login-subtitle {
  font-size: 14px;
  color: $text-secondary;
  margin-top: 8px;
}
</style>

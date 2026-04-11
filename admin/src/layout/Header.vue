<template>
  <div class="header">
    <div class="header-left">
      <el-icon class="collapse-btn" @click="appStore.toggleSidebar">
        <Fold v-if="!appStore.sidebarCollapsed" />
        <Expand v-else />
      </el-icon>
      <el-breadcrumb separator="/">
        <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.path">
          {{ item.title }}
        </el-breadcrumb-item>
      </el-breadcrumb>
    </div>
    <div class="header-right">
      <span class="admin-name">{{ userStore.nickname }}</span>
      <el-dropdown trigger="click" @command="handleCommand">
        <span class="avatar-wrap">
          <el-avatar :size="32" class="admin-avatar">
            {{ userStore.nickname ? userStore.nickname.charAt(0) : 'A' }}
          </el-avatar>
          <el-icon><ArrowDown /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="changePassword">
              <el-icon><Lock /></el-icon>修改密码
            </el-dropdown-item>
            <el-dropdown-item divided command="logout">
              <el-icon><SwitchButton /></el-icon>退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <!-- 修改密码弹窗 -->
    <el-dialog v-model="showPasswordDialog" title="修改密码" width="420px" :close-on-click-modal="false">
      <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-width="80px">
        <el-form-item label="原密码" prop="oldPassword">
          <el-input v-model="pwdForm.oldPassword" type="password" show-password placeholder="请输入原密码" />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="pwdForm.newPassword" type="password" show-password placeholder="请输入新密码" />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="pwdForm.confirmPassword" type="password" show-password placeholder="请再次输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPasswordDialog = false">取消</el-button>
        <el-button type="primary" :loading="pwdLoading" @click="submitPassword">确认修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { changePassword } from '@/api/auth'
import { ElMessage } from 'element-plus'

const route = useRoute()
const userStore = useUserStore()
const appStore = useAppStore()

const breadcrumbs = computed(() => {
  const matched = route.matched.filter(item => item.meta && item.meta.title)
  return matched.map(item => ({
    path: item.path,
    title: item.meta.title
  }))
})

// 修改密码
const showPasswordDialog = ref(false)
const pwdLoading = ref(false)
const pwdFormRef = ref(null)
const pwdForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const validateConfirm = (rule, value, callback) => {
  if (value !== pwdForm.newPassword) {
    callback(new Error('两次输入密码不一致'))
  } else {
    callback()
  }
}

const pwdRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: validateConfirm, trigger: 'blur' }
  ]
}

function handleCommand(cmd) {
  if (cmd === 'logout') {
    userStore.logout()
  } else if (cmd === 'changePassword') {
    pwdForm.oldPassword = ''
    pwdForm.newPassword = ''
    pwdForm.confirmPassword = ''
    showPasswordDialog.value = true
  }
}

async function submitPassword() {
  const valid = await pwdFormRef.value.validate().catch(() => false)
  if (!valid) return
  pwdLoading.value = true
  try {
    await changePassword(pwdForm)
    ElMessage.success('密码修改成功')
    showPasswordDialog.value = false
  } finally {
    pwdLoading.value = false
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.header {
  height: $header-height;
  background: $bg-sidebar;
  border-bottom: 1px solid $border-color;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: $text-secondary;
  transition: $transition-base;
  &:hover {
    color: $color-primary;
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-name {
  color: $text-regular;
  font-size: 13px;
}

.avatar-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: $text-secondary;
  &:hover {
    color: $color-primary;
  }
}

.admin-avatar {
  background: linear-gradient(135deg, $color-primary, #2196f3);
  color: #fff;
  font-weight: 600;
}

:deep(.el-breadcrumb__inner) {
  color: $text-secondary !important;
  &.is-link {
    color: $text-regular !important;
    &:hover {
      color: $color-primary !important;
    }
  }
}

:deep(.el-breadcrumb__separator) {
  color: $text-secondary !important;
}
</style>

<template>
  <router-view />
</template>

<script setup>
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
// 初始化时尝试从 localStorage 恢复 token
userStore.initToken()
</script>

<style>
#app {
  width: 100%;
  height: 100%;
}
</style>

<template>
  <div class="top-bar">
    <span class="top-bar-title">⛵ 纵横四海</span>
    <span class="top-bar-right">
      {{ userStore.username }} Lv.{{ userStore.level }}
      <a href="#" @click.prevent="logout" class="top-link" style="color:#ff6b6b;margin-left:4px;">退出</a>
    </span>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';
const userStore = useUserStore();
const router = useRouter();
function logout() { userStore.logout(); router.push('/'); }
</script>

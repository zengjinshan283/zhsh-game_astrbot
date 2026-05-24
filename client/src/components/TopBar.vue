<template>
  <div class="top-bar">
    <div class="tb-brand">
      <span class="tb-logo">⛵</span>
      <span class="tb-title">纵横四海</span>
    </div>
    <div class="tb-user">
      <div class="tb-info">
        <span class="tb-name">{{ userStore.username }}</span>
        <span class="tb-level">Lv.{{ userStore.level }}</span>
      </div>
      <a href="javascript:void(0)" class="tb-logout" @click.prevent="logout">退出</a>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';

const userStore = useUserStore();
const router = useRouter();

function logout() { userStore.logout(); router.push('/'); }
</script>

<style scoped>
.top-bar {
  position: fixed; top: 0; left: 0; right: 0; height: 48px; z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 14px;
  background: rgba(13, 17, 23, 0.90); backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}
.tb-brand { display: flex; align-items: center; gap: 8px; }
.tb-logo { font-size: 20px; }
.tb-title { font-size: 15px; font-weight: 800; color: #c9a758; letter-spacing: 1px; }
.tb-user { display: flex; align-items: center; gap: 10px; }
.tb-info { display: flex; align-items: center; gap: 6px; }
.tb-name { font-size: 13px; font-weight: 700; color: #f0f0f0; }
.tb-level {
  font-size: 10px; font-weight: 700; color: #c9a758;
  background: rgba(201, 167, 88, 0.12); padding: 1px 6px; border-radius: 8px;
  border: 1px solid rgba(201, 167, 88, 0.2);
}
.tb-logout {
  font-size: 11px; font-weight: 700; color: #e74c3c;
  text-decoration: none; padding: 3px 8px;
  background: rgba(231, 76, 60, 0.1); border: 1px solid rgba(231, 76, 60, 0.2);
  border-radius: 8px; transition: all 0.2s;
}
.tb-logout:hover { background: rgba(231, 76, 60, 0.2); }
</style>
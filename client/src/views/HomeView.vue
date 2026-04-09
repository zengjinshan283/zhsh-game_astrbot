<template>
  <div class="page" v-if="userStore.isLoggedIn">
    <div class="game-title" style="padding:24px 20px 12px;">
      <h1 style="font-size:28px;">⚓ 纵横四海</h1>
      <div class="divider"></div>
      <p class="subtitle">大航海时代的冒险</p>
      <p class="version">v2.0.0</p>
    </div>
    <StatusBar :user="userStore.user" />
    <router-link to="/map" class="btn btn-primary btn-block">🗺️ 进入游戏</router-link>
    <a href="#" @click.prevent="logout" class="btn btn-secondary btn-block mt-10">🚪 退出登录</a>
  </div>
  <div class="page" v-else>
    <div class="game-title" style="padding:40px 20px 16px;">
      <h1>⚓ 纵横四海</h1>
      <div class="divider"></div>
      <p class="subtitle">大航海时代的文字冒险</p>
      <p class="version">v2.0.0</p>
    </div>
    <div class="card">
      <div class="card-title">📜 游戏简介</div>
      <p style="font-size:13px;line-height:1.7;color:#cfc19e;">
        1453年，奥斯曼帝国攻陷君士坦丁堡，东西方贸易路线被切断。<br><br>
        面对危机，欧洲的航海家们纷纷扬帆远航，寻找通往东方的新航线……<br><br>
        在这个大航海时代，你将作为一名年轻的冒险者，从威尼斯出发，横跨地中海，穿越非洲，探索东亚，驶向印度洋，最终到达神秘的新大陆……
      </p>
    </div>
    <router-link to="/register" class="btn btn-primary btn-block">🚀 创建角色</router-link>
    <router-link to="/login" class="btn btn-secondary btn-block mt-10">🔑 登录游戏</router-link>
  </div>
</template>
<script setup>
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';
import StatusBar from '../components/StatusBar.vue';
const userStore = useUserStore();
const router = useRouter();
function logout() { userStore.logout(); router.push('/'); }
</script>

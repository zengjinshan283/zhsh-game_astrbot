<template>
  <div class="bottom-bar">
    <router-link to="/map" class="bottom-link" :class="{active: $route.path==='/map'}">
      <span class="nav-icon">🗺️</span><span class="nav-text">地图</span>
    </router-link>
    <router-link to="/inventory" class="bottom-link" :class="{active: $route.path==='/inventory'}">
      <span class="nav-icon">🎒</span><span class="nav-text">背包</span>
    </router-link>
    <router-link to="/chat" class="bottom-link" :class="{active: $route.path==='/chat'}">
      <span class="nav-icon">💬</span><span class="nav-text">聊天</span>
    </router-link>
    <a href="javascript:void(0)" class="bottom-link" @click.prevent="showMore=!showMore">
      <span class="nav-icon">☰</span><span class="nav-text">更多</span>
    </a>
  </div>
  <Teleport to="body">
    <div v-if="showMore" class="func-float open">
      <div class="func-overlay-bg" @click="showMore=false"></div>
      <div class="func-panel">
        <div class="func-close-bar" @click="showMore=false"></div>
        <div class="func-scroll">
          <div class="func-grid">
            <router-link to="/status" class="func-btn" @click="showMore=false"><span class="func-emoji">👤</span><span class="func-label">状态</span></router-link>
            <router-link to="/equipment" class="func-btn" @click="showMore=false"><span class="func-emoji">⚔️</span><span class="func-label">装备</span></router-link>
            <router-link to="/quest" class="func-btn" @click="showMore=false"><span class="func-emoji">📋</span><span class="func-label">任务</span></router-link>
            <router-link to="/friend" class="func-btn" @click="showMore=false"><span class="func-emoji">👥</span><span class="func-label">好友</span></router-link>
            <router-link to="/pet" class="func-btn" @click="showMore=false"><span class="func-emoji">🐶</span><span class="func-label">宠物</span></router-link>
            <router-link to="/rank" class="func-btn" @click="showMore=false"><span class="func-emoji">🏆</span><span class="func-label">排行</span></router-link>
            <router-link to="/arena" class="func-btn" @click="showMore=false"><span class="func-emoji">⚔️</span><span class="func-label">竞技场</span></router-link>
            <router-link to="/guild" class="func-btn" @click="showMore=false"><span class="func-emoji">🏴</span><span class="func-label">帮会</span></router-link>
            <router-link to="/welfare" class="func-btn" @click="showMore=false"><span class="func-emoji">🎁</span><span class="func-label">福利</span></router-link>
            <router-link to="/daily" class="func-btn" @click="showMore=false"><span class="func-emoji">📅</span><span class="func-label">每日</span></router-link>
            <router-link to="/mall" class="func-btn" @click="showMore=false"><span class="func-emoji">🛒</span><span class="func-label">商城</span></router-link>
            <router-link to="/codex" class="func-btn" @click="showMore=false"><span class="func-emoji">📜</span><span class="func-label">图鉴</span></router-link>
            <router-link to="/dungeon" class="func-btn" @click="showMore=false"><span class="func-emoji">🏔️</span><span class="func-label">副本</span></router-link>
            <router-link to="/vip" class="func-btn" @click="showMore=false"><span class="func-emoji">👑</span><span class="func-label">月卡</span></router-link>
            <router-link to="/invite" class="func-btn" @click="showMore=false"><span class="func-emoji">🎯</span><span class="func-label">推广</span></router-link>
          </div>
          <div v-if="dynamicBtns.length" class="func-grid" style="margin-top:2px;padding-top:2px;border-top:1px solid rgba(226,183,20,0.1);">
            <template v-for="(b, idx) in dynamicBtns" :key="idx">
              <router-link v-if="b.route" :to="b.route" class="func-btn" :class="b.cls" @click="showMore=false"><span class="func-emoji">{{ b.icon }}</span><span class="func-label">{{ b.label }}</span></router-link>
              <a v-else href="javascript:void(0)" class="func-btn" :class="b.cls" @click="b.action();showMore=false"><span class="func-emoji">{{ b.icon }}</span><span class="func-label">{{ b.label }}</span></a>
            </template>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
<script setup>
import { globalConfirm, globalAlert } from '../composables/useConfirm';
import { ref, computed } from 'vue';
import { useGameStore } from '../stores/game';
import { useUserStore } from '../stores/user';
import { Api } from '../composables/useApi';

const showMore = ref(false);
const gameStore = useGameStore();
const userStore = useUserStore();

async function doHeal() {
  try {
    await Api.post('/map/heal');
    const me = await Api.get('/auth/me');
    userStore.updateUser(me.user);
    await globalAlert('休息完成！体力已完全恢复 ❤️')
  } catch (e) { await globalAlert(e.message) }
}

const dynamicBtns = computed(() => {
  const btns = [];
  const scene = gameStore.scene;
  if (!scene) return btns;
  const p = scene.place;
  if (!p) return btns;
  if (p.type === 1) {
    btns.push({ icon: '⛵', label: '航海', route: '/sail', cls: 'func-highlight' });
  }
  if (p.id === 1024) {
    btns.push({ icon: '🏦', label: '银行', route: '/bank', cls: 'func-highlight' });
  }
  if (p.id === 1031) {
    btns.push({ icon: '⚒️', label: '铁匠', route: '/smith', cls: 'func-highlight' });
  }
  if (p.type === 4) {
    btns.push({ icon: '🏠', label: '休息', action: doHeal, cls: 'func-success' });
  }
  if (scene.city) {
    btns.push({ icon: '🗺️', label: '城内', route: '/citymap/' + scene.city.id, cls: '' });
  }
  return btns;
});
</script>

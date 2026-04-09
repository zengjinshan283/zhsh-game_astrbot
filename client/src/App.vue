<template>
  <div class="app-container">
    <TopBar v-if="userStore.isLoggedIn" />
    <div class="main-content" :class="routeClass">
      <router-view />
    </div>
    <BottomNav v-if="userStore.isLoggedIn && showNav" />
    <BattleOverlay v-if="gameStore.inBattle" />

    <!-- Global Confirm/Alert Modal -->
    <div class="modal-overlay" :class="{active: visible}" v-if="visible" @click.self="confirmCancel" style="z-index:10001;">
      <div class="modal-card" style="background:rgba(20,30,24,0.97);border:2px solid #bc9a58;border-radius:20px;box-shadow:inset 0 1px 3px rgba(0,0,0,0.3),0 15px 30px rgba(0,0,0,0.6);">
        <div class="modal-body" style="padding:20px 16px 16px;text-align:center;">
          <div v-if="title" style="font-size:15px;font-weight:700;color:#f3e1b3;margin-bottom:8px;">{{ title }}</div>
          <div style="font-size:13px;line-height:1.6;color:#ddd0b6;white-space:pre-line;">{{ message }}</div>
        </div>
        <div style="display:flex;gap:10px;padding:0 16px 18px;">
          <button v-if="isConfirm" class="modal-btn" style="flex:1;padding:10px;border-radius:30px;font-size:14px;font-weight:bold;background:#5f4a31;border:1px solid #bb9f6b;color:#f7efdb;cursor:pointer;box-shadow:0 2px 0 #2f2418;" @click="confirmCancel">取消</button>
          <button class="modal-btn" style="flex:1;padding:10px;border-radius:30px;font-size:14px;font-weight:bold;background:#b89b4c;border:1px solid #c9a758;color:#141e0a;cursor:pointer;box-shadow:0 2px 0 #7a6848;" @click="confirmOk">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from './stores/user';
import { useGameStore } from './stores/game';
import TopBar from './components/TopBar.vue';
import BottomNav from './components/BottomNav.vue';
import BattleOverlay from './components/BattleOverlay.vue';
import { useGameWS } from './composables/useGameWS';
import { visible, title, message, isConfirm, confirmOk, confirmCancel } from './composables/useConfirm';

const userStore = useUserStore();
const gameStore = useGameStore();
const route = useRoute();

const showNav = computed(() => {
  const hideOn = ['login', 'register', 'story'];
  return !hideOn.includes(route.name);
});

const routeClass = computed(() => {
  const name = route.name;
  if (name === 'chat') return 'chat-page';
  if (name === 'battle') return 'battle-page';
  return '';
});

if (userStore.isLoggedIn) {
  useGameWS();
}
</script>

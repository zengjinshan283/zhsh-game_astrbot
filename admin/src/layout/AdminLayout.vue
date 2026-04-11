<template>
  <div class="admin-layout">
    <Sidebar />
    <div class="main-container" :class="{ 'is-collapsed': appStore.sidebarCollapsed }">
      <Header />
      <TagsView />
      <div class="app-main">
        <router-view v-slot="{ Component }">
          <transition name="slide-fade" mode="out-in">
            <component :is="Component" :key="route.path" />
          </transition>
        </router-view>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'
import Sidebar from './Sidebar.vue'
import Header from './Header.vue'
import TagsView from './TagsView.vue'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const appStore = useAppStore()
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.admin-layout {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.main-container {
  flex: 1;
  margin-left: $sidebar-width;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  transition: margin-left 0.3s ease;

  &.is-collapsed {
    margin-left: $sidebar-collapsed-width;
  }
}

.app-main {
  flex: 1;
  overflow: hidden;
  background: $bg-primary;
}
</style>

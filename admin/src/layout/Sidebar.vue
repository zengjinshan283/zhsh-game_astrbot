<template>
  <div class="sidebar" :class="{ 'is-collapsed': appStore.sidebarCollapsed }">
    <div class="logo-container">
      <router-link to="/dashboard" class="logo-link">
        <div class="logo-icon">⚓</div>
        <span v-show="!appStore.sidebarCollapsed" class="logo-text">纵横四海</span>
      </router-link>
    </div>

    <el-scrollbar class="sidebar-menu">
      <el-menu
        :default-active="activeMenu"
        :collapse="appStore.sidebarCollapsed"
        :collapse-transition="false"
        router
        background-color="transparent"
        text-color="#b0bec5"
        active-text-color="#4fc3f7"
      >
        <el-menu-item index="/dashboard">
          <el-icon><Odometer /></el-icon>
          <template #title>仪表盘</template>
        </el-menu-item>

        <el-sub-menu index="map-group">
          <template #title>
            <el-icon><MapLocation /></el-icon>
            <span>地图管理</span>
          </template>
          <el-menu-item index="/maps">城市管理</el-menu-item>
          <el-menu-item index="/places">场景管理</el-menu-item>
        </el-sub-menu>

        <el-menu-item index="/npcs">
          <el-icon><User /></el-icon>
          <template #title>NPC管理</template>
        </el-menu-item>

        <el-menu-item index="/monsters">
          <el-icon><KnifeFork /></el-icon>
          <template #title>怪物管理</template>
        </el-menu-item>

        <el-menu-item index="/items">
          <el-icon><Goods /></el-icon>
          <template #title>物品管理</template>
        </el-menu-item>

        <el-menu-item index="/quests">
          <el-icon><List /></el-icon>
          <template #title>任务管理</template>
        </el-menu-item>

        <el-menu-item index="/pets">
          <el-icon><Orange /></el-icon>
          <template #title>宠物管理</template>
        </el-menu-item>

        <el-menu-item index="/ships">
          <el-icon><Ship /></el-icon>
          <template #title>船舶管理</template>
        </el-menu-item>

        <el-menu-item index="/players">
          <el-icon><UserFilled /></el-icon>
          <template #title>玩家管理</template>
        </el-menu-item>

        <el-sub-menu index="system-group">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>系统管理</span>
          </template>
          <el-menu-item index="/configs">游戏配置</el-menu-item>
          <el-menu-item index="/enums">枚举管理</el-menu-item>
          <el-menu-item index="/logs">操作日志</el-menu-item>
        </el-sub-menu>

        <el-menu-item index="/changelogs">
          <el-icon><Notebook /></el-icon>
          <template #title>数据日志</template>
        </el-menu-item>
      </el-menu>
    </el-scrollbar>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const appStore = useAppStore()

const activeMenu = computed(() => {
  return route.path
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: $sidebar-width;
  background: $bg-sidebar;
  border-right: 1px solid $border-color;
  z-index: 1001;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  overflow: hidden;

  &.is-collapsed {
    width: $sidebar-collapsed-width;
  }
}

.logo-container {
  height: $header-height;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid $border-color;
  flex-shrink: 0;
}

.logo-link {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  overflow: hidden;
  white-space: nowrap;
}

.logo-icon {
  font-size: 28px;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  color: $color-primary;
  letter-spacing: 2px;
}

.sidebar-menu {
  flex: 1;
  overflow: hidden;

  :deep(.el-menu) {
    border-right: none;
  }

  :deep(.el-menu-item),
  :deep(.el-sub-menu__title) {
    height: 48px;
    line-height: 48px;
    margin: 2px 8px;
    border-radius: 6px;

    &:hover {
      background-color: $bg-hover !important;
    }

    &.is-active {
      background-color: rgba($color-primary, 0.15) !important;
      color: $color-primary !important;
    }
  }

  :deep(.el-sub-menu .el-menu-item) {
    padding-left: 56px !important;
    min-width: auto;
  }

  :deep(.el-sub-menu.is-active > .el-sub-menu__title) {
    color: $color-primary !important;
  }
}
</style>

<template>
  <div class="tags-view" v-show="tags.length > 0" @click="contextMenu.visible = false">
    <el-scrollbar>
      <div class="tags-wrapper">
        <router-link
          v-for="tag in tags"
          :key="tag.path"
          :to="tag.path"
          class="tag-item"
          :class="{ active: isActive(tag) }"
          @contextmenu.prevent="openContextMenu($event, tag)"
        >
          <span class="tag-dot" />
          <span class="tag-title">{{ tag.title }}</span>
          <el-icon
            v-if="tag.path !== '/dashboard'"
            class="tag-close"
            @click.prevent.stop="closeTag(tag)"
          >
            <Close />
          </el-icon>
        </router-link>
      </div>
    </el-scrollbar>

    <!-- Right-click context menu -->
    <Teleport to="body">
      <div
        v-if="contextMenu.visible"
        class="context-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      >
        <div class="context-menu-item" @click="handleCloseCurrent" v-if="contextMenu.tag?.path !== '/dashboard'">
          <el-icon :size="14"><Close /></el-icon>
          <span>关闭当前</span>
        </div>
        <div class="context-menu-item" @click="handleCloseOthers">
          <el-icon :size="14"><Minus /></el-icon>
          <span>关闭其他</span>
        </div>
        <div class="context-menu-item" @click="handleCloseAll">
          <el-icon :size="14"><CircleClose /></el-icon>
          <span>关闭所有</span>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, watch, reactive, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { Close, Minus, CircleClose } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const contextMenu = reactive({ visible: false, x: 0, y: 0, tag: null })

const tags = computed(() => {
  return appStore.cachedViews.map(path => {
    const matched = router.getRoutes().find(r => r.path === path)
    return {
      path,
      title: matched?.meta?.title || path
    }
  })
})

function isActive(tag) {
  return tag.path === route.path
}

function openContextMenu(e, tag) {
  contextMenu.visible = true
  contextMenu.x = e.clientX
  contextMenu.y = e.clientY
  contextMenu.tag = tag
}

function handleCloseCurrent() {
  if (contextMenu.tag && contextMenu.tag.path !== '/dashboard') {
    closeTag(contextMenu.tag)
  }
  contextMenu.visible = false
}

function handleCloseOthers() {
  const keepPath = contextMenu.tag?.path || route.path
  appStore.closeOtherCachedViews(keepPath)
  if (route.path !== keepPath && route.path !== '/dashboard') {
    router.push(keepPath)
  }
  contextMenu.visible = false
}

function handleCloseAll() {
  appStore.closeAllCachedViews()
  if (route.path !== '/dashboard') {
    router.push('/dashboard')
  }
  contextMenu.visible = false
}

function closeTag(tag) {
  appStore.removeCachedView(tag.path)
  if (tag.path === route.path) {
    const last = appStore.cachedViews[appStore.cachedViews.length - 1]
    router.push(last || '/dashboard')
  }
}

function handleClickOutside() {
  contextMenu.visible = false
}

watch(
  () => route.path,
  (path) => {
    if (route.meta && route.meta.title && !route.meta.hidden) {
      appStore.addCachedView(path)
    }
  },
  { immediate: true }
)

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.tags-view {
  height: 36px;
  background: $bg-sidebar;
  border-bottom: 1px solid $border-color;
  flex-shrink: 0;
  overflow: hidden;
}

.tags-wrapper {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 8px;
  gap: 6px;
}

.tag-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 10px;
  height: 26px;
  border-radius: 4px;
  font-size: 12px;
  color: $text-regular;
  background: $bg-hover;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition: $transition-base;
  border: 1px solid transparent;

  &:hover {
    color: $color-primary;
    border-color: rgba($color-primary, 0.3);
  }

  &.active {
    color: $color-primary;
    background: rgba($color-primary, 0.12);
    border-color: rgba($color-primary, 0.3);
  }
}

.tag-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: $text-secondary;
  flex-shrink: 0;
}

.active .tag-dot {
  background: $color-primary;
}

.tag-title {
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tag-close {
  font-size: 12px;
  margin-left: 2px;
  border-radius: 50%;
  transition: $transition-base;
  &:hover {
    background: rgba($color-danger, 0.3);
    color: $color-danger;
  }
}
</style>

<style lang="scss">
@use '@/styles/variables' as *;

.context-menu {
  position: fixed;
  z-index: 9999;
  background: $bg-card;
  border: 1px solid $border-color;
  border-radius: 6px;
  padding: 4px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 120px;

  .context-menu-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 16px;
    font-size: 13px;
    color: $text-regular;
    cursor: pointer;
    transition: background 0.15s;

    &:hover {
      background: $bg-hover;
      color: $color-primary;
    }
  }
}
</style>

import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)
  const cachedViews = ref(['/dashboard'])
  const activeTag = ref('')

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function addCachedView(view) {
    if (!cachedViews.value.includes(view)) {
      cachedViews.value.push(view)
    }
    activeTag.value = view
  }

  function removeCachedView(view) {
    const idx = cachedViews.value.indexOf(view)
    if (idx > -1) {
      cachedViews.value.splice(idx, 1)
    }
    if (activeTag.value === view) {
      activeTag.value = cachedViews.value[Math.min(idx, cachedViews.value.length - 1)] || ''
    }
  }

  function closeOtherCachedViews(keepPath) {
    cachedViews.value = cachedViews.value.filter(v => v === '/dashboard' || v === keepPath)
    activeTag.value = keepPath
  }

  function closeAllCachedViews() {
    cachedViews.value = ['/dashboard']
    activeTag.value = '/dashboard'
  }

  function setActiveTag(view) {
    activeTag.value = view
  }

  function clearCachedViews() {
    cachedViews.value = ['/dashboard']
    activeTag.value = ''
  }

  return {
    sidebarCollapsed,
    cachedViews,
    activeTag,
    toggleSidebar,
    addCachedView,
    removeCachedView,
    closeOtherCachedViews,
    closeAllCachedViews,
    setActiveTag,
    clearCachedViews
  }
})

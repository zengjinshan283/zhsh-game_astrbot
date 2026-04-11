import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getInfo as fetchInfo } from '@/api/auth'
import router from '@/router'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('admin_token') || '')
  const adminInfo = ref(null)

  const isLoggedIn = computed(() => !!token.value)
  const username = computed(() => adminInfo.value?.username || '')
  const nickname = computed(() => adminInfo.value?.nickname || adminInfo.value?.username || '')
  const role = computed(() => adminInfo.value?.role || '')

  function initToken() {
    const saved = localStorage.getItem('admin_token')
    if (saved) {
      token.value = saved
      fetchAdminInfo().catch(() => {
        logout()
      })
    }
  }

  function setToken(newToken) {
    token.value = newToken
    localStorage.setItem('admin_token', newToken)
  }

  function setAdminInfo(info) {
    adminInfo.value = info
  }

  async function fetchAdminInfo() {
    const res = await fetchInfo()
    adminInfo.value = res.data
    return res.data
  }

  function logout() {
    token.value = ''
    adminInfo.value = null
    localStorage.removeItem('admin_token')
    router.push('/login')
  }

  return {
    token,
    adminInfo,
    isLoggedIn,
    username,
    nickname,
    role,
    initToken,
    setToken,
    setAdminInfo,
    fetchAdminInfo,
    logout
  }
})

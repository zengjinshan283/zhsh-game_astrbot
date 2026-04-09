import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('zhsh_token') || '');
  const user = ref(JSON.parse(localStorage.getItem('zhsh_user') || 'null'));

  const isLoggedIn = computed(() => !!token.value);
  const username = computed(() => user.value?.username || '');
  const level = computed(() => user.value?.level || 1);
  const money = computed(() => user.value?.money || 0);

  function setLogin(data) {
    token.value = data.token;
    user.value = data.user;
    localStorage.setItem('zhsh_token', data.token);
    localStorage.setItem('zhsh_user', JSON.stringify(data.user));
  }

  function updateUser(data) {
    user.value = { ...user.value, ...data };
    localStorage.setItem('zhsh_user', JSON.stringify(user.value));
  }

  function logout() {
    token.value = '';
    user.value = null;
    localStorage.removeItem('zhsh_token');
    localStorage.removeItem('zhsh_user');
  }

  return { token, user, isLoggedIn, username, level, money, setLogin, updateUser, logout };
});

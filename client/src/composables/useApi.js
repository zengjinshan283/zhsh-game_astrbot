/**
 * API 请求封装
 */
import { useUserStore } from '../stores/user';
import { useRouter } from 'vue-router';

const BASE = '/api';

export async function api(path, options = {}) {
  const userStore = useUserStore();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (userStore.isLoggedIn) {
    headers['Authorization'] = `Bearer ${userStore.token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await res.json();

  if (res.status === 401) {
    userStore.logout();
    window.location.href = '/login';
    throw new Error('登录已过期');
  }

  if (!res.ok) throw new Error(data.error || '请求失败');

  return data;
}

export const Api = {
  get: (path) => api(path),
  post: (path, body) => api(path, { method: 'POST', body }),
};

/**
 * API 请求封装
 */
import { useUserStore } from '../stores/user';
import router from '../router';

const BASE = import.meta.env.VITE_API_BASE || '/api';

export async function api(path, options = {}) {
  const userStore = useUserStore();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (userStore.isLoggedIn) {
    headers['Authorization'] = `Bearer ${userStore.token}`;
  }

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
  } catch (e) {
    throw new Error('网络连接失败，请检查网络');
  }

  let data;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error('服务器响应异常');
  }

  if (res.status === 401) {
    userStore.logout();
    router.push('/login');
    throw new Error('登录已过期');
  }

  if (!res.ok) throw new Error(data.error || '请求失败');

  return data;
}

export const Api = {
  get: (path) => api(path),
  post: (path, body) => api(path, { method: 'POST', body }),
};

/**
 * WebSocket 连接管理
 */
import { useUserStore } from '../stores/user';
import { useGameStore } from '../stores/game';
import { globalAlert } from './useConfirm';

let ws = null;
let reconnectAttempts = 0;

export function useGameWS() {
  const userStore = useUserStore();
  const gameStore = useGameStore();

  function connect() {
    if (!userStore.isLoggedIn) return;

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${location.host}/ws`;
    ws = new WebSocket(url);

    ws.onopen = () => {
      reconnectAttempts = 0;
      ws.send(JSON.stringify({ type: 'auth', token: userStore.token }));
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        handleMessage(msg);
      } catch (err) { /* ignore */ }
    };

    ws.onclose = () => {
      if (reconnectAttempts < 30) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        reconnectAttempts++;
        setTimeout(connect, delay);
      }
    };

    ws.onerror = () => { /* ws.onclose will handle */ };
  }

  async function handleMessage(msg) {
    switch (msg.type) {
      case 'auth_ok':
        if (msg.data) useUserStore().updateUser(msg.data);
        break;
      case 'auth_fail':
        useUserStore().logout();
        location.href = '/login';
        break;
      case 'chat_new':
        // 由 ChatView 处理
        break;
      case 'online_update':
        gameStore.setOnlineCount(msg.data?.online_count || 0);
        break;
      case 'kicked':
        await globalAlert(msg.data?.text || '你在其他地方登录了')
        useUserStore().logout();
        location.href = '/login';
        break;
    }
  }

  function send(data) {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(data));
  }

  // 自动连接
  connect();

  return { send, connect };
}

// 全局单例
let instance = null;
export function getGameWS() {
  if (!instance) instance = useGameWS();
  return instance;
}

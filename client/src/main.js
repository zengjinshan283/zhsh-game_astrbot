import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './assets/styles/game.css';
import './assets/styles/design-system.css';
import './assets/styles/animations.css';
import { useTheme } from './composables/useTheme';

// 启动主题
useTheme();

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');

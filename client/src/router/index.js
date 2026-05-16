import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '../stores/user';

const routes = [
  { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
  { path: '/login', name: 'login', component: () => import('../views/LoginView.vue') },
  { path: '/register', name: 'register', component: () => import('../views/RegisterView.vue') },
  { path: '/story', name: 'story', component: () => import('../views/StoryView.vue'), meta: { auth: true } },
  { path: '/map', name: 'map', component: () => import('../views/MapView.vue'), meta: { auth: true } },
  { path: '/shop/:npcId?', name: 'shop', component: () => import('../views/ShopView.vue'), meta: { auth: true } },
  { path: '/bank', name: 'bank', component: () => import('../views/BankView.vue'), meta: { auth: true } },
  { path: '/smith', name: 'smith', component: () => import('../views/SmithView.vue'), meta: { auth: true } },
  { path: '/market', name: 'market', component: () => import('../views/MarketView.vue'), meta: { auth: true } },
  { path: '/sail', name: 'sail', component: () => import('../views/SailView.vue'), meta: { auth: true } },
  { path: '/pet', name: 'pet', component: () => import('../views/PetView.vue'), meta: { auth: true } },
  { path: '/quest', name: 'quest', component: () => import('../views/QuestView.vue'), meta: { auth: true } },
  { path: '/chat', name: 'chat', component: () => import('../views/ChatView.vue'), meta: { auth: true } },
  { path: '/guild', name: 'guild', component: () => import('../views/GuildView.vue'), meta: { auth: true } },
  { path: '/casino', name: 'casino', component: () => import('../views/CasinoView.vue'), meta: { auth: true } },
  { path: '/rank', name: 'rank', component: () => import('../views/RankView.vue'), meta: { auth: true } },
  { path: '/friend', name: 'friend', component: () => import('../views/FriendView.vue'), meta: { auth: true } },
  { path: '/inventory', name: 'inventory', component: () => import('../views/InventoryView.vue'), meta: { auth: true } },
  { path: '/equipment', name: 'equipment', component: () => import('../views/EquipmentView.vue'), meta: { auth: true } },
  { path: '/status', name: 'status', component: () => import('../views/StatusView.vue'), meta: { auth: true } },
  { path: '/player/:id', name: 'player', component: () => import('../views/PlayerView.vue'), meta: { auth: true } },
  { path: '/citymap/:cityId?', name: 'citymap', component: () => import('../views/CityMapView.vue'), meta: { auth: true } },
  { path: '/cdkey', name: 'cdkey', component: () => import('../views/CdkeyView.vue'), meta: { auth: true } },
  { path: '/welfare', name: 'welfare', component: () => import('../views/WelfareView.vue'), meta: { auth: true } },
  { path: '/daily', name: 'daily', component: () => import('../views/DailyView.vue'), meta: { auth: true } },
  { path: '/mall', name: 'mall', component: () => import('../views/MallView.vue'), meta: { auth: true } },
  { path: '/:pathMatch(.*)*', redirect: '/' }
];

const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach((to, from, next) => {
  const userStore = useUserStore();
  if (to.meta.auth && !userStore.isLoggedIn) { next({ name: 'login' }); }
  else { next(); }
});

export default router;

import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录', noAuth: true }
  },
  {
    path: '/',
    component: () => import('@/layout/AdminLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '仪表盘', icon: 'Odometer' }
      },
      {
        path: 'maps',
        name: 'MapList',
        component: () => import('@/views/map/MapList.vue'),
        meta: { title: '地图管理', icon: 'MapLocation' }
      },
      {
        path: 'places',
        name: 'PlaceList',
        component: () => import('@/views/place/PlaceList.vue'),
        meta: { title: '场景管理', icon: 'Location' }
      },
      {
        path: 'npcs',
        name: 'NpcList',
        component: () => import('@/views/npc/NpcList.vue'),
        meta: { title: 'NPC管理', icon: 'User' }
      },
      {
        path: 'monsters',
        name: 'MonsterList',
        component: () => import('@/views/monster/MonsterList.vue'),
        meta: { title: '怪物管理', icon: 'KnifeFork' }
      },
      {
        path: 'items',
        name: 'ItemList',
        component: () => import('@/views/item/ItemList.vue'),
        meta: { title: '物品管理', icon: 'Goods' }
      },
      {
        path: 'quests',
        name: 'QuestList',
        component: () => import('@/views/quest/QuestList.vue'),
        meta: { title: '任务管理', icon: 'List' }
      },
      {
        path: 'pets',
        name: 'PetList',
        component: () => import('@/views/pet/PetList.vue'),
        meta: { title: '宠物管理', icon: 'Orange' }
      },
      {
        path: 'ships',
        name: 'ShipList',
        component: () => import('@/views/ship/ShipList.vue'),
        meta: { title: '船舶管理', icon: 'Ship' }
      },
      {
        path: 'players',
        name: 'PlayerList',
        component: () => import('@/views/player/PlayerList.vue'),
        meta: { title: '玩家管理', icon: 'UserFilled' }
      },
      {
        path: 'players/:id',
        name: 'PlayerDetail',
        component: () => import('@/views/player/PlayerDetail.vue'),
        meta: { title: '玩家详情', hidden: true }
      },
      {
        path: 'configs',
        name: 'GameConfig',
        component: () => import('@/views/system/GameConfig.vue'),
        meta: { title: '游戏配置', icon: 'Setting' }
      },
      {
        path: 'enums',
        name: 'EnumManage',
        component: () => import('@/views/system/EnumManage.vue'),
        meta: { title: '枚举管理', icon: 'Collection' }
      },
      {
        path: 'logs',
        name: 'OperationLog',
        component: () => import('@/views/system/OperationLog.vue'),
        meta: { title: '操作日志', icon: 'Document' }
      },
      {
        path: 'changelogs',
        name: 'DataChangelog',
        component: () => import('@/views/changelog/DataChangelog.vue'),
        meta: { title: '数据日志', icon: 'Notebook' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard'
  }
]

const router = createRouter({
  history: createWebHistory('/admin/'),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('admin_token')
  if (to.meta.noAuth) {
    next()
  } else if (!token) {
    next('/login')
  } else {
    next()
  }
})

export default router

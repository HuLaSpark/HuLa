import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

/**! 创建窗口后再跳转页面就会导致样式没有生效所以不能使用懒加载路由的方式，有些页面需要快速响应的就不需要懒加载 */
const { BASE_URL } = import.meta.env
const routes: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/loginWindow/Login.vue')
  },
  {
    path: '/qrCode',
    name: 'qrCode',
    component: () => import('@/views/loginWindow/QRCode.vue')
  },
  {
    path: '/tray',
    name: 'tray',
    component: () => import('@/views/Tray.vue')
  },
  {
    path: '/capture',
    name: 'capture',
    component: () => import('@/views/Capture.vue')
  },
  {
    path: '/home',
    name: 'home',
    component: () => import('@/layout/index.vue'),
    children: [
      {
        path: '/message',
        name: 'message',
        component: () => import('@/views/homeWindow/message/index.vue')
      },
      {
        path: '/friendsList',
        name: 'friendsList',
        component: () => import('@/views/homeWindow/FriendsList.vue')
      },
      {
        path: '/searchDetails',
        name: 'searchDetails',
        component: () => import('@/views/homeWindow/SearchDetails.vue')
      }
    ]
  },
  {
    path: '/robot',
    name: 'robot',
    component: () => import('@/views/homeWindow/robot/index.vue'),
    children: [
      {
        path: '/welcome',
        name: 'welcome',
        component: () => import('@/views/homeWindow/robot/views/Welcome.vue')
      },
      {
        path: '/chat',
        name: 'chat',
        component: () => import('@/views/homeWindow/robot/views/Chat.vue')
      },
      {
        path: '/chatSettings',
        name: 'chatSettings',
        component: () => import('@/views/homeWindow/robot/views/chatSettings/index.vue')
      }
    ]
  },
  {
    path: '/mail',
    name: 'mail',
    component: () => import('@/views/homeWindow/Mail.vue')
  },
  {
    path: '/dynamic',
    name: 'dynamic',
    component: () => import('@/views/homeWindow/Dynamic.vue')
  },
  {
    path: '/onlineStatus',
    name: 'onlineStatus',
    component: () => import('@/views/homeWindow/onlineStatus/index.vue')
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/homeWindow/more/About.vue')
  },
  {
    path: '/alone',
    name: 'alone',
    component: () => import('@/views/homeWindow/message/Alone.vue')
  },
  {
    path: '/sharedScreen',
    name: 'sharedScreen',
    component: () => import('@/views/homeWindow/SharedScreen.vue')
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/homeWindow/more/settings/index.vue'),
    children: [
      {
        path: '/general',
        name: 'general',
        component: () => import('@/views/homeWindow/more/settings/General.vue')
      },
      {
        path: '/loginSetting',
        name: 'loginSetting',
        component: () => import('@/views/homeWindow/more/settings/LoginSetting.vue')
      },
      {
        path: '/versatile',
        name: 'versatile',
        component: () => import('@/views/homeWindow/more/settings/Versatile.vue')
      }
    ]
  }
]

// 创建路由
const router: any = createRouter({
  history: createWebHistory(BASE_URL),
  routes
})
export default router

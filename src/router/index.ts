import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { Dynamic, About, Mail, OnlineStatus } from './noLazyRouter.ts'

/*! 创建窗口后再跳转页面就会导致样式没有生效所以不能使用懒加载路由的方式 */
const { BASE_URL } = import.meta.env
const routes: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login-window/Login.vue')
  },
  {
    path: '/qrCode',
    name: 'qrCode',
    component: () => import('@/views/login-window/QRCode.vue')
  },
  {
    path: '/home',
    name: 'home',
    component: () => import('@/layout/index.vue'),
    children: [
      {
        path: '/message',
        name: 'message',
        component: () => import('@/views/home-window/Message.vue')
      },
      {
        path: '/friendsList',
        name: 'friendsList',
        component: () => import('@/views/home-window/FriendsList.vue')
      },
      {
        path: '/searchDetails',
        name: 'searchDetails',
        component: () => import('@/views/home-window/SearchDetails.vue')
      }
    ]
  },
  {
    path: '/mail',
    name: 'mail',
    component: Mail
  },
  {
    path: '/dynamic',
    name: 'dynamic',
    component: Dynamic
  },
  {
    path: '/onlineStatus',
    name: 'onlineStatus',
    component: OnlineStatus
  },
  {
    path: '/about',
    name: 'about',
    component: About
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/home-window/more/settings/index.vue'),
    children: [
      {
        path: '/general',
        name: 'general',
        component: () => import('@/views/home-window/more/settings/General.vue')
      },
      {
        path: '/remind',
        name: 'remind',
        component: () => import('@/views/home-window/more/settings/Remind.vue')
      },
      {
        path: '/loginSetting',
        name: 'loginSetting',
        component: () => import('@/views/home-window/more/settings/LoginSetting.vue')
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

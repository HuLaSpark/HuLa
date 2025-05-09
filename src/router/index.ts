import {
  createRouter,
  createWebHistory,
  RouteRecordRaw,
  NavigationGuardNext,
  RouteLocationNormalized
} from 'vue-router'
import { type } from '@tauri-apps/plugin-os'
import MobileLogin from '../mobile/login.vue'
import MobileHome from '../mobile/layout/index.vue'

const isDesktop = computed(() => {
  return type() === 'windows' || type() === 'linux' || type() === 'macos'
})
/**! 创建窗口后再跳转页面就会导致样式没有生效所以不能使用懒加载路由的方式，有些页面需要快速响应的就不需要懒加载 */
const { BASE_URL } = import.meta.env
const routes: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/loginWindow/Login.vue')
  },
  {
    path: '/home',
    name: 'home',
    component: () => import('@/HomePage.vue'),
    // 如果来到了首页，那么重定向到消息页面
    redirect: '/home/message',
    children: [
      {
        path: 'message',
        name: 'message',
        component: () => import('@/MessagePanel.vue'),
        children: [
          {
            path: 'room/:id',
            name: 'message-room',
            component: () => import('@/ChatRoom.vue')
          }
        ]
      },
      {
        path: 'friendsList',
        name: 'friendsList',
        component: () => import('@/FriendsPanel.vue'),
        children: [
          {
            path: 'detail/:uid/:type',
            name: 'detail',
            component: () => import('@/FriendDetail.vue')
          }
        ]
      },
      // TODO 这应该是一个局部组件而不是一个路由？
      {
        path: 'searchDetails',
        name: 'searchDetails',
        component: () => import('@/SearchDetail.vue')
      }
    ]
  },
  {
    path: '/imageViewer',
    name: 'imageViewer',
    component: () => import('@/views/imageViewerWindow/index.vue')
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/registerWindow/index.vue')
  },
  {
    path: '/forgetPassword',
    name: 'forgetPassword',
    component: () => import('@/views/forgetPasswordWindow/index.vue')
  },
  {
    path: '/qrCode',
    name: 'qrCode',
    component: () => import('@/views/loginWindow/QRCode.vue')
  },
  {
    path: '/proxy',
    name: 'proxy',
    component: () => import('@/views/loginWindow/Proxy.vue')
  },
  {
    path: '/tray',
    name: 'tray',
    component: () => import('@/views/Tray.vue')
  },
  {
    path: '/notify',
    name: 'notify',
    component: () => import('@/views/Notify.vue')
  },
  {
    path: '/update',
    name: 'update',
    component: () => import('@/views/Update.vue')
  },
  {
    path: '/capture',
    name: 'capture',
    component: () => import('@/views/Capture.vue')
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/registerWindow/index.vue')
  },
  {
    path: '/qrCode',
    name: 'qrCode',
    component: () => import('@/views/loginWindow/QRCode.vue')
  },
  {
    path: '/proxy',
    name: 'proxy',
    component: () => import('@/views/loginWindow/Proxy.vue')
  },
  {
    path: '/tray',
    name: 'tray',
    component: () => import('@/views/Tray.vue')
  },
  {
    path: '/notify',
    name: 'notify',
    component: () => import('@/views/Notify.vue')
  },
  {
    path: '/update',
    name: 'update',
    component: () => import('@/views/Update.vue')
  },
  {
    path: '/capture',
    name: 'capture',
    component: () => import('@/views/Capture.vue')
  },
  {
    path: '/mobile/login',
    name: 'mobileLogin',
    component: MobileLogin
  },
  {
    path: '/mobile/home',
    name: 'mobileHome',
    component: MobileHome,
    children: [
      // 默认导航第一个子路由
      {
        path: '',
        name: 'mobileMessage',
        redirect: '/mobile/message'
      },
      {
        path: '/mobile/message',
        name: 'mobileMessage',
        component: () => import('@/mobile/views/message/index.vue')
      },
      {
        path: '/mobile/friends',
        name: 'mobileFriends',
        component: () => import('@/mobile/views/friends/index.vue')
      },
      {
        path: '/mobile/my',
        name: 'mobileMy',
        component: () => import('@/mobile/views/my/index.vue')
      }
    ]
  },

  // /**
  //  * 搜索好友/群聊
  //  * @author mint
  //  */
  // {
  //   path: '/searchFriend',
  //   name: 'searchFriend',
  //   component: () => import('@/views/friendWindow/SearchFriend.vue')
  // },
  {
    path: '/addGroupVerify',
    name: 'addGroupVerify',
    component: () => import('@/views/friendWindow/AddGroupVerify.vue')
  },
  // {
  //   path: '/home',
  //   name: 'home',
  //   component: () => import('@/layout/index.vue'),
  //   children: [
  //     {
  //       path: '/message',
  //       name: 'message',
  //       component: () => import('@/views/homeWindow/message/index.vue')
  //     },
  //     {
  //       path: '/friendsList',
  //       name: 'friendsList',
  //       component: () => import('@/views/homeWindow/FriendsList.vue')
  //     },
  //     {
  //       path: '/searchDetails',
  //       name: 'searchDetails',
  //       component: () => import('@/views/homeWindow/SearchDetails.vue')
  //     }
  //   ]
  // },
  {
    path: '/robot',
    name: 'robot',
    component: () => import('@/plugins/robot/index.vue'),
    children: [
      {
        path: '/welcome',
        name: 'welcome',
        component: () => import('@/plugins/robot/views/Welcome.vue')
      },
      {
        path: '/chat',
        name: 'chat',
        component: () => import('@/plugins/robot/views/Chat.vue')
      },
      {
        path: '/chatSettings',
        name: 'chatSettings',
        component: () => import('@/plugins/robot/views/chatSettings/index.vue')
      }
    ]
  },
  {
    path: '/mail',
    name: 'mail',
    component: () => import('@/views/mailWindow/index.vue')
  },
  {
    path: '/dynamic',
    name: 'dynamic',
    component: () => import('@/plugins/dynamic/index.vue')
  },
  {
    path: '/onlineStatus',
    name: 'onlineStatus',
    component: () => import('@/views/onlineStatusWindow/index.vue')
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/aboutWindow/index.vue')
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
    path: '/modal-invite',
    name: 'modal-invite',
    component: () => import('@/views/modalWindow/index.vue')
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/moreWindow/settings/index.vue'),
    children: [
      {
        path: '/general',
        name: 'general',
        component: () => import('@/views/moreWindow/settings/General.vue')
      },
      {
        path: '/loginSetting',
        name: 'loginSetting',
        component: () => import('@/views/moreWindow/settings/LoginSetting.vue')
      },
      {
        path: '/versatile',
        name: 'versatile',
        component: () => import('@/views/moreWindow/settings/Versatile.vue')
      }
    ]
  },
  {
    path: '/announList/:roomId/:type',
    name: 'announList',
    component: () => import('@/views/announWindow/index.vue')
  }
]

// 创建路由
const router: any = createRouter({
  history: createWebHistory(BASE_URL),
  routes
})

// 在创建路由后，添加全局前置守卫
router.beforeEach((to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
  // 如果是桌面端，直接放行
  if (isDesktop.value) {
    return next()
  }

  const token = localStorage.getItem('TOKEN')
  const isLoginPage = to.path === '/mobile/login'

  // 已登录用户访问登录页时重定向到首页
  if (isLoginPage && token) {
    return next('/mobile/home')
  }

  // 未登录用户访问非登录页时重定向到登录页
  if (!isLoginPage && !token) {
    return next('/mobile/login')
  }

  // 其他情况正常放行
  next()
})

export default router

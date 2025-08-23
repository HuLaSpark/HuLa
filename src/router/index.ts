import { type } from '@tauri-apps/plugin-os'
import {
  createRouter,
  createWebHistory,
  type NavigationGuardNext,
  type RouteLocationNormalized,
  type RouteRecordRaw
} from 'vue-router'

/**! 创建窗口后再跳转页面就会导致样式没有生效所以不能使用懒加载路由的方式，有些页面需要快速响应的就不需要懒加载 */
const { BASE_URL } = import.meta.env

const isMobile = type() === 'ios' || type() === 'android'
// 移动端路由配置 - 保持原始的非懒加载设计以避免样式和性能问题
const getMobileRoutes = async (): Promise<Array<RouteRecordRaw>> => {
  // 动态导入移动端组件，但立即解析以避免懒加载问题
  const [
    { default: ChatRoomLayout },
    { default: NoticeLayout },
    { default: MobileHome },
    { default: MyLayout },
    { default: MobileLogin },
    { default: ChatMain },
    { default: ChatSetting },
    { default: NoticeDetail },
    { default: NoticeEdit },
    { default: NoticeList },
    { default: MobileCommunity },
    { default: MobileFriendPage },
    { default: MobileMessagePage },
    { default: EditBio },
    { default: EditBirthday },
    { default: EditProfile },
    { default: MobileMy },
    { default: MobileQRCode },
    { default: MobileSettings },
    { default: MyMessages },
    { default: MyQRCode },
    { default: PublishCommunity },
    { default: Share }
  ] = await Promise.all([
    import('@/mobile/layout/chat-room/ChatRoomLayout.vue'),
    import('@/mobile/layout/chat-room/NoticeLayout.vue'),
    import('@/mobile/layout/index.vue'),
    import('@/mobile/layout/my/MyLayout.vue'),
    import('@/mobile/login.vue'),
    import('@/mobile/views/chat-room/ChatMain.vue'),
    import('@/mobile/views/chat-room/ChatSetting.vue'),
    import('@/mobile/views/chat-room/notice/NoticeDetail.vue'),
    import('@/mobile/views/chat-room/notice/NoticeEdit.vue'),
    import('@/mobile/views/chat-room/notice/NoticeList.vue'),
    import('@/mobile/views/community/index.vue'),
    import('@/mobile/views/friends/index.vue'),
    import('@/mobile/views/message/index.vue'),
    import('@/mobile/views/my/EditBio.vue'),
    import('@/mobile/views/my/EditBirthday.vue'),
    import('@/mobile/views/my/EditProfile.vue'),
    import('@/mobile/views/my/index.vue'),
    import('@/mobile/views/my/MobileQRCode.vue'),
    import('@/mobile/views/my/MobileSettings.vue'),
    import('@/mobile/views/my/MyMessages.vue'),
    import('@/mobile/views/my/MyQRCode.vue'),
    import('@/mobile/views/my/PublishCommunity.vue'),
    import('@/mobile/views/my/Share.vue')
  ])

  return [
    {
      path: '/mobile/login',
      name: 'mobileLogin',
      component: MobileLogin
    },
    {
      path: '/mobile/chatRoom',
      name: 'mobileChatRoom',
      component: ChatRoomLayout, // 这里不能懒加载，不然会出现布局问题
      children: [
        {
          path: '',
          name: 'mobileChatRoomDefault',
          redirect: '/mobile/chatRoom/chatMain'
        },
        {
          path: 'chatMain/:roomName',
          name: 'mobileChatMain',
          component: ChatMain
        },
        {
          path: 'setting',
          name: 'mobileChatSetting',
          component: ChatSetting
        },
        {
          path: 'notice',
          name: 'mobileChatNotice',
          component: NoticeLayout,
          children: [
            {
              path: '',
              name: 'mobileChatNoticeList',
              component: NoticeList
            },
            {
              path: 'edit/:noticeId',
              name: 'mobileChatNoticeEdit',
              component: NoticeEdit
            },
            {
              path: 'detail/:noticeId',
              name: 'mobileChatNoticeDetail',
              component: NoticeDetail
            }
          ]
        }
      ]
    },
    {
      path: '/mobile/home',
      name: 'mobileHome',
      component: MobileHome,
      children: [
        {
          path: '',
          name: 'mobileMessage',
          redirect: '/mobile/message'
        },
        {
          path: '/mobile/message',
          name: 'mobileMessage',
          component: MobileMessagePage
        },
        {
          path: '/mobile/friends',
          name: 'mobileFriends',
          component: MobileFriendPage
        },
        {
          path: '/mobile/community',
          name: 'mobileCommunity',
          component: MobileCommunity
        },
        {
          path: '/mobile/my',
          name: 'mobileMy',
          component: MobileMy
        }
      ]
    },
    {
      path: '/mobile/mobileMy',
      name: 'mobileMyLayout',
      component: MyLayout,
      children: [
        {
          path: '',
          name: 'mobileMyDefault',
          redirect: '/mobile/mobileMy/editProfile'
        },
        {
          path: 'editProfile',
          name: 'mobileEditProfile',
          component: EditProfile
        },
        {
          path: 'myMessages',
          name: 'mobileMyMessages',
          component: MyMessages
        },
        {
          path: 'editBio',
          name: 'mobileEditBio',
          component: EditBio
        },
        {
          path: 'editBirthday',
          name: 'mobileEditBirthday',
          component: EditBirthday
        },
        {
          path: 'publishCommunity',
          name: 'mobilePublishCommunity',
          component: PublishCommunity
        },
        {
          path: 'settings',
          name: 'MobileSettings',
          component: MobileSettings
        },
        {
          path: 'scanQRCode',
          name: 'mobileQRCode',
          component: MobileQRCode
        },
        {
          path: 'share',
          name: 'mobileShare',
          component: Share
        },
        {
          path: 'myQRCode',
          name: 'mobileShare',
          component: MyQRCode
        }
      ]
    }
  ]
}

// 桌面端路由配置
const getDesktopRoutes = (): Array<RouteRecordRaw> => [
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
      },
      {
        path: '/manageStore',
        name: 'manageStore',
        component: () => import('@/views/moreWindow/settings/ManageStore.vue')
      },
      {
        path: '/shortcut',
        name: 'shortcut',
        component: () => import('@/views/moreWindow/settings/Shortcut.vue')
      }
    ]
  },
  {
    path: '/announList/:roomId/:type',
    name: 'announList',
    component: () => import('@/views/announWindow/index.vue')
  },
  {
    path: '/previewFile',
    name: 'previewFile',
    component: () => import('@/views/previewFileWindow/index.vue')
  },
  {
    path: '/rtcCall',
    name: 'rtcCall',
    component: () => import('@/views/callWindow/index.vue')
  },
  {
    path: '/searchFriend',
    name: 'searchFriend',
    component: () => import('@/views/friendWindow/SearchFriend.vue')
  },
  {
    path: '/addFriendVerify',
    name: 'addFriendVerify',
    component: () => import('@/views/friendWindow/AddFriendVerify.vue')
  },
  {
    path: '/addGroupVerify',
    name: 'addGroupVerify',
    component: () => import('@/views/friendWindow/AddGroupVerify.vue')
  }
]

// 通用路由配置（所有平台都需要）
const getCommonRoutes = (): Array<RouteRecordRaw> => [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/loginWindow/Login.vue')
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
    path: '/network',
    name: 'network',
    component: () => import('@/views/loginWindow/Network.vue')
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
    path: '/checkupdate',
    name: 'checkupdate',
    component: () => import('@/views/CheckUpdate.vue')
  },
  {
    path: '/capture',
    name: 'capture',
    component: () => import('@/views/Capture.vue')
  },
  {
    path: '/imageViewer',
    name: 'imageViewer',
    component: () => import('@/views/imageViewerWindow/index.vue')
  },
  {
    path: '/videoViewer',
    name: 'videoViewer',
    component: () => import('@/views/videoViewerWindow/index.vue')
  }
]

// 创建基础路由（通用路由 + 桌面端路由，如果是桌面端的话）
const baseRoutes: Array<RouteRecordRaw> = [...getCommonRoutes(), ...(!isMobile ? getDesktopRoutes() : [])]

// 创建路由
const router: any = createRouter({
  history: createWebHistory(BASE_URL),
  routes: baseRoutes
})

// 移动端异步加载路由
if (isMobile) {
  getMobileRoutes().then((mobileRoutes) => {
    mobileRoutes.forEach((route) => {
      router.addRoute(route)
    })
  })
}

// 在创建路由后，添加全局前置守卫
// 为解决 “已声明‘to’，但从未读取其值” 的问题，将 to 参数改为下划线开头表示该参数不会被使用
router.beforeEach((_to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
  // 如果是桌面端，直接放行
  if (!isMobile) {
    return next()
  }

  // const token = localStorage.getItem('TOKEN')
  // const isLoginPage = to.path === '/mobile/login'

  // // 已登录用户访问登录页时重定向到首页
  // if (isLoginPage && token) {
  //   return next('/mobile/home')
  // }

  // // 未登录用户访问非登录页时重定向到登录页
  // if (!isLoginPage && !token) {
  //   return next('/mobile/login')
  // }

  // 其他情况正常放行
  next()
})

export default router

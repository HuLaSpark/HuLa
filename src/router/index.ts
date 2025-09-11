import { invoke } from '@tauri-apps/api/core'
import { type } from '@tauri-apps/plugin-os'
import {
  createRouter,
  createWebHistory,
  type NavigationGuardNext,
  type RouteLocationNormalized,
  type RouteRecordRaw
} from 'vue-router'

import ChatRoomLayout from '#/layout/chat-room/ChatRoomLayout.vue'
import NoticeLayout from '#/layout/chat-room/NoticeLayout.vue'
import FriendsLayout from '#/layout/friends/FriendsLayout.vue'
import MobileHome from '#/layout/index.vue'
import MyLayout from '#/layout/my/MyLayout.vue'
import MobileLogin from '#/login.vue'
import ChatMain from '#/views/chat-room/ChatMain.vue'
import ChatSetting from '#/views/chat-room/ChatSetting.vue'
import NoticeDetail from '#/views/chat-room/notice/NoticeDetail.vue'
import NoticeEdit from '#/views/chat-room/notice/NoticeEdit.vue'
import NoticeList from '#/views/chat-room/notice/NoticeList.vue'
import MobileCommunity from '#/views/community/index.vue'
import AddFriends from '#/views/friends/AddFriends.vue'
import MobileFriendPage from '#/views/friends/index.vue'
import StartGroupChat from '#/views/friends/StartGroupChat.vue'
import MobileMessagePage from '#/views/message/index.vue'
import EditBio from '#/views/my/EditBio.vue'
import EditBirthday from '#/views/my/EditBirthday.vue'
import EditProfile from '#/views/my/EditProfile.vue'
import FriendInfo from '#/views/my/FriendInfo.vue'
import MobileMy from '#/views/my/index.vue'
import MobileQRCode from '#/views/my/MobileQRCode.vue'
import MobileSettings from '#/views/my/MobileSettings.vue'
import MyMessages from '#/views/my/MyMessages.vue'
import MyQRCode from '#/views/my/MyQRCode.vue'
import PublishCommunity from '#/views/my/PublishCommunity.vue'
import Share from '#/views/my/Share.vue'
import SimpleBio from '#/views/my/SimpleBio.vue'
import { TauriCommand } from '@/enums'

/**! 创建窗口后再跳转页面就会导致样式没有生效所以不能使用懒加载路由的方式，有些页面需要快速响应的就不需要懒加载 */
const { BASE_URL } = import.meta.env

const isMobile = type() === 'ios' || type() === 'android'

// 移动端路由配置 - 使用直接导入避免懒加载问题
const getMobileRoutes = (): Array<RouteRecordRaw> => [
  {
    path: '/',
    name: 'mobileRoot',
    redirect: '/mobile/login'
  },
  {
    path: '/mobile/login',
    name: 'mobileLogin',
    component: MobileLogin
  },
  {
    path: '/mobile/chatRoom',
    name: 'mobileChatRoom',
    component: ChatRoomLayout,
    children: [
      {
        path: '',
        name: 'mobileChatRoomDefault',
        redirect: '/mobile/chatRoom/chatMain'
      },
      {
        path: 'chatMain',
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
            path: 'edit[NO]ticeId',
            name: 'mobileChatNoticeEdit',
            component: NoticeEdit
          },
          {
            path: 'detail[NO]ticeId',
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
        name: 'mobileHomeDefault',
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
        name: 'mobileMyQRCode',
        component: MyQRCode
      },
      {
        path: 'SimpleBio',
        name: 'mobileSimpleBio',
        component: SimpleBio
      },
      {
        path: 'friendInfo',
        name: 'mobileFriendInfo',
        component: FriendInfo
      }
    ]
  },
  {
    path: '/mobile/mobileFriends',
    name: 'mobileFriendsLayout',
    component: FriendsLayout,
    children: [
      {
        path: '',
        name: 'mobileMyDefault',
        redirect: '/mobile/mobileFriends/addFriends'
      },
      {
        path: 'addFriends',
        name: 'mobileAddFriends',
        component: AddFriends
      },
      {
        path: 'startGroupChat',
        name: 'mobileStartGroupChat',
        component: StartGroupChat
      }
    ]
  }
]

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
    path: '/chat-history',
    name: 'chat-history',
    component: () => import('@/views/chatHistory/index.vue')
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
  },
  {
    path: '/modal-serviceAgreement',
    name: 'modal-serviceAgreement',
    component: () => import('@/views/agreementWindow/Server.vue')
  },
  {
    path: '/modal-privacyAgreement',
    name: 'modal-privacyAgreement',
    component: () => import('@/views/agreementWindow/Privacy.vue')
  }
]

// 创建所有路由（通用路由 + 平台特定路由）
const getAllRoutes = (): Array<RouteRecordRaw> => {
  const commonRoutes = getCommonRoutes()
  if (isMobile) {
    return [...commonRoutes, ...getMobileRoutes()]
  } else {
    return [...commonRoutes, ...getDesktopRoutes()]
  }
}

// 创建路由
const router: any = createRouter({
  history: createWebHistory(BASE_URL),
  routes: getAllRoutes()
})

// 在创建路由后，添加全局前置守卫
// 为解决 “已声明‘to’，但从未读取其值” 的问题，将 to 参数改为下划线开头表示该参数不会被使用
router.beforeEach(async (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
  console.log('进入了路由：', from, to)
  // 桌面端直接放行
  if (!isMobile) {
    return next()
  }

  try {
    const tokens = await invoke<{ token: string | null; refreshToken: string | null }>(TauriCommand.GET_USER_TOKENS)
    const isLoginPage = to.path === '/mobile/login'
    const isLoggedIn = !!(tokens.token && tokens.refreshToken)

    // 未登录且不是登录页 → 跳转登录
    if (!isLoggedIn && !isLoginPage) {
      console.error('没有登录')
      return next('/mobile/login')
    }

    // 已登录且访问登录页 → 跳转首页
    if (isLoggedIn && isLoginPage) {
      return next('/mobile/message')
    }

    // 其他情况直接放行
    return next()
  } catch (error) {
    console.error('获取token错误:', error)
    // 出错时也跳转登录页（避免死循环）
    if (to.path !== '/mobile/login') {
      return next('/mobile/login')
    }
    return next()
  }
})

export default router

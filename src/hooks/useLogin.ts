import { emit } from '@tauri-apps/api/event'
import { EventEnum, TauriCommand } from '@/enums'
import { useWindow } from '@/hooks/useWindow.ts'
import { useChatStore } from '@/stores/chat'
import { useGlobalStore } from '@/stores/global.ts'
import { LoginStatus, useWsLoginStore } from '@/stores/ws'
import { isDesktop, isMac, isMobile } from '@/utils/PlatformConstants'
import { clearListener } from '@/utils/ReadCountQueue'
import { ErrorType, invokeSilently, invokeWithErrorHandler } from '@/utils/TauriInvokeHandler.ts'
import { useSettingStore } from '../stores/setting'
import { useGroupStore } from '../stores/group'
import { useCachedStore } from '../stores/cached'
import { useConfigStore } from '../stores/config'
import { useUserStatusStore } from '../stores/userStatus'
import { useUserStore } from '../stores/user'
import { useLoginHistoriesStore } from '../stores/loginHistory'
import rustWebSocketClient from '@/services/webSocketRust'
import { getAllUserState, getUserDetail } from '../utils/ImRequestUtils'
import { useNetwork } from '@vueuse/core'
import { UserInfoType } from '../services/types'
import { getEnhancedFingerprint } from '../services/fingerprint'
import { invoke } from '@tauri-apps/api/core'

export const useLogin = () => {
  const { resizeWindow } = useWindow()
  const globalStore = useGlobalStore()
  const loginStore = useWsLoginStore()
  const chatStore = useChatStore()
  const settingStore = useSettingStore()
  const { isTrayMenuShow } = storeToRefs(globalStore)
  const groupStore = useGroupStore()
  const cachedStore = useCachedStore()
  const configStore = useConfigStore()
  const userStatusStore = useUserStatusStore()
  const userStore = useUserStore()
  const loginHistoriesStore = useLoginHistoriesStore()
  const { createWebviewWindow } = useWindow()
  const router = useRouter()
  /** 网络连接是否正常 */
  const { isOnline } = useNetwork()
  const loading = ref(false)
  /** 登录按钮的文本内容 */
  const loginText = ref(isOnline.value ? '登录' : '网络异常')
  const loginDisabled = ref(!isOnline.value)
  /** 账号信息 */
  const info = ref({
    account: '',
    password: '',
    avatar: '',
    name: '',
    uid: ''
  })
  const uiState = ref<'manual' | 'auto'>()
  /**
   * 设置登录状态(系统托盘图标，系统托盘菜单选项)
   */
  const setLoginState = async () => {
    // 登录成功后删除本地存储的wsLogin，防止用户在二维码页面刷新出二维码但是不使用二维码登录，导致二维码过期或者登录失败
    if (localStorage.getItem('wsLogin')) {
      localStorage.removeItem('wsLogin')
    }
    isTrayMenuShow.value = true
    if (!isMobile()) {
      await resizeWindow('tray', 130, 356)
    }
  }

  /**
   * 登出账号
   */
  const logout = async () => {
    const { createWebviewWindow } = useWindow()
    isTrayMenuShow.value = false
    try {
      // ws 退出连接
      await invokeSilently('ws_disconnect')
      await invokeSilently(TauriCommand.REMOVE_TOKENS)
      await invokeSilently(TauriCommand.UPDATE_USER_LAST_OPT_TIME)
      // 创建登录窗口
      await createWebviewWindow('登录', 'login', 320, 448, undefined, false, 320, 448)
      // 发送登出事件
      if (isDesktop()) {
        await emit(EventEnum.LOGOUT)
      }
      // 调整托盘大小
      await resizeWindow('tray', 130, 44)
    } catch (error) {
      console.error('创建登录窗口失败:', error)
    }
  }

  /** 重置登录的状态 */
  const resetLoginState = async (isAutoLogin = false) => {
    // 清理消息已读计数监听器
    clearListener()
    // 1. 清理本地存储
    if (!isAutoLogin) {
      // TODO 未来这里需要区分账号，切换不同的account；用不同的REFRESH_TOKEN调用
      localStorage.removeItem('user')
      localStorage.removeItem('TOKEN')
      localStorage.removeItem('REFRESH_TOKEN')
    }
    settingStore.closeAutoLogin()
    loginStore.loginStatus = LoginStatus.Init
    // 4. 清除未读数
    chatStore.clearUnreadCount()
    // 5. 清除系统托盘图标上的未读数
    if (isMac()) {
      await invokeWithErrorHandler('set_badge_count', { count: undefined })
    }
  }

  const init = async () => {
    // 连接 ws
    await rustWebSocketClient.initConnect()

    // 用户相关数据初始化
    userStatusStore.stateList = await getAllUserState()
    const userDetail: any = await getUserDetail()
    userStatusStore.stateId = userDetail.userStateId
    const account = {
      ...userDetail,
      client: isDesktop() ? 'PC' : 'MOBILE'
    }
    userStore.userInfo = account
    loginHistoriesStore.addLoginHistory(account)

    // 在 sqlite 中存储用户信息
    await invokeWithErrorHandler(
      TauriCommand.SAVE_USER_INFO,
      {
        userInfo: userDetail
      },
      {
        customErrorMessage: '保存用户信息失败',
        errorType: ErrorType.Client
      }
    )

    // 数据初始化
    const cachedConfig = localStorage.getItem('config')
    if (cachedConfig) {
      configStore.config = JSON.parse(cachedConfig).config
    } else {
      await configStore.initConfig()
    }
    // 加载所有会话
    await chatStore.getSessionList(true)
    // 设置全局会话为第一个
    globalStore.currentSessionRoomId = chatStore.sessionList[0].roomId

    // 加载所有群的成员数据
    const groupSessions = chatStore.getGroupSessions()
    await Promise.all([
      ...groupSessions.map((session) => groupStore.getGroupUserList(session.roomId, true)),
      groupStore.setGroupDetails(),
      chatStore.setAllSessionMsgList(20),
      cachedStore.getAllBadgeList()
    ])
    // 强制持久化
    groupStore.$persist()
    chatStore.$persist()
    cachedStore.$persist()
    globalStore.$persist()

    await setLoginState()
    await routerOrOpenHomeWindow()
  }

  const routerOrOpenHomeWindow = async () => {
    if (isDesktop()) {
      await createWebviewWindow('HuLa', 'home', 960, 720, 'login', true, undefined, 480, undefined, false)
      // 只有在成功创建home窗口并且已登录的情况下才显示托盘菜单
      globalStore.isTrayMenuShow = true
    } else {
      router.push('/mobile/home')
    }
  }

  const normalLogin = async (deviceType: 'PC' | 'MOBILE', auto: boolean = settingStore.login.autoLogin) => {
    loading.value = true
    loginText.value = '登录中...'
    loginDisabled.value = true
    // 根据auto参数决定从哪里获取登录信息
    const loginInfo = auto ? (userStore.userInfo as UserInfoType) : info.value
    const { account } = loginInfo

    // 存储此次登陆设备指纹
    const clientId = await getEnhancedFingerprint()
    localStorage.setItem('clientId', clientId)

    invoke('login_command', {
      data: {
        account: account,
        password: info.value.password,
        deviceType: deviceType,
        systemType: '2',
        clientId: clientId,
        grantType: 'PASSWORD',
        isAutoLogin: auto,
        uid: auto ? userStore.userInfo!.uid : null
      }
    })
      .then(async (_: any) => {
        loginDisabled.value = true
        loading.value = false
        loginText.value = '登录成功正在跳转...'
        init()

        // 移动端登录成功之后，自动设置为自动登录
        if (isMobile()) {
          await invoke('hide_splash_screen')
          settingStore.setAutoLogin(true)
        }
      })
      .catch((e: any) => {
        console.error('登录异常：', e)
        window.$message.error(e)
        loading.value = false
        loginDisabled.value = false
        loginText.value = '登录'
        // 如果是自动登录失败，切换到手动登录界面并重置按钮状态
        if (auto) {
          uiState.value = 'manual'
          loginDisabled.value = false
          loginText.value = '登录'
          // 取消自动登录
          settingStore.setAutoLogin(false)
          // 自动填充之前尝试登录的账号信息到手动登录表单
          if (userStore.userInfo) {
            info.value.account = userStore.userInfo.account || userStore.userInfo.email || ''
            info.value.avatar = userStore.userInfo.avatar
            info.value.name = userStore.userInfo.name
            info.value.uid = userStore.userInfo.uid
          }
          if (isMobile()) {
            router.replace('/mobile/login')
          }
        }
      })
  }

  return {
    resetLoginState,
    setLoginState,
    logout,
    normalLogin,
    loading,
    loginText,
    loginDisabled,
    info,
    uiState
  }
}

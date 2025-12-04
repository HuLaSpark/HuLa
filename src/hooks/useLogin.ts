import { emit } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useRouter } from 'vue-router'
import { EventEnum, MittEnum, TauriCommand } from '@/enums'
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
import { useEmojiStore } from '@/stores/emoji'
import { getAllUserState, getUserDetail } from '../utils/ImRequestUtils'
import { useNetwork } from '@vueuse/core'
import { UserInfoType } from '../services/types'
import { getEnhancedFingerprint } from '../services/fingerprint'
import { invoke } from '@tauri-apps/api/core'
import { useMitt } from './useMitt'
import { info as logInfo } from '@tauri-apps/plugin-log'
import { ensureAppStateReady } from '@/utils/AppStateReady'
import { useI18nGlobal } from '../services/i18n'
import { useInitialSyncStore } from '@/stores/initialSync'

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
  const initialSyncStore = useInitialSyncStore()
  const { createWebviewWindow } = useWindow()

  const { t } = useI18nGlobal()

  /**
   * 在 composable 初始化时获取 router 实例
   * 注意: useRouter() 必须在组件 setup 上下文中调用
   * 不能在异步回调中调用 useRouter(),因为那时已经失去了 Vue 组件上下文
   * 所以在这里提前获取并保存 router 实例,供后续异步操作使用
   */
  let router: ReturnType<typeof useRouter> | null = null
  try {
    router = useRouter()
  } catch (e) {
    console.warn('[useLogin] 无法获取 router 实例,可能不在组件上下文中:', e)
  }

  /** 网络连接是否正常 */
  const { isOnline } = useNetwork()
  const loading = ref(false)
  /** 登录按钮的文本内容 */
  const loginText = ref(isOnline.value ? t('login.button.login.default') : t('login.button.login.network_error'))
  const loginDisabled = ref(!isOnline.value)
  /** 账号信息 */
  const info = ref({
    account: '',
    password: '',
    avatar: '',
    name: '',
    uid: ''
  })
  const uiState = ref<'manual' | 'auto'>('manual')
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
    const sendLogoutEvent = async () => {
      // ws 退出连接
      await invokeSilently('ws_disconnect')
      await invokeSilently(TauriCommand.REMOVE_TOKENS)
      await invokeSilently(TauriCommand.UPDATE_USER_LAST_OPT_TIME)
    }

    if (isDesktop()) {
      const { createWebviewWindow } = useWindow()
      isTrayMenuShow.value = false
      try {
        await sendLogoutEvent()
        // 创建登录窗口
        await createWebviewWindow('登录', 'login', 320, 448, undefined, false, 320, 448)
        // 发送登出事件
        await emit(EventEnum.LOGOUT)

        // 调整托盘大小
        await resizeWindow('tray', 130, 44)
      } catch (error) {
        console.error('创建登录窗口失败:', error)
      }
    } else {
      try {
        await sendLogoutEvent()
        // 发送登出事件
        await emit(EventEnum.LOGOUT)
      } catch (error) {
        console.error('登出失败:', error)
        window.$message.error('登出失败')
      }
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
    globalStore.updateCurrentSessionRoomId('')
    // 2. 清除系统托盘图标上的未读数
    if (isMac()) {
      await invokeWithErrorHandler('set_badge_count', { count: undefined })
    }
  }

  // 全量同步
  const runFullSync = async () => {
    await chatStore.getSessionList(true)
    // 重置当前选中会话，等待用户主动选择
    globalStore.updateCurrentSessionRoomId('')

    // 加载所有群的成员数据
    const groupSessions = chatStore.getGroupSessions()
    await Promise.all([
      ...groupSessions.map((session) => groupStore.getGroupUserList(session.roomId, true)),
      groupStore.setGroupDetails(),
      chatStore.setAllSessionMsgList(20),
      cachedStore.getAllBadgeList()
    ])
  }

  // 增量同步
  const runIncrementalSync = async () => {
    // 优先保证会话列表最新消息和未读数：拉会话即可让未读/最新一条消息就绪
    await chatStore.getSessionList(true)
    globalStore.updateCurrentSessionRoomId('')

    // 后台同步消息：登录命令已触发一次全量/离线同步，这里避免重复拉取；仅在需要时再显式调用
    // 将消息预取和其他预热放后台，避免阻塞 UI
    await Promise.allSettled([
      chatStore.setAllSessionMsgList(20),
      groupStore.setGroupDetails(),
      cachedStore.getAllBadgeList()
    ]).catch((error) => {
      console.warn('[useLogin] 增量预热任务失败:', error)
    })
  }

  const init = async (options?: { isInitialSync?: boolean }) => {
    const emojiStore = useEmojiStore()
    // 初始化前清空当前选中的会话，避免自动打开会话
    globalStore.updateCurrentSessionRoomId('')
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
    // 初始化表情列表并在后台预取本地缓存（使用 worker + 并发限制）
    void emojiStore.initEmojis().catch((error) => {
      console.warn('[login] 初始化表情失败:', error)
    })

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
    const isInitialSync = options?.isInitialSync ?? !initialSyncStore.isSynced(account.uid)

    // 登录后立即预热表情本地缓存（异步，不阻塞后续流程）
    void emojiStore.prefetchEmojiToLocal().catch((error) => {
      console.warn('[login] 预热表情缓存失败:', error)
    })

    if (isInitialSync) {
      chatStore.syncLoading = true
      try {
        await runFullSync()
      } finally {
        chatStore.syncLoading = false
      }
    } else {
      chatStore.syncLoading = true
      try {
        await runIncrementalSync()
      } finally {
        // 增量登录仅等待会话准备好就关闭提示，后台同步继续进行
        chatStore.syncLoading = false
      }
    }
    // 强制持久化
    chatStore.$persist?.()
    cachedStore.$persist?.()
    globalStore.$persist?.()

    await setLoginState()
  }

  /**
   * 根据平台类型执行不同的跳转逻辑
   * 桌面端: 创建主窗口
   * 移动端: 路由跳转到主页
   */
  const routerOrOpenHomeWindow = async () => {
    if (isDesktop()) {
      const registerWindow = await WebviewWindow.getByLabel('register')
      if (registerWindow) {
        await registerWindow.close().catch((error) => {
          console.warn('关闭注册窗口失败:', error)
        })
      }
      await createWebviewWindow('HuLa', 'home', 960, 720, 'login', true, 330, 480, undefined, false)
      // 只有在成功创建home窗口并且已登录的情况下才显示托盘菜单
      globalStore.isTrayMenuShow = true
    } else {
      // 移动端使用路由跳转
      router?.push('/mobile/home')
    }
  }

  const normalLogin = async (
    deviceType: 'PC' | 'MOBILE',
    syncRecentMessages: boolean,
    auto: boolean = settingStore.login.autoLogin
  ) => {
    loading.value = true
    loginText.value = t('login.status.logging_in')
    loginDisabled.value = true
    const hasStoredUserInfo = !!userStore.userInfo && !!userStore.userInfo.account
    if (auto && !hasStoredUserInfo) {
      loading.value = false
      loginDisabled.value = false
      loginText.value = isOnline.value ? t('login.button.login.default') : t('login.button.login.network_error')
      uiState.value = 'manual'
      settingStore.setAutoLogin(false)
      logInfo('自动登录信息已失效，请手动登录')
      return
    }

    // 根据auto参数决定从哪里获取登录信息
    const loginInfo = auto && userStore.userInfo ? (userStore.userInfo as UserInfoType) : info.value
    const account = loginInfo?.account
    const password = loginInfo?.password ?? info.value.password
    if (!account) {
      loading.value = false
      loginDisabled.value = false
      loginText.value = isOnline.value ? '登录' : '网络异常'
      if (auto) {
        uiState.value = 'manual'
        settingStore.setAutoLogin(false)
      }
      logInfo('账号信息缺失，请重新输入')
      return
    }

    // 存储此次登陆设备指纹
    const clientId = await getEnhancedFingerprint()
    localStorage.setItem('clientId', clientId)

    await ensureAppStateReady()

    invoke('login_command', {
      data: {
        account: account,
        password: password,
        deviceType: deviceType,
        systemType: '2',
        clientId: clientId,
        grantType: 'PASSWORD',
        isAutoLogin: auto,
        asyncData: syncRecentMessages,
        uid: auto ? userStore.userInfo!.uid : null
      }
    })
      .then(async (_: any) => {
        loginDisabled.value = true
        loading.value = false
        loginText.value = t('login.status.success_redirect')

        // 仅在移动端的首次手动登录时，才默认打开自动登录开关
        if (!auto && isMobile()) {
          settingStore.setAutoLogin(true)
        }

        // 移动端登录之后，初始化数据
        if (isMobile()) {
          await init()
          await invoke('hide_splash_screen') // 初始化完再关闭启动页
        }
        ;+useMitt.emit(MittEnum.MSG_INIT)

        await routerOrOpenHomeWindow()
      })
      .catch((e: any) => {
        console.error('登录异常：', e)
        window.$message.error(e)
        loading.value = false
        loginDisabled.value = false
        loginText.value = t('login.button.login.default')
        // 如果是自动登录失败，切换到手动登录界面并重置按钮状态
        if (auto) {
          uiState.value = 'manual'
          loginDisabled.value = false
          loginText.value = t('login.button.login.default')
          // 取消自动登录
          settingStore.setAutoLogin(false)
          // 自动填充之前尝试登录的账号信息到手动登录表单
          if (userStore.userInfo) {
            info.value.account = userStore.userInfo.account || userStore.userInfo.email || ''
            info.value.avatar = userStore.userInfo.avatar
            info.value.name = userStore.userInfo.name
            info.value.uid = userStore.userInfo.uid
          }
          // Token 过期时,移动端跳转到登录页
          if (isMobile()) {
            router?.replace('/mobile/login')
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
    uiState,
    init
  }
}

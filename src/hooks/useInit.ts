import { useChatStore } from '@/stores/chat'
import { useGlobalStore } from '@/stores/global'
import { useGroupStore } from '@/stores/group'
import { useCachedStore } from '@/stores/cached'
import { useConfigStore } from '@/stores/config'
import rustWebSocketClient from '@/services/webSocketRust'
import { useUserStatusStore } from '@/stores/userStatus'
import { getAllUserState, getUserDetail } from '@/utils/ImRequestUtils'
import { useUserStore } from '@/stores/user'
import { useLoginHistoriesStore } from '@/stores/loginHistory'
import { ErrorType, invokeWithErrorHandler } from '@/utils/TauriInvokeHandler'
import { TauriCommand } from '@/enums'
import { useLogin } from './useLogin'
import { isDesktop } from '../utils/PlatformConstants'
import { useWindow } from './useWindow'

export const useInit = () => {
  const chatStore = useChatStore()
  const globalStore = useGlobalStore()
  const groupStore = useGroupStore()
  const cachedStore = useCachedStore()
  const configStore = useConfigStore()
  const userStatusStore = useUserStatusStore()
  const userStore = useUserStore()
  const loginHistoriesStore = useLoginHistoriesStore()
  const { setLoginState } = useLogin()
  const { createWebviewWindow } = useWindow()
  const router = useRouter()

  const init = async () => {
    // 连接 ws
    await rustWebSocketClient.initConnect()

    // 用户相关数据初始化
    userStatusStore.stateList = await getAllUserState()
    const userDetail: any = await getUserDetail()
    userStatusStore.stateId = userDetail.userStateId
    const account = {
      ...userDetail
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

    await setLoginState()
    if (isDesktop()) {
      await openHomeWindow()
    } else {
      router.push('/mobile/message')
    }

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
  }

  const openHomeWindow = async () => {
    await createWebviewWindow('HuLa', 'home', 960, 720, 'login', true, undefined, 480, undefined, false)
    // 只有在成功创建home窗口并且已登录的情况下才显示托盘菜单
    globalStore.isTrayMenuShow = true
  }

  return {
    init
  }
}

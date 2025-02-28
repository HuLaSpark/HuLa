import { emit } from '@tauri-apps/api/event'
import { EventEnum, RoomTypeEnum } from '@/enums'
import { useWindow } from '@/hooks/useWindow.ts'
import { useGlobalStore } from '@/stores/global.ts'
import { type } from '@tauri-apps/plugin-os'
import { invoke } from '@tauri-apps/api/core'
import { LoginStatus, useWsLoginStore } from '@/stores/ws'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { clearListener } from '@/utils/ReadCountQueue'

const isMobile = computed(() => type() === 'android' || type() === 'ios')
export const useLogin = () => {
  const { resizeWindow } = useWindow()
  const globalStore = useGlobalStore()
  const loginStore = useWsLoginStore()
  const userStore = useUserStore()
  const chatStore = useChatStore()
  const { isTrayMenuShow } = storeToRefs(globalStore)
  /**
   * 设置登录状态(系统托盘图标，系统托盘菜单选项)
   */
  const setLoginState = async () => {
    // 登录成功后删除本地存储的wsLogin，防止用户在二维码页面刷新出二维码但是不使用二维码登录，导致二维码过期或者登录失败
    if (localStorage.getItem('wsLogin')) {
      localStorage.removeItem('wsLogin')
    }
    isTrayMenuShow.value = true
    if (!isMobile.value) {
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
      // 创建登录窗口
      await createWebviewWindow('登录', 'login', 320, 448, 'home', false, 320, 448)
      // 调整托盘大小
      await resizeWindow('tray', 130, 44)
      // 发送登出事件
      await emit(EventEnum.LOGOUT)
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
    // 2. 重置用户状态
    userStore.isSign = false
    userStore.userInfo = {}
    loginStore.loginStatus = LoginStatus.Init
    // 3. 重置当前会话为默认值
    globalStore.currentSession.roomId = '1'
    globalStore.currentSession.type = RoomTypeEnum.GROUP
    // 4. 清除未读数
    chatStore.clearUnreadCount()
    // 5. 清除系统托盘图标上的未读数
    await invoke('set_badge_count', { count: null })
  }

  return {
    resetLoginState,
    setLoginState,
    logout
  }
}

import { emit } from '@tauri-apps/api/event'
import { EventEnum } from '@/enums'
import { useWindow } from '@/hooks/useWindow.ts'

export const useLogin = () => {
  /**
   * 设置登录状态(系统托盘图标，系统托盘菜单选项)
   */
  const setLoginState = async () => {
    // 登录成功后删除本地存储的wsLogin，防止用户在二维码页面刷新出二维码但是不使用二维码登录，导致二维码过期或者登录失败
    if (localStorage.getItem('wsLogin')) {
      localStorage.removeItem('wsLogin')
    }
    await emit('login_success')
  }

  /**
   * 登出账号
   */
  const logout = async () => {
    const { createWebviewWindow } = useWindow()
    // todo 退出账号 需要关闭其他的全部窗口
    await createWebviewWindow('登录', 'login', 320, 448, 'home', false, 320, 448).then(() => {
      emit(EventEnum.LOGOUT)
      emit('logout_success')
    })
  }

  return {
    setLoginState,
    logout
  }
}

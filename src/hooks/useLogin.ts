import { emit } from '@tauri-apps/api/event'
import axios from 'axios'
import { EventEnum } from '@/enums'
import { useWindow } from '@/hooks/useWindow.ts'

export const useLogin = () => {
  /**
   * 设置登录状态(系统托盘图标，系统托盘菜单选项)
   */
  const setLoginState = async () => {
    await emit('login_success')
  }

  /** 登出账号 */

  const logout = async () => {
    const { createWebviewWindow } = useWindow()
    localStorage.removeItem('USER_INFO')
    localStorage.removeItem('TOKEN')
    // 清空axios请求头
    const instance = axios.create()
    instance.defaults.headers.common.Authorization = ''
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

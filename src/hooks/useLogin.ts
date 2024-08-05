import { emit } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/tauri'
import axios from 'axios'
import { delay } from 'lodash-es'
import { EventEnum } from '@/enums'
import { useWindow } from '@/hooks/useWindow.ts'

export const useLogin = () => {
  /**
   * 设置登录状态(系统托盘图标，系统托盘菜单选项)
   */
  const setLoginState = async () => {
    await emit('login_success')
    await invoke('set_main_icon').catch((error) => {
      console.error('设置主要图标失败:', error)
    })
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
    await createWebviewWindow('登录', 'login', 320, 448, 'home', true, false, 320, 448).then(() => {
      /** 给一点延迟，不然创建登录窗口后还没有来得及设置阴影和圆角效果 */
      delay(async () => {
        /** 如果图标在闪烁则先暂停闪烁 */
        await invoke('tray_blink', { isRun: false }).catch((error) => {
          console.error('暂停闪烁失败:', error)
        })
        /** 通知全部打开的窗口然后关闭 */
        await emit(EventEnum.LOGOUT)
        await emit('logout_success')
      }, 300)
    })
  }

  return {
    setLoginState,
    logout
  }
}

import { emit } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/tauri'

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

  return {
    setLoginState
  }
}

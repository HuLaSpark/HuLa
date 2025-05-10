import { defineStore } from 'pinia'
import { CloseBxEnum, StoresEnum, ShowModeEnum, ThemeEnum } from '@/enums'
import { type } from '@tauri-apps/plugin-os'

// TODO 使用indexDB或sqlite缓存数据，还需要根据每个账号来进行配置 (nyh -> 2024-03-26 01:22:12)
const isDesktop = computed(() => {
  return type() === 'windows' || type() === 'linux' || type() === 'macos'
})
export const useSettingStore = defineStore(StoresEnum.SETTING, {
  state: (): STO.Setting => ({
    themes: {
      content: '',
      pattern: '',
      versatile: isDesktop.value ? 'default' : 'simple'
    },
    escClose: true,
    showMode: ShowModeEnum.ICON,
    lockScreen: {
      enable: false,
      password: ''
    },
    tips: {
      type: CloseBxEnum.HIDE,
      notTips: false
    },
    login: {
      autoLogin: false,
      autoStartup: false
    },
    chat: {
      sendKey: 'Enter',
      isDouble: true,
      translate: 'tencent'
    },
    page: {
      shadow: true,
      fonts: 'PingFang',
      blur: true
    },
    update: {
      dismiss: ''
    }
  }),
  actions: {
    /** 初始化主题 */
    initTheme(theme: string) {
      this.themes.content = theme
      document.documentElement.dataset.theme = theme
      this.themes.pattern = theme
    },
    /** 切换主题 */
    toggleTheme(theme: string) {
      if (theme === ThemeEnum.OS) {
        this.themes.pattern = theme
        const os = matchMedia('(prefers-color-scheme: dark)').matches ? ThemeEnum.DARK : ThemeEnum.LIGHT
        document.documentElement.dataset.theme = os
        this.themes.content = os
      } else {
        this.themes.content = theme
        document.documentElement.dataset.theme = theme
        this.themes.pattern = theme
      }
    },
    /** 切换登录设置 */
    toggleLogin(autoLogin: boolean, autoStartup: boolean) {
      this.login.autoLogin = autoLogin
      this.login.autoStartup = autoStartup
    },
    /** 设置菜单显示模式 */
    setShowMode(showMode: ShowModeEnum): void {
      this.showMode = showMode
    }
  },
  share: {
    enable: true,
    initialize: true
  }
})

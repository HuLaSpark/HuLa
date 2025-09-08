import { defineStore } from 'pinia'
import { CloseBxEnum, ShowModeEnum, StoresEnum, ThemeEnum } from '@/enums'
import { isDesktop, isMac } from '@/utils/PlatformConstants'

// 获取平台对应的默认快捷键
const getDefaultShortcuts = () => {
  return {
    screenshot: isMac() ? 'Cmd+Ctrl+H' : 'Ctrl+Alt+H',
    openMainPanel: isMac() ? 'Cmd+Ctrl+P' : 'Ctrl+Alt+P',
    globalEnabled: false // 默认关闭全局快捷键
  }
}

// TODO 使用indexDB或sqlite缓存数据，还需要根据每个账号来进行配置 (nyh -> 2024-03-26 01:22:12)
const isDesktopComputed = computed(() => isDesktop())
export const useSettingStore = defineStore(StoresEnum.SETTING, {
  state: (): STO.Setting => ({
    themes: {
      content: '',
      pattern: '',
      versatile: isDesktopComputed.value ? 'default' : 'simple'
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
    shortcuts: getDefaultShortcuts(),
    page: {
      shadow: true,
      fonts: 'PingFang',
      blur: true
    },
    update: {
      dismiss: ''
    },
    screenshot: {
      isConceal: false
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
    setShowMode(showMode: ShowModeEnum) {
      this.showMode = showMode
    },
    /** 设置截图快捷键 */
    setScreenshotShortcut(shortcut: string) {
      if (!this.shortcuts) {
        this.shortcuts = getDefaultShortcuts()
      }
      this.shortcuts.screenshot = shortcut
    },
    /** 设置打开主面板快捷键 */
    setOpenMainPanelShortcut(shortcut: string) {
      if (!this.shortcuts) {
        this.shortcuts = getDefaultShortcuts()
      }
      this.shortcuts.openMainPanel = shortcut
    },
    /** 设置发送消息快捷键 */
    setSendMessageShortcut(shortcut: string) {
      if (!this.chat) {
        this.chat = { sendKey: 'Enter', isDouble: true, translate: 'tencent' }
      }
      this.chat.sendKey = shortcut
    },
    /** 设置全局快捷键开关状态 */
    setGlobalShortcutEnabled(enabled: boolean) {
      if (!this.shortcuts) {
        this.shortcuts = getDefaultShortcuts()
      }
      this.shortcuts.globalEnabled = enabled
    },
    closeAutoLogin() {
      this.login.autoLogin = false
    },
    /** 设置截图时是否隐藏窗口 */
    setScreenshotConceal(isConceal: boolean) {
      if (!this.screenshot) {
        this.screenshot = { isConceal: false }
      }
      this.screenshot.isConceal = isConceal
    }
  },
  share: {
    enable: true,
    initialize: true
  }
})

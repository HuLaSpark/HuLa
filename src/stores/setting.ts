import { defineStore } from 'pinia'
import { CloseBxEnum, ShowModeEnum, StoresEnum, ThemeEnum } from '@/enums'
import { isDesktop, isMac } from '@/utils/PlatformConstants'
import { setTheme } from '@tauri-apps/api/app'
import type { Theme } from '@tauri-apps/api/window'

// 获取平台对应的默认快捷键
const getDefaultShortcuts = () => {
  return {
    screenshot: isMac() ? 'Cmd+Ctrl+H' : 'Ctrl+Alt+H',
    openMainPanel: isMac() ? 'Cmd+Ctrl+P' : 'Ctrl+Alt+P',
    globalEnabled: false // 默认关闭全局快捷键
  }
}

const normalizeTheme = (theme: string) => {
  if (theme === ThemeEnum.DARK) return ThemeEnum.DARK
  if (theme === ThemeEnum.LIGHT) return ThemeEnum.LIGHT
  return ThemeEnum.LIGHT
}

const resolveOsTheme = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return ThemeEnum.LIGHT
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? ThemeEnum.DARK : ThemeEnum.LIGHT
}

const setDocumentTheme = (theme: string) => {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
}

// TODO 使用indexDB或sqlite缓存数据，还需要根据每个账号来进行配置 (nyh -> 2024-03-26 01:22:12)
const isDesktopComputed = computed(() => isDesktop())
export const useSettingStore = defineStore(StoresEnum.SETTING, {
  state: (): STO.Setting => ({
    themes: {
      content: '',
      pattern: ThemeEnum.OS,
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
      translate: 'youdao'
    },
    shortcuts: getDefaultShortcuts(),
    page: {
      shadow: true,
      fonts: 'PingFang',
      blur: true,
      lang: 'AUTO'
    },
    update: {
      dismiss: ''
    },
    screenshot: {
      isConceal: false
    },
    notification: {
      messageSound: true
    }
  }),
  actions: {
    /** 初始化主题 */
    initTheme(theme: string) {
      const nextPattern = theme === ThemeEnum.OS ? ThemeEnum.OS : normalizeTheme(theme)
      const nextContent = theme === ThemeEnum.OS ? resolveOsTheme() : normalizeTheme(theme)
      this.$patch((state) => {
        state.themes.pattern = nextPattern
        state.themes.content = nextContent
      })
      setDocumentTheme(nextContent)
      setTheme(Object.is(theme, 'os') ? null : (theme as Theme))
    },
    /** 切换主题 */
    toggleTheme(theme: string) {
      setTheme(Object.is(theme, 'os') ? null : (theme as Theme))
      if (theme === ThemeEnum.OS) {
        const os = resolveOsTheme()
        this.$patch((state) => {
          state.themes.pattern = ThemeEnum.OS
          state.themes.content = os
        })
        setDocumentTheme(os)
        return
      }
      const nextTheme = normalizeTheme(theme)
      this.$patch((state) => {
        state.themes.pattern = nextTheme
        state.themes.content = nextTheme
      })
      setDocumentTheme(nextTheme)
    },
    /** 同步系统主题到内容（仅在跟随系统时生效） */
    syncOsTheme() {
      if (this.themes.pattern !== ThemeEnum.OS) return
      const os = resolveOsTheme()
      if (this.themes.content !== os) {
        this.$patch((state) => {
          state.themes.content = os
        })
      }
      setDocumentTheme(os)
    },
    /** 兜底修正主题状态 */
    normalizeThemeState() {
      if (this.themes.pattern === ThemeEnum.OS) {
        this.syncOsTheme()
        return
      }
      const nextTheme = normalizeTheme(this.themes.pattern || this.themes.content)
      if (this.themes.pattern !== nextTheme || this.themes.content !== nextTheme) {
        this.$patch((state) => {
          state.themes.pattern = nextTheme
          state.themes.content = nextTheme
        })
      }
      setDocumentTheme(nextTheme)
    },
    /** 切换登录设置 */
    toggleLogin(autoLogin: boolean, autoStartup: boolean) {
      this.login.autoLogin = autoLogin
      this.login.autoStartup = autoStartup
    },

    setAutoLogin(autoLogin: boolean) {
      this.login.autoLogin = autoLogin
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
        this.chat = { sendKey: 'Enter', isDouble: true, translate: 'youdao' }
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
    },
    /** 设置消息提示音开关 */
    setMessageSoundEnabled(enabled: boolean) {
      if (!this.notification) {
        this.notification = { messageSound: true }
      }
      this.notification.messageSound = enabled
    }
  },
  share: {
    enable: true,
    initialize: true
  }
})

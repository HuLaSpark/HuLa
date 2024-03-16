import { defineStore } from 'pinia'
import { StoresEnum, ThemeEnum } from '@/enums'

export const setting = defineStore(StoresEnum.SETTING, {
  state: (): STO.Setting => ({
    /* 主题设置 */
    themes: {
      content: '',
      pattern: ''
    },
    /* 登录设置 */
    login: {
      autoLogin: false,
      autoStartup: false,
      /* 用户保存的登录信息 */
      accountInfo: {
        account: '',
        password: '',
        name: '',
        avatar: ''
      }
    }
  }),
  actions: {
    /* 初始化 */
    init(theme: string) {
      this.themes.content = theme
      document.documentElement.dataset.theme = theme
      this.themes.pattern = theme
    },
    /* 切换主题 */
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
    /* 切换登录设置 */
    toggleLogin(autoLogin: boolean, autoStartup: boolean) {
      this.login.autoLogin = autoLogin
      this.login.autoStartup = autoStartup
    },
    /* 设置用户保存的登录信息 */
    setAccountInfo(accountInfo: STO.Setting['login']['accountInfo']) {
      this.login.accountInfo = accountInfo
    },
    /* 清空账号信息 */
    clearAccount() {
      this.login.accountInfo = { account: '', avatar: '', name: '', password: '' }
    }
  }
})

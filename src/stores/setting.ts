import { defineStore } from 'pinia'
import { CloseBxEnum, StoresEnum, ThemeEnum } from '@/enums'
import apis from '@/services/apis.ts'
import { isDiffNow10Min } from '@/utils/ComputedTime.ts'
import type { CacheBadgeItem } from '@/services/types.ts'

const badgeCachedList = reactive<Record<number, Partial<CacheBadgeItem>>>({})
// TODO 使用indexDB或者把配置写出到文件中，还需要根据每个账号来进行配置 (nyh -> 2024-03-26 01:22:12)
export const setting = defineStore(StoresEnum.SETTING, {
  state: (): STO.Setting => ({
    themes: {
      content: '',
      pattern: '',
      versatile: 'default'
    },
    escClose: true,
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
      autoStartup: false,
      accountInfo: {
        account: '',
        password: '',
        name: '',
        avatar: '',
        uid: 0,
        token: ''
      },
      badgeList: []
    },
    chat: {
      sendKey: 'Enter',
      isDouble: true
    },
    page: {
      shadow: true,
      fonts: 'PingFang'
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
    /** 设置用户保存的登录信息 */
    setAccountInfo(accountInfo: STO.Setting['login']['accountInfo']) {
      this.login.accountInfo = accountInfo
    },
    /** 批量获取用户徽章详细信息 */
    async getBatchBadgeInfo(itemIds: number[]) {
      // 没有 lastModifyTime 的要更新，lastModifyTime 距离现在 10 分钟已上的也要更新
      const result = itemIds
        .map((itemId) => {
          const cacheBadge = badgeCachedList[itemId]
          return { itemId, lastModifyTime: cacheBadge?.lastModifyTime }
        })
        .filter((item) => !item.lastModifyTime || isDiffNow10Min(item.lastModifyTime))
      if (!result.length) return
      const { data } = await apis.getBadgesBatch(result)
      data?.forEach(
        (item: CacheBadgeItem) =>
          // 更新最后更新时间。
          (badgeCachedList[item.itemId] = {
            ...(item?.needRefresh ? item : badgeCachedList[item.itemId]),
            needRefresh: void 0,
            lastModifyTime: Date.now()
          })
      )
    },
    /** 清空账号信息 */
    clearAccount() {
      this.login.accountInfo.password = ''
    }
  },
  share: {
    enable: true,
    initialize: true
  }
})

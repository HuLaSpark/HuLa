import { defineStore } from 'pinia'
import { ThemeEnum } from '@/enums'

export const theme = defineStore('theme', {
  state: () => {
    return {
      /* 主题 */
      THEME: 'light',
      /* 选中的主题模式 */
      PATTERN: 'light'
    }
  },
  actions: {
    initTheme(theme: string) {
      this.THEME = theme
      document.documentElement.dataset.theme = theme
      this.PATTERN = theme
      localStorage.setItem('theme', JSON.stringify({ THEME: theme, PATTERN: theme }))
    },
    toggleTheme(theme: string) {
      if (theme === ThemeEnum.OS) {
        this.PATTERN = theme
        const os = matchMedia('(prefers-color-scheme: dark)').matches ? ThemeEnum.DARK : ThemeEnum.LIGHT
        document.documentElement.dataset.theme = os
        this.THEME = os
      } else {
        this.THEME = theme
        document.documentElement.dataset.theme = theme
        this.PATTERN = theme
      }
    }
  },
  //开启数据持久化
  persist: true
})

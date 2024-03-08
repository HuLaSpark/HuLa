import { defineStore } from 'pinia'
import { ThemeEnum } from '@/enums'

export const theme = defineStore('theme', {
  state: () => ({
    /* 主题 */
    THEME: '',
    /* 选中的主题模式 */
    PATTERN: ''
  }),
  actions: {
    initTheme(theme: string) {
      this.THEME = theme
      document.documentElement.dataset.theme = theme
      this.PATTERN = theme
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
  }
})

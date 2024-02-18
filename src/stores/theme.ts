import { defineStore } from 'pinia'

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
    toggleTheme(theme: string) {
      if (theme === 'os') {
        this.PATTERN = theme
        const os = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
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

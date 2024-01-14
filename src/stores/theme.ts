import { defineStore } from 'pinia'

export const theme = defineStore('theme', {
  state: () => {
    return {
      /*背景颜色*/
      BGC: '#FFF',
      /*是否切换护眼主题*/
      EYE_THEME: false
    }
  },
  actions: {
    toggleTheme() {
      this.EYE_THEME = !!this.EYE_THEME
      this.BGC = this.BGC === '#FFF' ? '#18181c' : '#FFF'
    }
  },
  //开启数据持久化
  persist: true
})

import { defineStore } from 'pinia'
import { EventEnum, StoresEnum } from '@/enums'
import { statusItem } from '@/views/home-window/onlineStatus/config.ts'
import { emit } from '@tauri-apps/api/event'
import Colorthief from 'colorthief'

const colorthief = new Colorthief()
export const onlineStatus = defineStore(StoresEnum.ONLINE_STATUS, {
  state: (): OPT.Online => ({
    url: '',
    title: '',
    bgColor: ''
  }),
  actions: {
    init() {
      /* 随机获取一个状态 */
      const index = Math.floor(Math.random() * statusItem.length)
      const { url, title } = statusItem[index]
      this.title = title
      this.url = url
      const img = new Image()
      img.src = url
      img.onload = async () => {
        const colors = await colorthief.getColor(img, 3)
        this.bgColor = `rgba(${colors.join(',')}, 0.4)`
        await emit(EventEnum.SET_OL_STS, { url: url, title: title, bgColor: this.bgColor })
      }
    },
    setOnlineStatus(url: string, title: string) {
      this.url = url
      this.title = title
    },
    setColor(color: string) {
      this.bgColor = color
    }
  }
})

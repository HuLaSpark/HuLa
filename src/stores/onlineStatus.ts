import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'
import { statusItem } from '@/views/homeWindow/onlineStatus/config.ts'
import Colorthief from 'colorthief'

const colorthief = new Colorthief()
export const onlineStatus = defineStore(StoresEnum.ONLINE_STATUS, {
  state: (): STO.OnlineStatus => ({
    url: '',
    title: '',
    bgColor: ''
  }),
  actions: {
    init() {
      /** 随机获取一个状态 */
      const index = Math.floor(Math.random() * statusItem.length)
      const { url, title } = statusItem[index]
      this.title = title
      this.url = url
      const img = new Image()
      img.src = url
      img.onload = async () => {
        const colors = await colorthief.getColor(img, 3)
        this.bgColor = `rgba(${colors.join(',')}, 0.4)`
      }
    },
    setOnlineStatus(url: string, title: string) {
      this.url = url
      this.title = title
      const img = new Image()
      img.src = url
      img.onload = async () => {
        const colors = await colorthief.getColor(img, 3)
        this.bgColor = `rgba(${colors.join(',')}, 0.4)`
      }
    }
  },
  share: {
    enable: true,
    initialize: true
  }
})

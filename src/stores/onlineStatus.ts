import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'

export const onlineStatus = defineStore(StoresEnum.ONLINE_STATUS, {
  state: () => ({
    url: '',
    title: ''
  }),
  actions: {
    setOnlineStatus(url: string, title: string) {
      this.url = url
      this.title = title
    }
  }
})

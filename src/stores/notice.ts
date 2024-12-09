import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'

export const useNoticeStore = defineStore(
  StoresEnum.NOTICE,
  () => {
    const systemNotice = ref(false)

    return {
      systemNotice
    }
  },
  {
    share: {
      enable: true
    }
  }
)

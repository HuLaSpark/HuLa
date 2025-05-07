import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'
import { fetchModel } from '@/plugins/robot/api'

export const useAiChatStore = defineStore(StoresEnum.AICHAT, () => {
  const aiModels: any = ref([])
  const InitModels = () => {
    fetchModel({
      current: 1,
      size: 10,
      model: ''
    }).then((res: any) => {
      aiModels.value = res
    })
  }

  return { InitModels, aiModels }
})

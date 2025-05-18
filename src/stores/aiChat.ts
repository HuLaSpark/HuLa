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
      aiModels.value.forEach((item: any) => {
        item.label = item.name + '(' + item.version + ')'
        item.key = item.version
      })
      console.log(aiModels.value)
    })
  }

  return { InitModels, aiModels }
})

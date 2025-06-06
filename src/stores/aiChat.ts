import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'
import { ModelApi } from '@/plugins/robot/api/model/model'

export const useAiChatStore = defineStore(StoresEnum.AICHAT, () => {
  const aiModels: any = ref([])
  const InitModels = () => {
    ModelApi.getModelPage({
      pageNo: 1,
      pageSize: -1
    }).then((res: any) => {
      console.log(res)
      aiModels.value = []
      res.list.forEach((item: any) => {
        item.label = item.name
        item.key = item.model
        item.value = item.model
        aiModels.value.push({
          label: item.platform + ':' + item.name,
          value: item.id,
          disabled: false
        })
      })
      console.log('aiModels.value:', aiModels.value)
    })
  }

  return { InitModels, aiModels }
})

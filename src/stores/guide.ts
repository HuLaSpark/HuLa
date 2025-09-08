import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'

export const useGuideStore = defineStore(
  StoresEnum.GUIDE,
  () => {
    /** 引导完成状态 */
    const isGuideCompleted = ref(false)

    /**
     * 标记引导为已完成
     */
    const markGuideCompleted = () => {
      isGuideCompleted.value = true
    }

    /**
     * 重置引导状态
     */
    const resetGuideStatus = () => {
      isGuideCompleted.value = false
    }

    return {
      isGuideCompleted,
      markGuideCompleted,
      resetGuideStatus
    }
  },
  {
    share: {
      enable: true,
      initialize: true
    }
  }
)

import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'

export const useImageViewer = defineStore(
  StoresEnum.IMAGEVIEWER,
  () => {
    const imageList = ref<string[]>([])
    const currentIndex = ref(0)

    // 添加一个重置方法,用于设置新的图片列表
    const resetImageList = (list: string[], index: number) => {
      // 去重但保持原有顺序
      imageList.value = Array.from(new Set(list))
      currentIndex.value = index
    }

    return {
      imageList,
      currentIndex,
      resetImageList
    }
  },
  {
    share: {
      enable: true,
      initialize: true
    }
  }
)

import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'

export const useImageViewer = defineStore(
  StoresEnum.IMAGEVIEWER,
  () => {
    const imageList = ref<string[]>([])
    const currentIndex = ref(0)

    // 添加一个重置方法,用于设置新的图片列表
    const resetImageList = (list: string[], originalIndex: number) => {
      // 创建一个去重后的新数组，同时保持原有顺序
      const uniqueList: string[] = []
      const seenUrls = new Set<string>()

      for (const url of list) {
        if (!seenUrls.has(url)) {
          uniqueList.push(url)
          seenUrls.add(url)
        }
      }

      // 找到原始图片在去重后的新列表中的索引
      const newIndex = uniqueList.indexOf(list[originalIndex])

      imageList.value = uniqueList
      currentIndex.value = newIndex !== -1 ? newIndex : 0
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

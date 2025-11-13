import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'

export const useImageViewer = defineStore(
  StoresEnum.IMAGEVIEWER,
  () => {
    const imageList = ref<string[]>([])
    const currentIndex = ref(0)
    const originalImageList = ref<string[]>([])
    // 单图模式相关变量
    const singleImage = ref('')
    const isSingleMode = ref(false)

    // 添加一个重置方法,用于设置新的图片列表
    const resetImageList = (list: string[], originalIndex: number, originalList?: string[]) => {
      isSingleMode.value = false
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
      originalImageList.value = (originalList && originalList.length > 0 ? originalList : uniqueList).slice()
    }

    // 设置单图的方法
    const setSingleImage = (url: string) => {
      singleImage.value = url
      isSingleMode.value = true
      const singleList = url ? [url] : []
      originalImageList.value = singleList.slice()
      imageList.value = singleList.slice()
      currentIndex.value = 0
    }

    const updateImageAt = (index: number, newUrl: string) => {
      if (!imageList.value[index]) {
        return
      }
      imageList.value[index] = newUrl
    }

    const updateSingleImageSource = (url: string) => {
      if (isSingleMode.value) {
        singleImage.value = url
      }
    }

    return {
      imageList,
      currentIndex,
      resetImageList,
      originalImageList,
      singleImage,
      isSingleMode,
      setSingleImage,
      updateImageAt,
      updateSingleImageSource
    }
  },
  {
    share: {
      enable: true,
      initialize: true
    }
  }
)

import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'

// 由于原函数名 useImageViewer 包含图片相关字样，这里改为 useVideoViewer
export const useVideoViewer = defineStore(
  StoresEnum.VIDEOVIEWER, // 假设这里枚举值可以修改为 VIDEOVIEWER
  () => {
    const imageList = ref<string[]>([])
    const currentIndex = ref(0)
    // 单图模式相关变量
    const singleImage = ref('')
    const isSingleMode = ref(false)

    // 视频相关变量
    const videoList = ref<string[]>([])
    const currentVideoIndex = ref(0)
    // 单视频模式相关变量
    const singleVideo = ref('')
    const isSingleVideoMode = ref(false)

    // 添加一个重置方法,用于设置新的图片列表
    const resetImageList = (list: string[], originalIndex: number) => {
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
    }

    // 设置单图的方法
    const setSingleImage = (url: string) => {
      singleImage.value = url
      isSingleMode.value = true
    }

    // 添加一个重置方法,用于设置新的视频列表
    // 优化后的重置视频列表方法，逻辑不变，命名更清晰
    const resetVideoListOptimized = (list: string[], originalIndex: number) => {
      isSingleVideoMode.value = false
      const uniqueList: string[] = []
      const seenUrls = new Set<string>()

      for (const url of list) {
        if (!seenUrls.has(url)) {
          uniqueList.push(url)
          seenUrls.add(url)
        }
      }

      const newIndex = uniqueList.indexOf(list[originalIndex])

      videoList.value = uniqueList
      currentVideoIndex.value = newIndex !== -1 ? newIndex : 0
    }

    // 优化后的设置单视频方法，逻辑不变，命名更清晰
    const setSingleVideoOptimized = (url: string) => {
      singleVideo.value = url
      isSingleVideoMode.value = true
    }

    return {
      imageList,
      currentIndex,
      resetImageList,
      singleImage,
      isSingleMode,
      setSingleImage,
      videoList,
      currentVideoIndex,
      resetVideoListOptimized,
      singleVideo,
      isSingleVideoMode,
      setSingleVideoOptimized
    }
  },
  {
    share: {
      enable: true,
      initialize: true
    }
  }
)

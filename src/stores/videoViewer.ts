import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'

export const useVideoViewer = defineStore(
  StoresEnum.VIDEOVIEWER,
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

    // 用于设置新的视频列表
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

    const setSingleVideoOptimized = (url: string) => {
      singleVideo.value = url
      isSingleVideoMode.value = true
    }

    // 更新视频列表中的特定视频路径（用于下载完成后更新为本地路径）
    const updateVideoPath = (originalUrl: string, newPath: string) => {
      const index = videoList.value.findIndex((url) => url === originalUrl)
      if (index !== -1) {
        videoList.value[index] = newPath
      }
      // 如果当前单视频模式的视频是被更新的视频，也要更新
      if (singleVideo.value === originalUrl) {
        singleVideo.value = newPath
      }
    }

    // 批量更新视频路径（用于批量处理本地路径）
    const updateVideoListPaths = (pathMapping: Record<string, string>) => {
      videoList.value = videoList.value.map((url) => pathMapping[url] || url)
      // 更新单视频模式的路径
      if (singleVideo.value && pathMapping[singleVideo.value]) {
        singleVideo.value = pathMapping[singleVideo.value]
      }
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
      setSingleVideoOptimized,
      updateVideoPath,
      updateVideoListPaths
    }
  },
  {
    share: {
      enable: true,
      initialize: true
    }
  }
)

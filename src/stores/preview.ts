import { defineStore } from 'pinia'

export const useImgPreviewStore = defineStore('image', () => {
  const previewUrl = ref('') // 图片预览链接
  const isShowing = ref(false) // 图片预览是否显示

  /**
   * 开启图片预览
   * @param url 图片链接
   */
  const show = (url: string) => {
    previewUrl.value = url
    isShowing.value = true
  }
  /**
   * 关闭图片预览
   */
  const close = () => {
    isShowing.value = false
    previewUrl.value = ''
  }

  return {
    previewUrl,
    isShowing,
    show,
    close
  }
})

/**
 * 音频预览Store
 */
export const useVoicePreviewStore = defineStore('voice', () => {
  const previewUrl = ref('') // 音频预览链接
  const isPlaying = ref(false) // 音频是否正在播放
  const progress = ref(0) // 音频播放进度
  const audio = ref<HTMLAudioElement | null>(null) // 音频播放器

  /**
   * 关闭音频预览
   */
  const close = () => {
    isPlaying.value = false
    progress.value = 0
    audio.value?.pause()
    //  显式移除事件监听
    audio.value?.removeEventListener('ended', () => {})
    audio.value = null
  }

  /**
   * 开启音频预览
   */
  const open = async (url: string) => {
    if (isPlaying.value && previewUrl.value === url) {
      close()
      return
    }
    close()
    previewUrl.value = url
    audio.value = new Audio(url)
    await audio.value.play()
    isPlaying.value = true
    audio.value.addEventListener('ended', () => close())
  }

  return {
    previewUrl,
    isPlaying,
    close,
    open
  }
})

/**
 * 视频预览Store
 */
export const useVideoPreviewStore = defineStore('video', () => {
  const previewUrl = ref('') // 预览链接
  const isPlaying = ref(false) // 是否正在播放

  /**
   * 开启视频预览
   */
  const open = (url: string) => {
    previewUrl.value = url
    isPlaying.value = true
  }

  /**
   * 关闭视频预览
   */
  const close = () => {
    previewUrl.value = ''
    isPlaying.value = false
  }

  return {
    previewUrl,
    isPlaying,
    open,
    close
  }
})

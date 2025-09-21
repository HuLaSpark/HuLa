import type { Ref } from 'vue'
import { audioManager } from '@/utils/AudioManager'

export type AudioPlaybackReturn = {
  // 状态
  isPlaying: Ref<boolean>
  loading: Ref<boolean>
  currentTime: Ref<number>
  playbackProgress: Ref<number>
  audioElement: Ref<HTMLAudioElement | null>

  // 播放位置记忆
  lastPlayPosition: Ref<number>
  hasBeenPlayed: Ref<boolean>
  shouldResumeFromPosition: Ref<boolean>

  // 方法
  togglePlayback: () => Promise<void>
  createAudioElement: (audioUrl: string, audioId: string, duration: number) => Promise<void>
  seekToTime: (time: number) => void
  cleanup: () => void
}

/**
 * 音频播放控制Hook
 * @param audioId 音频唯一标识
 * @param onTimeUpdate 时间更新回调
 * @returns 播放控制接口
 */
export const useAudioPlayback = (
  audioId: string,
  onTimeUpdate?: (currentTime: number, progress: number) => void
): AudioPlaybackReturn => {
  const isPlaying = ref(false)
  const loading = ref(false)
  const currentTime = ref(0)
  const playbackProgress = ref(0)
  const audioElement = ref<HTMLAudioElement | null>(null)

  const lastPlayPosition = ref(0) // 最后播放位置（秒）
  const hasBeenPlayed = ref(false) // 是否曾经播放过
  const shouldResumeFromPosition = ref(false) // 是否应从记忆位置恢复

  /**
   * 增强的边界处理
   */
  const enhancedClampTime = (time: number, maxTime: number = 0) => {
    if (!Number.isFinite(time) || isNaN(time)) {
      return 0
    }

    const max = Math.max(0, maxTime)
    return Math.max(0, Math.min(max, time))
  }

  /**
   * 音频状态变化监听器
   */
  const handleAudioStateChange = () => {
    const currentId = audioManager.getCurrentAudioId()
    // 如果当前播放的不是本组件的音频，则重置播放状态
    if (currentId !== audioId && isPlaying.value) {
      // 在切换前记忆当前位置
      if (audioElement.value && audioElement.value.currentTime > 0) {
        lastPlayPosition.value = audioElement.value.currentTime
        shouldResumeFromPosition.value = true
      }

      isPlaying.value = false
    }
  }

  /**
   * 创建音频元素并设置事件监听
   * @param audioUrl 音频URL
   * @param id 音频ID
   * @param duration 音频时长
   */
  const createAudioElement = async (audioUrl: string, _id: string, duration: number) => {
    if (audioElement.value) return

    audioElement.value = new Audio(audioUrl)

    // 设置事件监听
    audioElement.value.addEventListener('loadstart', () => {
      loading.value = true
    })

    audioElement.value.addEventListener('canplay', () => {
      loading.value = false

      // 音频准备就绪后，检查是否需要恢复播放位置
      if (shouldResumeFromPosition.value && lastPlayPosition.value > 0) {
        try {
          const clampedPosition = enhancedClampTime(lastPlayPosition.value, duration)
          audioElement.value!.currentTime = clampedPosition
          currentTime.value = clampedPosition
          const progress = (clampedPosition / audioElement.value!.duration) * 100
          playbackProgress.value = progress || 0
          shouldResumeFromPosition.value = false // 重置标志
        } catch (error) {
          console.warn('恢复播放位置失败:', error)
          // 恢复失败时清理状态
          lastPlayPosition.value = 0
          shouldResumeFromPosition.value = false
        }
      }
    })

    audioElement.value.addEventListener('timeupdate', () => {
      if (audioElement.value) {
        currentTime.value = audioElement.value.currentTime
        const progress = (audioElement.value.currentTime / audioElement.value.duration) * 100
        playbackProgress.value = progress || 0

        // 实时更新播放位置记忆（仅在正常播放时）
        if (isPlaying.value) {
          lastPlayPosition.value = audioElement.value.currentTime
          hasBeenPlayed.value = true
        }

        // 调用时间更新回调
        onTimeUpdate?.(currentTime.value, playbackProgress.value)
      }
    })

    audioElement.value.addEventListener('ended', () => {
      isPlaying.value = false
      currentTime.value = 0
      playbackProgress.value = 0

      // 播放结束时清理位置记忆
      lastPlayPosition.value = 0
      hasBeenPlayed.value = false
      shouldResumeFromPosition.value = false

      // 通知外部播放结束
      onTimeUpdate?.(0, 0)
    })

    audioElement.value.addEventListener('error', () => {
      loading.value = false
      isPlaying.value = false
    })

    // 添加音频管理器监听器
    audioManager.addListener(handleAudioStateChange)
  }

  /**
   * 切换播放状态
   */
  const togglePlayback = async () => {
    if (loading.value || !audioElement.value) return

    try {
      // 如果当前是播放状态，则暂停并记忆位置
      if (isPlaying.value) {
        // 记忆当前播放位置
        if (audioElement.value) {
          lastPlayPosition.value = audioElement.value.currentTime
          shouldResumeFromPosition.value = true
        }

        audioManager.pause()
        isPlaying.value = false
        return
      }

      // 检查是否需要恢复播放位置
      if (shouldResumeFromPosition.value && lastPlayPosition.value > 0) {
        const clampedPosition = enhancedClampTime(lastPlayPosition.value, audioElement.value.duration)
        audioElement.value.currentTime = clampedPosition
        currentTime.value = clampedPosition
        const progress = (clampedPosition / audioElement.value.duration) * 100
        playbackProgress.value = progress || 0
        shouldResumeFromPosition.value = false
      }

      // 开始播放
      await audioManager.play(audioElement.value, audioId)
      isPlaying.value = true
      hasBeenPlayed.value = true
    } catch (error) {
      console.error('播放控制错误:', error)
      isPlaying.value = false
      loading.value = false

      // 错误时清理状态
      lastPlayPosition.value = 0
      shouldResumeFromPosition.value = false
    }
  }

  /**
   * 跳转到指定时间
   * @param time 目标时间（秒）
   */
  const seekToTime = (time: number) => {
    if (!audioElement.value) return

    const clampedTime = enhancedClampTime(time, audioElement.value.duration)

    if (Number.isFinite(clampedTime) && !isNaN(clampedTime)) {
      audioElement.value.currentTime = clampedTime
      currentTime.value = clampedTime
      const progress = (clampedTime / audioElement.value.duration) * 100
      playbackProgress.value = progress || 0

      // 更新播放位置记忆
      lastPlayPosition.value = clampedTime
    }
  }

  /**
   * 清理资源
   */
  const cleanup = () => {
    // 移除音频管理器监听器
    audioManager.removeListener(handleAudioStateChange)

    // 清理音频元素
    if (audioElement.value) {
      try {
        audioElement.value.pause()
        audioElement.value.src = ''
        audioElement.value.load() // 重置音频元素
      } catch (error) {
        console.warn('清理音频元素时出现错误:', error)
      } finally {
        audioElement.value = null
      }
    }

    // 重置状态
    isPlaying.value = false
    loading.value = false
    currentTime.value = 0
    playbackProgress.value = 0
    lastPlayPosition.value = 0
    hasBeenPlayed.value = false
    shouldResumeFromPosition.value = false
  }

  return {
    // 状态
    isPlaying,
    loading,
    currentTime,
    playbackProgress,
    audioElement,

    // 播放位置记忆
    lastPlayPosition,
    hasBeenPlayed,
    shouldResumeFromPosition,

    // 方法
    togglePlayback,
    createAudioElement,
    seekToTime,
    cleanup
  }
}

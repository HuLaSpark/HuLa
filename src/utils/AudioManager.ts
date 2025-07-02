/**
 * 全局音频管理器
 * 确保同时只有一个音频在播放
 */
class AudioManager {
  private static instance: AudioManager
  private currentAudio: HTMLAudioElement | null = null
  private currentAudioId: string | null = null
  private listeners: Set<() => void> = new Set()

  private constructor() {}

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager()
    }
    return AudioManager.instance
  }

  /**
   * 播放音频
   * @param audio 音频元素
   * @param audioId 音频唯一标识
   */
  async play(audio: HTMLAudioElement, audioId: string): Promise<void> {
    // 如果当前有音频在播放且不是同一个音频，则停止当前音频
    if (this.currentAudio && this.currentAudioId !== audioId) {
      this.stop()
    }

    this.currentAudio = audio
    this.currentAudioId = audioId

    try {
      await audio.play()
    } catch (error) {
      console.error('音频播放失败:', error)
      this.currentAudio = null
      this.currentAudioId = null
      throw error
    }
  }

  /**
   * 暂停当前音频
   */
  pause(): void {
    if (this.currentAudio) {
      try {
        if (!this.currentAudio.paused) {
          this.currentAudio.pause()
        }
      } catch (error) {
        // 忽略音频元素已被销毁或状态异常的错误
        console.warn('暂停音频时出现错误:', error)
        this.currentAudio = null
        this.currentAudioId = null
      }
    }
  }

  /**
   * 停止当前音频并重置
   */
  stop(): void {
    if (this.currentAudio) {
      try {
        if (!this.currentAudio.paused) {
          this.currentAudio.pause()
        }
        this.currentAudio.currentTime = 0
      } catch (error) {
        // 忽略音频元素已被销毁或状态异常的错误
        console.warn('停止音频时出现错误:', error)
      } finally {
        this.currentAudio = null
        this.currentAudioId = null
        this.notifyListeners()
      }
    }
  }

  /**
   * 停止所有音频（用于会话切换等场景）
   */
  stopAll(): void {
    // 停止当前管理的音频
    this.stop()

    // 停止页面中所有其他音频元素
    document.querySelectorAll('audio').forEach((audio) => {
      try {
        if (!audio.paused) {
          audio.pause()
          audio.currentTime = 0
        }
      } catch (error) {
        // 忽略音频元素已被销毁或状态异常的错误
        console.warn('停止页面音频时出现错误:', error)
      }
    })

    this.notifyListeners()
  }

  /**
   * 检查指定音频是否正在播放
   * @param audioId 音频唯一标识
   */
  isPlaying(audioId: string): boolean {
    return !!(this.currentAudioId === audioId && this.currentAudio && !this.currentAudio.paused)
  }

  /**
   * 获取当前播放的音频ID
   */
  getCurrentAudioId(): string | null {
    return this.currentAudioId
  }

  /**
   * 添加状态变化监听器
   */
  addListener(callback: () => void): void {
    this.listeners.add(callback)
  }

  /**
   * 移除状态变化监听器
   */
  removeListener(callback: () => void): void {
    this.listeners.delete(callback)
  }

  /**
   * 通知所有监听器状态已变化
   */
  private notifyListeners(): void {
    this.listeners.forEach((callback) => callback())
  }
}

export const audioManager = AudioManager.getInstance()

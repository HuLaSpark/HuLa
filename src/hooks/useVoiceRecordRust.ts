import { startRecording, stopRecording } from 'tauri-plugin-mic-recorder-api'
import { BaseDirectory, create, exists, mkdir, readFile, remove } from '@tauri-apps/plugin-fs'
import { getImageCache } from '@/utils/PathUtil.ts'
import { useUserStore } from '@/stores/user'
import { compressAudioToMp3, getAudioInfo, calculateCompressionRatio } from '@/utils/AudioCompression'

// 导入worker计时器
let timerWorker: Worker | null = null

type VoiceRecordRustOptions = {
  onStart?: () => void
  onStop?: (audioBlob: Blob, duration: number, localPath: string) => void
  onError?: (error: string) => void
}

export const useVoiceRecordRust = (options: VoiceRecordRustOptions = {}) => {
  // 用户store
  const userStore = useUserStore()
  const isRecording = ref(false)
  const recordingTime = ref(0)
  const audioLevel = ref(0)
  const startTime = ref(0)
  const audioMonitor = ref<NodeJS.Timeout | null>(null)
  const timerMsgId = 'voiceRecordTimer' // worker计时器的消息ID

  /** 开始录音 */
  const startRecordingAudio = async () => {
    try {
      // 如果有录音正在进行，先停止再开始新录音
      if (isRecording.value) {
        await stopRecordingAudio()
      }

      // 调用Rust后端开始录音
      await startRecording()

      isRecording.value = true
      startTime.value = Date.now()
      recordingTime.value = 0

      // 初始化worker计时器
      if (!timerWorker) {
        timerWorker = new Worker(new URL('../workers/timer.worker.ts', import.meta.url))

        // 监听worker消息
        timerWorker.onmessage = (e) => {
          const { type, msgId } = e.data

          if (type === 'timeout' && msgId === timerMsgId) {
            // 每秒更新录音时间
            if (isRecording.value) {
              const currentTime = Math.floor((Date.now() - startTime.value) / 1000)
              recordingTime.value = currentTime

              // 检查是否达到60秒限制
              if (currentTime === 59) {
                // 达到60秒，自动停止录音
                stopRecordingAudio()
                return
              }

              // 重新启动1秒定时器
              timerWorker?.postMessage({
                type: 'startTimer',
                msgId: timerMsgId,
                duration: 1000
              })
            }
          }
        }

        timerWorker.onerror = (error) => {
          console.error('[VoiceRecord Worker Error]', error)
        }
      }

      // 开始worker计时
      timerWorker.postMessage({
        type: 'startTimer',
        msgId: timerMsgId,
        duration: 1000
      })

      options.onStart?.()
    } catch (error) {
      console.error('开始录音失败:', error)
      window.$message?.error('录音失败')
      options.onError?.('录音失败')
    }
  }

  /** 停止录音 */
  const stopRecordingAudio = async () => {
    try {
      if (!isRecording.value) return

      // 调用Rust后端停止录音
      const audioPath = await stopRecording()

      isRecording.value = false
      const duration = (Date.now() - startTime.value) / 1000

      // 清理worker定时器
      if (timerWorker) {
        timerWorker.postMessage({
          type: 'clearTimer',
          msgId: timerMsgId
        })
      }

      if (audioMonitor.value) {
        clearInterval(audioMonitor.value)
        audioMonitor.value = null
      }

      // 如果有音频文件路径，立即处理并显示录音结果
      if (audioPath) {
        // 读取录音文件
        const audioData = await readFile(audioPath)

        // 获取原始音频信息
        const originalInfo = await getAudioInfo(audioData.buffer as any)
        console.log('原始音频信息:', {
          duration: `${originalInfo.duration.toFixed(2)}秒`,
          sampleRate: `${originalInfo.sampleRate}Hz`,
          channels: originalInfo.channels,
          size: `${(originalInfo.size / 1024 / 1024).toFixed(2)}MB`
        })

        // 压缩音频为MP3格式
        const compressedBlob = await compressAudioToMp3(audioData.buffer as any, {
          channels: 1, // 单声道
          sampleRate: 22050, // 降低采样率
          bitRate: 64 // 较低比特率
        })

        // 计算压缩比
        const compressionRatio = calculateCompressionRatio(originalInfo.size, compressedBlob.size)
        console.log('音频压缩完成:', {
          originalSize: `${(originalInfo.size / 1024 / 1024).toFixed(2)}MB`,
          compressedSize: `${(compressedBlob.size / 1024 / 1024).toFixed(2)}MB`,
          compressionRatio: `${compressionRatio}%`
        })

        // 立即回调显示录音结果，传递压缩后的音频
        options.onStop?.(compressedBlob, duration, audioPath)

        // 异步处理缓存，不阻塞UI更新
        saveAudioToCache(compressedBlob, duration).catch((error) => {
          console.error('缓存音频文件失败:', error)
          // 缓存失败不影响主要功能，只记录错误
        })

        // 删除原始的wav文件，释放磁盘空间
        try {
          await remove(audioPath)
          console.log('已删除原始录音文件:', audioPath)
        } catch (deleteError) {
          console.warn('删除原始录音文件失败:', deleteError)
        }
      }
    } catch (error) {
      console.error('停止录音或压缩失败:', error)

      // 确保录音状态被正确重置
      isRecording.value = false

      // 清理worker定时器
      if (timerWorker) {
        timerWorker.postMessage({
          type: 'clearTimer',
          msgId: timerMsgId
        })
      }

      if (audioMonitor.value) {
        clearInterval(audioMonitor.value)
        audioMonitor.value = null
      }
      options.onError?.('停止录音失败')
    }
  }

  /** 取消录音 */
  const cancelRecordingAudio = async () => {
    try {
      if (!isRecording.value) return

      // 调用Rust后端停止录音，但不处理返回的音频文件
      await stopRecording()
      console.log('取消录音')

      isRecording.value = false

      // 清理worker定时器
      if (timerWorker) {
        timerWorker.postMessage({
          type: 'clearTimer',
          msgId: timerMsgId
        })
      }

      if (audioMonitor.value) {
        clearInterval(audioMonitor.value)
        audioMonitor.value = null
      }
    } catch (error) {
      console.error('取消录音失败:', error)
      // 确保状态被重置
      isRecording.value = false
      options.onError?.('取消录音失败')
    }
  }

  /** 保存音频到本地缓存 */
  const saveAudioToCache = async (audioBlob: Blob, duration: number) => {
    try {
      const userUid = userStore.userInfo.uid
      if (!userUid) {
        throw new Error('用户未登录')
      }

      // 生成文件名
      const timestamp = Date.now()
      const fileName = `voice_${timestamp}.mp3`

      // 获取缓存路径
      const audioFolder = 'audio'
      const cachePath = getImageCache(audioFolder, userUid.toString())
      const fullPath = cachePath + fileName

      // 确保目录存在
      const dirExists = await exists(cachePath, { baseDir: BaseDirectory.AppCache })
      if (!dirExists) {
        await mkdir(cachePath, { baseDir: BaseDirectory.AppCache, recursive: true })
      }

      // 将Blob转换为ArrayBuffer
      const arrayBuffer = await audioBlob.arrayBuffer()

      // 保存到本地文件
      const file = await create(fullPath, { baseDir: BaseDirectory.AppCache })
      await file.write(new Uint8Array(arrayBuffer))
      await file.close()

      console.log('音频文件已保存到:', fullPath)

      // 调用回调，传递本地路径
      options.onStop?.(audioBlob, duration, fullPath)
    } catch (error) {
      console.error('保存音频文件失败:', error)
      window.$message?.error('音频保存失败')
      options.onError?.('音频保存失败')
    }
  }

  // 格式化录音时间
  const formatTime = (seconds: number) => {
    const roundedSeconds = Math.round(seconds)
    const mins = Math.floor(roundedSeconds / 60)
    const secs = roundedSeconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 清理资源
  onUnmounted(() => {
    cancelRecordingAudio()
    // 清理worker
    if (timerWorker) {
      timerWorker.postMessage({
        type: 'clearTimer',
        msgId: timerMsgId
      })
      timerWorker.terminate()
      timerWorker = null
    }
  })

  return {
    isRecording: readonly(isRecording),
    recordingTime: readonly(recordingTime),
    audioLevel: readonly(audioLevel),
    startRecording: startRecordingAudio,
    stopRecording: stopRecordingAudio,
    cancelRecording: cancelRecordingAudio,
    formatTime
  }
}

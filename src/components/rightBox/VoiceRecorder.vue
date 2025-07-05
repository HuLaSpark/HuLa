<template>
  <div class="voice-recorder-container">
    <!-- 录音状态显示 -->
    <div class="voice-recorder-main">
      <!-- 录音状态文字 -->
      <div class="voice-status">
        <div v-if="!isRecording && !audioBlob" class="status-idle">
          <span>按住说话</span>
        </div>

        <div v-if="isRecording" class="status-recording">
          <div class="recording-animation">
            <div class="pulse-dot"></div>
          </div>
          <span>{{ formatTime(recordingTime) }} 正在录音...</span>
        </div>

        <div v-if="!isRecording && audioBlob" class="status-completed">
          <div class="playback-controls">
            <button @click="togglePlayback" class="play-btn">
              <svg v-if="!isPlaying" viewBox="0 0 24 24">
                <path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z" />
              </svg>
              <svg v-else viewBox="0 0 24 24">
                <path fill="currentColor" d="M14,19H18V5H14M6,19H10V5H6V19Z" />
              </svg>
            </button>
            <span>{{ formatTime(recordingDuration) }}</span>
          </div>
        </div>
      </div>

      <!-- 录音控制按钮 -->
      <div class="voice-controls">
        <!-- 未录音状态 -->
        <div v-if="!isRecording && !audioBlob" class="controls-idle">
          <button
            @mousedown="startRecording"
            @mouseup="stopRecording"
            @mouseleave="stopRecording"
            @touchstart="startRecording"
            @touchend="stopRecording"
            class="record-btn">
            <svg viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z" />
            </svg>
          </button>
          <button @click="handleCancel" class="cancel-btn">
            <svg viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
            </svg>
          </button>
        </div>

        <!-- 录音中状态 -->
        <div v-if="isRecording" class="controls-recording">
          <button @click="stopRecording" class="stop-btn">
            <svg viewBox="0 0 24 24">
              <path fill="currentColor" d="M18,18H6V6H18V18Z" />
            </svg>
          </button>
          <button @click="cancelRecording" class="cancel-record-btn">
            <svg viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
            </svg>
          </button>
        </div>

        <!-- 录音完成状态 -->
        <div v-if="!isRecording && audioBlob" class="controls-completed">
          <button @click="reRecord" class="re-record-btn">
            <svg viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z" />
            </svg>
          </button>
          <button @click="handleSend" class="send-btn" :disabled="sending">
            <svg v-if="!sending" viewBox="0 0 24 24">
              <path fill="currentColor" d="M2,21L23,12L2,3V10L17,12L2,14V21Z" />
            </svg>
            <div v-else class="loading-spinner"></div>
          </button>
          <button @click="handleCancel" class="cancel-btn">
            <svg viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useVoiceRecordRust } from '@/hooks/useVoiceRecordRust'

// 事件定义
const emit = defineEmits<{
  cancel: []
  send: [voiceData: any]
}>()

// 录音状态
const audioBlob = ref<Blob | null>(null)
const recordingDuration = ref(0)
const sending = ref(false)
const localAudioPath = ref<string>('')

// 播放状态
const isPlaying = ref(false)
const audioElement = ref<HTMLAudioElement | null>(null)

// 语音录制功能
const {
  isRecording,
  recordingTime,
  startRecording: startRecord,
  stopRecording: stopRecord,
  cancelRecording: cancelRecord,
  formatTime
} = useVoiceRecordRust({
  onStart: () => {
    console.log('开始录音')
  },
  onStop: (blob, duration, localPath) => {
    console.log('录音结束', duration, '本地路径:', localPath)
    audioBlob.value = blob
    recordingDuration.value = duration
    localAudioPath.value = localPath
    createAudioElement()
  },
  onError: () => {
    window.$message?.error('录音失败')
  }
})

// 开始录音
const startRecording = async () => {
  await startRecord()
}

// 停止录音
const stopRecording = async () => {
  await stopRecord()
}

// 取消录音
const cancelRecording = () => {
  cancelRecord()
  audioBlob.value = null
  recordingDuration.value = 0
}

// 重新录制
const reRecord = () => {
  audioBlob.value = null
  recordingDuration.value = 0
  localAudioPath.value = ''
  if (audioElement.value) {
    audioElement.value.pause()
    audioElement.value = null
  }
}

// 创建音频元素用于播放
const createAudioElement = () => {
  if (audioBlob.value) {
    const url = URL.createObjectURL(audioBlob.value)
    audioElement.value = new Audio(url)

    audioElement.value.addEventListener('ended', () => {
      isPlaying.value = false
    })
  }
}

// 切换播放状态
const togglePlayback = () => {
  if (audioElement.value) {
    if (isPlaying.value) {
      audioElement.value.pause()
    } else {
      audioElement.value.play()
    }
    isPlaying.value = !isPlaying.value
  }
}

// 发送语音
const handleSend = async () => {
  if (!audioBlob.value || !localAudioPath.value) {
    console.log('🎤 缺少音频数据，退出发送')
    return
  }

  try {
    sending.value = true

    // 直接使用本地路径，不需要重新上传文件
    // 这样和其他文件发送逻辑保持一致，都是先缓存到本地再处理
    const voiceData = {
      localPath: localAudioPath.value,
      size: audioBlob.value.size,
      duration: recordingDuration.value,
      filename: `voice_${Date.now()}.mp3`,
      type: 'audio/mp3'
    }

    console.log('🎤 发送语音数据:', voiceData)
    emit('send', voiceData)
  } catch (error) {
    console.error('🎤 发送语音失败:', error)
  } finally {
    sending.value = false
  }
}

// 取消/关闭
const handleCancel = () => {
  // 清理资源
  if (audioElement.value) {
    audioElement.value.pause()
    URL.revokeObjectURL(audioElement.value.src)
  }

  emit('cancel')
}

// 生命周期
onUnmounted(() => {
  if (audioElement.value) {
    audioElement.value.pause()
    URL.revokeObjectURL(audioElement.value.src)
  }
})
</script>

<style scoped lang="scss">
.voice-recorder-container {
  width: 100%;
  height: 110px;
  background: var(--bg-color);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  position: relative;
}

.voice-recorder-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
}

.voice-status {
  text-align: center;
  color: var(--text-color);
  font-size: 14px;
  min-height: 24px;

  .status-idle span {
    color: var(--text-color-secondary, #666);
  }

  .status-recording {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #13987f;
    font-weight: 500;

    .recording-animation {
      position: relative;

      .pulse-dot {
        width: 8px;
        height: 8px;
        background: #13987f;
        border-radius: 50%;
        animation: pulse 1.5s infinite;
      }
    }
  }

  .status-completed {
    .playback-controls {
      display: flex;
      align-items: center;
      gap: 8px;

      .play-btn {
        background: none;
        border: none;
        cursor: pointer;
        color: #13987f;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;

        svg {
          width: 16px;
          height: 16px;
        }

        &:hover {
          opacity: 0.8;
        }
      }
    }
  }
}

.voice-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;

  .controls-idle,
  .controls-recording,
  .controls-completed {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  button {
    background: none;
    border: none;
    cursor: pointer;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    svg {
      width: 20px;
      height: 20px;
    }

    &:hover:not(:disabled) {
      transform: scale(1.05);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .record-btn {
    background: #13987f;
    color: white;
    width: 36px;
    height: 36px;

    svg {
      width: 24px;
      height: 24px;
    }

    &:hover {
      background: #117a65;
    }

    &:active {
      transform: scale(0.95);
    }
  }

  .stop-btn {
    background: #e74c3c;
    color: white;

    &:hover {
      background: #c0392b;
    }
  }

  .send-btn {
    background: #13987f;
    color: white;

    &:hover:not(:disabled) {
      background: #117a65;
    }

    .loading-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
  }

  .re-record-btn {
    background: #f39c12;
    color: white;

    &:hover {
      background: #e67e22;
    }
  }

  .cancel-btn,
  .cancel-record-btn {
    background: #95a5a6;
    color: white;

    &:hover {
      background: #7f8c8d;
    }
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

// 深色主题适配
.dark {
  .voice-recorder-container {
    --bg-color: #2a2a2a;
    --text-color: #fff;
    --text-color-secondary: #aaa;
  }
}

// 浅色主题
.light {
  .voice-recorder-container {
    --bg-color: #f8f9fa;
    --text-color: #24292e;
    --text-color-secondary: #666;
  }
}
</style>

<template>
  <div class="voice-message">
    <div class="voice-container" :class="{ playing: isPlaying, loading: loading }" @click="togglePlayback">
      <!-- 语音图标 -->
      <div class="voice-icon">
        <svg v-if="loading" class="loading-icon">
          <use href="#loading"></use>
        </svg>
        <svg v-else-if="isPlaying" class="play-icon">
          <use href="#pause"></use>
        </svg>
        <svg v-else class="play-icon">
          <use href="#play"></use>
        </svg>
      </div>

      <!-- 音浪动画 -->
      <div class="voice-waves" v-if="isPlaying">
        <div class="wave-bar" v-for="i in 4" :key="i" :style="{ animationDelay: `${i * 0.1}s` }"></div>
      </div>
      <div class="voice-waves static" v-else>
        <div class="wave-bar static" v-for="i in 4" :key="i"></div>
      </div>

      <!-- 语音时长 -->
      <div class="voice-duration">
        <span v-if="isPlaying && currentTime > 0"> {{ formatTime(currentTime) }} / {{ formatTime(duration) }} </span>
        <span v-else>{{ formatTime(duration) }}</span>
      </div>
    </div>

    <!-- 播放进度条 -->
    <div class="voice-progress" v-if="isPlaying">
      <div class="progress-bar" :style="{ width: `${playbackProgress}%` }"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

interface VoiceMessageBody {
  url: string
  size?: number
  duration?: number
}

const props = defineProps<{
  body: VoiceMessageBody
}>()

// 播放状态
const isPlaying = ref(false)
const loading = ref(false)
const currentTime = ref(0)
const playbackProgress = ref(0)
const audioElement = ref<HTMLAudioElement | null>(null)

// 计算属性
const duration = computed(() => props.body.duration || 0)

// 格式化时间
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 创建音频元素
const createAudioElement = () => {
  if (audioElement.value) return

  audioElement.value = new Audio(props.body.url)

  // 设置事件监听
  audioElement.value.addEventListener('loadstart', () => {
    loading.value = true
  })

  audioElement.value.addEventListener('canplay', () => {
    loading.value = false
  })

  audioElement.value.addEventListener('timeupdate', () => {
    if (audioElement.value) {
      currentTime.value = audioElement.value.currentTime
      const progress = (audioElement.value.currentTime / audioElement.value.duration) * 100
      playbackProgress.value = progress || 0
    }
  })

  audioElement.value.addEventListener('ended', () => {
    isPlaying.value = false
    currentTime.value = 0
    playbackProgress.value = 0
  })

  audioElement.value.addEventListener('error', (e) => {
    loading.value = false
    isPlaying.value = false
    console.error('语音播放错误:', e)
    window.$message?.error('语音播放失败')
  })
}

// 切换播放状态
const togglePlayback = async () => {
  if (loading.value) return

  try {
    createAudioElement()

    if (!audioElement.value) return

    if (isPlaying.value) {
      audioElement.value.pause()
      isPlaying.value = false
    } else {
      // 暂停其他正在播放的语音
      document.querySelectorAll('audio').forEach((audio) => {
        if (audio !== audioElement.value && !audio.paused) {
          audio.pause()
        }
      })

      await audioElement.value.play()
      isPlaying.value = true
    }
  } catch (error) {
    console.error('播放失败:', error)
    window.$message?.error('播放失败')
    isPlaying.value = false
    loading.value = false
  }
}

// 清理资源
onUnmounted(() => {
  if (audioElement.value) {
    audioElement.value.pause()
    audioElement.value.src = ''
    audioElement.value = null
  }
})
</script>

<style scoped lang="scss">
.voice-message {
  display: inline-block;
  max-width: 300px;
  min-width: 150px;
}

.voice-container {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-msg-voice, #f0f0f0);
  border-radius: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));

  &:hover {
    background: var(--bg-msg-voice-hover, #e8e8e8);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &.loading {
    cursor: wait;
    opacity: 0.7;
  }

  &.playing {
    background: var(--bg-msg-voice-playing, #e3f2fd);
    border-color: var(--primary-color, #1976d2);
  }
}

.voice-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-color, #333);

  svg {
    width: 18px;
    height: 18px;

    &.loading-icon {
      animation: spin 1s linear infinite;
    }
  }
}

.voice-waves {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 40px;

  &.static .wave-bar {
    height: 4px;
    opacity: 0.3;
  }

  .wave-bar {
    width: 3px;
    height: 12px;
    background: var(--primary-color, #1976d2);
    border-radius: 2px;
    transition: height 0.2s ease;

    &:not(.static) {
      animation: wave 1.2s ease-in-out infinite;
    }

    &:nth-child(1) {
      animation-delay: 0s;
    }
    &:nth-child(2) {
      animation-delay: 0.1s;
    }
    &:nth-child(3) {
      animation-delay: 0.2s;
    }
    &:nth-child(4) {
      animation-delay: 0.3s;
    }
  }
}

.voice-duration {
  font-size: 12px;
  color: var(--text-color-secondary, #666);
  white-space: nowrap;
  min-width: 35px;
  text-align: right;
}

.voice-progress {
  height: 2px;
  background: var(--bg-progress, rgba(0, 0, 0, 0.1));
  border-radius: 1px;
  margin-top: 8px;
  overflow: hidden;

  .progress-bar {
    height: 100%;
    background: var(--primary-color, #1976d2);
    border-radius: 1px;
    transition: width 0.1s ease;
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

@keyframes wave {
  0%,
  100% {
    height: 4px;
    opacity: 0.3;
  }
  50% {
    height: 12px;
    opacity: 1;
  }
}

// 深色主题适配
.dark {
  .voice-container {
    --bg-msg-voice: #2a2a2a;
    --bg-msg-voice-hover: #3a3a3a;
    --bg-msg-voice-playing: #1e3a8a;
    --border-color: rgba(255, 255, 255, 0.1);
    --text-color: #fff;
    --text-color-secondary: #aaa;
    --primary-color: #60a5fa;
    --bg-progress: rgba(255, 255, 255, 0.1);
  }
}

// 移动端适配
@media (max-width: 768px) {
  .voice-container {
    padding: 10px 12px;
    gap: 8px;
  }

  .voice-icon {
    width: 20px;
    height: 20px;

    svg {
      width: 16px;
      height: 16px;
    }
  }

  .voice-waves {
    min-width: 30px;
    gap: 1px;

    .wave-bar {
      width: 2px;
    }
  }

  .voice-duration {
    font-size: 11px;
    min-width: 30px;
  }
}
</style>

<template>
  <div class="size-full bg-#222 relative flex flex-col select-none">
    <!-- 顶部操作栏 -->
    <ActionBar class="bg-#000 z-9999" :shrink="false" :current-label="currentLabel" />

    <!-- 主体内容区域 -->
    <div ref="contentRef" class="flex-1 overflow-auto">
      <!-- 视频展示区域 -->
      <div ref="videoContainerRef" class="min-h-[calc(100vh-124px)] flex-center w-full h-full">
        <video
          ref="videoRef"
          :src="currentVideo"
          controls
          class="w-full h-full object-cover"
          @loadeddata="onVideoLoaded"
          alt="preview" />

        <!-- 提示文本 -->
        <transition name="viewer-tip">
          <div
            v-if="showTip"
            class="fixed z-10 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 px-24px py-12px rounded-8px text-(white 14px) transition-all duration-300 backdrop-blur-sm select-none flex items-center gap-8px">
            <svg class="size-16px"><use href="#info"></use></svg>
            {{ tipText }}
          </div>
        </transition>
      </div>
    </div>

    <!-- 底部工具栏 -->
    <div data-tauri-drag-region class="z-9999 h-50px bg-#000 flex justify-center items-center gap-30px">
      <n-tooltip placement="top">
        <template #trigger>
          <svg @click="playPause" class="size-24px cursor-pointer color-white"><use href="#play-pause"></use></svg>
        </template>
        {{ isPlaying ? '暂停' : '播放' }}
      </n-tooltip>

      <n-tooltip placement="top">
        <template #trigger>
          <svg @click="muteUnmute" class="size-24px cursor-pointer color-white"><use href="#volume"></use></svg>
        </template>
        {{ isMuted ? '取消静音' : '静音' }}
      </n-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getCurrentWebviewWindow, WebviewWindow } from '@tauri-apps/api/webviewWindow'
import ActionBar from '@/components/windows/ActionBar.vue'
import { NTooltip } from 'naive-ui'
import { useVideoViewer } from '@/stores/videoViewer.ts'
import { useTauriListener } from '@/hooks/useTauriListener'

const { addListener } = useTauriListener()
const videoViewerStore = useVideoViewer()
const appWindow = WebviewWindow.getCurrent()

// 初始化数据
const videoList = ref<string[]>([])

const currentLabel = WebviewWindow.getCurrent().label
const currentIndex = ref(0)
const isPlaying = ref(false)
const isMuted = ref(false)
const videoRef = ref<HTMLVideoElement>()
const contentScrollbar = useTemplateRef<HTMLElement>('contentRef')
const videoContainer = useTemplateRef<HTMLElement>('videoContainerRef')
const showTip = ref(false)
const tipText = ref('')

// 当前显示的视频URL
const currentVideo = computed(() => {
  if (videoViewerStore.isSingleMode) {
    return videoViewerStore.singleVideo
  }
  return videoList.value[currentIndex.value]
})

// 播放/暂停视频
const playPause = () => {
  if (videoRef.value) {
    if (videoRef.value.paused) {
      videoRef.value.play()
      isPlaying.value = true
    } else {
      videoRef.value.pause()
      isPlaying.value = false
    }
  }
}

// 静音/取消静音
const muteUnmute = () => {
  if (videoRef.value) {
    videoRef.value.muted = !videoRef.value.muted
    isMuted.value = videoRef.value.muted
  }
}
// 检查是否有滚动条的函数
const checkScrollbar = () => {
  if (!videoContainer.value || !contentScrollbar.value || !videoRef.value) return

  videoContainer.value.style.height = 'auto' // 先重置为auto以便正确计算
  // 检查是否有滚动条
  videoContainer.value.style.height =
    contentScrollbar.value.scrollHeight > contentScrollbar.value.clientHeight ? 'auto' : '100%'
}

// 自动播放视频
const onVideoLoaded = () => {
  checkScrollbar()
  if (videoRef.value) {
    videoRef.value.play().then(() => {
      isPlaying.value = true
    })
  }
}

onMounted(async () => {
  await getCurrentWebviewWindow().show()

  // 修改事件名称与发送端保持一致
  await addListener(
    appWindow.listen('video-updated', (event: any) => {
      const { list, index } = event.payload
      videoList.value = list
      currentIndex.value = index
      nextTick(() => {
        if (videoRef.value) {
          videoRef.value.load()
          videoRef.value.play()
        }
      })
    })
  )

  if (videoViewerStore.isSingleMode) {
    videoList.value = [videoViewerStore.singleVideo]
    currentIndex.value = 0
  } else {
    // 添加数据有效性验证
    const validIndex = Math.min(Math.max(videoViewerStore.currentIndex, 0), videoViewerStore.videoList.length - 1)
    videoList.value = [...videoViewerStore.videoList]
    currentIndex.value = validIndex
    console.log('Initial index:', validIndex)
  }
})
</script>

<style scoped>
/* 自定义滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

/* 添加以下样式来修改 ActionBar 中的 svg 颜色 */
:deep(.action-close),
:deep(.hover-box) {
  svg {
    color: #fff !important;
  }
}
</style>

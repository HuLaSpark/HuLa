<template>
  <div class="dynamic-detail-page h-full flex flex-col bg-gradient-to-br from-#f8f9fa to-#e9ecef">
    <ActionBar :shrink="false" :max-w="false"></ActionBar>
    <!-- 顶部导航栏 -->
    <div
      data-tauri-drag-region
      class="flex items-center justify-between px-24px py-16px bg-white/80 backdrop-blur-md border-b border-#e5e5e5 shadow-sm">
      <div class="flex items-center gap-16px">
        <div
          class="cursor-pointer hover:bg-#13987F/10 p-8px rounded-8px transition-all duration-200 active:scale-95"
          @click="goBack">
          <svg class="w-20px h-20px text-#13987F">
            <use href="#arrow-left"></use>
          </svg>
        </div>
        <div class="flex items-center gap-10px">
          <div class="w-4px h-20px bg-#13987F rounded-full"></div>
          <span class="text-18px font-700 text-#333">动态详情</span>
        </div>
      </div>
    </div>

    <!-- 动态详情内容 -->
    <div v-if="feedId" class="flex-1 detail-scroll-container px-24px py-24px">
      <div class="max-w-900px mx-auto">
        <DynamicDetail :feed-id="feedId" mode="pc" @preview-image="previewImage" @video-play="handleVideoPlay" />
      </div>
    </div>
    <div v-else class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="relative inline-block mb-16px">
          <div
            class="w-80px h-80px rounded-full bg-gradient-to-br from-#13987F/20 to-#13987F/5 flex items-center justify-center animate-pulse">
            <div class="text-40px">⏳</div>
          </div>
        </div>
        <div class="text-15px text-#666 font-500">加载中...</div>
        <div class="text-12px text-#999 mt-6px">正在获取动态详情</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { listen } from '@tauri-apps/api/event'
import DynamicDetail from '@/components/common/DynamicDetail.vue'
import { useWindow } from '@/hooks/useWindow'
import { useRoute } from 'vue-router'
import { useTauriListener } from '@/hooks/useTauriListener'

const { getWindowPayload } = useWindow()
const route = useRoute()
const { addListener } = useTauriListener()

// 动态ID
const feedId = ref<string>('')

// 获取窗口传递的参数
onMounted(async () => {
  const currentWindow = WebviewWindow.getCurrent()

  if (route.params.id) {
    feedId.value = route.params.id as string
  } else {
    const payload = (await getWindowPayload(currentWindow.label, false)) as any
    if (payload && payload.feedId) {
      feedId.value = payload.feedId
    } else {
      setTimeout(async () => {
        await currentWindow.emit('window-payload-updated', { feedId: feedId.value })
      }, 1000)
    }
  }

  // 监听 payload 更新事件，用于窗口复用时更新内容
  await addListener(
    listen('window-payload-updated', async (event: any) => {
      const payload = event.payload
      if (payload && payload.feedId) {
        feedId.value = payload.feedId
      }
    }),
    'window-payload-updated'
  )

  // 显示窗口
  await currentWindow.show()
})

// 关闭窗口
const goBack = async () => {
  const currentWindow = WebviewWindow.getCurrent()
  await currentWindow.close()
}

// 图片预览
const previewImage = (images: string[], index: number) => {
  console.log('预览图片:', images, index)
  // TODO: 实现图片预览功能
}

// 视频播放
const handleVideoPlay = (url: string) => {
  console.log('播放视频:', url)
  // TODO: 实现视频播放功能
}
</script>

<style scoped lang="scss">
.dynamic-detail-page {
  width: 100%;
  height: 100%;
}

/* 自定义滚动条样式 */
.detail-scroll-container {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    width: 6px;
    transition-property: opacity;
    transition-duration: 0.3s;
    transition-timing-function: ease;
  }

  &::-webkit-scrollbar-thumb {
    background-color: rgba(144, 144, 144, 0.3);
    border-radius: 3px;
    transition-property: opacity, background-color;
    transition-duration: 0.3s;
    transition-timing-function: ease;
  }

  &::-webkit-scrollbar-thumb:hover {
    background-color: rgba(144, 144, 144, 0.5);
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
}
</style>

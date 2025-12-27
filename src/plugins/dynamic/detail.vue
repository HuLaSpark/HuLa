<template>
  <div class="dynamic-detail-page h-full flex flex-col text-[--text-color]">
    <ActionBar :shrink="false" :max-w="false"></ActionBar>
    <!-- 顶部导航-->
    <div
      data-tauri-drag-region
      class="detail-header flex items-center justify-between px-24px py-16px backdrop-blur-md shadow-sm">
      <div class="flex items-center gap-16px">
        <div
          class="cursor-pointer hover:bg-#13987F/10 dark:hover:bg-#13987f/20 p-8px rounded-8px transition-all duration-200 active:scale-95"
          @click="goBack">
          <svg class="size-20px text-[--text-color] rotate-180">
            <use href="#right"></use>
          </svg>
        </div>
        <div class="flex items-center gap-10px">
          <div class="w-4px h-20px bg-#13987F rounded-full"></div>
          <span class="text-18px font-700 text-[--text-color]">{{ t('dynamic.page.detail.title') }}</span>
        </div>
      </div>
    </div>

    <!-- 动态详情内?-->
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
            <div class="text-40px">...</div>
          </div>
        </div>
        <div class="text-15px font-500 text-[--text-color]">{{ t('dynamic.common.loading_title') }}</div>
        <div class="text-12px text-#999 dark:text-#b5b5b5 mt-6px">{{ t('dynamic.common.loading_desc') }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { listen } from '@tauri-apps/api/event'
import { useI18n } from 'vue-i18n'
import DynamicDetail from '@/components/common/DynamicDetail.vue'
import { useWindow } from '@/hooks/useWindow'
import { useRoute, useRouter } from 'vue-router'
import { useTauriListener } from '@/hooks/useTauriListener'

const { getWindowPayload } = useWindow()
const route = useRoute()
const router = useRouter()
const { addListener } = useTauriListener()
const { t } = useI18n()

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
  if (route.params.id) {
    router.back()
    return
  }
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
  --detail-bg-from: #f8f9fa;
  --detail-bg-to: #e9ecef;
  --detail-header-bg: rgba(255, 255, 255, 0.8);
  --detail-header-border: #e5e5e5;
  --detail-scroll-thumb: rgba(144, 144, 144, 0.3);
  --detail-scroll-thumb-hover: rgba(144, 144, 144, 0.5);
  --detail-scroll-track: transparent;
  background: linear-gradient(135deg, var(--detail-bg-from), var(--detail-bg-to));
}

html[data-theme='dark'] .dynamic-detail-page {
  --detail-bg-from: #1b1b1b;
  --detail-bg-to: #0f0f0f;
  --detail-header-bg: rgba(30, 30, 30, 0.9);
  --detail-header-border: #2a2a2a;
  --detail-scroll-thumb: rgba(255, 255, 255, 0.2);
  --detail-scroll-thumb-hover: rgba(255, 255, 255, 0.3);
}

.detail-header {
  background: var(--detail-header-bg);
  border-bottom: 1px solid var(--detail-header-border);
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
    background-color: var(--detail-scroll-thumb);
    border-radius: 3px;
    transition-property: opacity, background-color;
    transition-duration: 0.3s;
    transition-timing-function: ease;
  }

  &::-webkit-scrollbar-thumb:hover {
    background-color: var(--detail-scroll-thumb-hover);
  }

  &::-webkit-scrollbar-track {
    background: var(--detail-scroll-track);
  }
}
</style>

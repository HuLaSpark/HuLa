<template>
  <div class="flex flex-col h-full">
    <!-- 头部 -->
    <div class="flex justify-between items-center p-4">
      <div @click="() => router.back()">
        <svg class="iconpark-icon w-24px h-24px"><use href="#fanhui"></use></svg>
      </div>
      <div>
        <n-dropdown trigger="click" :options="options" :show-arrow="true">
          <n-button>选择类型</n-button>
        </n-dropdown>
      </div>
      <n-button text type="primary">选择</n-button>
    </div>
    <!-- 内容 -->
    <div class="flex-1 p-4 overflow-auto">
      <!-- 图片网格 -->
      <div class="grid grid-cols-4 gap-1">
        <div
          v-for="(image, index) in imageList"
          :key="index"
          class="overflow-hidden bg-gray-100 aspect-square"
          @click="
            () => {
              activeImage = image
              showImagePreviewRef = true
            }
          ">
          <img :src="image.url" class="w-full h-full" />
        </div>
      </div>
    </div>

    <!-- 图片预览组件 -->
    <component
      :is="ImagePreview"
      v-if="ImagePreview"
      v-model:visible="showImagePreviewRef"
      :image-url="activeImage?.url || ''" />
  </div>
</template>

<script setup lang="ts">
import { useFileStore } from '@/stores/file'
import { useGlobalStore } from '@/stores/global'
import { isMobile } from '@/utils/PlatformConstants'

const ImagePreview = isMobile() ? defineAsyncComponent(() => import('@/mobile/components/ImagePreview.vue')) : void 0

const router = useRouter()
const fileStore = useFileStore()
const globalStore = useGlobalStore()

// 图片预览状态
const showImagePreviewRef = ref(false)
const activeImage = ref<{ url: string }>()

const options = [
  {
    label: '图片与视频',
    key: 'image_video',
    disabled: false
  },
  {
    label: '图片',
    key: 'image',
    disabled: false
  },
  {
    label: '视频',
    key: 'video',
    disabled: false
  }
]

// 从 fileDownload store 获取图片数据
const imageList = ref<
  {
    url: string
  }[]
>([])

const getImageList = async () => {
  const data = await fileStore.getRoomFilesForDisplay(globalStore.currentSessionRoomId)
  imageList.value = data.filter((item) => item.type === 'image').map((item) => ({ url: item.displayUrl }))
}

onMounted(() => {
  getImageList()
})
</script>

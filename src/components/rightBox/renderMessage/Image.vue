<template>
  <div>
    <n-image
      v-if="body?.url"
      class="select-none cursor-pointer"
      :img-props="{
        style: {
          ...imageStyle
        }
      }"
      object-fit="cover"
      show-toolbar-tooltip
      preview-disabled
      style="border-radius: 8px; cursor: pointer !important"
      :src="displayImageSrc"
      @dblclick="handleOpenImageViewer"
      @click="handleOpenImage"
      @error="handleImageError">
      <template #placeholder>
        <n-flex
          v-if="!isError"
          align="center"
          justify="center"
          :style="{
            width: `${imageStyle.width}`,
            height: `${imageStyle.height}`,
            backgroundColor: '#c8c8c833'
          }"
          class="rounded-10px">
          <img class="size-24px select-none" src="@/assets/img/loading.svg" alt="loading" />
        </n-flex>
      </template>
      <template #error>
        <n-flex v-if="isError" align="center" justify="center" class="w-200px h-150px bg-#c8c8c833 rounded-10px">
          <svg class="size-34px color-[--chat-text-color]">
            <use href="#error-picture"></use>
          </svg>
        </n-flex>
      </template>
    </n-image>

    <!-- 图片预览组件 -->
    <component
      :is="ImagePreview"
      v-if="ImagePreview"
      v-model:visible="showImagePreviewRef"
      :image-url="body?.url || ''"
      :message="message" />
  </div>
</template>

<script setup lang="ts">
import { convertFileSrc } from '@tauri-apps/api/core'
import { exists } from '@tauri-apps/plugin-fs'
import { MsgEnum } from '@/enums'
import { useImageViewer } from '@/hooks/useImageViewer'
import type { ImageBody, MsgType } from '@/services/types'
import { isMobile } from '@/utils/PlatformConstants'
import { useThumbnailCacheStore } from '@/stores/thumbnailCache'
import { buildQiniuThumbnailUrl, getPreferredQiniuFormat } from '@/utils/QiniuImageUtils'

const ImagePreview = isMobile() ? defineAsyncComponent(() => import('@/mobile/components/ImagePreview.vue')) : void 0

const props = defineProps<{
  body: ImageBody
  onImageClick?: (url: string) => void
  message: MsgType
}>()
// 图片显示相关常量
const MAX_WIDTH = isMobile() ? 240 : 320
const MAX_HEIGHT = 240
const MIN_WIDTH = 60
const MIN_HEIGHT = 60
const THUMB_QUALITY = 60
// 错误状态控制
const isError = ref(false)
// 使用图片查看器hook
const { openImageViewer } = useImageViewer()
const showImagePreviewRef = ref(false)
const imagesRef = ref<string[]>([])
const thumbnailStore = useThumbnailCacheStore()
const localThumbnailSrc = ref<string | null>(null)

// 处理图片加载错误
const handleImageError = () => {
  isError.value = true
}

const handleOpenImage = () => {
  if (!isMobile()) return // 非移动端直接返回

  if (props.body?.url) {
    imagesRef.value = [props.body.url]
    showImagePreviewRef.value = true
  }
}

// 处理打开图片查看器
const handleOpenImageViewer = () => {
  if (isMobile()) {
    return
  }

  if (props.body?.url) {
    // 如果有自定义点击处理函数，使用它；否则使用默认逻辑
    if (props.onImageClick) {
      props.onImageClick(props.body.url)
    } else {
      openImageViewer(props.body.url, [MsgEnum.IMAGE, MsgEnum.EMOJI])
    }
  }
}

/**
 * 计算图片样式
 */
const remoteThumbnailSrc = computed(() => {
  const originalUrl = props.body?.url
  if (!originalUrl) return ''
  const deviceRatio = typeof window !== 'undefined' ? Math.max(window.devicePixelRatio || 1, 1) : 1
  const thumbnailWidth = Math.ceil(MAX_WIDTH * Math.min(deviceRatio, 2))
  const format = getPreferredQiniuFormat()

  return (
    buildQiniuThumbnailUrl(originalUrl, {
      width: thumbnailWidth,
      quality: THUMB_QUALITY,
      format
    }) ?? originalUrl
  )
})

const downloadKey = computed(() => remoteThumbnailSrc.value || props.body?.url || '')

const displayImageSrc = computed(() => localThumbnailSrc.value || remoteThumbnailSrc.value)

const requestThumbnailDownload = () => {
  if (!downloadKey.value || !props.message) return
  void thumbnailStore
    .enqueueThumbnail({ url: downloadKey.value, msgId: props.message.id, roomId: props.message.roomId, kind: 'image' })
    .then((path) => {
      if (!path) return
      localThumbnailSrc.value = convertFileSrc(path)
    })
}

const ensureLocalThumbnail = async () => {
  const localPath = props.body?.thumbnailPath
  if (!localPath) {
    localThumbnailSrc.value = null
    return
  }
  try {
    const existsFlag = await exists(localPath)
    if (existsFlag) {
      localThumbnailSrc.value = convertFileSrc(localPath)
      return
    }
  } catch (error) {
    console.warn('[Image] 检查缩略图文件失败:', error)
  }
  localThumbnailSrc.value = null
  thumbnailStore.invalidate(downloadKey.value)
  requestThumbnailDownload()
}

watch(
  () => props.body?.thumbnailPath,
  () => {
    void ensureLocalThumbnail()
  },
  { immediate: true }
)

watch(
  () => downloadKey.value,
  () => {
    if (!props.body?.thumbnailPath) {
      requestThumbnailDownload()
    }
  }
)

const imageStyle = computed(() => {
  // 如果有原始尺寸，使用原始尺寸计算
  let width = props.body?.width
  let height = props.body?.height

  // 如果没有原始尺寸，使用默认尺寸
  if (!width || !height) {
    width = MAX_WIDTH
    height = MAX_HEIGHT
  }

  const aspectRatio = width / height
  let finalWidth = width
  let finalHeight = height

  // 如果图片太大,需要等比缩放
  if (width > MAX_WIDTH || height > MAX_HEIGHT) {
    if (width / height > MAX_WIDTH / MAX_HEIGHT) {
      // 宽度超出更多,以最大宽度为基准缩放
      finalWidth = MAX_WIDTH
      finalHeight = MAX_WIDTH / aspectRatio
    } else {
      // 高度超出更多,以最大高度为基准缩放
      finalHeight = MAX_HEIGHT
      finalWidth = MAX_HEIGHT * aspectRatio
    }
  }

  // 确保不小于最小尺寸
  finalWidth = Math.max(finalWidth, MIN_WIDTH)
  finalHeight = Math.max(finalHeight, MIN_HEIGHT)

  // 向上取整避免小数导致的抖动
  return {
    width: `${Math.ceil(finalWidth)}px`,
    height: `${Math.ceil(finalHeight)}px`
  }
})

onMounted(() => {
  if (props.body?.url && !props.body?.thumbnailPath) {
    requestThumbnailDownload()
  }
})
</script>

<style scoped></style>

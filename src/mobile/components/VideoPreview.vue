<template>
  <Teleport to="body">
    <Transition name="video-preview" appear>
      <div
        v-if="visible"
        class="fixed top-0 left-0 w-100vw h-100vh bg-black z-3000 box-border flex-center"
        :style="containerStyle"
        @click="handleClose">
        <div class="relative w-full h-full flex items-center justify-center overflow-hidden">
          <div class="absolute rounded-8 bg-black/75 z-20 shadow-lg" :style="backStyle">
            <n-button quaternary circle class="bg-white/20" @click.stop="handleClose" aria-label="返回">
              <template #icon>
                <svg class="size-22px text-white rotate-180">
                  <use href="#right"></use>
                </svg>
              </template>
            </n-button>
          </div>
          <video
            v-if="videoUrl"
            class="max-w-full max-h-full rounded-8px bg-black"
            :style="videoStyle"
            :src="videoUrl"
            playsinline
            autoplay
            @click.stop />
          <div class="absolute flex gap-3 p-2 rounded-8 text-white bg-black/75 z-20 shadow-lg" :style="actionStyle">
            <n-button
              v-if="showSave"
              circle
              quaternary
              size="medium"
              class="bg-white/20"
              @click.stop="handleSave"
              aria-label="保存">
              <template #icon>
                <svg class="size-22px text-white"><use href="#Importing"></use></svg>
              </template>
            </n-button>
            <n-button
              v-if="showMore"
              circle
              quaternary
              size="medium"
              class="bg-white/20"
              @click.stop="handleMore"
              aria-label="更多">
              <template #icon>
                <svg class="size-22px text-white"><use href="#more"></use></svg>
              </template>
            </n-button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useFileDownloadStore } from '@/stores/fileDownload'
import { useFileStore } from '@/stores/file'
import { extractFileName } from '@/utils/Formatting'
import type { MsgType } from '@/services/types'
import { isMobile } from '@/utils/PlatformConstants'

interface Props {
  visible: boolean
  videoUrl: string
  message?: MsgType
  showSave?: boolean
  showMore?: boolean
}

type Emits = (e: 'update:visible', value: boolean) => void

const props = withDefaults(defineProps<Props>(), {
  showSave: true,
  showMore: true
})
const emit = defineEmits<Emits>()
const safeAreaInsets = ref({ top: 0, bottom: 0, left: 0, right: 0 })
const chatStore = useChatStore()
const fileDownloadStore = useFileDownloadStore()
const fileStore = useFileStore()
const NAV_OFFSET = 44

const containerStyle = computed<CSSProperties>(() => ({
  paddingTop: `${safeAreaInsets.value.top}px`,
  paddingBottom: `${safeAreaInsets.value.bottom}px`
}))

const videoStyle = computed<CSSProperties>(() => ({
  maxHeight: `calc(100% - ${safeAreaInsets.value.top + safeAreaInsets.value.bottom}px)`,
  maxWidth: '100%',
  objectFit: 'contain'
}))

const actionStyle = computed<CSSProperties>(() => ({
  bottom: `${Math.max(safeAreaInsets.value.bottom + 16, 16)}px`,
  right: `${Math.max(safeAreaInsets.value.right + 12, 12)}px`
}))

const backStyle = computed<CSSProperties>(() => ({
  top: `${Math.max(safeAreaInsets.value.top + NAV_OFFSET, 16 + NAV_OFFSET)}px`,
  left: `${Math.max(safeAreaInsets.value.left + 12, 12)}px`
}))

const handleClose = () => {
  emit('update:visible', false)
}

const parsePxValue = (value: string | null) => {
  if (!value) return 0
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const updateSafeAreaInsets = () => {
  if (typeof window === 'undefined') return
  const styles = getComputedStyle(document.documentElement)
  safeAreaInsets.value = {
    top: parsePxValue(styles.getPropertyValue('--safe-area-inset-top')),
    bottom: parsePxValue(styles.getPropertyValue('--safe-area-inset-bottom')),
    left: parsePxValue(styles.getPropertyValue('--safe-area-inset-left')),
    right: parsePxValue(styles.getPropertyValue('--safe-area-inset-right'))
  }
}

const getCurrentRoomId = () => props.message?.roomId || chatStore.currentSessionInfo?.roomId || ''

const handleSave = async () => {
  if (!props.videoUrl) return
  try {
    const fileName = extractFileName(props.videoUrl) || 'video.mp4'
    const result = await fileDownloadStore.downloadFile(props.videoUrl, fileName)
    if (result && props.message) {
      const roomId = getCurrentRoomId()
      if (roomId) {
        const fileInfo = {
          id: props.message.id,
          roomId,
          fileName,
          type: 'video' as const,
          url: result,
          suffix: fileName.split('.').pop()?.toLowerCase()
        }
        fileStore.addFile(fileInfo)
      }
    }
    window.$message?.success?.('视频已保存')
  } catch (error) {
    console.error('保存视频失败:', error)
    window.$message?.error?.('保存失败')
  }
}

const handleMore = () => {
  window.$message?.warning?.('更多功能暂未实现')
}

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    if (isMobile()) {
      updateSafeAreaInsets()
    } else {
      safeAreaInsets.value = { top: 0, bottom: 0, left: 0, right: 0 }
    }
  },
  { immediate: true }
)

onMounted(() => {
  if (isMobile()) {
    updateSafeAreaInsets()
  }
})
</script>

<style scoped>
.video-preview-enter-active,
.video-preview-leave-active {
  transition: opacity 0.2s ease;
}

.video-preview-enter-from,
.video-preview-leave-to {
  opacity: 0;
}
</style>

<template>
  <Teleport to="body">
    <Transition name="image-preview" appear>
      <div v-if="visible" class="fixed top-0 left-0 w-100vw h-100vh bg-black z-3000" @click="handleClose">
        <div class="w-full h-full flex justify-center items-center relative">
          <Transition name="image-zoom" appear>
            <img class="w-full" :src="imageUrl" alt="preview" />
          </Transition>
          <div class="absolute right-3 bottom-10 flex gap-3 p-1.5 rounded-5 backdrop-blur-sm">
            <n-button
              v-if="showForward"
              circle
              quaternary
              size="medium"
              @click.stop="handleForward"
              aria-label="转发"
              class="bg-white/20">
              <template #icon>
                <svg class="size-22px text-white">
                  <use href="#share"></use>
                </svg>
              </template>
            </n-button>
            <n-button
              v-if="showSave"
              circle
              quaternary
              size="medium"
              @click.stop="handleSave"
              aria-label="保存"
              class="bg-white/20">
              <template #icon>
                <svg class="size-22px text-white">
                  <use href="#Importing"></use>
                </svg>
              </template>
            </n-button>
            <n-button
              v-if="showMore"
              circle
              quaternary
              size="medium"
              @click.stop="handleMore"
              aria-label="更多"
              class="bg-white/20">
              <template #icon>
                <svg class="size-22px text-white">
                  <use href="#more"></use>
                </svg>
              </template>
            </n-button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { MergeMessageType, MittEnum } from '@/enums'
import { useChatStore } from '@/stores/chat'
import { useFileDownloadStore } from '@/stores/fileDownload'
import { useFileStore } from '@/stores/file'
import { useMitt } from '@/hooks/useMitt'
import { extractFileName } from '@/utils/Formatting'
import type { MsgType } from '@/services/types'

interface Props {
  visible: boolean
  imageUrl: string
  message?: MsgType
  showForward?: boolean
  showSave?: boolean
  showMore?: boolean
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'forward'): void
  (e: 'save'): void
  (e: 'more'): void
}

const props = withDefaults(defineProps<Props>(), {
  showForward: true,
  showSave: true,
  showMore: true
})

const emit = defineEmits<Emits>()

const chatStore = useChatStore()
const fileDownloadStore = useFileDownloadStore()
const fileStore = useFileStore()

// 获取当前房间ID的方法
const getCurrentRoomId = () => {
  // 从 props.message 中获取房间ID，如果没有则从 chatStore 获取
  return props.message?.roomId || chatStore.currentSessionInfo?.roomId || ''
}

const handleClose = () => {
  emit('update:visible', false)
}

const handleForward = () => {
  const msgId = props.message?.id
  if (!msgId) {
    if (window.$message) {
      window.$message.warning('无法转发：消息ID缺失')
    }
    return
  }
  const target = chatStore.chatMessageList.find((m: any) => m.message.id === msgId)
  if (!target) {
    if (window.$message) {
      window.$message.warning('未找到可转发的消息')
    }
    return
  }
  chatStore.clearMsgCheck()
  target.isCheck = true
  chatStore.setMsgMultiChoose(false)
  useMitt.emit(MittEnum.MSG_MULTI_CHOOSE, { action: 'open-forward', mergeType: MergeMessageType.SINGLE })

  emit('forward')
}

const handleSave = async () => {
  const imageUrl = props.imageUrl
  if (!imageUrl) {
    if (window.$message) {
      window.$message.warning('无法保存：图片地址缺失')
    }
    return
  }
  try {
    const fileName = extractFileName(imageUrl) || 'image.png'
    const result = await fileDownloadStore.downloadFile(imageUrl, fileName)
    if (result && window.$message) {
      console.log('图片保存路径:', result)
      window.$message.success('图片已保存')

      // 保存文件信息到 file store
      const roomId = getCurrentRoomId()
      if (roomId) {
        // 获取文件状态，使用相对路径（localPath）而不是绝对路径
        const fileStatus = fileDownloadStore.getFileStatus(imageUrl)
        const localPath = fileStatus.localPath || result

        // 如果没有消息信息，手动创建文件信息
        const fileInfo = {
          id: props.message!.id, // 生成唯一ID
          roomId,
          fileName,
          type: 'image' as const,
          url: localPath, // 使用相对路径
          suffix: fileName.split('.').pop()?.toLowerCase()
        }
        fileStore.addFile(fileInfo)
        console.log('🔍 [ImagePreview Debug] 保存文件信息到 fileStore:', fileInfo)
      }
    }
  } catch (e) {
    console.error('保存图片失败:', e)
    if (window.$message) {
      window.$message.error('保存失败')
    }
  }

  emit('save')
}

const handleMore = () => {
  if (window.$message) {
    window.$message.warning('更多功能暂未实现')
  }

  emit('more')
}
</script>

<style scoped>
/* 图片预览背景淡入淡出动画 */
.image-preview-enter-active,
.image-preview-leave-active {
  transition: opacity 0.3s ease;
}

.image-preview-enter-from,
.image-preview-leave-to {
  opacity: 0;
}

/* 图片缩放动画 */
.image-zoom-enter-active,
.image-zoom-leave-active {
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.image-zoom-enter-from {
  opacity: 0;
  transform: scale(0.8);
}

.image-zoom-leave-to {
  opacity: 0;
  transform: scale(1.1);
}
</style>

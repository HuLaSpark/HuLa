<template>
  <n-modal
    :trap-focus="false"
    v-model:show="visible"
    :mask-closable="false"
    class="rounded-8px"
    transform-origin="center">
    <div class="bg-[--bg-edit] min-w-320px h-fit box-border flex flex-col select-none cursor-default">
      <n-flex :size="6" vertical>
        <div
          v-if="type() === 'macos'"
          @click="visible = false"
          class="mac-close size-13px shadow-inner bg-#ed6a5eff rounded-50% mt-6px select-none absolute left-6px">
          <svg class="hidden size-7px color-#000 font-bold select-none absolute top-3px left-3px">
            <use href="#close"></use>
          </svg>
        </div>

        <n-flex class="text-(14px [--text-color]) select-none pt-6px" justify="center">发送文件</n-flex>

        <svg
          v-if="type() === 'windows'"
          class="size-14px cursor-pointer pt-6px select-none absolute right-6px"
          @click="visible = false">
          <use href="#close"></use>
        </svg>
        <span class="h-1px w-full bg-[--line-color]"></span>
      </n-flex>

      <!-- 内容 -->
      <div class="p-10px">
        <div class="max-h-400px overflow-y-auto">
          <div v-for="(file, index) in fileList" :key="index" class="flex-y-center p-12px">
            <div class="flex-shrink-0 pr-12px">
              <img
                :src="`/file/${getFileExtension(file.name)}.svg`"
                :alt="getFileExtension(file.name)"
                @error="handleIconError"
                class="size-32px object-contain" />
            </div>

            <div class="flex-1 min-w-0">
              <div
                class="text-(14px [--text-color]) whitespace-nowrap overflow-hidden text-ellipsis pb-4px"
                :title="file.name">
                {{ file.name }}
              </div>
              <div class="text-(12px [--chat-text-color])">{{ formatFileSize(file.size) }}</div>
            </div>

            <div @click="removeFile(index)" class="flex-shrink-0 pl-20px cursor-pointer">
              <svg class="size-20px hover:color-#909090 transition-colors duration-200 ease-in-out">
                <use href="#squareClose"></use>
              </svg>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-8px">
          <n-button quaternary @click="handleCancel">取消</n-button>
          <n-button secondary type="primary" @click="handleConfirm" :disabled="fileList.length === 0">
            发送 ({{ fileList.length }})
          </n-button>
        </div>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { formatBytes } from '@/utils/Formatting'
import { type } from '@tauri-apps/plugin-os'

const props = withDefaults(
  defineProps<{
    show: boolean
    files: File[]
  }>(),
  {
    show: false,
    files: () => []
  }
)

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'confirm', files: File[]): void
  (e: 'cancel'): void
}>()

const visible = computed({
  get: () => props.show,
  set: (value: boolean) => emit('update:show', value)
})

const fileList = ref<File[]>([])

watch(
  () => props.files,
  (newFiles) => {
    fileList.value = [...newFiles]
  },
  { immediate: true }
)

const getFileExtension = (fileName: string): string => {
  return fileName.split('.').pop()?.toLowerCase() || 'file'
}

const formatFileSize = (bytes: number): string => {
  return formatBytes(bytes)
}

const handleIconError = (event: Event) => {
  const target = event.target as HTMLImageElement
  target.src = '/file/other.svg' // 默认文件图标
}

const removeFile = (index: number) => {
  fileList.value.splice(index, 1)
  // 如果文件列表为空，自动关闭弹窗
  if (fileList.value.length === 0) {
    visible.value = false
  }
}

const handleCancel = () => {
  visible.value = false
  emit('cancel')
}

const handleConfirm = async () => {
  visible.value = false
  await nextTick()
  await new Promise((resolve) => {
    setTimeout(resolve, 100)
  })
  emit('confirm', fileList.value)
}
</script>

<style scoped lang="scss"></style>

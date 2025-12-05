<template>
  <n-modal
    :show="props.show"
    @update:show="$emit('update:show', $event)"
    :mask-closable="false"
    class="rounded-8px"
    transform-origin="center">
    <div class="bg-[--bg-edit] w-560px h-480px box-border flex flex-col items-center justify-between">
      <!-- 标题栏 -->
      <n-flex :size="6" vertical class="w-full">
        <div
          v-if="isMac()"
          @click="closeWindow"
          class="mac-close size-13px shadow-inner bg-#ed6a5eff rounded-50% mt-6px select-none absolute left-6px">
          <svg class="hidden size-7px color-#000 select-none absolute top-3px left-3px">
            <use href="#close"></use>
          </svg>
        </div>

        <n-flex class="text-(14px [--text-color]) select-none pt-6px" justify="center">
          {{ t('components.avatarCropper.title') }}
        </n-flex>

        <svg
          v-if="isWindows()"
          class="size-14px cursor-pointer pt-6px select-none absolute right-6px"
          @click="closeWindow">
          <use href="#close"></use>
        </svg>
        <span class="h-1px w-full bg-[--line-color]"></span>
      </n-flex>

      <!-- 主体内容 -->
      <n-flex align="center">
        <!-- 裁剪区域 -->
        <div class="w-320px h-320px p-10px mr-20px">
          <vue-cropper
            ref="cropperRef"
            :img="localImageUrl"
            :outputSize="0.4"
            :autoCrop="true"
            :fixedBox="true"
            :fixed="true"
            :centerBox="true"
            :autoCropWidth="320"
            :autoCropHeight="320"
            :fixedNumber="[1, 1]"
            @realTime="handleRealTime" />
        </div>

        <!-- 预览区域 -->
        <n-flex vertical class="px-20px">
          <!-- 圆形预览 -->
          <div class="mb-20px">
            <div class="text-14px text-[--text-color] mb-8px">
              {{ t('components.avatarCropper.preview.round') }}
            </div>
            <div class="preview-wrapper">
              <div
                class="rounded-full preview-content"
                :style="{
                  width: previewUrl?.w + 'px',
                  height: previewUrl?.h + 'px',
                  overflow: 'hidden',
                  transform: 'scale(0.4)',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  transformOrigin: '0 0'
                }">
                <img :src="previewUrl?.url" :style="previewUrl?.img" />
              </div>
            </div>
          </div>

          <!-- 方形预览 -->
          <div>
            <div class="text-14px text-[--text-color] mb-8px w-120px">
              {{ t('components.avatarCropper.preview.square') }}
            </div>
            <div class="preview-wrapper">
              <div
                class="rounded-36px preview-content"
                :style="{
                  width: previewUrl?.w + 'px',
                  height: previewUrl?.h + 'px',
                  overflow: 'hidden',
                  transform: 'scale(0.4)',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  transformOrigin: '0 0'
                }">
                <img :src="previewUrl?.url" :style="previewUrl?.img" />
              </div>
            </div>
          </div>
        </n-flex>
      </n-flex>
      <n-flex class="p-12px" align="center" justify="center" :size="12">
        <n-button quaternary @click="closeWindow" :disabled="loading">{{ t('components.common.cancel') }}</n-button>
        <n-button secondary type="primary" @click="handleCrop" :loading="loading">{{ loadingText }}</n-button>
      </n-flex>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { isMac, isWindows } from '@/utils/PlatformConstants'
import 'vue-cropper/dist/index.css'
import { VueCropper } from 'vue-cropper'

const { t } = useI18n()
const localImageUrl = ref('')
const cropperRef = ref()
const loading = ref(false)
const loadingText = computed(() =>
  loading.value ? t('components.avatarCropper.uploading') : t('components.common.confirm')
)
const previewUrl = ref<{
  url: string
  img: any
  w: number
  h: number
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  crop: [data: Blob]
}>()

const props = defineProps<{
  show: boolean
  imageUrl: string
}>()

watch(
  () => props.imageUrl,
  (newVal) => {
    localImageUrl.value = newVal
  },
  { immediate: true }
)

const handleRealTime = (data: { url: string; img: any; w: number; h: number }) => {
  previewUrl.value = data
}

const handleCrop = () => {
  loading.value = true

  cropperRef.value?.getCropBlob((blob: Blob) => {
    emit('crop', blob)
  })
}

/** 关闭裁剪窗口 */
const closeWindow = () => {
  if (!loading.value) {
    emit('update:show', false)
  }
}

/** 结束加载状态 */
const finishLoading = () => {
  loading.value = false
}

// 定义组件实例类型
export interface AvatarCropperInstance {
  finishLoading: () => void
}
defineExpose<AvatarCropperInstance>({
  finishLoading
})

// 确保在组件卸载时清理预览
onUnmounted(() => {
  previewUrl.value = {
    url: '',
    img: null,
    w: 0,
    h: 0
  }
})
</script>

<style scoped>
.mac-close:hover svg {
  display: block;
}

/* 修改裁剪框样式 */
:deep(.cropper-view-box) {
  border-radius: 50%;
  outline: none;
  outline-color: transparent;
}

:deep(.cropper-face) {
  background-color: transparent;
  border-radius: 50%;
}

:deep(.cropper-dashed) {
  display: none;
}

/* 添加预览图片的过渡效果 */
img {
  transition: opacity 0.2s ease-in-out;
}

.preview-wrapper {
  position: relative;
  width: calc(320px * 0.4); /* 根据原始尺寸和缩放比例计算 */
  height: calc(320px * 0.4);
  overflow: hidden;
}

.preview-content {
  transform-origin: left top;
}
</style>

<template>
  <div
    class="size-full bg-#222 relative flex flex-col select-none"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave">
    <!-- 顶部操作栏 -->
    <ActionBar class="bg-#000 z-9999" :shrink="false" :current-label="currentLabel" />

    <!-- 主体内容区域 -->
    <div ref="contentRef" class="flex-1 overflow-auto">
      <!-- 图片展示区域 -->
      <div ref="imgContainerRef" class="min-h-[calc(100vh-124px)] flex-center">
        <img
          ref="imageRef"
          :src="currentImage"
          :style="{
            willChange: isDragging ? 'transform' : 'auto',
            cursor: isDragging ? 'grabbing' : 'grab'
          }"
          class="max-w-90% max-h-90% select-none"
          :class="[{ 'transition-transform duration-200': !isDragging }]"
          @mousedown="startDrag"
          @load="checkScrollbar"
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

    <!-- 左右箭头 -->
    <div
      v-show="imageList.length > 1 && showArrows.left"
      @click="prevImage"
      @mouseenter="handleArrowEnter('left')"
      @mouseleave="handleArrowLeave('left')"
      class="fixed left-20px top-1/2 -translate-y-1/2 size-40px rounded-full bg-black/30 flex-center cursor-pointer hover:bg-black/50 transition-all duration-200 opacity-0 z-10"
      :class="{ 'opacity-100': showArrows.left }">
      <svg class="size-24px color-white rotate-180"><use href="#arrow-right"></use></svg>
    </div>
    <div
      v-show="imageList.length > 1 && showArrows.right"
      @click="nextImage"
      @mouseenter="handleArrowEnter('right')"
      @mouseleave="handleArrowLeave('right')"
      class="fixed right-20px top-1/2 -translate-y-1/2 size-40px rounded-full bg-black/30 flex-center cursor-pointer hover:bg-black/50 transition-all duration-200 opacity-0 z-10"
      :class="{ 'opacity-100': showArrows.right }">
      <svg class="size-24px color-white"><use href="#arrow-right"></use></svg>
    </div>

    <!-- 底部工具栏 -->
    <div data-tauri-drag-region class="z-9999 h-50px bg-#000 flex justify-center items-center gap-30px">
      <n-tooltip placement="top">
        <template #trigger>
          <svg @click="zoomOut" class="size-24px cursor-pointer color-white"><use href="#zoom-out"></use></svg>
        </template>
        缩小
      </n-tooltip>

      <span class="color-white text-14px min-w-50px text-center select-none">{{ scaleText }}</span>

      <n-tooltip placement="top">
        <template #trigger>
          <svg @click="zoomIn" class="size-24px cursor-pointer color-white"><use href="#zoom-in"></use></svg>
        </template>
        放大
      </n-tooltip>

      <n-tooltip placement="top">
        <template #trigger>
          <svg @click="rotateLeft" class="size-24px cursor-pointer scale-x--100 color-white">
            <use href="#RotateRight"></use>
          </svg>
        </template>
        向左旋转
      </n-tooltip>

      <n-tooltip placement="top">
        <template #trigger>
          <svg @click="rotateRight" class="size-24px cursor-pointer color-white"><use href="#RotateRight"></use></svg>
        </template>
        向右旋转
      </n-tooltip>

      <n-tooltip placement="top">
        <template #trigger>
          <svg @click="resetImage()" class="size-24px cursor-pointer color-white"><use href="#refresh"></use></svg>
        </template>
        重置
      </n-tooltip>

      <n-tooltip placement="top">
        <template #trigger>
          <svg @click="saveImage" class="size-24px cursor-pointer color-white"><use href="#Importing"></use></svg>
        </template>
        另存为
      </n-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { save } from '@tauri-apps/plugin-dialog'
import { useDownload } from '@/hooks/useDownload'
import { getCurrentWebviewWindow, WebviewWindow } from '@tauri-apps/api/webviewWindow'
import ActionBar from '@/components/windows/ActionBar.vue'
import { NTooltip } from 'naive-ui'
import { useImageViewer } from '@/stores/imageViewer.ts'
import { useTauriListener } from '@/hooks/useTauriListener'

const { addListener } = useTauriListener()
const { downloadFile } = useDownload()
const imageViewerStore = useImageViewer()
const appWindow = WebviewWindow.getCurrent()

// 初始化数据
const imageList = ref<string[]>([])

const currentLabel = WebviewWindow.getCurrent().label
const currentIndex = ref(0)
const scale = ref(1)
const rotation = ref(0)
const isDragging = ref(false)
const dragStart = reactive({ x: 0, y: 0 })
const imagePosition = reactive({ x: 0, y: 0 })
const imageRef = ref<HTMLImageElement>()
// 添加响应式变量来跟踪是否有滚动条
const contentScrollbar = useTemplateRef<HTMLElement>('contentRef')
// 图片容器
const imgContainer = useTemplateRef<HTMLElement>('imgContainerRef')
//提示相关的响应式变量
const showTip = ref(false)
const tipText = ref('')
// 左右箭头显示
const showArrows = reactive({
  left: false,
  right: false,
  leftHover: false,
  rightHover: false
})

// 添加缩放倍数显示的计算属性
const scaleText = computed(() => {
  return `${Math.round(scale.value * 100)}%`
})
// 当前显示的图片URL
const currentImage = computed(() => {
  if (imageViewerStore.isSingleMode) {
    return imageViewerStore.singleImage
  }
  return imageList.value[currentIndex.value]
})

// 添加鼠标移动处理函数
const handleMouseMove = (e: MouseEvent) => {
  const { clientX } = e
  const { innerWidth } = window

  // 左侧箭头显示逻辑
  if (!showArrows.leftHover) {
    showArrows.left = clientX <= 78
  }

  // 右侧箭头显示逻辑
  if (!showArrows.rightHover) {
    showArrows.right = innerWidth - clientX <= 78
  }
}

// 添加鼠标离开整个容器的处理
const handleMouseLeave = () => {
  if (!showArrows.leftHover) {
    showArrows.left = false
  }
  if (!showArrows.rightHover) {
    showArrows.right = false
  }
}

// 添加箭头hover状态处理
const handleArrowEnter = (direction: 'left' | 'right') => {
  showArrows[`${direction}Hover`] = true
  showArrows[direction] = true
}

const handleArrowLeave = (direction: 'left' | 'right') => {
  showArrows[`${direction}Hover`] = false
  showArrows[direction] = false
}

// 图片拖动相关
const startDrag = (e: MouseEvent) => {
  isDragging.value = true
  dragStart.x = e.clientX - imagePosition.x
  dragStart.y = e.clientY - imagePosition.y

  // 使用 addEventListener 的第三个参数 { passive: true } 来优化性能
  document.addEventListener('mousemove', handleDrag, { passive: true })
  document.addEventListener('mouseup', stopDrag)
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
}

const updateTransform = () => {
  if (!imageRef.value) return
  const transform = `translate3d(${imagePosition.x}px, ${imagePosition.y}px, 0) scale3d(${scale.value}, ${scale.value}, 1) rotate(${rotation.value}deg)`

  requestAnimationFrame(() => {
    if (imageRef.value) {
      imageRef.value.style.transform = transform
    }
  })
}

const handleDrag = (e: MouseEvent) => {
  if (!isDragging.value) return
  imagePosition.x = e.clientX - dragStart.x
  imagePosition.y = e.clientY - dragStart.y
  updateTransform()
}

// 工具栏操作
const zoomIn = () => {
  scale.value = Math.min(5, scale.value + 0.1)
  updateTransform()
}

const zoomOut = () => {
  scale.value = Math.max(0.1, scale.value - 0.1)
  updateTransform()
}

const rotateLeft = () => {
  rotation.value -= 90
  updateTransform()
}

const rotateRight = () => {
  rotation.value += 90
  updateTransform()
}

// 重置图片
const resetImage = (immediate = false) => {
  scale.value = 1
  rotation.value = 0
  imagePosition.x = 0
  imagePosition.y = 0
  if (imageRef.value) {
    if (immediate) {
      // 立即重置，不使用过渡动画
      imageRef.value.style.transition = 'none'
      imageRef.value.style.transform = ''
      // 强制重绘
      imageRef.value.offsetHeight
      // 恢复过渡动画
      imageRef.value.style.transition = ''
    } else {
      imageRef.value.style.transform = ''
    }
  }
}

const saveImage = async () => {
  const imageUrl = currentImage.value
  const suggestedName = imageUrl.split('/').pop() || 'image.png'

  const savePath = await save({
    filters: [
      {
        name: '图片',
        extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp']
      }
    ],
    defaultPath: suggestedName
  })

  if (savePath) {
    await downloadFile(imageUrl, savePath)
  }
}

// 显示提示的函数
const showTipMessage = (message: string) => {
  tipText.value = message
  showTip.value = true
  setTimeout(() => {
    showTip.value = false
  }, 1500)
}

// 修改切换图片的函数
const prevImage = () => {
  if (currentIndex.value > 0) {
    resetImage(true) // 立即重置
    currentIndex.value--
  } else {
    showTipMessage('这是第一张图片')
  }
}

const nextImage = () => {
  if (currentIndex.value < imageList.value.length - 1) {
    resetImage(true) // 立即重置
    currentIndex.value++
  } else {
    showTipMessage('已经最后一张图片')
  }
}

// 添加键盘事件处理
const handleKeydown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowLeft':
      prevImage()
      break
    case 'ArrowRight':
      nextImage()
      break
    case '=':
    case '+':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        zoomIn()
      }
      break
    case '-':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        zoomOut()
      }
      break
    case '0':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        resetImage()
      }
      break
    case 'Escape':
      appWindow.close()
      break
  }
}

// 检查是否有滚动条的函数
const checkScrollbar = () => {
  if (!imgContainer.value || !contentScrollbar.value || !imageRef.value) return

  imgContainer.value.style.height = 'auto' // 先重置为auto以便正确计算
  // 检查是否有滚动条
  imgContainer.value.style.height =
    contentScrollbar.value.scrollHeight > contentScrollbar.value.clientHeight ? 'auto' : '100%'
}

onMounted(async () => {
  // 显示窗口
  await getCurrentWebviewWindow().show()

  await addListener(
    appWindow.listen('update-image', (event: any) => {
      const { list, index } = event.payload
      imageList.value = list
      currentIndex.value = index
      // 重置图片状态
      resetImage(true)
    })
  )

  if (imageViewerStore.isSingleMode) {
    // 单图模式下不需要设置 imageList 和 currentIndex
    imageList.value = [imageViewerStore.singleImage]
    currentIndex.value = 0
  } else {
    // 多图模式保持原有逻辑
    imageList.value = imageViewerStore.imageList
    currentIndex.value = imageViewerStore.currentIndex
  }

  // 监听键盘事件
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
})
</script>

<style scoped>
.viewer-tip-enter-active,
.viewer-tip-leave-active {
  transition: opacity 0.3s ease;
}

.viewer-tip-enter-from,
.viewer-tip-leave-to {
  opacity: 0;
}

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

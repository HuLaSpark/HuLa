<template>
  <main
    data-tauri-drag-region
    id="center"
    class="resizable select-none flex flex-col"
    :style="{ width: `${initWidth}px` }">
    <div class="resize-handle" @mousedown="initDrag"></div>
    <ActionBar
      class="absolute right-0"
      v-if="shrinkStatus"
      :shrink-status="!shrinkStatus"
      :max-w="false"
      :current-label="appWindow.label" />

    <!--    <div class="resize-handle" @mousedown="initDrag"></div>-->

    <!-- 顶部搜索栏 -->
    <header
      style="box-shadow: 0 2px 4px var(--box-shadow-color)"
      class="mt-30px w-full h-38px flex flex-col items-center">
      <div class="flex-center gap-5px w-full pr-16px pl-16px box-border">
        <n-input
          id="search"
          @focus="() => router.push('/searchDetails')"
          class="rounded-4px w-full"
          style="background: var(--search-bg-color)"
          :maxlength="20"
          clearable
          size="small"
          placeholder="搜索">
          <template #prefix>
            <svg class="w-12px h-12px"><use href="#search"></use></svg>
          </template>
        </n-input>
        <n-button size="small" secondary style="padding: 0 5px">
          <template #icon>
            <svg class="w-24px h-24px"><use href="#plus"></use></svg>
          </template>
        </n-button>
      </div>
    </header>

    <!-- 列表 -->
    <div id="centerList">
      <router-view />
    </div>
  </main>
</template>

<script setup lang="ts">
import Mitt from '@/utils/Bus.ts'
import router from '@/router'
import { MittEnum } from '@/enums'
import { appWindow } from '@tauri-apps/api/window'
import { useWindowSize } from '@vueuse/core'

/** 设置最小宽度 */
const minWidth = 160
/** 设置最大宽度 */
const maxWidth = 300
/** 初始化宽度 */
const initWidth = ref(250)
/**! 使用(vueUse函数获取)视口宽度 */
const { width } = useWindowSize()
/** 是否拖拽 */
const isDrag = ref(true)
/** 当前消息 */
const currentMsg = ref()

const startX = ref()
const startWidth = ref()
const shrinkStatus = ref(false)

watchEffect(() => {
  if (width.value >= 310 && width.value < 800) {
    Mitt.emit(MittEnum.SHRINK_WINDOW, true)
    const center = document.querySelector('#center')
    center?.classList.add('flex-1')
    isDrag.value = false
  }
  if (width.value >= 800) {
    Mitt.emit(MittEnum.SHRINK_WINDOW, false)
    if (currentMsg.value) {
      Mitt.emit(MittEnum.MSG_BOX_SHOW, { msgBoxShow: true, ...currentMsg.value })
    }
    const center = document.querySelector('#center')
    center?.classList.remove('flex-1')
    isDrag.value = true
  }
})

const closeMenu = (event: Event) => {
  const e = event.target as HTMLInputElement
  const route = router.currentRoute.value.path
  /** 判断如果点击的搜索框，就关闭消息列表 */
  if (!e.matches('#search, #search *, #centerList *, #centerList') && route === '/searchDetails') {
    router.go(-1)
  }
}

/** 定义一个函数，在鼠标拖动时调用 */
const doDrag = (e: MouseEvent) => {
  // 使用 requestAnimationFrame 来处理动画，确保动画在下一帧渲染前执行
  requestAnimationFrame(() => {
    // 计算新的宽度
    const newWidth = startWidth.value + e.clientX - startX.value
    // 如果新宽度不等于最大宽度，则更新宽度值
    if (newWidth !== maxWidth) {
      initWidth.value = clamp(newWidth, minWidth, maxWidth) // 使用 clamp 函数限制宽度值在最小值和最大值之间
    }
  })
}

/** 定义一个函数，用于将数值限制在指定的最小值和最大值之间 */
const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max) // 使用 Math.min 和 Math.max 函数来限制数值范围
}

const initDrag = (e: MouseEvent) => {
  if (!isDrag.value) return
  startX.value = e.clientX
  startWidth.value = initWidth.value
  document.addEventListener('mousemove', doDrag, false)
  document.addEventListener('mouseup', stopDrag, false)
}

const stopDrag = () => {
  document.removeEventListener('mousemove', doDrag, false)
  document.removeEventListener('mouseup', stopDrag, false)
}

onMounted(async () => {
  Mitt.on(MittEnum.SHRINK_WINDOW, (event) => {
    shrinkStatus.value = event as boolean
  })
  Mitt.on(MittEnum.MSG_BOX_SHOW, (event: any) => {
    if (!event) return
    currentMsg.value = event
  })
  window.addEventListener('click', closeMenu, true)
})

onUnmounted(() => {
  window.removeEventListener('click', closeMenu, true)
})
</script>

<style scoped lang="scss">
@import 'style';
</style>

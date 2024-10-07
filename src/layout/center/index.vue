<template>
  <main
    data-tauri-drag-region
    id="center"
    :class="{ 'rounded-r-8px': shrinkStatus }"
    class="resizable select-none flex flex-col border-r-(1px solid [--right-chat-footer-line-color])"
    :style="{ width: `${initWidth}px` }">
    <!-- 分隔条 -->
    <div v-if="!shrinkStatus" class="resize-handle transition-all duration-600 ease-in-out" @mousedown="initDrag">
      <div :class="{ 'opacity-100': isDragging }" class="transition-all duration-600 ease-in-out opacity-0 drag-icon">
        <div style="border-radius: 8px 0 0 8px" class="bg-#c8c8c833 h-60px w-14px absolute top-40% right-0 drag-icon">
          <svg class="size-16px absolute top-1/2 right--2px transform -translate-y-1/2 color-#909090">
            <use href="#sliding"></use>
          </svg>
        </div>
      </div>
    </div>

    <ActionBar
      class="absolute right-0 w-full"
      v-if="shrinkStatus"
      :shrink-status="!shrinkStatus"
      :max-w="false"
      :current-label="appWindow.label" />

    <!-- 顶部搜索栏 -->
    <header
      class="mt-30px w-full h-40px flex flex-col items-center border-b-(1px solid [--right-chat-footer-line-color])">
      <div class="flex-center gap-5px w-full pr-16px pl-16px box-border">
        <n-input
          id="search"
          @focus="() => handleSearchFocus()"
          @blur="() => (searchText = '搜索')"
          class="rounded-6px w-full relative text-12px"
          style="background: var(--search-bg-color)"
          :maxlength="20"
          clearable
          size="small"
          :placeholder="searchText">
          <template #prefix>
            <svg class="w-12px h-12px"><use href="#search"></use></svg>
          </template>
        </n-input>

        <!-- 添加面板 -->
        <n-popover
          v-model:show="addPanels.show"
          style="padding: 0; background: transparent; user-select: none"
          :show-arrow="false"
          trigger="click">
          <template #trigger>
            <n-button size="small" secondary style="padding: 0 5px">
              <template #icon>
                <svg class="w-24px h-24px"><use href="#plus"></use></svg>
              </template>
            </n-button>
          </template>

          <div @click.stop="addPanels.show = false" class="add-item">
            <div class="menu-list">
              <div v-for="(item, index) in addPanels.list" :key="index">
                <div class="menu-item" @click="() => item.click()">
                  <svg><use :href="`#${item.icon}`"></use></svg>
                  {{ item.label }}
                </div>
              </div>
            </div>
          </div>
        </n-popover>
      </div>
    </header>

    <!-- 列表 -->
    <div id="centerList" class="h-full" :class="{ 'shadow-inner': page.shadow }">
      <router-view />
    </div>
  </main>
</template>

<script setup lang="ts">
import Mitt from '@/utils/Bus.ts'
import router from '@/router'
import { MittEnum } from '@/enums'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useWindowSize } from '@vueuse/core'
import { setting } from '@/stores/setting.ts'

const settingStore = setting()
const { page } = storeToRefs(settingStore)
const appWindow = WebviewWindow.getCurrent()
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
/** 搜索框文字 */
const searchText = ref('搜索')
/** 添加面板是否显示 */
const addPanels = ref({
  show: false,
  list: [
    {
      label: '发起群聊',
      icon: 'launch',
      click: () => {
        console.log('发起群聊')
      }
    },
    {
      label: '加好友/群',
      icon: 'people-plus',
      click: () => {
        console.log('加好友/群')
      }
    }
  ]
})

const startX = ref()
const startWidth = ref()
const shrinkStatus = ref(false)
const isDragging = ref(false)

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

const handleSearchFocus = () => {
  router.push('/searchDetails')
  searchText.value = ''
}

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
  isDragging.value = true
  document.addEventListener('mousemove', doDrag, false)
  document.addEventListener('mouseup', stopDrag, false)
}

const stopDrag = () => {
  document.removeEventListener('mousemove', doDrag, false)
  document.removeEventListener('mouseup', stopDrag, false)
  isDragging.value = false
  setTimeout(() => {
    // 移除 hover 样式
    const resizeHandle = document.querySelector('.resize-handle') as HTMLElement
    resizeHandle.classList.remove('hover')
  }, 1000)
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

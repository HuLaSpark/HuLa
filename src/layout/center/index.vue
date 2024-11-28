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

    <!-- 创建群聊穿梭框 -->
    <n-modal v-model:show="createGroupModal" :mask-closable="false" class="rounded-8px" transform-origin="center">
      <div class="bg-[--bg-edit] w-520px h-fit box-border flex flex-col">
        <n-flex :size="6" vertical>
          <div
            v-if="type() === 'macos'"
            @click="createGroupModal = false"
            class="mac-close size-13px shadow-inner bg-#ed6a5eff rounded-50% mt-6px select-none absolute left-6px">
            <svg class="hidden size-7px color-#000 font-bold select-none absolute top-3px left-3px">
              <use href="#close"></use>
            </svg>
          </div>

          <n-flex class="text-(14px --text-color) select-none pt-6px" justify="center">创建群聊</n-flex>

          <svg
            v-if="type() === 'windows'"
            class="size-14px cursor-pointer pt-6px select-none absolute right-6px"
            @click="createGroupModal = false">
            <use href="#close"></use>
          </svg>

          <n-transfer v-model:value="value" :options="options" :render-target-label="renderLabel" />

          <n-flex align="center" justify="center" class="p-16px">
            <n-button color="#13987f" @click="createGroupModal = false">创建</n-button>
          </n-flex>
        </n-flex>
      </div>
    </n-modal>
  </main>
</template>

<script setup lang="ts">
import Mitt from '@/utils/Bus.ts'
import router from '@/router'
import { MittEnum } from '@/enums'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useWindowSize } from '@vueuse/core'
import { useSettingStore } from '@/stores/setting.ts'
import { type } from '@tauri-apps/plugin-os'
import type { TransferRenderTargetLabel } from 'naive-ui'
import { NAvatar } from 'naive-ui'

const settingStore = useSettingStore()
const { page } = storeToRefs(settingStore)
const appWindow = WebviewWindow.getCurrent()
const createGroupModal = ref(false)
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
        createGroupModal.value = true
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
const options = [
  {
    label: '07akioni',
    value: 'https://avatars.githubusercontent.com/u/18677354?s=60&v=4'
  },
  {
    label: 'amadeus711',
    value: 'https://avatars.githubusercontent.com/u/46394163?s=60&v=4'
  },
  {
    label: 'Talljack',
    value: 'https://avatars.githubusercontent.com/u/34439652?s=60&v=4'
  },
  {
    label: 'JiwenBai',
    value: 'https://avatars.githubusercontent.com/u/43430022?s=60&v=4'
  },
  {
    label: 'songjianet',
    value: 'https://avatars.githubusercontent.com/u/19239641?s=60&v=4'
  }
]
const value = ref([options[0].value])
const renderLabel: TransferRenderTargetLabel = function ({ option }) {
  return h(
    'div',
    {
      style: {
        display: 'flex',
        margin: '6px 0'
      }
    },
    {
      default: () => [
        h(NAvatar, {
          round: true,
          src: option.value as string,
          size: 'small',
          fallbackSrc: 'https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg'
        }),
        h(
          'div',
          {
            style: {
              display: 'flex',
              marginLeft: '6px',
              alignSelf: 'center'
            }
          },
          { default: () => option.label }
        )
      ]
    }
  )
}

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
      // 给聊天框添加 select-none 样式，防止在拖动改变布局时选中文本
      const chatMain = document.querySelector('#image-chat-main')
      chatMain?.classList.add('select-none')
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
  // 松开鼠标后，移除聊天框的 select-none 样式
  const chatMain = document.querySelector('#image-chat-main')
  chatMain?.classList.remove('select-none')
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
@use 'style';
:deep(.n-transfer .n-transfer-list .n-transfer-list__border) {
  border: none;
}
:deep(.n-transfer .n-transfer-list.n-transfer-list--source .n-transfer-list__border) {
  border-right: 1px solid var(--n-divider-color);
}
</style>

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
          v-model:value="searchText"
          @focus="() => handleSearchFocus()"
          @blur="() => (searchText = '搜索')"
          @update:value="handleSearchInputChange"
          class="rounded-6px w-full relative text-12px"
          style="background: var(--search-bg-color)"
          :maxlength="20"
          clearable
          spellCheck="false"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          size="small"
          :placeholder="isSearchMode ? '' : '搜索'">
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
      <router-view v-slot="{ Component }">
        <keep-alive :include="['message', 'friendsList']">
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </div>

    <!-- 创建群聊穿梭框 -->
    <n-modal v-model:show="createGroupModal" :mask-closable="false" class="rounded-8px" transform-origin="center">
      <div class="bg-[--bg-edit] w-540px h-fit box-border flex flex-col">
        <n-flex :size="6" vertical>
          <div
            v-if="type() === 'macos'"
            @click="createGroupModal = false"
            class="mac-close size-13px shadow-inner bg-#ed6a5eff rounded-50% mt-6px select-none absolute left-6px">
            <svg class="hidden size-7px color-#000 font-bold select-none absolute top-3px left-3px">
              <use href="#close"></use>
            </svg>
          </div>

          <n-flex class="text-(14px [--text-color]) select-none pt-6px" justify="center">创建群聊</n-flex>

          <svg
            v-if="type() === 'windows'"
            class="size-14px cursor-pointer pt-6px select-none absolute right-6px"
            @click="createGroupModal = false">
            <use href="#close"></use>
          </svg>

          <n-transfer
            source-filterable
            target-filterable
            v-model:value="selectedValue"
            :options="options"
            :render-source-list="renderSourceList()"
            :render-target-label="renderLabel" />

          <n-flex align="center" justify="center" class="p-16px">
            <n-button :disabled="selectedValue.length < 2" color="#13987f" @click="handleCreateGroup">创建</n-button>
          </n-flex>
        </n-flex>
      </div>
    </n-modal>
  </main>
</template>

<script setup lang="ts">
import { useMitt } from '@/hooks/useMitt.ts'
import router from '@/router'
import { MittEnum } from '@/enums'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useWindowSize } from '@vueuse/core'
import { useSettingStore } from '@/stores/setting.ts'
import { type } from '@tauri-apps/plugin-os'
import { renderLabel, renderSourceList, options, createGroup } from './model.tsx'
import { useWindow } from '@/hooks/useWindow'
import { useGlobalStore } from '@/stores/global.ts'

const { createWebviewWindow } = useWindow()

const settingStore = useSettingStore()
const globalStore = useGlobalStore()
const { page } = storeToRefs(settingStore)
const appWindow = WebviewWindow.getCurrent()
const selectedValue = ref([])
const createGroupModal = ref(false)
/** 设置最小宽度 */
const minWidth = 160
/** 设置最大宽度 */
const maxWidth = 300
/** 初始化宽度 */
const initWidth = ref(250)
/**! 使用(vueUse函数获取)视口宽度 */
const { width, height } = useWindowSize()
/** 是否拖拽 */
const isDrag = ref(true)
/** 当前消息 */
const currentMsg = ref()
/** 搜索框文字 */
const searchText = ref('搜索')
/** 是否处于搜索模式 */
const isSearchMode = ref(false)
/** 添加面板是否显示 */
const addPanels = ref({
  show: false,
  list: [
    {
      label: '发起群聊',
      icon: 'launch',
      click: () => {
        createGroupModal.value = true
      }
    },
    {
      label: '加好友/群',
      icon: 'people-plus',
      click: async () => {
        await createWebviewWindow('添加好友/群', 'searchFriend', 500, 580)
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
    useMitt.emit(MittEnum.SHRINK_WINDOW, true)
    const center = document.querySelector('#center')
    center?.classList.add('flex-1')
    isDrag.value = false
  }
  if (width.value >= 800) {
    useMitt.emit(MittEnum.SHRINK_WINDOW, false)
    // TODO: 因为拖动后要重新加载所以这里会监听两次，后续优化
    // if (currentMsg.value) {
    //   useMitt.emit(MittEnum.MSG_BOX_SHOW, { msgBoxShow: true, ...currentMsg.value })
    // }
    const center = document.querySelector('#center')
    center?.classList.remove('flex-1')
    isDrag.value = true
  }
  globalStore.setHomeWindowState({ width: width.value, height: height.value })
})

const handleCreateGroup = async () => {
  if (selectedValue.value.length < 2) return
  try {
    await createGroup(selectedValue.value)
    createGroupModal.value = false
    selectedValue.value = []
    window.$message.success('创建群聊成功')
  } catch (error) {
    window.$message.error('创建群聊失败')
  }
}

const handleSearchFocus = () => {
  router.push('/searchDetails')
  searchText.value = ''
  isSearchMode.value = true

  // 延迟发送当前搜索框的值到SearchDetails组件
  setTimeout(() => {
    useMitt.emit('search_input_change', searchText.value)
  }, 100)
}

// 处理搜索输入变化
const handleSearchInputChange = (value: string) => {
  // 如果处于搜索详情页面，将输入值发送到SearchDetails组件
  if (isSearchMode.value) {
    useMitt.emit('search_input_change', value)
  }
}

const closeMenu = (event: Event) => {
  const e = event.target as HTMLInputElement
  const route = router.currentRoute.value.path
  /** 判断如果点击的搜索框，就关闭消息列表 */
  if (!e.matches('#search, #search *, #centerList *, #centerList') && route === '/searchDetails') {
    router.go(-1)
    isSearchMode.value = false
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
  useMitt.on(MittEnum.SHRINK_WINDOW, (event: boolean) => {
    shrinkStatus.value = event
  })
  useMitt.on(MittEnum.CREATE_GROUP, (event: { id: string }) => {
    createGroupModal.value = true
    console.log(event)
    // TODO: 选用并且禁用当前 event.id 对应的uid的用户
  })
  useMitt.on(MittEnum.MSG_BOX_SHOW, (event: any) => {
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
</style>

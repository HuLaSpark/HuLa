<template>
  <main
    data-tauri-drag-region
    id="center"
    :class="{ 'rounded-r-8px': shrinkStatus }"
    class="resizable select-none flex flex-col border-r-(1px solid [--right-chat-footer-line-color])"
    :style="{ width: shrinkStatus ? '100%' : `${initWidth}px` }">
    <!-- 分隔条 -->
    <div v-show="!shrinkStatus" class="resize-handle transition-all duration-600 ease-in-out" @mousedown="initDrag">
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
      v-show="shrinkStatus"
      :shrink-status="!shrinkStatus"
      :max-w="false"
      :current-label="appWindow.label" />

    <!-- 顶部搜索栏 -->
    <header class="mt-30px pb-10px flex-1 flex-col-x-center border-b-(1px solid [--right-chat-footer-line-color])">
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
            v-if="isMac()"
            @click="resetCreateGroupState"
            class="mac-close size-13px shadow-inner bg-#ed6a5eff rounded-50% mt-6px select-none absolute left-6px">
            <svg class="hidden size-7px color-#000 select-none absolute top-3px left-3px">
              <use href="#close"></use>
            </svg>
          </div>

          <n-flex class="text-(14px [--text-color]) select-none pt-6px" justify="center">创建群聊</n-flex>

          <svg
            v-if="isWindows()"
            class="size-14px cursor-pointer pt-6px select-none absolute right-6px"
            @click="resetCreateGroupState">
            <use href="#close"></use>
          </svg>

          <n-transfer
            :key="`${isFromChatbox}-${preSelectedFriendId}`"
            source-filterable
            target-filterable
            v-model:value="selectedValue"
            :options="options"
            :render-source-list="renderSourceList(isFromChatbox ? preSelectedFriendId : '', isFromChatbox)"
            :render-target-list="renderTargetList(isFromChatbox ? preSelectedFriendId : '', isFromChatbox)"
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
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useWindowSize } from '@vueuse/core'
import { MittEnum } from '@/enums'
import { useMitt } from '@/hooks/useMitt.ts'
import { useWindow } from '@/hooks/useWindow'
import router from '@/router'
import { useChatStore } from '@/stores/chat.ts'
import { useGlobalStore } from '@/stores/global.ts'
import { useSettingStore } from '@/stores/setting.ts'
import * as ImRequestUtils from '@/utils/ImRequestUtils'
import { isMac, isWindows } from '@/utils/PlatformConstants'
import { options, renderLabel, renderSourceList, renderTargetList } from './model.tsx'

const { createWebviewWindow } = useWindow()

const chatStore = useChatStore()
const settingStore = useSettingStore()
const globalStore = useGlobalStore()
const { page } = storeToRefs(settingStore)
const appWindow = WebviewWindow.getCurrent()
const selectedValue = ref<string[]>([])
const createGroupModal = ref(false)
const preSelectedFriendId = ref('')
const isFromChatbox = ref(false) // 标记是否来自聊天框
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
        isFromChatbox.value = false
        preSelectedFriendId.value = ''
        selectedValue.value = []
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
  // 获取页面缩放因子来计算调整后的断点
  // 由于使用了 useFixedScale 来抵消系统缩放，需要相应调整窗口布局断点
  const pageScale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--page-scale') || '1')
  const SHRINK_MIN_WIDTH = 310 * pageScale // 根据缩放因子调整断点
  const SHRINK_MAX_WIDTH = 800 * pageScale // 根据缩放因子调整断点

  const shouldShrink = width.value >= SHRINK_MIN_WIDTH && width.value < SHRINK_MAX_WIDTH
  const shouldExpand = width.value >= SHRINK_MAX_WIDTH

  if (shouldShrink) {
    useMitt.emit(MittEnum.SHRINK_WINDOW, true)
    const center = document.querySelector('#center')
    center?.classList.add('flex-1')
    isDrag.value = false
  } else if (shouldExpand) {
    useMitt.emit(MittEnum.SHRINK_WINDOW, false)
    const center = document.querySelector('#center')
    center?.classList.remove('flex-1')
    isDrag.value = true
  }
  globalStore.setHomeWindowState({ width: width.value, height: height.value })
})

// 监听选中值的变化，确保必选项不会被清除
watch(selectedValue, (newValue) => {
  if (isFromChatbox.value && preSelectedFriendId.value && newValue) {
    // 如果是从聊天框触发且有预选中好友，确保该好友始终在选中列表中
    if (!newValue.includes(preSelectedFriendId.value)) {
      // 如果预选中好友被移除了，重新加回去
      selectedValue.value = [...newValue, preSelectedFriendId.value]
    }
  }
})

const resetCreateGroupState = () => {
  selectedValue.value = []
  preSelectedFriendId.value = ''
  isFromChatbox.value = false
  createGroupModal.value = false
}

const handleCreateGroup = async () => {
  if (selectedValue.value.length < 2) return
  try {
    const result: any = await ImRequestUtils.createGroup({ uidList: selectedValue.value })

    // 创建成功后刷新会话列表以显示新群聊
    await chatStore.getSessionList(true)

    const resultRoomId = result?.roomId != null ? String(result.roomId) : undefined
    const resultId = result?.id != null ? String(result.id) : undefined

    const matchedSession = chatStore.sessionList.find((session) => {
      const sessionRoomId = String(session.roomId)
      const sessionDetailId = session.detailId != null ? String(session.detailId) : undefined
      return (
        (resultRoomId !== undefined && sessionRoomId === resultRoomId) ||
        (resultId !== undefined && (sessionDetailId === resultId || sessionRoomId === resultId))
      )
    })

    if (matchedSession?.roomId) {
      globalStore.updateCurrentSessionRoomId(matchedSession.roomId)
    }

    resetCreateGroupState()
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
  // 防止拖拽时选中文本
  document.body.style.userSelect = 'none'
  e.preventDefault()
}

const stopDrag = () => {
  // 恢复文本选择功能
  document.body.style.userSelect = ''
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
    isFromChatbox.value = true
    preSelectedFriendId.value = event.id
    createGroupModal.value = true
    nextTick(() => {
      selectedValue.value = [event.id]
    })
  })
  window.addEventListener('click', closeMenu, true)
})

onUnmounted(() => {
  window.removeEventListener('click', closeMenu, true)
  // 清理拖拽相关的事件监听器和样式
  if (isDragging.value) {
    document.removeEventListener('mousemove', doDrag, false)
    document.removeEventListener('mouseup', stopDrag, false)
    document.body.style.userSelect = ''
    isDragging.value = false
  }
})
</script>

<style scoped lang="scss">
@use 'style';
</style>

<template>
  <div class="chat-main-container" :style="cssVariables">
    <!-- 网络状态提示 -->
    <n-flex
      v-if="!networkStatus.isOnline.value"
      align="center"
      justify="center"
      class="z-999 w-full h-40px rounded-4px text-(12px [--danger-text]) bg-[--danger-bg] flex-shrink-0">
      <svg class="size-16px">
        <use href="#cloudError"></use>
      </svg>
      当前网络不可用，请检查你的网络设置
    </n-flex>

    <!-- 置顶公告提示 -->
    <Transition name="announcement" mode="out-in">
      <div
        v-if="isGroup && topAnnouncement"
        key="announcement"
        class="custom-announcement"
        :class="{ 'announcement-hover': isAnnouncementHover }"
        @mouseenter="isAnnouncementHover = true"
        @mouseleave="isAnnouncementHover = false">
        <n-flex :wrap="false" class="w-full" align="center" justify="space-between">
          <n-flex :wrap="false" align="center" class="pl-12px select-none flex-1" :size="6">
            <svg class="size-16px flex-shrink-0"><use href="#Loudspeaker"></use></svg>
            <div class="flex-1 min-w-0 line-clamp-1 text-(12px [--chat-text-color])">
              {{ topAnnouncement.content }}
            </div>
          </n-flex>
          <div class="flex-shrink-0 w-60px select-none" @click="handleViewAnnouncement">
            <p class="text-(12px #13987f) cursor-pointer">查看全部</p>
          </div>
        </n-flex>
      </div>
    </Transition>

    <!-- 聊天内容 -->
    <div class="flex flex-col flex-1 min-h-0">
      <div
        id="image-chat-main"
        ref="scrollContainer"
        class="scrollbar-container"
        :class="{ 'hide-scrollbar': !showScrollbar }"
        @scroll="handleScroll"
        @click="handleChatAreaClick"
        @mouseenter="showScrollbar = true"
        @mouseleave="showScrollbar = false">
        <!-- 消息列表 -->
        <div class="message-list min-h-full flex flex-col">
          <!-- 没有更多消息提示 -->
          <div v-show="chatStore.shouldShowNoMoreMessage" class="flex-center gap-6px h-32px flex-shrink-0">
            <span class="text-(12px #909090)">没有更多消息</span>
          </div>
          <n-flex
            v-for="(item, index) in chatStore.chatMessageList"
            :key="item.message.id"
            vertical
            class="flex-y-center"
            :class="[
              item.message.type === MsgEnum.RECALL ? 'min-h-22px' : 'min-h-62px',
              isGroup ? 'p-[14px_10px_14px_20px]' : 'chat-single p-[4px_10px_10px_20px]',
              { 'active-reply': activeReply === item.message.id }
            ]"
            :data-message-id="item.message.id"
            :data-message-index="index">
            <!-- 信息间隔时间 -->
            <span class="text-(12px #909090) select-none p-4px" v-if="item.timeBlock">
              {{ item.timeBlock }}
            </span>
            <RenderMessage
              :message="item"
              :is-group="isGroup"
              :from-user="{ uid: item.fromUser.uid }"
              :upload-progress="item.uploadProgress"
              @jump2-reply="jumpToReplyMsg" />
          </n-flex>
        </div>
      </div>
    </div>
  </div>

  <!-- 弹出框 -->
  <n-modal v-model:show="modalShow" class="w-350px border-rd-8px">
    <div class="bg-[--bg-popover] w-360px h-full p-6px box-border flex flex-col">
      <div
        v-if="isMac()"
        @click="modalShow = false"
        class="mac-close z-999 size-13px shadow-inner bg-#ed6a5eff rounded-50% select-none absolute left-6px">
        <svg class="hidden size-7px color-#000 select-none absolute top-3px left-3px">
          <use href="#close"></use>
        </svg>
      </div>

      <svg v-if="isWindows()" @click="modalShow = false" class="w-12px h-12px ml-a cursor-pointer select-none">
        <use href="#close"></use>
      </svg>
      <div class="flex flex-col gap-30px p-[22px_10px_10px_22px] select-none">
        <span class="text-14px">{{ tips }}</span>

        <n-flex justify="end">
          <n-button @click="handleConfirm" class="w-78px" color="#13987f">确定</n-button>
          <n-button @click="modalShow = false" class="w-78px" secondary>取消</n-button>
        </n-flex>
      </div>
    </div>
  </n-modal>

  <!--  悬浮按钮提示(底部悬浮) -->
  <footer
    class="float-footer"
    v-if="shouldShowFloatFooter && currentNewMsgCount"
    :class="isGroup ? 'right-220px' : 'right-50px'"
    :style="{ bottom: `${footerHeight - 60}px` }">
    <div class="float-box" :class="{ max: currentNewMsgCount?.count > 99 }" @click="handleFloatButtonClick">
      <n-flex justify="space-between" align="center">
        <n-icon :color="currentNewMsgCount?.count > 99 ? '#ce304f' : '#13987f'">
          <svg>
            <use href="#double-down"></use>
          </svg>
        </n-icon>
        <span
          v-if="currentNewMsgCount?.count && currentNewMsgCount.count > 0"
          class="text-12px"
          :class="{ 'color-#ce304f': currentNewMsgCount?.count > 99 }">
          {{ currentNewMsgCount?.count > 99 ? '99+' : currentNewMsgCount?.count }}条新消息
        </span>
      </n-flex>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { info } from '@tauri-apps/plugin-log'
import { useDebounceFn } from '@vueuse/core'
import { delay } from 'lodash-es'
import { MittEnum, MsgEnum, ScrollIntentEnum } from '@/enums'
import { useChatLayoutGlobal } from '@/hooks/useChatLayout'
import { useChatMain } from '@/hooks/useChatMain.ts'
import { useMitt } from '@/hooks/useMitt.ts'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { usePopover } from '@/hooks/usePopover.ts'
import { useWindow } from '@/hooks/useWindow.ts'
import { useCachedStore } from '@/stores/cached'
import { useChatStore } from '@/stores/chat.ts'
import { useGlobalStore } from '@/stores/global'
import { useUserStore } from '@/stores/user.ts'
import { audioManager } from '@/utils/AudioManager'
import { isMac, isWindows } from '@/utils/PlatformConstants'

type AnnouncementData = {
  content: string
  top?: boolean
}

// Store 实例
const appWindow = WebviewWindow.getCurrent()
const globalStore = useGlobalStore()
const chatStore = useChatStore()
const userStore = useUserStore()
const cachedStore = useCachedStore()
const networkStatus = useNetworkStatus()
const { footerHeight } = useChatLayoutGlobal()
// 添加标记，用于识别是否正在加载历史消息
const isLoadingMore = ref(false)
// 滚动意图状态
const scrollIntent = ref<ScrollIntentEnum>(ScrollIntentEnum.NONE)

// 计算属性
const isGroup = computed<boolean>(() => chatStore.isGroup)
const userUid = computed(() => userStore.userInfo!.uid || '')
const currentNewMsgCount = computed(() => chatStore.currentNewMsgCount || null)
const { createWebviewWindow } = useWindow()
const currentRoomId = computed(() => globalStore.currentSession?.roomId ?? null)

// 响应式状态变量
const activeReply = ref<string>('')
const scrollContainerRef = useTemplateRef<HTMLDivElement>('scrollContainer')
const infoPopoverRefs = shallowRef<Record<string, any>>({})
const showScrollbar = ref<boolean>(true)
const isAnnouncementHover = ref<boolean>(false)
const topAnnouncement = ref<AnnouncementData | null>(null)

// CSS 变量计算，避免动态高度重排
const cssVariables = computed(() => {
  return {
    '--footer-height': `${footerHeight.value}px`
  }
})

// 是否显示悬浮页脚
const shouldShowFloatFooter = computed<boolean>(() => {
  const container = scrollContainerRef.value
  if (!container) return false

  // 在自动滚动或加载更多消息时不显示
  if (isLoadingMore.value) {
    return false
  }

  const scrollHeight = container.scrollHeight
  const clientHeight = container.clientHeight
  const distanceFromBottom = scrollHeight - scrollTop.value - clientHeight

  // 若已接近底部，任何情况下都不显示，避免切换会话瞬时闪现
  if (distanceFromBottom <= 20) {
    return false
  }

  // 优先级1：如果有新消息，优先显示新消息提示
  if (currentNewMsgCount.value?.count && currentNewMsgCount.value.count > 0) {
    return true
  }

  // 优先级2：只在向下滚动且距离底部较远时显示按钮
  if (distanceFromBottom > clientHeight * 0.5) {
    return true
  }

  return false
})

const { handleConfirm, tips, modalShow, selectKey, scrollTop } = useChatMain()
const { handlePopoverUpdate, enableScroll } = usePopover(selectKey, 'image-chat-main')
provide('popoverControls', { enableScroll })

// 1. 监听房间切换，触发初始化滚动意图
watch(
  () => [currentRoomId.value] as const,
  ([newRoomId], [oldRoomId]) => {
    // 只有在房间切换且DOM就绪时才触发初始化意图
    if (newRoomId && newRoomId !== oldRoomId) {
      scrollIntent.value = ScrollIntentEnum.INITIAL
    }
  },
  { flush: 'post' } // 确保DOM更新后执行
)

// 3. 执行具体的滚动操作 - 使用watchPostEffect确保DOM更新完成
watchPostEffect(() => {
  if (scrollIntent.value === ScrollIntentEnum.NONE) return

  handleScrollByIntent(scrollIntent.value)
  // 重置意图状态
  scrollIntent.value = ScrollIntentEnum.NONE
})

// 跳转到回复消息
const jumpToReplyMsg = async (key: string): Promise<void> => {
  // 先在当前列表中尝试查找
  let messageIndex = chatStore.chatMessageList.findIndex((msg: any) => msg.message.id === String(key))

  // 如果找到了，直接滚动到该消息
  if (messageIndex !== -1) {
    scrollToIndex(messageIndex, 'instant')
    activeReply.value = String(key)
    return
  }

  // 设置加载标记
  isLoadingMore.value = true

  // 显示加载状态
  window.$message.info('正在查找消息...')

  // 尝试加载历史消息直到找到目标消息或无法再加载
  let foundMessage = false
  let attemptCount = 0
  const MAX_ATTEMPTS = 5 // 设置最大尝试次数，避免无限循环

  while (!foundMessage && attemptCount < MAX_ATTEMPTS) {
    attemptCount++

    // 加载更多历史消息
    await chatStore.loadMore()

    // 在新加载的消息中查找
    messageIndex = chatStore.chatMessageList.findIndex((msg) => msg.message.id === key)

    if (messageIndex !== -1) {
      foundMessage = true
      break
    }

    // 简单延时，避免快速请求
    await new Promise((resolve) => setTimeout(resolve, 300))
  }

  // 重置加载标记
  isLoadingMore.value = false

  // 如果找到了消息，滚动到该位置
  if (foundMessage) {
    nextTick(() => {
      scrollToIndex(messageIndex, 'instant')
      activeReply.value = key
    })
  } else {
    // 如果尝试多次后仍未找到消息
    window.$message.warning('无法找到原始消息，可能已被删除或太久远')
  }
}

// 滚动到指定索引位置
const scrollToIndex = (index: number, behavior: ScrollBehavior = 'auto'): void => {
  const container = scrollContainerRef.value
  if (!container || index < 0) return

  // 查找对应的消息元素
  const messageElements = container.querySelectorAll('[data-message-index]')
  const targetElement = messageElements[index] as HTMLElement

  if (targetElement) {
    targetElement.scrollIntoView({ behavior, block: 'start' })
  }
}

// 根据滚动意图执行相应操作
const handleScrollByIntent = (intent: ScrollIntentEnum): void => {
  const container = scrollContainerRef.value
  if (!container) return

  switch (intent) {
    case ScrollIntentEnum.INITIAL:
      // 初始化滚动：直接滚动到底部显示最新消息
      scrollToBottom()
      break

    case ScrollIntentEnum.NEW_MESSAGE:
      // 新消息滚动：直接滚动到底部
      scrollToBottom()
      break

    case ScrollIntentEnum.LOAD_MORE:
      // 加载更多：不执行任何滚动，由handleLoadMore管理
      break

    default:
      break
  }
}

// 滚动到底部
const scrollToBottom = (): void => {
  console.log('scrollToBottom')
  const container = scrollContainerRef.value
  if (!container) return
  // 立即清除新消息计数
  chatStore.clearNewMsgCount()
  // 使用requestAnimationFrame确保在下一帧执行，避免布局抖动
  container.scrollTo({
    top: container.scrollHeight,
    behavior: 'auto'
  })
}

// 处理悬浮按钮点击 - 重置消息列表并滚动到底部
const handleFloatButtonClick = async () => {
  try {
    await chatStore.resetAndRefreshCurrentRoomMessages()
    scrollToBottom()
  } catch (error) {
    console.error('重置消息列表失败:', error)
    scrollToBottom()
  }
}

// 处理滚动事件(用于页脚显示功能)
const handleScroll = (event: Event) => {
  const container = event.target as HTMLElement
  if (!container) return

  const currentScrollTop = container.scrollTop
  scrollTop.value = currentScrollTop

  debouncedScrollOperations(container)
}

// 将滚动操作分离到防抖函数中
const debouncedScrollOperations = useDebounceFn(async (container: HTMLElement) => {
  const scrollHeight = container.scrollHeight
  const clientHeight = container.clientHeight
  const distanceFromBottom = scrollHeight - scrollTop.value - clientHeight

  // 处理触顶加载更多
  if (scrollTop.value < 60) {
    // 如果正在加载或已经触发了加载，或已到达最后一页，则不重复触发
    if (chatStore.currentMessageOptions?.isLast) return

    await handleLoadMore()
  }

  // 处理底部滚动和新消息提示
  if (distanceFromBottom <= 20) {
    chatStore.clearNewMsgCount()
  }
}, 16)

// 监听会话切换（仅切换数据，不清空 DOM）
watch(
  () => globalStore.currentSession!,
  async (value, oldValue) => {
    if (oldValue.roomId !== value.roomId) {
      // 使用音频管理器停止所有音频
      audioManager.stopAll()

      // 重置并刷新当前房间的消息
      await chatStore.resetAndRefreshCurrentRoomMessages()

      // 在会话切换时加载新会话的置顶公告
      if (isGroup.value) {
        loadTopAnnouncement()
      } else {
        // 如果不是群聊，清空置顶公告
        topAnnouncement.value = null
      }
      scrollToBottom()
    }
  }
)

// 监听消息列表变化
watch(
  () => chatStore.chatMessageList,
  async (value, oldValue) => {
    // 简化消息列表监听，避免直接滚动操作
    if (value.length > oldValue.length) {
      // 获取最新消息
      const latestMessage = value[value.length - 1]

      // 如果正在加载历史消息，不进行任何滚动操作，由handleLoadMore处理位置恢复
      if (isLoadingMore.value) {
        return
      }

      // 新消息计数逻辑（不在底部时）
      const container = scrollContainerRef.value
      if (container) {
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
        const isOtherUserMessage =
          latestMessage?.fromUser?.uid && String(latestMessage.fromUser.uid) !== String(userUid.value)

        // 只有当不在底部且是他人消息时才增加计数
        if (distanceFromBottom > 300 && isOtherUserMessage) {
          const current = chatStore.newMsgCount.get(globalStore.currentSession!.roomId)
          if (!current) {
            chatStore.newMsgCount.set(globalStore.currentSession!.roomId, {
              count: 1,
              isStart: true
            })
          } else {
            current.count++
          }
        }
      }

      await nextTick()
      scrollToBottom()
    }
  },
  { deep: false }
)

// 处理聊天区域点击事件，用于清除回复样式和气泡激活状态
const handleChatAreaClick = (event: Event): void => {
  const target = event.target as Element

  // 检查点击目标是否为回复相关元素
  const isReplyElement =
    target.closest('.reply-bubble') || target.matches('.active-reply') || target.closest('.active-reply')

  // 如果点击的不是回复相关元素，清除activeReply样式
  if (!isReplyElement && activeReply.value) {
    nextTick(() => {
      const activeReplyElement = document.querySelector('.active-reply') as HTMLElement
      if (activeReplyElement) {
        activeReplyElement.classList.add('reply-exit')
        delay(() => {
          activeReplyElement.classList.remove('reply-exit')
          activeReply.value = ''
        }, 300)
      }
    })
  }
}

// 防冲突的加载更多处理
const handleLoadMore = async (): Promise<void> => {
  // 如果正在加载、已经触发了加载、或已到达最后一页，则不重复触发
  if (chatStore.currentMessageOptions?.isLoading || isLoadingMore.value || chatStore.currentMessageOptions?.isLast)
    return

  const container = scrollContainerRef.value
  if (!container) return
  scrollIntent.value = ScrollIntentEnum.LOAD_MORE

  isLoadingMore.value = true

  // 记录加载前的滚动高度，用于加载后恢复位置
  const oldScrollHeight = container.scrollHeight
  const oldScrollTop = container.scrollTop
  try {
    await chatStore.loadMore()

    // 计算新的滚动位置，保持用户在加载前的相对位置
    const newScrollHeight = container.scrollHeight
    const heightDifference = newScrollHeight - oldScrollHeight
    const newScrollTop = oldScrollTop + heightDifference

    // 恢复滚动位置
    container.scrollTop = newScrollTop
  } catch (error) {
    console.error('加载历史消息失败:', error)
    window.$message?.error('加载历史消息失败，请稍后重试')
  } finally {
    isLoadingMore.value = false

    scrollIntent.value = ScrollIntentEnum.NONE
  }
}

// 获取置顶公告
const loadTopAnnouncement = async (): Promise<void> => {
  if (currentRoomId.value && isGroup.value) {
    try {
      const data = await cachedStore.getGroupAnnouncementList(currentRoomId.value, 1, 1)
      if (data && data.records.length > 0) {
        // 查找置顶公告
        const topNotice = data.records.find((item: any) => item.top)
        const oldAnnouncement = topAnnouncement.value
        topAnnouncement.value = topNotice || null

        // 如果公告状态发生变化，重新滚动到底部
        if (oldAnnouncement !== topAnnouncement.value) {
          const container = scrollContainerRef.value
          if (container) {
            const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
            // 仅当接近底部时保持吸底，避免远离底部时的抖动
            if (distanceFromBottom <= 20) {
              nextTick(() => {
                scrollToBottom()
              })
            }
          }
        }
      } else {
        topAnnouncement.value = null
      }
    } catch (error) {
      console.error('获取置顶公告失败:', error)
      topAnnouncement.value = null
    }
  }
}

// 处理点击查看公告
const handleViewAnnouncement = (): void => {
  nextTick(async () => {
    if (!currentRoomId.value) return
    await createWebviewWindow('查看群公告', `announList/${currentRoomId.value}/1`, 420, 620)
  })
}

// 监听公告更新和清空事件的变量
let announcementUpdatedListener: any = null
let announcementClearListener: any = null

onMounted(() => {
  // 初始化监听器
  const initListeners = async () => {
    try {
      // 监听公告清空事件
      announcementClearListener = await appWindow.listen('announcementClear', () => {
        topAnnouncement.value = null
      })

      // 监听公告更新事件
      announcementUpdatedListener = await appWindow.listen('announcementUpdated', async (event: any) => {
        info(`公告更新事件: ${event.payload}`)
        if (event.payload) {
          const { hasAnnouncements, topAnnouncement: newTopAnnouncement } = event.payload
          if (hasAnnouncements && newTopAnnouncement) {
            // 只有置顶公告才更新顶部提示
            if (newTopAnnouncement.top) {
              topAnnouncement.value = newTopAnnouncement
            } else if (topAnnouncement.value) {
              // 如果当前有显示置顶公告，但新公告不是置顶的，保持不变
              await loadTopAnnouncement() // 重新获取置顶公告
            }
          } else {
            // 如果没有公告，清空显示
            topAnnouncement.value = null
          }
        }
      })
    } catch (error) {
      console.error('Failed to initialize listeners:', error)
    }
  }

  // 异步初始化监听器（不等待结果）
  initListeners().catch(console.error)

  nextTick(() => {
    loadTopAnnouncement()
  })

  useMitt.on(`${MittEnum.INFO_POPOVER}-Main`, (event: any) => {
    selectKey.value = event.uid
    infoPopoverRefs.value[event.uid].setShow(true)
    handlePopoverUpdate(event.uid)
  })

  // 监听滚动到底部的事件
  useMitt.on(MittEnum.CHAT_SCROLL_BOTTOM, () => {
    scrollToBottom()
  })
  scrollToBottom()
})

onUnmounted(() => {
  // 清理监听器
  if (announcementUpdatedListener) {
    announcementUpdatedListener()
  }
  if (announcementClearListener) {
    announcementClearListener()
  }
})
</script>

<style scoped lang="scss">
@use '@/styles/scss/chat-main';

.chat-main-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh / var(--page-scale, 1) - var(--footer-height));
  overflow: hidden;
  // 布局优化
  contain: layout style;
  will-change: auto;
}

// 原生滚动容器样式
.scrollbar-container {
  flex: 1;
  overflow-y: auto;
  // 滚动性能优化
  -webkit-overflow-scrolling: touch;
  will-change: scroll-position;
  transform: translateZ(0);

  /* 滚动条样式 */
  &::-webkit-scrollbar {
    width: 6px;
    transition-property: opacity;
    transition-duration: 0.3s;
    transition-timing-function: ease;
  }

  &::-webkit-scrollbar-thumb {
    background-color: rgba(144, 144, 144, 0.3);
    border-radius: 3px;
    transition-property: opacity, background-color;
    transition-duration: 0.3s;
    transition-timing-function: ease;
    // min-height: 42px;
    z-index: 999;
  }

  &::-webkit-scrollbar-thumb:hover {
    background-color: rgba(144, 144, 144, 0.5);
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &.hide-scrollbar {
    &::-webkit-scrollbar {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: transparent;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    // 这里添加一个小的padding，防止mac上会不显示
    padding-right: 0.01px;
  }
}

// 性能优化相关样式
.message-item {
  contain: layout style;
  will-change: auto;
}

// 拖拽时禁用鼠标事件，避免不必要的监听损耗
:global(body.dragging-resize) .scrollbar-container {
  pointer-events: none;
}
</style>

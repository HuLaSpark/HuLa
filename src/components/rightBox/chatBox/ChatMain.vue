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
        role="log"
        aria-live="polite"
        tabindex="0"
        @scroll="handleScroll"
        @click="handleChatAreaClick"
        @mouseenter="showScrollbar = true"
        @mouseleave="showScrollbar = false">
        <!-- 加载中提示 -->
        <div v-if="isLoadingMore" class="flex-center gap-6px h-42px">
          <img class="size-16px" src="@/assets/img/loading.svg" alt="" />
          <span class="text-(14px #909090)">加载中</span>
        </div>

        <!-- 消息列表 -->
        <div class="message-list min-h-full flex flex-col">
          <n-flex
            v-for="(item, index) in displayedMessageList"
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

            <!-- 消息为撤回消息 -->
            <RecallMessage
              v-if="item.message.type === MsgEnum.RECALL"
              :message="item.message"
              :from-user-uid="item.fromUser.uid"
              :is-group="isGroup" />

            <!-- 消息为系统消息 -->
            <SystemMessage
              v-else-if="item.message.type === MsgEnum.SYSTEM"
              :body="item.message.body as string"
              :from-user-uid="item.fromUser.uid" />

            <!-- 消息为机器人消息时 -->
            <BotMessage
              v-else-if="item.message.type === MsgEnum.BOT"
              :message="item.message"
              :from-user-uid="item.fromUser.uid" />

            <!-- 好友或者群聊的信息 -->
            <div
              v-else
              class="flex flex-col w-full"
              :class="[{ 'items-end': item.fromUser.uid === userUid }, isGroup ? 'gap-18px' : 'gap-2px']">
              <!-- 信息时间(单聊) -->
              <div
                v-if="!isGroup"
                class="text-(12px #909090) h-12px w-fit select-none"
                :class="
                  item.fromUser.uid === userUid
                    ? activeReply === item.message.id
                      ? 'pr-68px'
                      : 'pr-42px'
                    : activeReply === item.message.id
                      ? 'pl-68px'
                      : 'pl-42px'
                ">
                <Transition name="fade-single">
                  <span v-if="hoverBubble.key === Number(item.message.id)">
                    {{ formatTimestamp(item.message.sendTime, true) }}
                  </span>
                </Transition>
              </div>
              <div
                class="flex items-start flex-1 select-none"
                :class="item.fromUser.uid === userUid ? 'flex-row-reverse' : ''">
                <!-- 回复消息提示的箭头 -->
                <svg
                  v-if="activeReply === item.message.id"
                  class="size-16px pt-4px color-#909090"
                  :class="item.fromUser.uid === userUid ? 'ml-8px' : 'mr-8px'">
                  <use :href="item.fromUser.uid === userUid ? `#corner-down-left` : `#corner-down-right`"></use>
                </svg>
                <!-- 头像 -->
                <n-popover
                  :ref="(el: any) => (infoPopoverRefs[item.message.id] = el)"
                  @update:show="handlePopoverUpdate(item.message.id, $event)"
                  trigger="click"
                  placement="right"
                  :show-arrow="false"
                  style="padding: 0; background: var(--bg-info)">
                  <template #trigger>
                    <ContextMenu
                      @select="$event.click(item, 'Main')"
                      :content="item"
                      :menu="isGroup ? optionsList : void 0"
                      :special-menu="report">
                      <!-- 存在头像时候显示 -->
                      <n-avatar
                        round
                        :size="34"
                        @click="selectKey = item.message.id"
                        class="select-none"
                        :color="themes.content === ThemeEnum.DARK ? '' : '#fff'"
                        :fallback-src="themes.content === ThemeEnum.DARK ? '/logoL.png' : '/logoD.png'"
                        :src="getAvatarSrc(item.fromUser.uid)"
                        :class="item.fromUser.uid === userUid ? '' : 'mr-10px'" />
                    </ContextMenu>
                  </template>
                  <!-- 用户个人信息框 -->
                  <InfoPopover v-if="selectKey === item.message.id" :uid="item.fromUser.uid" />
                </n-popover>
                <n-flex
                  vertical
                  justify="center"
                  :size="6"
                  class="color-[--text-color] flex-1 select-none"
                  :class="item.fromUser.uid === userUid ? 'items-end mr-10px' : ''">
                  <n-flex
                    :size="6"
                    align="center"
                    :style="item.fromUser.uid === userUid ? 'flex-direction: row-reverse' : ''">
                    <ContextMenu
                      @select="$event.click(item, 'Main')"
                      :content="item"
                      :menu="isGroup ? optionsList : void 0"
                      :special-menu="report">
                      <n-flex
                        :size="6"
                        class="select-none"
                        align="center"
                        v-if="isGroup"
                        :style="item.fromUser.uid === userUid ? 'flex-direction: row-reverse' : ''">
                        <!-- 用户徽章 -->
                        <n-popover
                          v-if="
                            currentRoomId === '1' &&
                            useBadgeInfo(useUserInfo(item.fromUser.uid).value.wearingItemId).value.img
                          "
                          trigger="hover">
                          <template #trigger>
                            <n-avatar
                              class="select-none"
                              :size="18"
                              round
                              :fallback-src="themes.content === ThemeEnum.DARK ? '/logoL.png' : '/logoD.png'"
                              :src="useBadgeInfo(useUserInfo(item.fromUser.uid).value.wearingItemId).value.img" />
                          </template>
                          <span>
                            {{ useBadgeInfo(useUserInfo(item.fromUser.uid).value.wearingItemId).value.describe }}
                          </span>
                        </n-popover>
                        <!-- 用户名 -->
                        <span class="text-12px select-none color-#909090 inline-block align-top">
                          {{ getUserDisplayName(item.fromUser.uid) }}
                        </span>
                        <!-- 消息归属地 -->
                        <span class="text-(12px #909090)">
                          ({{ useUserInfo(item.fromUser.uid).value.locPlace || '未知' }})
                        </span>
                      </n-flex>
                    </ContextMenu>
                    <!-- 群主 -->
                    <div
                      v-if="isGroup && groupStore.currentLordId === item.fromUser.uid"
                      class="flex px-4px py-3px rounded-4px bg-#d5304f30 size-fit select-none">
                      <span class="text-(9px #d5304f)">群主</span>
                    </div>
                    <!-- 管理员 -->
                    <div
                      v-if="isGroup && groupStore.adminUidList.includes(item.fromUser.uid)"
                      class="flex px-4px py-3px rounded-4px bg-#1a7d6b30 size-fit select-none">
                      <span class="text-(9px #008080)">管理员</span>
                    </div>
                    <!-- 信息时间(群聊) -->
                    <Transition name="fade-group">
                      <span
                        v-if="isGroup && hoverBubble.key === Number(item.message.id)"
                        class="text-(12px #909090) select-none">
                        {{ formatTimestamp(item.message.sendTime, true) }}
                      </span>
                    </Transition>
                  </n-flex>
                  <!--  气泡样式  -->
                  <ContextMenu
                    :content="item"
                    @contextmenu="handleMacSelect"
                    @mouseenter="handleMouseEnter(Number(item.message.id))"
                    @mouseleave="handleMouseLeave"
                    class="w-fit relative flex flex-col"
                    :data-key="item.fromUser.uid === userUid ? `U${item.message.id}` : `Q${item.message.id}`"
                    :class="item.fromUser.uid === userUid ? 'items-end' : 'items-start'"
                    :style="{ '--bubble-max-width': isGroup ? '32vw' : '50vw' }"
                    @select="$event.click(item)"
                    :menu="handleItemType(item.message.type)"
                    :emoji="emojiList"
                    :special-menu="specialMenuList"
                    @reply-emoji="handleEmojiSelect($event, item)"
                    @click="handleMsgClick(item)">
                    <RenderMessage
                      :class="[
                        item.message.type === MsgEnum.VOICE ? 'select-none cursor-pointer' : 'select-text cursor-text',
                        {
                          active:
                            activeBubble === item.message.id &&
                            !isSpecialMsgType(item.message.type) &&
                            item.message.type !== MsgEnum.VOICE
                        },
                        !isSpecialMsgType(item.message.type) || item.message.type === MsgEnum.VOICE
                          ? item.fromUser.uid === userUid
                            ? 'bubble-oneself'
                            : 'bubble'
                          : ''
                      ]"
                      :message="item.message"
                      :from-user-uid="item.fromUser.uid"
                      :upload-progress="item.uploadProgress" />

                    <!-- 显示翻译文本 -->
                    <Transition name="fade-translate" appear mode="out-in">
                      <div
                        v-if="item.message.body.translatedText"
                        class="translated-text select-none cursor-default flex flex-col"
                        :class="[item.fromUser.uid === userUid ? 'item-end' : 'item-start']">
                        <n-flex align="center" justify="space-between" class="mb-6px">
                          <n-flex align="center" :size="4">
                            <span class="text-(12px #909090)">{{ item.message.body.translatedText.provider }}</span>
                            <svg class="size-12px">
                              <use href="#success"></use>
                            </svg>
                          </n-flex>
                          <svg class="size-10px cursor-pointer" @click="item.message.body.translatedText = null">
                            <use href="#close"></use>
                          </svg>
                        </n-flex>
                        <p class="select-text cursor-text">{{ item.message.body.translatedText.text }}</p>
                      </div>
                    </Transition>

                    <!-- 消息状态指示器 -->
                    <div v-if="item.fromUser.uid === userUid" class="absolute -left-6 top-2">
                      <n-icon v-if="item.message.status === Number(MessageStatusEnum.SENDING)" class="text-gray-400">
                        <img class="size-16px" src="@/assets/img/loading-one.svg" alt="" />
                      </n-icon>
                      <n-icon
                        v-if="item.message.status === Number(MessageStatusEnum.FAILED)"
                        class="text-#d5304f cursor-pointer"
                        @click.stop="handleRetry(item)">
                        <svg class="size-16px">
                          <use href="#cloudError"></use>
                        </svg>
                      </n-icon>
                    </div>
                  </ContextMenu>

                  <!-- 回复的内容 -->
                  <n-flex
                    align="center"
                    :size="6"
                    v-if="item.message.body.reply"
                    @click="jumpToReplyMsg(item.message.body.reply.id)"
                    class="reply-bubble relative w-fit custom-shadow select-none">
                    <svg class="size-14px">
                      <use href="#to-top"></use>
                    </svg>
                    <n-avatar
                      class="reply-avatar"
                      round
                      :size="20"
                      :color="themes.content === ThemeEnum.DARK ? '' : '#fff'"
                      :fallback-src="themes.content === ThemeEnum.DARK ? '/logoL.png' : '/logoD.png'"
                      :src="getAvatarSrc(item.message.body.reply.uid)" />
                    <span>{{ `${item.message.body.reply.username}：` }}</span>
                    <span class="content-span">
                      {{ item.message.body.reply.body }}
                    </span>
                    <div v-if="item.message.body.reply.imgCount" class="reply-img-sub">
                      {{ item.message.body.reply.imgCount }}
                    </div>
                  </n-flex>

                  <!-- 动态渲染所有回复表情反应 -->
                  <div
                    v-if="item && item.message"
                    class="flex-y-center gap-6px flex-wrap w-270px"
                    :class="{ 'justify-end': isSingleLineEmojis(item) }">
                    <template v-for="emoji in emojiList" :key="emoji.value">
                      <!-- 根据表情类型获取对应的计数属性名 -->
                      <div class="flex-y-center" v-if="item && getEmojiCount(item, emoji.value) > 0">
                        <div class="emoji-reply-bubble" @click.stop="item && cancelReplyEmoji(item, emoji.value)">
                          <img :title="emoji.title" class="size-18px" :src="emoji.url" :alt="emoji.title" />
                          <span class="text-(12px #eee)">{{ item ? getEmojiCount(item, emoji.value) : 0 }}</span>
                        </div>
                      </div>
                    </template>
                  </div>
                </n-flex>
              </div>
            </div>
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
    <div class="float-box" :class="{ max: currentNewMsgCount?.count > 99 }" @click="scrollToBottom">
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
import { MessageStatusEnum, MittEnum, MsgEnum, ThemeEnum } from '@/enums'
import { useBadgeInfo, useUserInfo } from '@/hooks/useCached.ts'
import { useChatLayoutGlobal } from '@/hooks/useChatLayout'
import { useChatMain } from '@/hooks/useChatMain.ts'
import { useMitt } from '@/hooks/useMitt.ts'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { usePopover } from '@/hooks/usePopover.ts'
import { useWindow } from '@/hooks/useWindow.ts'
import type { MessageType } from '@/services/types.ts'
import { useCachedStore } from '@/stores/cached'
import { useChatStore } from '@/stores/chat.ts'
import { useGlobalStore } from '@/stores/global'
import { useGroupStore } from '@/stores/group.ts'
import { useSettingStore } from '@/stores/setting'
import { useUserStore } from '@/stores/user.ts'
import { audioManager } from '@/utils/AudioManager'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { formatTimestamp } from '@/utils/ComputedTime.ts'
import { markMsg } from '@/utils/ImRequestUtils'
import { isMac, isWindows } from '@/utils/PlatformConstants'

// TypeScript 类型定义
interface ChatMessage {
  message: {
    id: string
    type: number
    status?: number
    sendTime: number
    roomId?: string
    body: {
      reply?: {
        id: string
        uid: string
        username: string
        body: string
        imgCount?: number
      }
      translatedText?: {
        provider: string
        text: string
      } | null
    }
    messageMarks?: Record<string, { count: number; userMarked: boolean }>
  }
  fromUser: {
    uid: string
    nickname?: string
  }
  timeBlock?: string
  uploadProgress?: number
}

interface HoverBubbleState {
  key: number
  timer?: NodeJS.Timeout
}

interface AnnouncementData {
  content: string
  top?: boolean
}

// Store 实例
const appWindow = WebviewWindow.getCurrent()
const globalStore = useGlobalStore()
const chatStore = useChatStore()
const userStore = useUserStore()
const groupStore = useGroupStore()
const cachedStore = useCachedStore()
const networkStatus = useNetworkStatus()
const settingStore = useSettingStore()
const { themes } = storeToRefs(settingStore)
const { footerHeight } = useChatLayoutGlobal()

// 响应式变量
const visibleIds = shallowRef<string[]>([])
const intersectionObserver = ref<IntersectionObserver | null>(null)
const lastScrollTop = ref<number>(0)
const scrollPositions = ref<Map<string, number>>(new Map())
// 会话消息列表缓存：roomId -> messages
const messageCache = ref<Map<string, any[]>>(new Map())
// 保持旧内容，直到新会话数据就绪再替换
const displayedMessageList = shallowRef<any[]>([])
// 待切换的会话，用于在新数据就绪前保持旧数据
const pendingRoomId = ref<string | null>(null)

// 记录当前滚动位置相关信息
const isAutoScrolling = ref(false)

/** 记录是否正在向上滚动 */
const isScrollingUp = ref(false)
/** 记录是否正在向下滚动 */
const isScrollingDown = ref(false)
// 添加标记，用于识别是否正在加载历史消息
const isLoadingMore = ref(false)

// 计算属性
const isGroup = computed<boolean>(() => chatStore.isGroup)
const userUid = computed(() => userStore.userInfo.uid || '')
const chatMessageList = computed(() => chatStore.chatMessageList)
const currentNewMsgCount = computed(() => chatStore.currentNewMsgCount || null)
const messageOptions = computed(() => {
  const options = chatStore.currentMessageOptions
  return options || null
})
const { createWebviewWindow } = useWindow()
const currentRoomId = computed(() => globalStore.currentSession?.roomId ?? null)

// 我的群昵称
const getUserDisplayName = computed(() => (uid: string) => {
  const user = groupStore.userList.find((user) => user.uid === uid)
  return user?.myName || user?.name || ''
})

// 响应式状态变量
const activeReply = ref<string>('')
const scrollContainerRef = useTemplateRef<HTMLDivElement>('scrollContainer')
const infoPopoverRefs = shallowRef<Record<string, any>>({})
const showScrollbar = ref<boolean>(false)
const rafId = ref<number>()
const messageIdToIndexMap = shallowRef<Map<string, number>>(new Map())
const hoverBubble = ref<HoverBubbleState>({
  key: -1
})
const recordEL = ref<HTMLElement>()
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
  if (isAutoScrolling.value || isLoadingMore.value) {
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
  if (isScrollingDown.value && distanceFromBottom > clientHeight * 0.5) {
    return true
  }

  return false
})

const {
  handleMsgClick,
  handleConfirm,
  handleItemType,
  activeBubble,
  tips,
  modalShow,
  specialMenuList,
  optionsList,
  report,
  selectKey,
  emojiList,
  scrollTop
} = useChatMain()
const { handlePopoverUpdate, enableScroll } = usePopover(selectKey, 'image-chat-main')
provide('popoverControls', { enableScroll })

// 初始化 IntersectionObserver
const initIntersectionObserver = (): void => {
  if (intersectionObserver.value) {
    intersectionObserver.value.disconnect()
  }

  const container = scrollContainerRef.value
  if (!container) return

  intersectionObserver.value = new IntersectionObserver(
    (entries) => {
      const visibleMessageIds: string[] = []

      entries.forEach((entry) => {
        const messageId = (entry.target as HTMLElement).dataset.messageId
        if (messageId && entry.isIntersecting) {
          visibleMessageIds.push(messageId)
        }
      })

      // 更新可见项列表
      visibleIds.value = visibleMessageIds
    },
    {
      root: container,
      rootMargin: '50px 0px',
      threshold: [0, 0.1, 0.5, 1]
    }
  )

  // 观察所有消息元素
  const messageElements = container.querySelectorAll('[data-message-id]')
  messageElements.forEach((el) => {
    intersectionObserver.value?.observe(el)
  })
}

// 更新 IntersectionObserver 观察的元素
const updateIntersectionObserver = (): void => {
  if (!intersectionObserver.value) return

  const container = scrollContainerRef.value
  if (!container) return

  // Disconnect all to prevent memory leaks
  intersectionObserver.value.disconnect()

  // Re-observe all current message elements
  const messageElements = container.querySelectorAll('[data-message-id]')
  messageElements.forEach((el) => {
    intersectionObserver.value?.observe(el)
  })
}

// 恢复指定会话的滚动位置，返回是否恢复成功
const restoreScrollPosition = (roomId: string | undefined | null): boolean => {
  if (!roomId) return false
  const container = scrollContainerRef.value
  if (!container) return false
  const target = scrollPositions.value.get(roomId)
  if (typeof target !== 'number') return false

  const doScroll = (): void => {
    // 标记为自动滚动，避免被 handleScroll 误判
    isAutoScrolling.value = true
    container.scrollTo({ top: Math.max(0, target), behavior: 'auto' })
    // 若偏差仍明显（>16px），再补偿一次
    setTimeout(() => {
      const delta = Math.abs(container.scrollTop - target)
      if (delta > 16) {
        container.scrollTo({ top: Math.max(0, target), behavior: 'auto' })
      }
      isAutoScrolling.value = false
    }, 120)
  }

  nextTick(() => doScroll())
  return true
}

// 滚动到底部
const scrollToBottom = (): void => {
  const container = scrollContainerRef.value
  if (!container) return

  // 立即清除滚动方向状态以隐藏悬浮按钮
  isScrollingDown.value = false
  isScrollingUp.value = false
  // 立即清除新消息计数
  chatStore.clearNewMsgCount()

  isAutoScrolling.value = true
  container.scrollTo({
    top: Math.max(0, container.scrollHeight - container.clientHeight),
    behavior: 'auto'
  })

  setTimeout(() => {
    isAutoScrolling.value = false
  }, 100)
}

// 滚动到指定索引位置
const scrollToIndex = (index: number, behavior: ScrollBehavior = 'auto'): void => {
  const container = scrollContainerRef.value
  if (!container || index < 0) return

  // 查找对应的消息元素
  const messageElements = container.querySelectorAll('[data-message-index]')
  const targetElement = messageElements[index] as HTMLElement

  if (targetElement) {
    isAutoScrolling.value = true
    targetElement.scrollIntoView({ behavior, block: 'start' })
    setTimeout(() => {
      isAutoScrolling.value = false
    }, 100)
  }
}

// 更新消息索引映射
const updateMessageIndexMap = (): void => {
  messageIdToIndexMap.value.clear()
  chatMessageList.value.forEach((msg, index) => {
    messageIdToIndexMap.value.set(msg.message.id, index)
  })
}

// 处理滚动事件(用于页脚显示功能)
const handleScroll = (event: Event): void => {
  if (isAutoScrolling.value) return // 如果是自动滚动，不处理
  const container = event.target as HTMLElement
  if (!container) return

  const currentScrollTop = container.scrollTop

  // 立即检测滚动方向
  if (currentScrollTop > lastScrollTop.value + 2) {
    // 添加小的阈值避免抖动
    isScrollingDown.value = true
    isScrollingUp.value = false
  } else if (currentScrollTop < lastScrollTop.value - 2) {
    isScrollingUp.value = true
    isScrollingDown.value = false
  }

  lastScrollTop.value = currentScrollTop
  scrollTop.value = currentScrollTop

  // 防抖处理昂贵操作
  debouncedScrollOperations(container)
}

// 将昂贵的滚动操作分离到防抖函数中
const debouncedScrollOperations = useDebounceFn(async (container: HTMLElement) => {
  const scrollHeight = container.scrollHeight
  const clientHeight = container.clientHeight
  const distanceFromBottom = scrollHeight - scrollTop.value - clientHeight

  // 存储 requestAnimationFrame 的返回值
  if (rafId.value) {
    cancelAnimationFrame(rafId.value)
  }

  rafId.value = requestAnimationFrame(async () => {
    // 处理触顶加载更多
    if (scrollTop.value < 26) {
      // 如果正在加载或已经触发了加载，则不重复触发
      if (messageOptions.value?.isLoading || isLoadingMore.value) return

      await handleLoadMore()
    }

    // 处理底部滚动和新消息提示
    if (distanceFromBottom <= 20) {
      chatStore.clearNewMsgCount()
    }
  })
}, 16) // ~60fps throttling for better performance

// 添加防抖的鼠标事件处理
const debouncedMouseEnter = useDebounceFn((key: number) => {
  hoverBubble.value.key = key
}, 300)

// 当鼠标进入时触发的处理函数
const handleMouseEnter = (key: number): void => {
  // 清除之前的定时器
  if (hoverBubble.value.timer) {
    clearTimeout(hoverBubble.value.timer)
  }
  // 设置新的定时器
  hoverBubble.value.timer = setTimeout(() => {
    debouncedMouseEnter(key)
  }, 800)
}

// 当鼠标离开时触发的处理函数
const handleMouseLeave = (): void => {
  // 如果定时器存在，则清除定时器并重置为undefined
  if (hoverBubble.value.timer) {
    clearTimeout(hoverBubble.value.timer)
    hoverBubble.value.timer = void 0
  }
  // 重置悬浮气泡的key值为-1
  hoverBubble.value.key = -1
}

// 监听会话切换（仅切换数据，不清空 DOM）
watch(
  () => globalStore.currentSession!,
  (value, oldValue) => {
    if (oldValue.roomId !== value.roomId) {
      // 切换前保存旧会话的滚动位置
      const container = scrollContainerRef.value
      if (container && oldValue.roomId) {
        scrollPositions.value.set(oldValue.roomId, container.scrollTop)
      }
      // 标记即将切换到的新会话，等待新数据就绪后再替换展示数据
      pendingRoomId.value = value.roomId

      // 使用音频管理器停止所有音频
      audioManager.stopAll()

      // 如果有目标会话的缓存，立即显示，避免空白或显示上个会话内容
      const cached = messageCache.value.get(value.roomId)
      if (cached && Array.isArray(cached)) {
        displayedMessageList.value = cached
      }

      // 在会话切换时加载新会话的置顶公告
      if (isGroup.value) {
        loadTopAnnouncement()
      } else {
        // 如果不是群聊，清空置顶公告
        topAnnouncement.value = null
      }
    }
  }
)

// 监听消息列表变化
watch(
  chatMessageList,
  (value, oldValue) => {
    // 非会话切换下，展示列表跟随真实列表，确保顶部加载更多不出现置底
    if (!pendingRoomId.value) {
      displayedMessageList.value = value
      // 更新 IntersectionObserver
      nextTick(() => {
        updateIntersectionObserver()
      })
    }
    const currentRoomIdLocal = globalStore.currentSession!.roomId

    // 当首条消息属于当前会话，或当前会话已停止加载（空列表也需要替换）
    const dataBelongsToCurrent = value.length > 0 && value[0]?.message?.roomId === currentRoomIdLocal
    const loadingFinished = messageOptions.value?.isLoading === false

    if (pendingRoomId.value === currentRoomIdLocal && (dataBelongsToCurrent || loadingFinished)) {
      displayedMessageList.value = value
      // 更新目标会话缓存
      messageCache.value.set(currentRoomIdLocal, value)
      pendingRoomId.value = null
      nextTick(() => {
        updateIntersectionObserver()
        scrollToBottom()
      })
    }

    // 首次进入或没有待切换标记时，如果当前展示为空且数据已属于当前会话（或加载结束），也要填充一次
    if (!pendingRoomId.value && displayedMessageList.value.length === 0 && (dataBelongsToCurrent || loadingFinished)) {
      displayedMessageList.value = value
      // 更新当前会话缓存
      messageCache.value.set(currentRoomIdLocal, value)
      nextTick(() => {
        updateIntersectionObserver()
      })
    }

    // 更新消息索引映射
    updateMessageIndexMap()

    if (value.length > oldValue.length) {
      // 获取最新消息
      const latestMessage = value[value.length - 1]

      // 如果正在加载历史消息，优先处理历史消息的滚动
      if (isLoadingMore.value) {
        if (scrollTop.value < 26) {
          requestAnimationFrame(() => {
            scrollToIndex(value.length - oldValue.length)
          })
        }
        return
      }

      // 优先级1：用户发送的消息，始终滚动到底部
      if (latestMessage?.fromUser?.uid === userUid.value) {
        nextTick(() => {
          scrollToBottom()
        })
        return
      }

      // 优先级2：已经在底部时的新消息
      const container = scrollContainerRef.value
      if (container) {
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
        if (distanceFromBottom <= 300) {
          scrollToBottom()
          return
        }

        // 其他情况：如果是他人的消息且不在底部，增加新消息计数
        const isOtherUserMessage =
          latestMessage?.fromUser?.uid && String(latestMessage.fromUser.uid) !== String(userUid.value)

        if (isOtherUserMessage) {
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
    }
  },
  { deep: false }
)

// 监听加载游标变化
watch(
  () => messageOptions.value?.cursor,
  () => {
    const currentRoomIdLocal = globalStore.currentSession!.roomId
    if (pendingRoomId.value === currentRoomIdLocal) {
      displayedMessageList.value = chatMessageList.value
      // 更新目标会话缓存
      messageCache.value.set(currentRoomIdLocal, chatMessageList.value)
      pendingRoomId.value = null
      nextTick(() => {
        const restored = restoreScrollPosition(currentRoomIdLocal)
        if (!restored) {
          scrollToBottom()
        }
      })
    }
  }
)

// 取消表情反应
const cancelReplyEmoji = async (item: ChatMessage, type: number): Promise<void> => {
  if (!item || !item.message || !item.message.messageMarks) return

  // 检查该表情是否已被当前用户标记
  const userMarked = item.message.messageMarks[String(type)]?.userMarked

  // 只有当用户已标记时才发送取消请求
  if (userMarked) {
    try {
      const data = {
        msgId: item.message.id,
        markType: type, // 使用对应的MarkEnum类型
        actType: 2 // 使用Confirm作为操作类型
      }
      await markMsg(data)
    } catch (error) {
      console.error('取消表情标记失败:', error)
    }
  }
}

/**
 * 根据表情类型获取对应的计数
 * @param item 消息项
 * @param emojiType 表情类型值
 * @returns 计数值
 */
const getEmojiCount = (item: ChatMessage, emojiType: number): number => {
  if (!item || !item.message || !item.message.messageMarks) return 0

  // messageMarks 是一个对象，键是表情类型，值是包含 count 和 userMarked 的对象
  // 如果存在该表情类型的统计数据，返回其计数值，否则返回0
  return item.message.messageMarks[String(emojiType)]?.count || 0
}

// 处理表情回应
const handleEmojiSelect = async (
  context: { label: string; value: number; title: string },
  item: ChatMessage
): Promise<void> => {
  if (!item || !item.message) return

  if (!item.message.messageMarks) {
    item.message.messageMarks = {}
  }

  // 检查该表情是否已被当前用户标记
  const userMarked = item.message.messageMarks[String(context.value)]?.userMarked
  // 只给没有标记过的图标标记
  if (!userMarked) {
    try {
      await markMsg({
        msgId: item.message.id,
        markType: context.value,
        actType: 1
      })
    } catch (error) {
      console.error('标记表情失败:', error)
    }
  } else {
    window.$message.warning('该表情已标记')
  }
}

// 跳转到回复消息
const jumpToReplyMsg = async (key: string): Promise<void> => {
  // 先在当前列表中尝试查找
  let messageIndex = chatMessageList.value.findIndex((msg) => msg.message.id === String(key))

  // 如果找到了，直接滚动到该消息
  if (messageIndex !== -1) {
    scrollToIndex(messageIndex, 'instant')
    activeReply.value = String(key)
    return
  }

  // 如果没有找到消息，需要加载历史消息
  // 检查是否正在加载，避免重复加载
  if (messageOptions.value?.isLoading || isLoadingMore.value) return

  // 设置加载标记
  isLoadingMore.value = true

  // 显示加载状态
  window.$message.info('正在查找消息...')

  // 尝试加载历史消息直到找到目标消息或无法再加载
  let foundMessage = false
  let attemptCount = 0
  const MAX_ATTEMPTS = 5 // 设置最大尝试次数，避免无限循环

  while (!foundMessage && attemptCount < MAX_ATTEMPTS && !messageOptions.value?.isLast) {
    attemptCount++

    // 加载更多历史消息
    await chatStore.loadMore()

    // 在新加载的消息中查找
    messageIndex = chatMessageList.value.findIndex((msg) => msg.message.id === key)

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

// 给气泡添加动画
const addToDomUpdateQueue = (index: string, id: string): void => {
  // 使用 nextTick 确保虚拟列表渲染完最新的项目后进行滚动
  nextTick(() => {
    /** data-key标识的气泡,添加前缀用于区分用户消息，不然气泡动画会被覆盖 */
    const dataKey = id === userUid.value ? `U${index}` : `Q${index}`
    const lastMessageElement = document.querySelector(`[data-key="${dataKey}"]`) as HTMLElement
    if (lastMessageElement) {
      console.log('触发气泡添加动画')
      // 添加动画类
      lastMessageElement.classList.add('bubble-animation')
      // 监听动画结束事件
      const handleAnimationEnd = () => {
        lastMessageElement.classList.remove('bubble-animation')
        lastMessageElement.removeEventListener('animationend', handleAnimationEnd)
      }
      lastMessageElement.addEventListener('animationend', handleAnimationEnd)
    }
  })
}

// 解决mac右键会选中文本的问题
const handleMacSelect = (event: Event): void => {
  if (isMac()) {
    const target = event.target as HTMLElement
    target.classList.add('select-none')
    recordEL.value = target
  }
}

// 处理聊天区域点击事件，用于清除回复样式和气泡激活状态
const handleChatAreaClick = (event: Event): void => {
  const target = event.target as Element

  // 检查点击目标是否为回复相关元素
  const isReplyElement =
    target.closest('.reply-bubble') || target.matches('.active-reply') || target.closest('.active-reply')

  // 检查点击目标是否为气泡相关元素
  const isBubbleElement = target.closest('.bubble') || target.closest('.bubble-oneself') || target.closest('[data-key]')

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

  // 如果点击的不是气泡相关元素，清除activeBubble状态
  if (!isBubbleElement && activeBubble.value) {
    activeBubble.value = ''
  }
}

const handleRetry = (item: ChatMessage): void => {
  // TODO: 实现重试发送逻辑
  console.log('重试发送消息:', item)
}

// 处理加载更多
const handleLoadMore = async (): Promise<void> => {
  // 如果正在加载或已经触发了加载，则不重复触发
  if (messageOptions.value?.isLoading || isLoadingMore.value) return

  const container = scrollContainerRef.value
  if (!container) return

  // 使用"锚定第一个可见项"的方式保持滚动位置
  const anchorId = visibleIds.value?.[0]
  const containerRectTop = container.getBoundingClientRect().top
  const anchorElBefore = anchorId ? document.getElementById(`item-${anchorId}`) : null
  const anchorTopBefore = anchorElBefore ? anchorElBefore.getBoundingClientRect().top - containerRectTop : 0

  isLoadingMore.value = true

  // 使用CSS变量控制滚动行为，避免直接操作DOM样式
  container.classList.add('loading-history')

  try {
    await chatStore.loadMore()
    await nextTick()

    // 恢复锚点相对位置
    if (anchorId) {
      const anchorElAfter = document.getElementById(`item-${anchorId}`)
      const anchorTopAfter = anchorElAfter ? anchorElAfter.getBoundingClientRect().top - containerRectTop : 0
      const delta = anchorTopAfter - anchorTopBefore
      container.scrollTop += delta
    }

    // 更新消息索引映射
    updateMessageIndexMap()
  } catch (error) {
    console.error('加载历史消息失败:', error)
    window.$message?.error('加载历史消息失败，请稍后重试')
  } finally {
    // 恢复滚动交互
    setTimeout(() => {
      container.classList.remove('loading-history')
      isLoadingMore.value = false

      // 重置滚动方向状态，防止加载后悬浮按钮意外出现
      isScrollingDown.value = false
      isScrollingUp.value = false
    }, 100)
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

// 获取用户头像
const getAvatarSrc = (uid: string): string => {
  const avatar = uid === userUid.value ? userStore.userInfo.avatar : useUserInfo(uid).value.avatar
  return AvatarUtils.getAvatarUrl(avatar as string)
}

// 处理点击查看公告
const handleViewAnnouncement = (): void => {
  nextTick(async () => {
    if (!currentRoomId.value) return
    await createWebviewWindow('查看群公告', `announList/${currentRoomId.value}/1`, 420, 620)
  })
}

const isSpecialMsgType = (type: number): boolean => {
  return (
    type === MsgEnum.IMAGE ||
    type === MsgEnum.EMOJI ||
    type === MsgEnum.NOTICE ||
    type === MsgEnum.VIDEO ||
    type === MsgEnum.FILE
  )
}

// 判断表情反应是否只有一行
const isSingleLineEmojis = (item: ChatMessage): boolean => {
  if (!item || !item.fromUser || !item.message) return false

  // 计算有多少个表情反应
  let emojiCount = 0
  for (const emoji of emojiList.value) {
    if (getEmojiCount(item, emoji.value) > 0) {
      emojiCount++
    }
  }

  // 如果表情数量小于等于3个，认为是一行
  // 这个阈值可以根据实际UI调整
  return emojiCount <= 5 && item.fromUser.uid === userUid.value
}

// 监听公告更新事件
const announcementUpdatedListener = await appWindow.listen('announcementUpdated', async (event: any) => {
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

// 监听公告清空事件
const announcementClearListener = await appWindow.listen('announcementClear', () => {
  topAnnouncement.value = null
})

onMounted(async () => {
  nextTick(() => {
    // 初始化 IntersectionObserver
    initIntersectionObserver()

    // 初始尽量恢复会话滚动位置，否则置底
    const current = currentRoomId.value
    if (!current || !restoreScrollPosition(current)) {
      scrollToBottom()
    }
    // 初始化消息索引映射
    updateMessageIndexMap()
    // 初始加载置顶公告
    loadTopAnnouncement()
    // 初始显示当前会话数据
    displayedMessageList.value = chatMessageList.value
    if (current) {
      messageCache.value.set(current, chatMessageList.value)
    }
  })
  useMitt.on(MittEnum.MESSAGE_ANIMATION, (messageType: MessageType) => {
    addToDomUpdateQueue(messageType.message.id, messageType.fromUser.uid)
  })
  useMitt.on(`${MittEnum.INFO_POPOVER}-Main`, (event: any) => {
    selectKey.value = event.uid
    infoPopoverRefs.value[event.uid].setShow(true)
    handlePopoverUpdate(event.uid)
  })
  // 监听滚动到底部的事件
  useMitt.on(MittEnum.CHAT_SCROLL_BOTTOM, () => {
    nextTick(() => {
      scrollToBottom()
    })
  })
})

onUnmounted(() => {
  if (rafId.value) {
    cancelAnimationFrame(rafId.value)
  }
  if (hoverBubble.value.timer) {
    clearTimeout(hoverBubble.value.timer)
    hoverBubble.value.timer = void 0
  }
  hoverBubble.value.key = -1

  // 清理 IntersectionObserver
  if (intersectionObserver.value) {
    intersectionObserver.value.disconnect()
    intersectionObserver.value = null
  }

  announcementUpdatedListener()
  announcementClearListener()
})
</script>

<style scoped lang="scss">
@use '@/styles/scss/chat-main';

.chat-main-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--footer-height));
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
    min-height: 75px;
    z-index: 999;
  }

  &::-webkit-scrollbar-thumb:hover {
    background-color: rgba(144, 144, 144, 0.5);
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  /* 使用WebKit兼容的方式隐藏滚动条 */
  &.hide-scrollbar {
    /* 保持滚动功能但隐藏滚动条 */
    &::-webkit-scrollbar {
      background: transparent;
    }
    &::-webkit-scrollbar-thumb {
      background: transparent;
    }
    /* 为了保持布局稳定 */
    margin-right: 0;
  }

  &.show-scrollbar {
    scrollbar-gutter: auto;
  }
}

// 加载历史消息时的样式
.loading-history {
  scroll-behavior: auto !important;
  pointer-events: none;
}

// 性能优化相关样式
.message-item {
  contain: layout style;
  will-change: auto;
}
</style>

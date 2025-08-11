<template>
  <!-- 网络状态提示 -->
  <n-flex
    v-if="!networkStatus.isOnline.value"
    align="center"
    justify="center"
    class="z-999 absolute w-full h-40px rounded-4px text-(12px [--danger-text]) bg-[--danger-bg]">
    <svg class="size-16px">
      <use href="#cloudError"></use>
    </svg>
    当前网络不可用，请检查你的网络设置
  </n-flex>

  <!-- 置顶公告提示 -->
  <div
    v-if="isGroup && topAnnouncement"
    class="feishu-announcement"
    :class="{ 'announcement-hover': isAnnouncementHover }"
    @mouseenter="isAnnouncementHover = true"
    @mouseleave="isAnnouncementHover = false">
    <n-flex :wrap="false" class="w-full" align="center" justify="space-between">
      <n-flex :wrap="false" align="center" class="pl-12px select-none" :size="6">
        <svg class="size-16px flex-shrink-0"><use href="#Loudspeaker"></use></svg>
        <div style="max-width: calc(100vw - 70vw)" class="line-clamp-1 text-(12px [--chat-text-color])">
          {{ topAnnouncement.content }}
        </div>
      </n-flex>
      <div class="flex-shrink-0 w-60px select-none" @click="handleViewAnnouncement">
        <p class="text-(12px #13987f) cursor-pointer">查看全部</p>
      </div>
    </n-flex>
  </div>

  <Transition name="chat-init" appear mode="out-in" @after-leave="handleTransitionComplete">
    <!-- 初次加载的骨架屏 -->
    <n-flex
      v-if="messageOptions?.isLoading && !messageOptions?.cursor"
      vertical
      :size="18"
      :style="{ 'max-height': `calc(100vh - ${announcementHeight}px)` }"
      class="relative h-100vh box-border p-20px">
      <n-flex justify="end">
        <n-skeleton style="border-radius: 14px" height="40px" width="46%" :sharp="false" />
        <n-skeleton height="40px" circle />
      </n-flex>

      <n-flex>
        <n-skeleton height="40px" circle />
        <n-skeleton style="border-radius: 14px" height="60px" width="58%" :sharp="false" />
      </n-flex>

      <n-flex>
        <n-skeleton height="40px" circle />
        <n-skeleton style="border-radius: 14px" height="40px" width="26%" :sharp="false" />
      </n-flex>

      <n-flex justify="end">
        <n-skeleton style="border-radius: 14px" height="40px" width="60%" :sharp="false" />
        <n-skeleton height="40px" circle />
      </n-flex>
    </n-flex>

    <!-- 聊天内容 -->
    <VirtualList
      v-else
      id="image-chat-main"
      ref="virtualListInst"
      :items="chatMessageList"
      :estimatedItemHeight="itemSize"
      :buffer="5"
      :is-loading-more="isLoadingMore"
      :is-last="messageOptions?.isLast"
      @scroll="handleScroll"
      @scroll-direction-change="handleScrollDirectionChange"
      @load-more="handleLoadMore"
      class="scrollbar-container"
      :class="{ 'hide-scrollbar': !showScrollbar }"
      :style="{ 'max-height': `calc(100vh - ${announcementHeight}px)` }"
      @mouseenter="showScrollbar = true"
      @mouseleave="showScrollbar = false">
      <template #default="{ item, index }">
        <n-flex
          vertical
          :key="index"
          class="flex-y-center"
          :class="[
            item.message.type === MsgEnum.RECALL ? 'min-h-22px' : 'min-h-62px',
            isGroup ? 'p-[14px_10px_14px_20px]' : 'chat-single p-[4px_10px_10px_20px]',
            { 'active-reply': activeReply === item.message.id }
          ]">
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
                <span v-if="hoverBubble.key === item.message.id">
                  {{ formatTimestamp(item.message.sendTime, true) }}
                </span>
              </Transition>
            </div>
            <div class="flex items-start flex-1" :class="item.fromUser.uid === userUid ? 'flex-row-reverse' : ''">
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
                class="color-[--text-color] flex-1"
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
                            :color="themes.content === ThemeEnum.DARK ? '' : '#fff'"
                            :fallback-src="themes.content === ThemeEnum.DARK ? '/logoL.png' : '/logoD.png'"
                            :src="useBadgeInfo(useUserInfo(item.fromUser.uid).value.wearingItemId).value.img" />
                        </template>
                        <span>
                          {{ useBadgeInfo(useUserInfo(item.fromUser.uid).value.wearingItemId).value.describe }}
                        </span>
                      </n-popover>
                      <!-- 用户名 -->
                      <span class="text-12px select-none color-#909090 inline-block align-top">
                        {{ item.fromUser.nickname }}
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
                    <span v-if="isGroup && hoverBubble.key === item.message.id" class="text-(12px #909090) select-none">
                      {{ formatTimestamp(item.message.sendTime, true) }}
                    </span>
                  </Transition>
                </n-flex>
                <!--  气泡样式  -->
                <ContextMenu
                  :content="item"
                  @contextmenu="handleMacSelect"
                  @mouseenter="handleMouseEnter(item.message.id)"
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
                  <!-- 渲染消息内容体 TODO: 等完善消息类型后逐渐替换使用RenderMessage -->
                  <RenderMessage
                    :class="[
                      item.message.type === MsgEnum.VOICE ? 'select-none cursor-pointer' : '!select-auto !cursor-text',
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

                  <!--  消息为为图片类型(不固定宽度和高度), 多张图片时渲染  -->
                  <!-- <n-image-group v-if="Array.isArray(item.message.body.url) && item.message.type === MsgEnum.IMAGE">
                    <n-flex class="photo-wall" vertical>
                      <n-image
                        class="select-none"
                        v-for="(src, index) in item.message.body.url"
                        :key="index"
                        :img-props="{ style: { maxWidth: '325px', maxHeight: '165px', width: '100%', height: 'auto' } }"
                        show-toolbar-tooltip
                        style="border-radius: 8px"
                        :fallback-src="'https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg'"
                        :src="src"></n-image>
                    </n-flex>
                  </n-image-group> -->

                  <!-- 消息为文件 -->
                  <!-- <n-image
                    class="select-none"
                    v-if="typeof item.message.body.url === 'string' && item.message.type === MsgEnum.FILE"
                    :img-props="{ style: { maxWidth: '325px', maxHeight: '165px' } }"
                    show-toolbar-tooltip
                    preview-disabled
                    style="border-radius: 8px"
                    :src="item.message.body.url"></n-image> -->
                  <!-- 消息状态指示器 -->
                  <div v-if="item.fromUser.uid === userUid" class="absolute -left-6 top-2">
                    <n-icon v-if="item.message.status === MessageStatusEnum.SENDING" class="text-gray-400">
                      <img class="size-16px" src="@/assets/img/loading-one.svg" alt="" />
                    </n-icon>
                    <n-icon
                      v-if="item.message.status === MessageStatusEnum.FAILED"
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
                  class="reply-bubble relative w-fit custom-shadow">
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
                  class="flex-y-center gap-6px flex-wrap w-270px"
                  :class="{ 'justify-end': isSingleLineEmojis(item) }">
                  <template v-for="emoji in emojiList" :key="emoji.value">
                    <!-- 根据表情类型获取对应的计数属性名 -->
                    <div class="flex-y-center" v-if="getEmojiCount(item, emoji.value) > 0">
                      <div class="emoji-reply-bubble" @click.stop="cancelReplyEmoji(item, emoji.value)">
                        <img :title="emoji.title" class="size-18px" :src="emoji.url" :alt="emoji.title" />
                        <span class="text-(12px #eee)">{{ getEmojiCount(item, emoji.value) }}</span>
                      </div>
                    </div>
                  </template>
                </div>
              </n-flex>
            </div>
          </div>
        </n-flex>
      </template>
    </VirtualList>
  </Transition>

  <!-- 弹出框 -->
  <n-modal v-model:show="modalShow" class="w-350px border-rd-8px">
    <div class="bg-[--bg-popover] w-360px h-full p-6px box-border flex flex-col">
      <div
        v-if="type() === 'macos'"
        @click="modalShow = false"
        class="mac-close z-999 size-13px shadow-inner bg-#ed6a5eff rounded-50% select-none absolute left-6px">
        <svg class="hidden size-7px color-#000 select-none absolute top-3px left-3px">
          <use href="#close"></use>
        </svg>
      </div>

      <svg v-if="type() === 'windows'" @click="modalShow = false" class="w-12px h-12px ml-a cursor-pointer select-none">
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
    :class="isGroup ? 'right-220px' : 'right-50px'">
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
import { type } from '@tauri-apps/plugin-os'
import { useDebounceFn } from '@vueuse/core'
import { delay } from 'lodash-es'
import VirtualList, { type VirtualListExpose } from '@/components/common/VirtualList.vue'
import { EventEnum, MessageStatusEnum, MittEnum, MsgEnum, TauriCommand, ThemeEnum } from '@/enums'
import { useBadgeInfo, useUserInfo } from '@/hooks/useCached.ts'
import { useChatMain } from '@/hooks/useChatMain.ts'
import { useMitt } from '@/hooks/useMitt.ts'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { usePopover } from '@/hooks/usePopover.ts'
import { useTauriListener } from '@/hooks/useTauriListener'
import { useWindow } from '@/hooks/useWindow.ts'
import apis from '@/services/apis'
import type { MessageType, SessionItem } from '@/services/types.ts'
import { useCachedStore } from '@/stores/cached'
import { useChatStore } from '@/stores/chat.ts'
import { useGlobalStore } from '@/stores/global'
import { useGroupStore } from '@/stores/group.ts'
import { useUserStore } from '@/stores/user.ts'
import { audioManager } from '@/utils/AudioManager'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { formatTimestamp } from '@/utils/ComputedTime.ts'
import { ErrorType, invokeWithErrorHandler } from '@/utils/TauriInvokeHandler'
import { useSettingStore } from '@/stores/setting'

const appWindow = WebviewWindow.getCurrent()
const { addListener } = useTauriListener()
const props = defineProps<{
  activeItem: SessionItem
}>()
const activeItemRef = shallowRef<SessionItem>(props.activeItem)
const chatStore = useChatStore()
const userStore = useUserStore()
const groupStore = useGroupStore()
const globalStore = useGlobalStore()
const cachedStore = useCachedStore()
const networkStatus = useNetworkStatus()
const settingStore = useSettingStore()
const { themes } = storeToRefs(settingStore)

// 记录当前滚动位置相关信息
const isAutoScrolling = ref(false)

/** 记录是否正在向上滚动 */
const isScrollingUp = ref(false)
/** 记录是否正在向下滚动 */
const isScrollingDown = ref(false)
// 添加标记，用于识别是否正在加载历史消息
const isLoadingMore = ref(false)

// 是否是群聊
const isGroup = computed(() => chatStore.isGroup)
const userUid = computed(() => userStore.userInfo.uid)
const chatMessageList = computed(() => chatStore.chatMessageList)
const currentNewMsgCount = computed(() => chatStore.currentNewMsgCount)
const messageOptions = computed(() => {
  const options = chatStore.currentMessageOptions
  console.log('🔍 messageOptions 状态:', {
    isLoading: options?.isLoading,
    cursor: options?.cursor,
    isLast: options?.isLast,
    showSkeleton: options?.isLoading && !options?.cursor
  })
  return options
})
const { createWebviewWindow } = useWindow()
const currentRoomId = computed(() => globalStore.currentSession?.roomId)
// 我的群昵称
// const myGroupNickname = (uid: string) => {
//   if (props.activeItem.type === RoomTypeEnum.GROUP && userUid.value === uid) {
//     return groupStore.countInfo?.myName || ''
//   }
// }
/** 是否是超级管理员 */
// const isAdmin = computed(() => userInfo?.power === PowerEnum.ADMIN)
/** 跳转回复消息后选中效果 */
const activeReply = ref('')
/** item最小高度，用于计算滚动大小和位置 */
const itemSize = computed(() => (isGroup.value ? 90 : 76))
/** 虚拟列表 */
const virtualListInst = useTemplateRef<VirtualListExpose>('virtualListInst')
/** List中的Popover组件实例 */
const infoPopoverRefs = ref<Record<string, any>>([])
// 是否显示滚动条
const showScrollbar = ref(false)
// 记录 requestAnimationFrame 的返回值
const rafId = ref<number>()
// 缓存消息ID到索引的映射，提高查找效率
const messageIdToIndexMap = ref(new Map<string, number>())
/** 鼠标悬浮的气泡显示对应的时间 */
const hoverBubble = ref<{
  key: number
  timer?: NodeJS.Timeout
}>({
  key: -1
})
/** 记录右键菜单时选中的气泡的元素(用于处理mac右键会选中文本的问题) */
const recordEL = ref()
const isMac = computed(() => type() === 'macos')
// 公告展示时需要减去的高度
const announcementHeight = computed(() => (isGroup.value && topAnnouncement.value ? 300 : 260))
// 置顶公告hover状态
const isAnnouncementHover = ref(false)
// 置顶公告相关
const topAnnouncement = ref<any>(null)
// 是否显示悬浮页脚
const shouldShowFloatFooter = computed(() => {
  const container = virtualListInst.value?.getContainer()
  if (!container) return false

  const scrollHeight = container.scrollHeight
  const clientHeight = container.clientHeight
  const distanceFromBottom = scrollHeight - scrollTop.value - clientHeight

  // 如果有新消息，优先显示新消息提示
  if (currentNewMsgCount.value?.count && currentNewMsgCount.value.count > 0) {
    return true
  }

  // 只在向下滚动时显示按钮
  if (!isScrollingDown.value) {
    return false
  }

  // 当距离底部超过一个屏幕高度时显示向下箭头
  return distanceFromBottom > clientHeight
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

// 滚动到底部
const scrollToBottom = () => {
  if (!virtualListInst.value) return
  virtualListInst.value?.scrollTo({ position: 'bottom', behavior: 'instant' })
}

// 更新消息索引映射
const updateMessageIndexMap = () => {
  messageIdToIndexMap.value.clear()
  chatMessageList.value.forEach((msg, index) => {
    messageIdToIndexMap.value.set(msg.message.id, index)
  })
}

// 处理滚动事件(用于页脚显示功能)
const handleScroll = () => {
  if (isAutoScrolling.value) return // 如果是自动滚动，不处理
  const container = virtualListInst.value?.getContainer()
  if (!container) return

  // 获取已滚动的距离
  scrollTop.value = container.scrollTop
  // 获取整个滚动容器的高度
  const scrollHeight = container.scrollHeight
  // 获取容器的可视区域高度
  const clientHeight = container.clientHeight
  // 计算距离底部的距离
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
}

// 添加防抖的鼠标事件处理
const debouncedMouseEnter = useDebounceFn((key: any) => {
  hoverBubble.value.key = key
}, 300)

// 当鼠标进入时触发的处理函数
const handleMouseEnter = (key: any) => {
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
const handleMouseLeave = () => {
  // 如果定时器存在，则清除定时器并重置为undefined
  if (hoverBubble.value.timer) {
    clearTimeout(hoverBubble.value.timer)
    hoverBubble.value.timer = void 0
  }
  // 重置悬浮气泡的key值为-1
  hoverBubble.value.key = -1
}

// 监听会话切换
watch(
  () => props.activeItem,
  (value, oldValue) => {
    if (oldValue.roomId !== value.roomId) {
      // 使用音频管理器停止所有音频
      audioManager.stopAll()

      scrollToBottom()
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
    // 确保消息属于当前会话
    if (!value.length || (value[0] && value[0].message.roomId !== props.activeItem.roomId)) {
      return
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
            virtualListInst.value?.scrollTo({ index: value.length - oldValue.length })
          })
        }
        return
      }

      // 优先级1：用户发送的消息，始终滚动到底部
      if (latestMessage?.fromUser?.uid === userUid.value) {
        scrollToBottom()
        return
      }

      // 优先级2：已经在底部时的新消息
      const container = virtualListInst.value?.getContainer()
      if (container) {
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
        if (distanceFromBottom <= 300) {
          scrollToBottom()
          return
        }

        // 其他情况：如果是他人的消息且不在底部，增加新消息计数
        if (latestMessage?.fromUser?.uid !== userUid.value) {
          const current = chatStore.newMsgCount.get(props.activeItem.roomId)
          if (!current) {
            chatStore.newMsgCount.set(props.activeItem.roomId, {
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

// 处理过渡动画完成后的滚动
const handleTransitionComplete = () => {
  if (!messageOptions.value?.isLoading) {
    nextTick(() => {
      scrollToBottom()
    })
  }
}

// 处理滚动方向变化
const handleScrollDirectionChange = (direction: 'up' | 'down') => {
  isScrollingUp.value = direction === 'up'
  isScrollingDown.value = direction === 'down'
}

// 取消表情反应
const cancelReplyEmoji = async (item: any, type: number) => {
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
      await apis.markMsg(data)

      await invokeWithErrorHandler(
        TauriCommand.SAVE_MESSAGE_MARK,
        {
          data: data
        },
        {
          customErrorMessage: '保存消息标记',
          errorType: ErrorType.Client
        }
      )

      const currentCount = item.message.messageMarks[String(type)]?.count || 0
      chatStore.updateMarkCount([
        {
          msgId: Number(item.message.id),
          markType: type,
          markCount: Math.max(0, currentCount - 1), // 确保计数不会为负数
          actType: 2,
          uid: Number(userStore.userInfo.uid)
        }
      ])
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
const getEmojiCount = (item: any, emojiType: number): number => {
  if (!item?.message?.messageMarks) return 0

  // messageMarks 是一个对象，键是表情类型，值是包含 count 和 userMarked 的对象
  // 如果存在该表情类型的统计数据，返回其计数值，否则返回0
  return item.message.messageMarks[String(emojiType)]?.count || 0
}

// 处理表情回应
const handleEmojiSelect = async (context: { label: string; value: number; title: string }, item: any) => {
  // 检查该表情是否已被当前用户标记
  const userMarked = item.message.messageMarks[String(context.value)]?.userMarked
  // 只给没有标记过的图标标记
  if (!userMarked) {
    try {
      await apis.markMsg({
        msgId: item.message.id,
        markType: context.value,
        actType: 1
      })

      await invokeWithErrorHandler(
        TauriCommand.SAVE_MESSAGE_MARK,
        {
          data: {
            msgId: item.message.id,
            markType: context.value,
            actType: 1
          }
        },
        {
          customErrorMessage: '保存消息标记',
          errorType: ErrorType.Client
        }
      )

      const currentCount = item.message.messageMarks[String(context.value)]?.count || 0
      chatStore.updateMarkCount([
        {
          msgId: Number(item.message.id),
          markType: context.value,
          markCount: currentCount + 1,
          actType: 1,
          uid: Number(userStore.userInfo.uid)
        }
      ])
    } catch (error) {
      console.error('标记表情失败:', error)
    }
  } else {
    window.$message.warning('该表情已标记')
  }
}

// 跳转到回复消息
const jumpToReplyMsg = async (key: string) => {
  // 先在当前列表中尝试查找
  let messageIndex = chatMessageList.value.findIndex((msg) => msg.message.id === String(key))

  // 如果找到了，直接滚动到该消息
  if (messageIndex !== -1) {
    virtualListInst.value?.scrollTo({ index: messageIndex, behavior: 'instant' })
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
      virtualListInst.value?.scrollTo({ index: messageIndex, behavior: 'instant' })
      activeReply.value = key
    })
  } else {
    // 如果尝试多次后仍未找到消息
    window.$message.warning('无法找到原始消息，可能已被删除或太久远')
  }
}

// 给气泡添加动画
const addToDomUpdateQueue = (index: string, id: string) => {
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
const handleMacSelect = (event: any) => {
  if (isMac.value) {
    event.target.classList.add('select-none')
    recordEL.value = event.target
  }
}

const closeMenu = (event: any) => {
  if (!event.target.matches('.bubble', 'bubble-oneself')) {
    activeBubble.value = ''
    // 解决mac右键会选中文本的问题
    if (isMac.value && recordEL.value) {
      recordEL.value.classList.remove('select-none')
    }
  }
  if (!event.target.matches('.active-reply')) {
    /** 解决更替交换回复气泡时候没有触发动画的问题 */
    if (!event.target.matches('.reply-bubble *')) {
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
}

const handleRetry = (item: any) => {
  // TODO: 实现重试发送逻辑
  console.log('重试发送消息:', item)
}

// 处理加载更多
const handleLoadMore = async () => {
  // 如果正在加载或已经触发了加载，则不重复触发
  if (messageOptions.value?.isLoading || isLoadingMore.value) return

  // 记录当前的内容高度
  const container = virtualListInst.value?.getContainer()
  if (!container) return
  const oldScrollHeight = container.scrollHeight

  isLoadingMore.value = true

  // 使用CSS变量控制滚动行为，避免直接操作DOM样式
  container.classList.add('loading-history')

  try {
    await chatStore.loadMore()

    // 加载完成后，计算新增内容的高度差，并设置滚动位置
    await nextTick()
    const newScrollHeight = container.scrollHeight
    const heightDiff = newScrollHeight - oldScrollHeight
    if (heightDiff > 0) {
      container.scrollTop = heightDiff
    }

    // 更新消息索引映射
    updateMessageIndexMap()
  } catch (error) {
    console.error('加载历史消息失败:', error)
  } finally {
    // 恢复滚动交互
    setTimeout(() => {
      container.classList.remove('loading-history')
      isLoadingMore.value = false
    }, 100)
  }
}

// 获取置顶公告
const loadTopAnnouncement = async () => {
  if (currentRoomId.value && isGroup.value) {
    try {
      const data = await cachedStore.getGroupAnnouncementList(currentRoomId.value, 1, 1)
      if (data && data.records.length > 0) {
        // 查找置顶公告
        const topNotice = data.records.find((item: any) => item.top)
        topAnnouncement.value = topNotice || null
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
const getAvatarSrc = (uid: string) => {
  const avatar = uid === userUid.value ? userStore.userInfo.avatar : useUserInfo(uid).value.avatar
  return AvatarUtils.getAvatarUrl(avatar as string)
}

// 处理点击查看公告
const handleViewAnnouncement = () => {
  nextTick(async () => {
    if (!currentRoomId.value) return
    await createWebviewWindow('查看群公告', `announList/${currentRoomId.value}/1`, 420, 620)
  })
}

const isSpecialMsgType = (type: number) => {
  return (
    type === MsgEnum.IMAGE ||
    type === MsgEnum.EMOJI ||
    type === MsgEnum.NOTICE ||
    type === MsgEnum.VIDEO ||
    type === MsgEnum.FILE
  )
}

// 判断表情反应是否只有一行
const isSingleLineEmojis = (item: any) => {
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

onMounted(async () => {
  nextTick(() => {
    scrollToBottom()
    // 初始化消息索引映射
    updateMessageIndexMap()
    // 初始加载置顶公告
    loadTopAnnouncement()
  })
  useMitt.on(MittEnum.MESSAGE_ANIMATION, (messageType: MessageType) => {
    addToDomUpdateQueue(messageType.message.id, messageType.fromUser.uid)
  })
  useMitt.on(`${MittEnum.INFO_POPOVER}-Main`, (event: any) => {
    selectKey.value = event.uid
    infoPopoverRefs.value[event.uid].setShow(true)
    handlePopoverUpdate(event.uid)
  })
  useMitt.on(MittEnum.MSG_BOX_SHOW, (event: any) => {
    activeItemRef.value = event.item
  })
  // 监听滚动到底部的事件
  useMitt.on(MittEnum.CHAT_SCROLL_BOTTOM, () => {
    if (virtualListInst.value) {
      nextTick(() => {
        scrollToBottom()
      })
    }
  })

  // 监听公告更新事件
  addListener(
    appWindow.listen('announcementUpdated', async (event: any) => {
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
    }),
    'announcementUpdated'
  )

  // 监听公告清空事件
  addListener(
    appWindow.listen('announcementClear', () => {
      topAnnouncement.value = null
    }),
    'announcementClear'
  )

  addListener(
    appWindow.listen(EventEnum.SHARE_SCREEN, async () => {
      await createWebviewWindow('共享屏幕', 'sharedScreen', 840, 840)
    }),
    'shareScreen'
  )
  window.addEventListener('click', closeMenu, true)
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
  window.removeEventListener('click', closeMenu, true)
})
</script>

<style scoped lang="scss">
@use '@/styles/scss/chat-main';
</style>

<template>
  <component
    v-memo="[
      message.message.id,
      message.message.status,
      message.message.body?.translatedText?.text || '',
      uploadProgress,
      searchKeyword,
      historyMode
    ]"
    v-if="historyMode || !hasBubble(message.message.type)"
    :is="componentMap[message.message.type]"
    :body="message.message.body"
    :message-status="message.message.status"
    :upload-progress="uploadProgress"
    :from-user-uid="fromUser?.uid"
    :message="message.message"
    :data-message-id="message.message.id"
    :is-group="isGroup"
    :on-image-click="onImageClick"
    :on-video-click="onVideoClick"
    :search-keyword="searchKeyword"
    :history-mode="historyMode" />

  <!-- 好友或者群聊的信息 -->
  <div v-else class="flex flex-col w-full" :class="{ 'justify-end': isMe }">
    <!-- 信息时间(单聊) -->
    <div
      v-if="!isGroup"
      class="text-(12px #909090) h-12px flex select-none"
      :class="{
        'pr-48px justify-end': isMe,
        'pl-42px justify-start': !isMe
      }">
      <Transition name="fade-single">
        <span v-if="hoverMsgId === message.message.id">
          {{ formatTimestamp(message.message.sendTime, true) }}
        </span>
      </Transition>
    </div>
    <div class="flex justify-center items-center">
      <n-checkbox
        v-model:checked="message.isCheck"
        v-if="chatStore.isMsgMultiChoose && chatStore.msgMultiChooseMode !== 'forward' && !isMultiSelectDisabled"
        class="mr-3 select-none"
        :focusable="false"
        @click.stop />
      <div class="flex items-start flex-1" :class="isMe ? 'flex-row-reverse' : ''">
        <!-- 回复消息提示的箭头 -->
        <svg
          v-if="activeReply === message.message.id"
          class="size-16px pt-4px color-#909090"
          :class="isMe ? 'ml-8px' : 'mr-8px'">
          <use :href="isMe ? `#corner-down-left` : `#corner-down-right`"></use>
        </svg>
        <!-- 头像 -->
        <n-popover
          :ref="(el: any) => el && (infoPopoverRefs[message.message.id] = el)"
          @update:show="handlePopoverUpdate(message.message.id, $event)"
          trigger="click"
          placement="right"
          :show-arrow="false"
          style="padding: 0; background: var(--bg-info)">
          <template #trigger>
            <ContextMenu
              @select="$event.click(message, 'Main')"
              :content="message"
              :menu="isGroup ? optionsList : void 0"
              :special-menu="report">
              <!-- 存在头像时候显示 -->
              <n-avatar
                round
                :size="34"
                @click="handleAvatarClick(message.fromUser.uid, message.message.id)"
                class="select-none"
                :color="themes.content === ThemeEnum.DARK ? '' : '#fff'"
                :fallback-src="themes.content === ThemeEnum.DARK ? '/logoL.png' : '/logoD.png'"
                :src="getAvatarSrc(message.fromUser.uid)"
                :class="isMe ? '' : 'mr-10px'" />
            </ContextMenu>
          </template>
          <!-- 用户个人信息框 -->
          <InfoPopover v-if="selectKey === message.message.id" :uid="fromUser.uid" />
        </n-popover>

        <n-flex vertical :size="6" class="color-[--text-color] flex-1" :class="isMe ? 'items-end mr-10px' : ''">
          <n-flex :size="6" align="center" :style="isMe ? 'flex-direction: row-reverse' : ''">
            <ContextMenu
              @select="$event.click(message, 'Main')"
              :content="message"
              :menu="isGroup ? optionsList : void 0"
              :special-menu="report">
              <n-flex
                :size="6"
                class="select-none cursor-default"
                align="center"
                v-if="isGroup"
                :style="isMe ? 'flex-direction: row-reverse' : ''">
                <!-- 用户徽章 -->
                <n-popover
                  v-if="
                    globalStore.currentSessionRoomId === '1' &&
                    cachedStore.badgeById(groupStore.getUserInfo(fromUser.uid)?.wearingItemId)?.img
                  "
                  trigger="hover">
                  <template #trigger>
                    <n-avatar
                      class="select-none"
                      :size="18"
                      round
                      :fallback-src="themes.content === ThemeEnum.DARK ? '/logoL.png' : '/logoD.png'"
                      :src="cachedStore.badgeById(groupStore.getUserInfo(fromUser.uid)?.wearingItemId)?.img" />
                  </template>
                  <span>
                    {{ cachedStore.badgeById(groupStore.getUserInfo(fromUser.uid)?.wearingItemId)?.describe }}
                  </span>
                </n-popover>
                <!-- 用户名 -->
                <span
                  :class="[
                    'text-12px select-none color-#909090 inline-block align-top',
                    !isMe ? 'cursor-pointer hover:color-#13987f transition-colors' : ''
                  ]"
                  @click.stop="handleMentionUser">
                  {{ senderDisplayName }}
                </span>
                <!-- 消息归属地 -->
                <span v-if="senderLocPlace" class="text-(12px #909090)">({{ senderLocPlace }})</span>
              </n-flex>
            </ContextMenu>
            <!-- 群主 -->
            <div
              v-if="groupStore.isCurrentLord(fromUser.uid)"
              class="flex px-4px py-3px rounded-4px bg-#d5304f30 size-fit select-none">
              <span class="text-(9px #d5304f)">群主</span>
            </div>
            <!-- 管理员 -->
            <div
              v-if="groupStore.isAdmin(fromUser.uid)"
              class="flex px-4px py-3px rounded-4px bg-#1a7d6b30 size-fit select-none">
              <span class="text-(9px #008080)">管理员</span>
            </div>
            <!-- 信息时间(群聊) -->
            <Transition name="fade-group">
              <span v-if="isGroup && hoverMsgId === message.message.id" class="text-(12px #909090) select-none">
                {{ formatTimestamp(message.message.sendTime, true) }}
              </span>
            </Transition>
          </n-flex>
          <!--  气泡样式  -->
          <ContextMenu
            v-on-long-press="[(e) => handleLongPress(e, handleItemType(message.message.type)), longPressOption]"
            :content="message"
            @mousedown.right="recordSelectionBeforeContext"
            @contextmenu="handleContextMenuSelection"
            @mouseenter="() => (hoverMsgId = message.message.id)"
            @mouseleave="() => (hoverMsgId = '')"
            class="w-fit relative flex flex-col chat-message-max-width"
            :data-key="isMe ? `U${message.message.id}` : `Q${message.message.id}`"
            :class="isMe ? 'items-end' : 'items-start'"
            :style="{ '--bubble-max-width': bubbleMaxWidth }"
            @select="$event.click(message, 'Main')"
            :menu="handleItemType(message.message.type)"
            :emoji="emojiList"
            :special-menu="specialMenuList(message.message.type)"
            @reply-emoji="handleEmojiSelect($event, message)"
            @click="handleMsgClick(message)">
            <component
              v-memo="[
                message.message.id,
                message.message.status,
                message.message.body?.translatedText?.text || '',
                uploadProgress,
                searchKeyword,
                historyMode
              ]"
              :class="[
                message.message.type === MsgEnum.VOICE ? 'select-none cursor-pointer' : 'select-text cursor-text',
                !isSpecialMsgType(message.message.type) ? (isMe ? 'bubble-oneself' : 'bubble') : '',
                {
                  active:
                    activeBubble === message.message.id &&
                    !isSpecialMsgType(message.message.type) &&
                    message.message.type !== MsgEnum.VOICE &&
                    !isMobile()
                },
                isMobile() ? 'max-w-170px!' : ''
              ]"
              :is="componentMap[message.message.type]"
              :body="message.message.body"
              :message-status="message.message.status"
              :upload-progress="uploadProgress"
              :from-user-uid="fromUser?.uid"
              :message="message.message"
              :data-message-id="message.message.id"
              :is-group="isGroup"
              :on-image-click="onImageClick"
              :on-video-click="onVideoClick"
              :search-keyword="searchKeyword"
              :history-mode="historyMode" />

            <!-- 显示翻译文本 -->
            <Transition name="fade-translate" appear mode="out-in">
              <div v-if="message.message.body.translatedText" class="translated-text cursor-default flex flex-col">
                <n-flex align="center" justify="space-between" class="mb-6px">
                  <n-flex align="center" :size="4">
                    <span class="text-(12px #909090)">{{ message.message.body.translatedText.provider }}</span>
                    <svg class="size-12px">
                      <use href="#success"></use>
                    </svg>

                    <n-tooltip trigger="hover">
                      <template #trigger>
                        <svg
                          class="pl-6px size-10px cursor-pointer hover:color-#909090 hover:transition-colors"
                          @click="handleCopyTranslation(message.message.body.translatedText.text)">
                          <use href="#copy"></use>
                        </svg>
                      </template>
                      <span>复制翻译</span>
                    </n-tooltip>
                  </n-flex>
                  <svg class="size-10px cursor-pointer" @click="message.message.body.translatedText = null">
                    <use href="#close"></use>
                  </svg>
                </n-flex>
                <p class="select-text cursor-text">{{ message.message.body.translatedText.text }}</p>
              </div>
            </Transition>

            <!-- 消息状态指示器 -->
            <div v-if="isMe" class="absolute -left-6 top-2">
              <n-icon v-if="message.message.status === MessageStatusEnum.SENDING" class="text-gray-400">
                <img class="size-16px" src="@/assets/img/loading-one.svg" alt="" />
              </n-icon>
              <n-icon
                v-if="message.message.status === MessageStatusEnum.FAILED"
                class="text-#d5304f cursor-pointer"
                @click.stop="handleRetry(message)">
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
            v-if="message.message.body.reply"
            @click="emit('jump2Reply', message.message.body.reply.id)"
            :class="isMobile() ? 'bg-#fafafa text-13px' : 'bg-[--right-chat-reply-color] text-12px'"
            class="reply-bubble relative w-fit custom-shadow select-none chat-message-max-width"
            :style="{ 'max-width': bubbleMaxWidth }">
            <svg class="size-14px">
              <use href="#to-top"></use>
            </svg>
            <n-avatar
              class="reply-avatar"
              round
              :size="20"
              :color="themes.content === ThemeEnum.DARK ? '' : '#fff'"
              :fallback-src="themes.content === ThemeEnum.DARK ? '/logoL.png' : '/logoD.png'"
              :src="getAvatarSrc(message.message.body.reply.uid)" />
            <span>{{ `${message.message.body.reply.username}: ` }}</span>
            <span class="content-span">
              {{ message.message.body.reply.body }}
            </span>
            <div v-if="message.message.body.reply.imgCount" class="reply-img-sub">
              {{ message.message.body.reply.imgCount }}
            </div>
          </n-flex>

          <!-- 动态渲染所有回复表情反应 -->
          <div
            v-if="message.message"
            class="flex-y-center gap-6px flex-wrap w-270px"
            :class="{ 'justify-end': isSingleLineEmojis(message) }">
            <template v-for="emoji in emojiList" :key="emoji.value">
              <!-- 根据表情类型获取对应的计数属性名 -->
              <div class="flex-y-center" v-if="message && getEmojiCount(message, emoji.value) > 0">
                <div
                  class="emoji-reply-bubble"
                  :class="{ 'emoji-reply-bubble--active': hasUserMarkedEmoji(message, emoji.value) }"
                  @click.stop="message && cancelReplyEmoji(message, emoji.value)">
                  <img :title="emoji.title" class="size-18px" :src="emoji.url" :alt="emoji.title" />
                  <span :class="hasUserMarkedEmoji(message, emoji.value) ? 'text-#fbb160' : 'text-(12px #eee)'">
                    {{ message ? getEmojiCount(message, emoji.value) : 0 }}
                  </span>
                </div>
              </div>
            </template>
          </div>
        </n-flex>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { Component } from 'vue'
import { MessageStatusEnum, MittEnum, MsgEnum, ThemeEnum } from '@/enums'
import { chatMainInjectionKey, useChatMain } from '@/hooks/useChatMain'
import { useMitt } from '@/hooks/useMitt'
import { usePopover } from '@/hooks/usePopover'
import type { MessageType } from '@/services/types'
import { useCachedStore } from '@/stores/cached'
import { useGlobalStore } from '@/stores/global'
import { useGroupStore } from '@/stores/group'
import { useSettingStore } from '@/stores/setting'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { formatTimestamp } from '@/utils/ComputedTime.ts'
import { isMessageMultiSelectEnabled } from '@/utils/MessageSelect'
import { useChatStore } from '@/stores/chat'
import { useUserStore } from '@/stores/user'
import { markMsg } from '@/utils/ImRequestUtils'
import { createMacContextSelectionGuard } from '@/utils/MacSelectionGuard'
import { isMobile } from '@/utils/PlatformConstants'
import Announcement from './Announcement.vue'
import AudioCall from './AudioCall.vue'
import Emoji from './Emoji.vue'
import File from './File.vue'
import Image from './Image.vue'
import Location from './Location.vue'
import MergeMessage from './MergeMessage.vue'
import BotMessage from './special/BotMessage.vue'
import RecallMessage from './special/RecallMessage.vue'
import SystemMessage from './special/SystemMessage.vue'
import Text from './Text.vue'
import Video from './Video.vue'
import VideoCall from './VideoCall.vue'
import Voice from './Voice.vue'
import { toFriendInfoPage } from '@/utils/RouterUtils'
import { vOnLongPress } from '@vueuse/components'

const props = withDefaults(
  defineProps<{
    message: MessageType
    uploadProgress?: number
    isGroup: boolean
    fromUser: {
      uid: string
    }
    onImageClick?: (url: string) => void
    onVideoClick?: (url: string) => void
    searchKeyword?: string
    historyMode?: boolean
  }>(),
  {
    historyMode: false
  }
)

const emit = defineEmits(['jump2Reply'])
const globalStore = useGlobalStore()
const selectKey = ref(props.fromUser!.uid)
const infoPopoverRefs = reactive<Record<string, any>>({})
const { handlePopoverUpdate } = usePopover(selectKey, 'image-chat-main')

const userStore = useUserStore()
// 响应式状态变量
const activeReply = ref<string>('')
const hoverMsgId = ref<string>('')
const settingStore = useSettingStore()
const { themes } = storeToRefs(settingStore)
const injectedChatMain = inject(chatMainInjectionKey, null)
const chatMainApi = injectedChatMain ?? useChatMain()
const { optionsList, report, activeBubble, handleItemType, emojiList, specialMenuList, handleMsgClick } = chatMainApi
const groupStore = useGroupStore()
const chatStore = useChatStore()
const cachedStore = useCachedStore()
const isMultiSelectDisabled = computed(() => !isMessageMultiSelectEnabled(props.message.message.type))
const bubbleMaxWidth = computed(() => {
  if (isMobile()) {
    return '70vw'
  }
  return props.isGroup ? '32vw' : '50vw'
})

const { recordSelectionBeforeContext, handleContextMenuSelection } = createMacContextSelectionGuard({
  lockSelector: '.chat-message-max-width'
})

const handleAvatarClick = (uid: string, msgId: string) => {
  if (isMobile()) {
    toFriendInfoPage(uid)
  } else {
    selectKey.value = msgId
  }
}

const handleMentionUser = () => {
  if (!props.isGroup || isMe.value) return
  const targetUid = props.fromUser?.uid
  if (!targetUid) return
  useMitt.emit(MittEnum.AT, targetUid)
}

// 获取用户头像
const getAvatarSrc = computed(() => (uid: string) => {
  const isCurrentUser = uid === userStore.userInfo?.uid
  const storeUser = groupStore.getUserInfo(uid)
  if (isMe.value && isCurrentUser) {
    return AvatarUtils.getAvatarUrl(userStore.userInfo!.avatar as string)
  }
  const resolvedAvatar = storeUser?.avatar || (uid === props.fromUser.uid ? props.message.fromUser.avatar : '')
  return AvatarUtils.getAvatarUrl(resolvedAvatar as string)
})

const senderDisplayName = computed(() => {
  const displayName = groupStore.getUserDisplayName(props.fromUser.uid)
  if (displayName) {
    return displayName
  }

  const storeUser = groupStore.getUserInfo(props.fromUser.uid)
  if (storeUser?.myName || storeUser?.name) {
    return storeUser.myName || storeUser.name || ''
  }

  return props.message.fromUser.username || '未知用户'
})

const senderLocPlace = computed(() => {
  const storeLocPlace = groupStore.getUserInfo(props.fromUser.uid)?.locPlace
  if (storeLocPlace) {
    return storeLocPlace
  }
  return props.message.fromUser.locPlace || ''
})

const componentMap: Partial<Record<MsgEnum, Component>> = {
  [MsgEnum.TEXT]: Text,
  [MsgEnum.IMAGE]: Image,
  [MsgEnum.EMOJI]: Emoji,
  [MsgEnum.VIDEO]: Video,
  [MsgEnum.VOICE]: Voice,
  [MsgEnum.FILE]: File,
  [MsgEnum.NOTICE]: Announcement,
  [MsgEnum.VIDEO_CALL]: VideoCall,
  [MsgEnum.AUDIO_CALL]: AudioCall,
  [MsgEnum.SYSTEM]: SystemMessage,
  [MsgEnum.RECALL]: RecallMessage,
  [MsgEnum.BOT]: BotMessage,
  [MsgEnum.MERGE]: MergeMessage,
  [MsgEnum.LOCATION]: Location
}

const isSpecialMsgType = (type: number): boolean => {
  return (
    type === MsgEnum.IMAGE ||
    type === MsgEnum.EMOJI ||
    type === MsgEnum.NOTICE ||
    type === MsgEnum.VIDEO ||
    type === MsgEnum.FILE ||
    type === MsgEnum.MERGE ||
    type === MsgEnum.LOCATION
  )
}

// 判断表情反应是否只有一行
const isSingleLineEmojis = (item: MessageType): boolean => {
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
  return isMe.value && emojiCount <= 5
}

// 取消表情反应
const cancelReplyEmoji = async (item: MessageType, type: number): Promise<void> => {
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
const getEmojiCount = (item: MessageType, emojiType: number): number => {
  if (!item || !item.message || !item.message.messageMarks) return 0

  // messageMarks 是一个对象，键是表情类型，值是包含 count 和 userMarked 的对象
  // 如果存在该表情类型的统计数据，返回其计数值，否则返回0
  return item.message.messageMarks[String(emojiType)]?.count || 0
}

// 是否是当前登录用户标记
const hasUserMarkedEmoji = (item: MessageType, emojiType: number) => {
  if (!item || !item.message || !item.message.messageMarks) return false

  return item.message.messageMarks[String(emojiType)]?.userMarked
}

const handleRetry = (item: MessageType): void => {
  // TODO: 实现重试发送逻辑
  console.log('重试发送消息:', item)
}

// 处理复制翻译文本
const handleCopyTranslation = (text: string) => {
  if (text) {
    navigator.clipboard.writeText(text)
    window.$message.success('复制成功')
  }
}

const hasBubble = (type: MsgEnum) => {
  return !(type === MsgEnum.RECALL || type === MsgEnum.SYSTEM || type === MsgEnum.BOT)
}

const isMe = computed(() => {
  return props.fromUser?.uid === userStore.userInfo!.uid
})

// 解决mac右键会选中文本的问题
const closeMenu = (event: any) => {
  if (!event.target.matches('.bubble', 'bubble-oneself')) {
    activeBubble.value = ''
  }
}

// 处理表情回应
const handleEmojiSelect = async (
  context: { label: string; value: number; title: string },
  item: MessageType
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

useMitt.on(`${MittEnum.INFO_POPOVER}-Main`, (event: any) => {
  const messageId = event.uid

  // 首先设置 selectKey 以显示 InfoPopover 组件
  selectKey.value = messageId

  // 如果有对应的 popover 引用，则显示 popover
  if (infoPopoverRefs[messageId]) {
    infoPopoverRefs[messageId].setShow(true)
    handlePopoverUpdate(messageId)
  }
})

onMounted(() => {
  window.addEventListener('click', closeMenu, true)
})

onUnmounted(() => {
  window.removeEventListener('click', closeMenu, true)
})

/**
 * 长按事件（开始）
 */

const longPressOption = computed(() => ({
  delay: 700,
  modifiers: {
    // 只在移动端阻止默认行为，桌面端允许文本选中
    prevent: isMobile(),
    stop: isMobile()
  },
  reset: true,
  windowResize: true,
  windowScroll: true,
  immediate: true,
  updateTiming: 'sync'
}))

const handleLongPress = (e: PointerEvent, _menu: any) => {
  if (!isMobile()) return

  // 1. 阻止默认行为（防止系统菜单出现）
  e.preventDefault()
  e.stopPropagation()

  // // 2. 获取目标元素
  const target = e.target as HTMLElement

  const preventClick = (event: Event) => {
    event.stopPropagation()
    event.preventDefault()
    document.removeEventListener('click', preventClick, true)
    document.removeEventListener('pointerup', preventClick, true)
  }

  // 3. 添加临时事件监听器，阻止后续点击事件
  document.addEventListener('click', preventClick, true)
  document.addEventListener('pointerup', preventClick, true)

  // 4. 模拟右键点击事件
  const contextMenuEvent = new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    clientX: e.clientX,
    clientY: e.clientY,
    button: 2 // 明确指定右键
  })

  target.dispatchEvent(contextMenuEvent)

  setTimeout(() => {
    document.removeEventListener('click', preventClick, true)
    document.removeEventListener('pointerup', preventClick, true)
  }, 300)
}

/**
 * 长按事件（结束）
 */
</script>
<style scoped lang="scss">
@use '@/styles/scss/render-message';
</style>

<template>
  <n-scrollbar ref="msg-scrollbar" style="max-height: calc(100vh / var(--page-scale, 1) - 70px)">
    <!-- 消息同步加载提示 -->
    <div v-if="syncLoading" class="flex-center gap-10px py-12px text-(12px [--text-color])">
      <n-spin :size="14" />
      <span>正在同步消息</span>
    </div>
    <!--  会话列表  -->
    <div v-if="sessionList.length > 0" class="p-[4px_10px_0px_8px]">
      <ContextMenu
        v-for="item in sessionList"
        :key="item.roomId"
        :class="getItemClasses(item)"
        :data-key="item.roomId"
        :menu="visibleMenu(item)"
        :special-menu="visibleSpecialMenu(item)"
        :content="item"
        class="msg-box w-full h-75px mb-5px"
        @click="handleMsgClick(item)"
        @dblclick="handleMsgDblclick(item)"
        @select="$event.click(item)"
        @menu-show="handleMenuShow(item.roomId, $event)">
        <n-flex :size="10" align="center" class="h-75px pl-6px pr-8px flex-1">
          <n-avatar
            style="border: 1px solid var(--avatar-border-color)"
            :size="44"
            :color="themes.content === ThemeEnum.DARK ? '' : '#fff'"
            :fallback-src="themes.content === ThemeEnum.DARK ? '/logoL.png' : '/logoD.png'"
            :src="AvatarUtils.getAvatarUrl(item.avatar)"
            round />

          <n-flex class="h-fit flex-1 truncate" justify="space-between" vertical>
            <n-flex :size="4" align="center" class="flex-1 truncate" justify="space-between">
              <n-flex :size="0" align="center" class="leading-tight flex-1 truncate">
                <span class="text-14px leading-tight flex-1 truncate">{{ item.name }}</span>
                <n-popover trigger="hover" v-if="item.hotFlag === IsAllUserEnum.Yes">
                  <template #trigger>
                    <svg
                      :class="[globalStore.currentSessionRoomId === item.roomId ? 'color-#33ceab' : 'color-#13987f']"
                      class="size-20px select-none outline-none cursor-pointer">
                      <use href="#auth"></use>
                    </svg>
                  </template>
                  <span>官方群聊认证</span>
                </n-popover>

                <n-popover trigger="hover" v-if="item.account === UserType.BOT">
                  <template #trigger>
                    <svg class="size-20px select-none outline-none cursor-pointer color-#13987f">
                      <use href="#authenticationUser"></use>
                    </svg>
                  </template>
                  <span>HuLa助手</span>
                </n-popover>
              </n-flex>
              <span
                :class="[
                  { 'text-[#707070]! dark:text-[#fff]!': item.account === UserType.BOT },
                  { 'color-#d5304f90!': item.shield && globalStore.currentSessionRoomId === item.roomId }
                ]"
                class="text text-10px w-fit truncate text-right">
                {{ item.lastMsgTime }}
              </span>
            </n-flex>

            <n-flex align="center" justify="space-between">
              <template v-if="item.isAtMe">
                <span class="text flex-1 leading-tight text-12px truncate">
                  <span class="text-#d5304f mr-4px">[有人@我]</span>
                  <span>{{ String(item.lastMsg || '').replace(':', '：') }}</span>
                </span>
              </template>
              <template v-else-if="item.shield">
                <span class="text flex-1 leading-tight text-12px truncate">
                  <span :class="globalStore.currentSessionRoomId === item.roomId ? 'color-#d5304f90' : 'color-#909090'">
                    {{ item.type === RoomTypeEnum.GROUP ? '您已屏蔽群聊' : '您已屏蔽此人' }}
                  </span>
                </span>
              </template>
              <template v-else>
                <span
                  :class="[
                    'text flex-1 leading-tight text-12px truncate',
                    { 'text-[#707070]! dark:text-[#fff]!': item.account === UserType.BOT }
                  ]">
                  {{ String(item.lastMsg || '').replace(':', '：') }}
                </span>
              </template>

              <!-- 消息提示 -->
              <template v-if="item.shield">
                <svg
                  :class="[globalStore.currentSessionRoomId === item.roomId ? 'color-#d5304f90' : 'color-#909090']"
                  class="size-14px">
                  <use href="#forbid"></use>
                </svg>
              </template>
              <template v-else-if="item.muteNotification === 1 && !item.unreadCount">
                <svg
                  :class="[globalStore.currentSessionRoomId === item.roomId ? 'color-#fefefe' : 'color-#909090']"
                  class="size-14px">
                  <use href="#close-remind"></use>
                </svg>
              </template>
              <n-badge
                v-else
                :max="99"
                :value="item.unreadCount"
                :color="item.muteNotification === 1 ? 'rgba(128, 128, 128, 0.5)' : undefined" />
            </n-flex>
          </n-flex>
        </n-flex>
      </ContextMenu>
    </div>

    <!-- 加载中显示的骨架屏 -->
    <n-flex
      v-else-if="chatStore.sessionOptions.isLoading"
      vertical
      :size="18"
      style="max-height: calc(100vh / var(--page-scale, 1) - 70px)"
      class="relative h-100vh box-border p-20px">
      <n-flex>
        <n-skeleton style="border-radius: 14px" height="60px" width="100%" :sharp="false" />
      </n-flex>

      <n-flex>
        <n-skeleton style="border-radius: 14px" height="40px" width="80%" :sharp="false" />
      </n-flex>

      <n-flex justify="end">
        <n-skeleton style="border-radius: 14px" height="40px" width="80%" :sharp="false" />
      </n-flex>

      <n-flex>
        <n-skeleton style="border-radius: 14px" height="60px" width="100%" :sharp="false" />
      </n-flex>
    </n-flex>

    <!-- 没有数据显示的提示 -->
    <n-result v-else class="absolute-center" status="418" description="快和朋友聊天吧！">
      <template #footer>
        <n-button secondary type="primary">寻找好友</n-button>
      </template>
    </n-result>
  </n-scrollbar>
</template>
<script lang="ts" setup name="message">
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { MittEnum, RoomTypeEnum, ThemeEnum, UserType } from '@/enums'
import { useCommon } from '@/hooks/useCommon.ts'
import { useMessage } from '@/hooks/useMessage.ts'
import { useMitt } from '@/hooks/useMitt'
import { useReplaceMsg } from '@/hooks/useReplaceMsg.ts'
import { useTauriListener } from '@/hooks/useTauriListener'
import { IsAllUserEnum, type SessionItem } from '@/services/types.ts'
import { useChatStore } from '@/stores/chat.ts'
import { useGlobalStore } from '@/stores/global.ts'
import { useGroupStore } from '@/stores/group.ts'
import { useSettingStore } from '@/stores/setting'
import { useBotStore } from '@/stores/bot'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { formatTimestamp } from '@/utils/ComputedTime.ts'

const appWindow = WebviewWindow.getCurrent()
const chatStore = useChatStore()
const globalStore = useGlobalStore()
const groupStore = useGroupStore()
const settingStore = useSettingStore()
const botStore = useBotStore()
const { addListener } = useTauriListener()
const { themes } = storeToRefs(settingStore)
const { syncLoading } = storeToRefs(chatStore)
const botDisplayText = computed(() => botStore.displayText)
const { openMsgSession } = useCommon()
const msgScrollbar = useTemplateRef<HTMLElement>('msg-scrollbar')
const { handleMsgClick, handleMsgDelete, handleMsgDblclick, visibleMenu, visibleSpecialMenu } = useMessage()
// 跟踪当前显示右键菜单的会话ID
const activeContextMenuRoomId = ref<string | null>(null)

type SessionMsgCacheItem = { msg: string; isAtMe: boolean; time: number; senderName: string }

// 缓存每个会话的格式化消息，避免重复计算
const sessionMsgCache = reactive<Record<string, SessionMsgCacheItem>>({})

// 会话列表
const sessionList = computed(() => {
  const { checkRoomAtMe, getMessageSenderName, formatMessageContent } = useReplaceMsg()

  return (
    chatStore.sessionList
      .map((item) => {
        // 获取最新的头像
        let latestAvatar = item.avatar
        if (item.type === RoomTypeEnum.SINGLE && item.detailId) {
          latestAvatar = groupStore.getUserInfo(item.detailId)?.avatar || item.avatar
        }

        // 获取群聊备注名称（如果有）
        let displayName = item.name
        if (item.type === RoomTypeEnum.GROUP && item.remark) {
          displayName = item.remark
        }

        // 获取该会话的所有消息用于检查@我
        const messages = chatStore.chatMessageListByRoomId(item.roomId)

        // 优化：使用缓存的消息，或者计算新的消息
        let displayMsg = ''
        let isAtMe = false

        const lastMsg = messages[messages.length - 1]
        const cacheKey = item.roomId
        const cached = sessionMsgCache[cacheKey]
        const sendTime = lastMsg?.message?.sendTime || 0

        // 如果有消息且缓存不存在或已过期，重新计算
        if (lastMsg) {
          const senderName = getMessageSenderName(lastMsg, '', item.roomId, item.type)
          const shouldRefreshCache = !cached || cached.time < sendTime || cached.senderName !== senderName

          if (shouldRefreshCache) {
            isAtMe = checkRoomAtMe(
              item.roomId,
              item.type,
              globalStore.currentSessionRoomId!,
              messages,
              item.unreadCount
            )
            // 获取纯文本消息内容（不包含 @我 标记）
            displayMsg = formatMessageContent(lastMsg, item.type, senderName, item.roomId)

            // 更新缓存（只缓存纯文本消息内容）
            sessionMsgCache[cacheKey] = {
              msg: displayMsg,
              isAtMe,
              time: sendTime,
              senderName
            }
          } else {
            displayMsg = cached.msg
            isAtMe = item.unreadCount > 0 ? cached.isAtMe : false
          }
        } else if (cached) {
          // 使用缓存的值，但如果未读数为0，强制isAtMe为false
          displayMsg = cached.msg
          isAtMe = item.unreadCount > 0 ? cached.isAtMe : false
        }

        if (item.account === UserType.BOT) {
          displayMsg = botDisplayText.value || displayMsg
        }

        return {
          ...item,
          avatar: latestAvatar,
          name: displayName,
          lastMsg: displayMsg || '欢迎使用HuLa',
          lastMsgTime: formatTimestamp(item?.activeTime),
          isAtMe
        }
      })
      // 添加排序逻辑：先按置顶状态排序，再按活跃时间排序
      .sort((a, b) => {
        // 1. 先按置顶状态排序（置顶的排在前面）
        if (a.top && !b.top) return -1
        if (!a.top && b.top) return 1

        // 2. 在相同置顶状态下，按最后活跃时间降序排序（最新的排在前面）
        return b.activeTime - a.activeTime
      })
  )
})

watch(
  () => chatStore.currentSessionInfo,
  async (newVal) => {
    if (newVal) {
      // 避免重复调用：如果新会话与当前会话相同，跳过处理，不然会触发两次
      if (newVal.roomId === globalStore.currentSessionRoomId) {
        return
      }

      // 判断是否是群聊
      if (newVal.type === RoomTypeEnum.GROUP) {
        const sessionItem = {
          ...newVal,
          memberNum: groupStore.countInfo?.memberNum,
          remark: groupStore.countInfo?.remark,
          myName: groupStore.countInfo?.myName
        }
        handleMsgClick(sessionItem)
      } else {
        // 非群聊直接传递原始信息
        const sessionItem = newVal as SessionItem
        handleMsgClick(sessionItem)
      }
    }
  },
  { immediate: true }
)

// 处理右键菜单显示状态变化
const handleMenuShow = (roomId: string, isShow: boolean) => {
  activeContextMenuRoomId.value = isShow ? roomId : null
}

// 判断对应样式
const getItemClasses = (item: SessionItem) => {
  const isCurrentSession = globalStore.currentSessionRoomId === item.roomId
  const isContextMenuActive = activeContextMenuRoomId.value === item.roomId

  return {
    active: isCurrentSession,
    'active-bot': isCurrentSession && item.account === UserType.BOT,
    'active-shield': isCurrentSession && item.shield,
    'bg-[--bg-msg-first-child] rounded-12px relative': item.top,
    'context-menu-active': isContextMenuActive,
    'context-menu-active-shield': item.shield && isContextMenuActive,
    'active-context-menu': isContextMenuActive && isCurrentSession
  }
}

onBeforeMount(async () => {
  // 从联系人页面切换回消息页面的时候自动定位到选中的会话
  useMitt.emit(MittEnum.LOCATE_SESSION, { roomId: globalStore.currentSessionRoomId })
})

onMounted(async () => {
  // TODO: 待完善
  // SysNTF

  // TODO：频繁切换会话会导致频繁请求，切换的时候也会有点卡顿
  if (appWindow.label === 'home') {
    await addListener(
      appWindow.listen('search_to_msg', (event: { payload: { uid: string; roomType: number } }) => {
        openMsgSession(event.payload.uid, event.payload.roomType)
      }),
      'search_to_msg'
    )
  }
  useMitt.on(MittEnum.UPDATE_SESSION_LAST_MSG, (payload?: { roomId?: string }) => {
    const roomId = payload?.roomId
    if (!roomId) return
    delete sessionMsgCache[roomId]
  })
  useMitt.on(MittEnum.DELETE_SESSION, async (roomId: string) => {
    await handleMsgDelete(roomId)
  })
  useMitt.on(MittEnum.LOCATE_SESSION, async (e: { roomId: string }) => {
    const index = sessionList.value.findIndex((item) => item.roomId === e.roomId)
    if (index !== -1) {
      await nextTick(() => {
        msgScrollbar.value?.scrollTo({
          top: index * (75 + 5) - 264,
          behavior: 'smooth'
        })
      })
    }
  })
})
</script>

<style lang="scss" scoped>
@use '@/styles/scss/message';

#image-no-data {
  @apply size-full mt-60px text-[--text-color] text-14px;
}
</style>

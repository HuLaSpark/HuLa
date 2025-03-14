<template>
  <!-- 消息列表 // TODO 使用虚拟列表组件就用不了动画和拖动了 (nyh -> 2024-03-28 06:01:00) -->
  <n-scrollbar ref="msg-scrollbar" style="max-height: calc(100vh - 70px)">
    <!--  右键菜单组件  -->
    <div v-if="sessionList.length > 0" class="p-[4px_10px_0px_8px]">
      <ContextMenu
        v-for="item in sessionList"
        :key="item.roomId"
        :class="[
          { active: currentSession.roomId === item.roomId },
          { 'bg-[--bg-msg-first-child] rounded-12px relative': item.top }
        ]"
        :data-key="item.roomId"
        :menu="menuList"
        :special-menu="specialMenuList"
        :content="item"
        class="msg-box w-full h-75px mb-5px"
        @click="handleMsgClick(item)"
        @dblclick="handleMsgDblclick(item)"
        @select="$event.click(item)">
        <n-flex :size="10" align="center" class="h-75px pl-6px pr-8px flex-1">
          <n-avatar
            style="border: 1px solid var(--avatar-border-color)"
            :size="44"
            :src="AvatarUtils.getAvatarUrl(item.avatar)"
            fallback-src="/logo.png"
            round />

          <n-flex class="h-fit flex-1 truncate" justify="space-between" vertical>
            <n-flex :size="4" align="center" class="flex-1 truncate" justify="space-between">
              <n-flex :size="0" align="center" class="leading-tight flex-1 truncate">
                <span class="text-14px leading-tight flex-1 truncate">{{ item.name }}</span>
                <n-popover trigger="hover" v-if="item.hotFlag === IsAllUserEnum.Yes">
                  <template #trigger>
                    <svg
                      :class="[currentSession.roomId === item.roomId ? 'color-#33ceab' : 'color-#13987f']"
                      class="size-20px select-none outline-none cursor-pointer">
                      <use href="#auth"></use>
                    </svg>
                  </template>
                  <span>官方群聊认证</span>
                </n-popover>
              </n-flex>
              <span class="text text-10px w-fit truncate text-right">{{ item.lastMsgTime }}</span>
            </n-flex>

            <n-flex align="center" justify="space-between">
              <span class="text flex-1 leading-tight text-12px truncate" v-html="item.lastMsg.replace(':', '：')">
              </span>

              <!-- 消息提示 -->
              <template v-if="item.muteNotification === 1 && !item.unreadCount">
                <svg
                  :class="[currentSession.roomId === item.roomId ? 'color-#fefefe' : 'color-#909090']"
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
      style="max-height: calc(100vh - 70px)"
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
import { useMessage } from '@/hooks/useMessage.ts'
import { MittEnum, MsgEnum, RoomTypeEnum } from '@/enums'
import { IsAllUserEnum, SessionItem } from '@/services/types.ts'
import { formatTimestamp } from '@/utils/ComputedTime.ts'
import { useChatStore } from '@/stores/chat.ts'
import { useGlobalStore } from '@/stores/global.ts'
import { useUserInfo } from '@/hooks/useCached.ts'
import { renderReplyContent } from '@/utils/RenderReplyContent.ts'
import { useCommon } from '@/hooks/useCommon.ts'
import SysNTF from '@/components/common/SystemNotification.tsx'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { useGroupStore } from '@/stores/group.ts'
import { useMitt } from '@/hooks/useMitt'
import { useUserStore } from '@/stores/user'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useTauriListener } from '@/hooks/useTauriListener'

const appWindow = WebviewWindow.getCurrent()
const { addListener } = useTauriListener()
const chatStore = useChatStore()
const globalStore = useGlobalStore()
const groupStore = useGroupStore()
const { userUid, openMsgSession } = useCommon()
const userStore = useUserStore()
const msgScrollbar = useTemplateRef<HTMLElement>('msg-scrollbar')
const { handleMsgClick, handleMsgDelete, menuList, specialMenuList, handleMsgDblclick } = useMessage()
const currentSession = computed(() => globalStore.currentSession)
// 会话列表
const sessionList = computed(() => {
  return (
    chatStore.sessionList
      .map((item) => {
        // 获取该会话的所有消息，避免重复转换
        const messages = Array.from(chatStore.messageMap.get(item.roomId)?.values() || [])
        // 获取最后一条消息
        const lastMsg = messages[messages.length - 1]
        let LastUserMsg = ''

        // 获取最新的头像
        let latestAvatar = item.avatar
        if (item.type === RoomTypeEnum.SINGLE && item.id) {
          latestAvatar = useUserInfo(item.id).value.avatar || item.avatar
        }

        if (lastMsg) {
          const lastMsgUserName = useUserInfo(lastMsg.fromUser.uid)

          // 添加@提醒判断 - 修改比较逻辑，确保类型一致
          const messagesWithAt = messages.filter((msg) =>
            msg.message?.body?.atUidList?.some((atUid: string) => String(atUid) === String(userStore.userInfo.uid))
          )

          // 检查是否有@我的消息以及是否在未读范围内
          const isAtMe =
            item.type === RoomTypeEnum.GROUP &&
            currentSession.value.roomId !== item.roomId &&
            messagesWithAt.some((msg) => messages.indexOf(msg) >= messages.length - (item.unreadCount || 0))

          const atPrefix = isAtMe ? '<span class="text-#d5304f mr-4px">[有人@我]</span>' : ''

          LastUserMsg =
            lastMsg.message?.type === MsgEnum.RECALL
              ? item.type === RoomTypeEnum.GROUP
                ? `${lastMsgUserName.value.name}:撤回了一条消息`
                : lastMsg.fromUser.uid === userUid.value
                  ? '你撤回了一条消息'
                  : '对方撤回了一条消息'
              : `${atPrefix}${
                  renderReplyContent(
                    lastMsgUserName.value.name,
                    lastMsg.message?.type,
                    lastMsg.message?.body?.content || lastMsg.message?.body,
                    item.type
                  ) as string
                }`
        }
        return {
          ...item,
          avatar: latestAvatar,
          lastMsg: LastUserMsg || item.text || '欢迎使用HuLa',
          lastMsgTime: formatTimestamp(item?.activeTime)
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
  (newVal) => {
    if (newVal) {
      handleMsgClick(newVal as SessionItem)
    }
  },
  { immediate: true }
)

onBeforeMount(async () => {
  // 请求回话列表
  await chatStore.getSessionList(true)
  await groupStore.getCountStatistic()
  // 从联系人页面切换回消息页面的时候自动定位到选中的会话
  useMitt.emit(MittEnum.LOCATE_SESSION, { roomId: currentSession.value.roomId })
})

onMounted(() => {
  SysNTF
  // 监听其他窗口发来的WebSocket发送请求
  // TODO：频繁切换会话会导致频繁请求，切换的时候也会有点卡顿
  addListener(
    appWindow.listen('search_to_msg', (event: { payload: { uid: string; roomType: number } }) => {
      openMsgSession(event.payload.uid, event.payload.roomType)
    })
  )
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

<template>
  <!-- 消息列表 // TODO 使用虚拟列表组件就用不了动画和拖动了 (nyh -> 2024-03-28 06:01:00) -->
  <n-scrollbar ref="scrollbar" style="max-height: calc(100vh - 70px)">
    <!--  右键菜单组件  -->
    <TransitionGroup class="sort-target p-[4px_10px_0px_8px]" name="fade" tag="div" type="transition">
      <ContextMenu
        v-for="item in sessionList"
        :key="item.roomId"
        :class="{ active: currentSession.roomId === item.roomId }"
        :data-key="item.roomId"
        :menu="menuList"
        :special-menu="specialMenuList"
        class="msg-box w-full h-75px mb-5px"
        @click="handleMsgClick(item)"
        @dblclick="handleMsgDblclick(item)"
        @select="$event.click(item)">
        <n-flex :size="10" align="center" class="h-75px pl-6px pr-8px flex-1">
          <n-avatar :size="44" :src="AvatarUtils.getAvatarUrl(item.avatar)" bordered fallback-src="/logo.png" round />

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
              <span class="text flex-1 leading-tight text-12px truncate">
                {{ item.lastMsg.replace(':', '：') }}
              </span>

              <!-- 消息提示 -->
              <n-badge :max="99" :value="item.unreadCount" />
            </n-flex>
          </n-flex>
        </n-flex>
      </ContextMenu>
    </TransitionGroup>
  </n-scrollbar>
</template>
<script lang="ts" setup>
import { useMessage } from '@/hooks/useMessage.ts'
import { MsgEnum, RoomTypeEnum } from '@/enums'
import { IsAllUserEnum, SessionItem } from '@/services/types.ts'
import { formatTimestamp } from '@/utils/ComputedTime.ts'
import { useChatStore } from '@/stores/chat.ts'
import { useGlobalStore } from '@/stores/global.ts'
import { useUserInfo } from '@/hooks/useCached.ts'
import { renderReplyContent } from '@/utils/RenderReplyContent.ts'
import { useCommon } from '@/hooks/useCommon.ts'
import SysNTF from '@/components/common/SystemNotification.tsx'
import { AvatarUtils } from '@/utils/avatarUtils'
import { useGroupStore } from '@/stores/group.ts'

const chatStore = useChatStore()
const globalStore = useGlobalStore()
const groupStore = useGroupStore()
const { userUid } = useCommon()
const scrollbar = ref()
const { handleMsgClick, menuList, specialMenuList, handleMsgDblclick } = useMessage()
const currentSession = computed(() => globalStore.currentSession)
// TODO 艾特我提醒
const sessionList = computed(() =>
  chatStore.sessionList.map((item) => {
    // 最后一条消息内容
    const lastMsg = Array.from(chatStore.messageMap.get(item.roomId)?.values() || [])?.slice(-1)?.[0]
    let LastUserMsg = ''
    if (lastMsg) {
      const lastMsgUserName = useUserInfo(lastMsg.fromUser.uid)
      LastUserMsg =
        lastMsg.message?.type === MsgEnum.RECALL
          ? item.type === RoomTypeEnum.GROUP
            ? `${lastMsgUserName.value.name}:撤回了一条消息`
            : lastMsg.fromUser.uid === userUid.value
              ? '你撤回了一条消息'
              : '对方撤回了一条消息'
          : (renderReplyContent(
              lastMsgUserName.value.name,
              lastMsg.message?.type,
              lastMsg.message?.body?.content || lastMsg.message?.body,
              item.type
            ) as string)
    }
    return {
      ...item,
      lastMsg: LastUserMsg || item.text || '欢迎使用HuLa',
      lastMsgTime: formatTimestamp(item?.activeTime)
    }
  })
)

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
  groupStore.getCountStatistic()
})

onMounted(() => {
  SysNTF
})
</script>

<style lang="scss" scoped>
@use '@/styles/scss/message';
#image-no-data {
  @apply size-full mt-60px text-[--text-color] text-14px;
}
</style>

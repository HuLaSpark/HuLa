<template>
  <div class="h-100vh flex flex-col">
    <!-- 考虑不需要这个元素，因为有些页面是占满顶部的，考虑按需引入 -->
    <!-- 顶部安全区域占位元素 -->
    <SafeAreaPlaceholder type="layout" class="" direction="top" />

    <!-- 页面全部内容 -->
    <div class="flex flex-col flex-1">
      <RouterView v-slot="{ Component }">
        <component :is="Component" :key="route.fullPath" class="page-view" />
      </RouterView>
    </div>

    <!-- 底部安全区域占位元素 -->
    <SafeAreaPlaceholder type="layout" class="bg-#FAFAFA" direction="bottom" />
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import SafeAreaPlaceholder from '#/components/placeholders/SafeAreaPlaceholder.vue'
import { NotificationTypeEnum, TauriCommand } from '@/enums'
import { useMitt } from '@/hooks/useMitt'
import type { MessageType } from '@/services/types'
import { WsResponseMessageType } from '@/services/wsType'
import { useChatStore } from '@/stores/chat'
import { useGlobalStore } from '@/stores/global'
import { useUserStore } from '@/stores/user'
import { invokeSilently } from '@/utils/TauriInvokeHandler'

const route = useRoute()

const chatStore = useChatStore()
const userStore = useUserStore()
const globalStore = useGlobalStore()
const userUid = computed(() => userStore.userInfo!.uid)

/** 测试 */
useMitt.on(WsResponseMessageType.RECEIVE_MESSAGE, async (data: MessageType) => {
  console.log('[mobile/chat-room] 收到的消息：', data)
  chatStore.pushMsg(data, {
    isActiveChatView: route.path.startsWith('/mobile/chatRoom'),
    activeRoomId: globalStore.currentSessionRoomId || ''
  })
  data.message.sendTime = new Date(data.message.sendTime).getTime()
  await invokeSilently(TauriCommand.SAVE_MSG, {
    data
  })
  if (data.fromUser.uid !== userUid.value) {
    // 获取该消息的会话信息
    const session = chatStore.sessionList.find((s) => s.roomId === data.message.roomId)

    // 只有非免打扰的会话才发送通知和触发图标闪烁
    if (session && session.muteNotification !== NotificationTypeEnum.NOT_DISTURB) {
      const isCurrentChatRoom =
        route.path.startsWith('/mobile/chatRoom') && globalStore.currentSessionRoomId === data.message.roomId
      if (!isCurrentChatRoom) {
      }
    }
  }

  await globalStore.updateGlobalUnreadCount()
})
</script>

<style lang="scss" scoped>
.page-view {
  flex: 1;
  // 进入时的动画
  animation: fade-slide-in 0.3s ease;
}

@keyframes fade-slide-in {
  from {
    transform: translateX(20px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>

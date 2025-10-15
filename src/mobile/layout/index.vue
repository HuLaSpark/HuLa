<template>
  <div class="flex flex-col h-full" id="mobile-layout">
    <div class="flex-1 overflow-hidden">
      <RouterView v-slot="{ Component }">
        <Transition name="slide" appear mode="out-in">
          <component :is="Component" :key="route.fullPath" />
        </Transition>
      </RouterView>
    </div>

    <div class="flex-shrink-0">
      <TabBar ref="tabBarElement" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { emitTo } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useRoute } from 'vue-router'
import type { default as TabBarType } from '#/layout/tabBar/index.vue'
import TabBar from '#/layout/tabBar/index.vue'
import { NotificationTypeEnum, TauriCommand } from '@/enums'
import { useMitt } from '@/hooks/useMitt'
import type { MessageType } from '@/services/types'
import { WsResponseMessageType } from '@/services/wsType'
import { useChatStore } from '@/stores/chat'
import { useGlobalStore } from '@/stores/global'
import { useSettingStore } from '@/stores/setting'
import { useUserStore } from '@/stores/user'
import { audioManager } from '@/utils/AudioManager'
import { isMobile, isWindows } from '@/utils/PlatformConstants'
import { invokeSilently } from '@/utils/TauriInvokeHandler'

const route = useRoute()
const tabBarElement = ref<InstanceType<typeof TabBarType>>()
const chatStore = useChatStore()
const userStore = useUserStore()
const globalStore = useGlobalStore()
const settingStore = useSettingStore()
const userUid = computed(() => userStore.userInfo!.uid)
const playMessageSound = async () => {
  // 检查是否开启了消息提示音
  if (!settingStore.notification?.messageSound) {
    return
  }

  try {
    const audio = new Audio('/sound/message.mp3')
    await audioManager.play(audio, 'message-notification')
  } catch (error) {
    console.warn('播放消息音效失败:', error)
  }
}

/** 处理收到的消息 */
useMitt.on(WsResponseMessageType.RECEIVE_MESSAGE, async (data: MessageType) => {
  if (chatStore.checkMsgExist(data.message.roomId, data.message.id)) {
    return
  }
  console.log('[mobile/layout] 收到的消息：', data)
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
      let shouldPlaySound = isMobile()

      if (!isMobile()) {
        try {
          const home = await WebviewWindow.getByLabel('mobile-home')

          if (home) {
            const isVisible = await home.isVisible()
            const isMinimized = await home.isMinimized()
            const isFocused = await home.isFocused()

            // 如果窗口不可见、被最小化或未聚焦，则播放音效
            shouldPlaySound = !isVisible || isMinimized || !isFocused
          } else {
            // 如果找不到home 窗口，播放音效
            shouldPlaySound = true
          }
        } catch (error) {
          console.warn('检查窗口状态失败:', error)
          // 如果检查失败，默认播放音效
          shouldPlaySound = true
        }
      }

      // 播放消息音效
      if (shouldPlaySound) {
        await playMessageSound()
      }

      // 设置图标闪烁
      // useMitt.emit(MittEnum.MESSAGE_ANIMATION, data)
      // session.unreadCount++
      // 在windows系统下才发送通知
      if (!isMobile() && isWindows()) {
        globalStore.setTipVisible(true)
      }

      if (!isMobile()) {
        const currentWindow = WebviewWindow.getCurrent()

        if (currentWindow.label === 'mobile-home') {
          await emitTo('notify', 'notify_content', data)
        }
      }
    }
  }

  await globalStore.updateGlobalUnreadCount()
})
</script>

<style lang="scss">
#mobile-layout {
  box-sizing: border-box;
}
</style>

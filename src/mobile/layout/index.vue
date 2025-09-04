<template>
  <div class="h-100vh flex flex-col">
    <!-- 考虑不需要这个元素，因为有些页面是占满顶部的，考虑按需引入 -->
    <!-- 顶部安全区域占位元素 -->
    <!-- <SafeAreaPlaceholder direction="top" /> -->

    <!-- 页面全部内容 -->
    <div class="flex-1 overflow-y-auto flex flex-col">
      <div class="flex flex-1 overflow-y-auto">
        <RouterView v-slot="{ Component }">
          <Transition name="slide" appear mode="out-in">
            <component :is="Component" :key="route.fullPath" />
          </Transition>
        </RouterView>
      </div>
      <div class="flex">
        <TabBar ref="tabBarElement" />
      </div>
    </div>

    <!-- 底部安全区域占位元素 -->
    <SafeAreaPlaceholder type="layout" direction="bottom" />
  </div>
</template>

<script setup lang="ts">
import { emitTo } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { type } from '@tauri-apps/plugin-os'
import { useRoute } from 'vue-router'
import SafeAreaPlaceholder from '#/components/placeholders/SafeAreaPlaceholder.vue'
import type { default as TabBarType } from '#/layout/tabBar/index.vue'
import TabBar from '#/layout/tabBar/index.vue'
import { MittEnum, NotificationTypeEnum, TauriCommand } from '@/enums'
import { useMitt } from '@/hooks/useMitt'
import type { MessageType } from '@/services/types'
import { WsResponseMessageType } from '@/services/wsType'
import { useChatStore } from '@/stores/chat'
import { useGlobalStore } from '@/stores/global'
import { useMobileStore } from '@/stores/mobile'
import { useUserStore } from '@/stores/user'
import { audioManager } from '@/utils/AudioManager'
import { calculateElementPosition } from '@/utils/DomCalculate'
import { invokeSilently } from '@/utils/TauriInvokeHandler'

const route = useRoute()
const mobileStore = useMobileStore()
const tabBarElement = ref<InstanceType<typeof TabBarType>>()

const updateTabBarPosition = async (isInit: boolean) => {
  // 等待渲染完成
  await nextTick()

  // 渲染完成后下一帧开始前计算其位置信息
  requestAnimationFrame(async () => {
    const tabBarRect = await calculateElementPosition(tabBarElement)
    if (!tabBarRect) {
      throw new Error('[updateTabBarPosition] 无法获取tabBarRect位置和高度信息')
    }

    mobileStore.updateTabBarPosition({
      newPosition: tabBarRect,
      isInit: isInit
    })
  })
}

const chatStore = useChatStore()
const userStore = useUserStore()
const globalStore = useGlobalStore()
const userUid = computed(() => userStore.userInfo!.uid)
const playMessageSound = async () => {
  try {
    const audio = new Audio('/sound/message.mp3')
    await audioManager.play(audio, 'message-notification')
  } catch (error) {
    console.warn('播放消息音效失败:', error)
  }
}

/** 测试 */
useMitt.on(WsResponseMessageType.RECEIVE_MESSAGE, async (data: MessageType) => {
  chatStore.pushMsg(data)
  data.message.sendTime = new Date(data.message.sendTime).getTime()
  await invokeSilently(TauriCommand.SAVE_MSG, {
    data
  })
  if (data.fromUser.uid !== userUid.value) {
    // 获取该消息的会话信息
    const session = chatStore.sessionList.find((s) => s.roomId === data.message.roomId)

    // 只有非免打扰的会话才发送通知和触发图标闪烁
    if (session && session.muteNotification !== NotificationTypeEnum.NOT_DISTURB) {
      // 检查 home 窗口状态
      const home = await WebviewWindow.getByLabel('mobile-home')
      let shouldPlaySound = false

      if (home) {
        try {
          const isVisible = await home.isVisible()
          const isMinimized = await home.isMinimized()
          const isFocused = await home.isFocused()

          // 如果窗口不可见、被最小化或未聚焦，则播放音效
          shouldPlaySound = !isVisible || isMinimized || !isFocused
        } catch (error) {
          console.warn('检查窗口状态失败:', error)
          // 如果检查失败，默认播放音效
          shouldPlaySound = true
        }
      } else {
        // 如果找不到 home 窗口，播放音效
        shouldPlaySound = true
      }

      // 播放消息音效
      if (shouldPlaySound) {
        await playMessageSound()
      }

      // 设置图标闪烁
      useMitt.emit(MittEnum.MESSAGE_ANIMATION, data)
      // session.unreadCount++
      // 在windows系统下才发送通知
      if (type() === 'windows') {
        globalStore.setTipVisible(true)
      }

      if (WebviewWindow.getCurrent().label === 'mobile-home') {
        await emitTo('notify', 'notify_content', data)
      }
    }
  }

  await globalStore.updateGlobalUnreadCount()
})

/** 测试-结束 */

onMounted(async () => {
  await updateTabBarPosition(true)
})

// 这里要明确等待加载后再监听，不能写在全局作用域，如果窗口大小改变，则该参数会改变，所以需要监听
watch(
  () => mobileStore.safeArea,
  (newData) => {
    // 改变后需要更新tabbar的位置
    console.log('[layout watch] 安全区域改变了', newData)
    updateTabBarPosition(false)
  },
  {
    immediate: false
  }
)
</script>

<style lang="scss">
/* 侧滑切换动画 */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.1s ease;
}

.slide-enter-from {
  transform: translateX(-30px);
  opacity: 0;
}

.slide-leave-to {
  transform: translateX(30px);
  opacity: 0;
}
</style>

<template>
  <n-flex vertical :size="6" class="notify" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
    <n-flex align="center" :size="4" class="m-[8px_0_0_0] text-(12px) font-bold">
      <p>新消息</p>
      <p>·</p>
      <p>{{ msgCount }}</p>
    </n-flex>
    <component :is="division" />
    <n-scrollbar style="max-height: 320px">
      <n-flex
        v-for="(group, index) in content"
        :key="index"
        @click="handleClickMsg(group.id)"
        align="left"
        :size="10"
        class="mt-2px p-6px box-border rounded-8px hover:bg-[--tray-hover] cursor-pointer">
        <n-avatar round :size="44" :src="AvatarUtils.getAvatarUrl(group.avatar)" />

        <n-flex class="flex-1" vertical justify="center" :size="8">
          <span class="text-(16px [--text-color]) font-bold">{{ group.name }}</span>

          <n-flex class="w-full" align="center" justify="space-between" :size="10">
            <span class="max-w-150px truncate text-(12px [--text-color])">
              <span v-if="group.isAtMe" class="text-#d5304f pr-4px">[有人@我]</span>{{ group.latestContent }}
            </span>

            <!-- 有多少条消息 -->
            <div class="text-(10px #fff) rounded-full px-6px py-2px flex-center bg-#d5304f">
              {{ group.messageCount > 99 ? '99+' : group.messageCount }}
            </div>
          </n-flex>
        </n-flex>
      </n-flex>
    </n-scrollbar>
    <component :is="division" />
    <p @click="handleTip" class="pt-4px pl-6px text-(12px #13987f) cursor-pointer">忽略全部</p>
  </n-flex>
</template>
<script setup lang="tsx">
import { useGlobalStore } from '@/stores/global.ts'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { Event } from '@tauri-apps/api/event'
import { PhysicalPosition } from '@tauri-apps/api/dpi'
import { useWindow } from '@/hooks/useWindow.ts'
import { useTauriListener } from '@/hooks/useTauriListener'
import type { MessageType } from '@/services/types.ts'
import { useChatStore } from '@/stores/chat.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { useCommon } from '@/hooks/useCommon.ts'

// 定义分组消息的类型
type GroupedMessage = {
  id: string
  roomId: string
  latestContent: string
  messageCount: number
  avatar: string
  name: string
  timestamp: number
  isAtMe: boolean
}

const appWindow = WebviewWindow.getCurrent()
const { checkWinExist, resizeWindow } = useWindow()
const { openMsgSession, userUid } = useCommon()
const { pushListeners } = useTauriListener()
const globalStore = useGlobalStore()
const chatStore = useChatStore()
const { tipVisible } = storeToRefs(globalStore)
const isMouseInWindow = ref(false)
const content = ref<GroupedMessage[]>([])
const msgCount = ref(0)

// 监听 tipVisible 的变化，当它变为 false 时重置消息列表
watch(
  () => tipVisible.value,
  (newValue) => {
    if (!newValue) {
      content.value = []
      msgCount.value = 0
      // 重置窗口高度
      resizeWindow('notify', 280, 140)
    }
  }
)

const division = () => {
  return <div class={'h-1px bg-[--line-color] w-full'}></div>
}

// 检查是否@了当前用户
const checkIsAtMe = (content: MessageType) => {
  return content.message.body.atUidList?.includes(userUid.value)
}

// 处理点击消息的逻辑
const handleClickMsg = async (uid: string) => {
  // 打开消息页面
  await checkWinExist('home')
  await handleTip()
  openMsgSession(uid)
}

// 取消状态栏闪烁
const handleTip = async () => {
  globalStore.setTipVisible(false)
  await WebviewWindow.getCurrent().hide()
}

// 处理窗口显示和隐藏的逻辑
const showWindow = async (event: Event<any>) => {
  if (tipVisible.value) {
    const notifyWindow = await WebviewWindow.getCurrent()
    const outerSize = await notifyWindow?.outerSize()
    if (outerSize) {
      await notifyWindow?.setPosition(
        new PhysicalPosition(
          event.payload.position.Physical.x - 120,
          event.payload.position.Physical.y - outerSize.height
        )
      )
      await notifyWindow?.show()
      await notifyWindow?.unminimize()
      await notifyWindow?.setFocus()
      await notifyWindow?.setAlwaysOnTop(true)
    }
  }
}

const hideWindow = async () => {
  if (!isMouseInWindow.value) {
    const notifyWindow = await WebviewWindow.getCurrent()
    await notifyWindow?.hide()
  }
}

const handleMouseEnter = () => {
  console.log('Mouse enter')
  isMouseInWindow.value = true
}

const handleMouseLeave = async () => {
  console.log('Mouse leave')
  isMouseInWindow.value = false
  await hideWindow()
}

// 对消息进行排序的函数
const sortMessages = () => {
  content.value.sort((a, b) => {
    return b.timestamp - a.timestamp
  })
}

onBeforeMount(async () => {
  // 确保用户已登录并初始化会话列表
  await chatStore.getSessionList(true)
})

onMounted(async () => {
  // 初始化窗口高度
  resizeWindow('notify', 280, 140)

  await pushListeners([
    // 监听托盘鼠标进入事件
    appWindow.listen('notify_enter', async (event: Event<any>) => {
      await showWindow(event)
    }),

    // 监听托盘鼠标离开事件
    appWindow.listen('notify_leave', async () => {
      setTimeout(async () => {
        await hideWindow()
      }, 300)
    }),

    // 监听消息的内容
    appWindow.listen('notify_cotent', async (event: Event<MessageType>) => {
      if (tipVisible.value) {
        const message = event.payload
        const session = chatStore.sessionList.find((s) => s.roomId === message.message.roomId)
        const existingGroup = content.value.find((group) => group.roomId === message.message.roomId)
        const isAtMe = checkIsAtMe(message)
        const currentTime = Date.now()

        if (existingGroup) {
          // 如果该房间的消息已存在，更新最新内容和计数
          existingGroup.id = message.message.id
          existingGroup.latestContent = message.message.body.content
          existingGroup.messageCount++
          existingGroup.timestamp = currentTime
          existingGroup.isAtMe = isAtMe
          if (session) {
            existingGroup.avatar = session.avatar
            existingGroup.name = session.name
          }
        } else {
          // 如果是新的房间，创建新的分组
          content.value.push({
            id: message.message.id,
            roomId: message.message.roomId,
            latestContent: message.message.body.content,
            messageCount: 1,
            avatar: session?.avatar || '',
            name: session?.name || '',
            timestamp: currentTime,
            isAtMe: isAtMe
          })

          // 调整窗口高度，基础高度140，从第二个分组开始每组增加60px，最多4个分组
          const baseHeight = 140
          const groupCount = content.value.length
          const additionalHeight = Math.min(Math.max(groupCount - 1, 0), 3) * 60
          const newHeight = baseHeight + additionalHeight
          resizeWindow('notify', 280, newHeight)
        }

        // 对消息进行排序
        sortMessages()

        msgCount.value = content.value.reduce((acc, group) => acc + group.messageCount, 0)
        console.log('Grouped messages:', content.value)
      }
    })
  ])
})
</script>
<style scoped lang="scss">
.notify {
  @apply bg-[--center-bg-color] size-full p-8px box-border select-none text-[--text-color] text-12px;
}
</style>

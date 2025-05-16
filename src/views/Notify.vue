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
        @click="handleClickMsg(group)"
        align="left"
        :size="10"
        class="mt-2px p-6px box-border rounded-8px hover:bg-[--tray-hover] cursor-pointer">
        <n-avatar round :size="44" :src="AvatarUtils.getAvatarUrl(group.avatar)" />

        <n-flex class="flex-1" vertical justify="center" :size="8">
          <span class="text-(16px [--text-color]) font-bold">{{ group.name }}</span>

          <n-flex class="w-full" align="center" justify="space-between" :size="10">
            <span class="max-w-150px truncate text-(12px [--text-color])">
              <template v-if="group.isAtMe">
                <span
                  class="text flex-1 leading-tight text-12px truncate"
                  v-html="group.latestContent.replace(':', '：')" />
              </template>
              <template v-else>
                <span
                  class="text flex-1 leading-tight text-12px truncate"
                  v-text="group.latestContent.replace(':', '：')" />
              </template>
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
import { emitTo, Event, listen } from '@tauri-apps/api/event'
import { PhysicalPosition } from '@tauri-apps/api/dpi'
import { RoomTypeEnum } from '@/enums'
import { useWindow } from '@/hooks/useWindow.ts'
import { useTauriListener } from '@/hooks/useTauriListener'
import type { MessageType } from '@/services/types.ts'
import { useChatStore } from '@/stores/chat.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { useReplaceMsg } from '@/hooks/useReplaceMsg.ts'

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
  top?: boolean // 添加置顶状态属性
  roomType: number // 房间类型：1=群聊，2=单聊
}

const appWindow = WebviewWindow.getCurrent()
const { checkWinExist, resizeWindow } = useWindow()
const { pushListeners } = useTauriListener()
const { checkMessageAtMe } = useReplaceMsg()
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

// 处理点击消息的逻辑
// TODO: 会导致频控触发
const handleClickMsg = async (group: any) => {
  // 打开消息页面
  await checkWinExist('home')
  // 找到对应的会话 - 根据roomId而不是消息ID
  const session = chatStore.sessionList.find((s) => s.roomId === group.roomId)
  if (session) {
    // 获取home窗口实例
    const home = await WebviewWindow.getByLabel('home')

    // 如果当前不在消息页面且在home窗口，则跳转到消息页面
    await home?.setFocus()
    emitTo('home', 'search_to_msg', {
      uid: group.roomType === RoomTypeEnum.SINGLE ? session.id : session.roomId,
      roomType: group.roomType
    })
    // 收起通知面板
    await handleTip()
  } else {
    console.error('找不到对应的会话信息')
  }
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
          event.payload.position.Physical.y - outerSize.height + 8
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

// 对消息进行排序的函数 - 现在直接写在事件处理中

onBeforeMount(async () => {
  // 确保用户已登录并初始化会话列表
  await chatStore.getSessionList(true)
})

onMounted(async () => {
  // 初始化窗口高度
  resizeWindow('notify', 280, 140)

  // 监听全局事件，以及本地窗口事件
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

    // 监听隐藏通知的事件，当主窗口获得焦点时触发
    appWindow.listen('hide_notify', async () => {
      // 隐藏所有通知并关闭窗口
      await handleTip()
    })
  ])

  // 使用全局事件监听器接收通知消息
  const contentEventUnlisten = listen('notify_cotent', async (event: Event<MessageType>) => {
    if (event.payload) {
      // 窗口显示将由notify_enter事件触发

      // 处理消息内容
      const msg = event.payload
      const session = chatStore.sessionList.find((s) => s.roomId === msg.message.roomId)
      const existingGroup = content.value.find((group) => group.roomId === msg.message.roomId)

      // 使用useReplaceMsg处理消息内容
      const { formatMessageContent, getMessageSenderName } = useReplaceMsg()
      const isAtMe = checkMessageAtMe(msg)
      const currentTime = Date.now()

      // 获取发送者信息
      const senderName = getMessageSenderName(msg, session?.name || '')

      // 格式化消息内容
      const formattedContent = formatMessageContent(msg, session?.type || RoomTypeEnum.GROUP, senderName, isAtMe)

      // 获取会话中已有的未读消息数量（排除已在通知中计算过的）
      let unreadCount = 0
      if (session && !existingGroup) {
        unreadCount = session.unreadCount || 0
      }

      if (existingGroup) {
        // 如果该房间的消息已存在，更新最新内容和计数
        existingGroup.id = msg.message.id
        existingGroup.latestContent = formattedContent
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
          id: msg.message.id,
          roomId: msg.message.roomId,
          latestContent: formattedContent,
          messageCount: 1 + unreadCount, // 加上已有的未读消息数量
          avatar: session?.avatar || '',
          name: session?.name || '',
          timestamp: currentTime,
          isAtMe: isAtMe,
          // 添加房间类型，从session中获取，如果没有则默认为私聊类型
          roomType: session?.type || RoomTypeEnum.SINGLE
        })

        // 调整窗口高度，基础高度140，从第二个分组开始每组增加60px，最多4个分组
        const baseHeight = 140
        const groupCount = content.value.length
        const additionalHeight = Math.min(Math.max(groupCount - 1, 0), 3) * 60
        const newHeight = baseHeight + additionalHeight
        resizeWindow('notify', 280, newHeight)
      }

      // 对消息进行排序 - 先按置顶状态排序，再按活跃时间排序
      content.value.sort((a, b) => {
        // 1. 先按置顶状态排序（置顶的排在前面）
        if (a.top && !b.top) return -1
        if (!a.top && b.top) return 1

        // 2. 在相同置顶状态下，按时间戳降序排序（最新的排在前面）
        return b.timestamp - a.timestamp
      })

      msgCount.value = content.value.reduce((acc, group) => acc + group.messageCount, 0)
    }
  })

  // 添加到监听器列表以便在组件卸载时自动清理
  await pushListeners([contentEventUnlisten])
})
</script>
<style scoped lang="scss">
.notify {
  @apply bg-[--center-bg-color] size-full p-8px box-border select-none text-[--text-color] text-12px;
}
</style>

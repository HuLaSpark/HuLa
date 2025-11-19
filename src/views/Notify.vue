<template>
  <n-flex vertical :size="6" class="notify" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
    <n-flex align="center" :size="4" class="m-[8px_0_0_0] text-(12px)">
      <p>新消息</p>
      <p>·</p>
      <p>{{ msgCount }}</p>
    </n-flex>
    <component :is="division" />
    <n-scrollbar style="max-height: 320px">
      <n-flex
        v-for="group in content"
        :key="group.id"
        v-memo="[group.id, group.messageCount, group.latestContent, group.isAtMe, group.name, group.avatar]"
        @click="handleClickMsg(group)"
        align="left"
        :size="10"
        class="mt-2px p-6px box-border rounded-8px hover:bg-[--tray-hover] cursor-pointer">
        <n-avatar round :size="44" :src="AvatarUtils.getAvatarUrl(group.avatar)" />

        <n-flex class="flex-1" vertical justify="center" :size="8">
          <span class="text-(16px [--text-color])">{{ group.name }}</span>

          <n-flex class="w-full" align="center" justify="space-between" :size="10">
            <span class="max-w-150px truncate text-(12px [--text-color])">
              <template v-if="group.isAtMe">
                <span class="text flex-1 leading-tight text-12px truncate">
                  <span class="text-#d5304f mr-4px">[有人@我]</span>
                  <span>{{ group.latestContent.replace(':', '：') }}</span>
                </span>
              </template>
              <template v-else>
                <span class="text flex-1 leading-tight text-12px truncate">
                  {{ group.latestContent.replace(':', '：') }}
                </span>
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
import { PhysicalPosition } from '@tauri-apps/api/dpi'
import { type Event, emitTo } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { info } from '@tauri-apps/plugin-log'
import { useDebounceFn } from '@vueuse/core'
import { sumBy } from 'es-toolkit'
import { RoomTypeEnum } from '@/enums'
import { useReplaceMsg } from '@/hooks/useReplaceMsg.ts'
import { useWindow } from '@/hooks/useWindow.ts'
import type { MessageType } from '@/services/types.ts'
import { useChatStore } from '@/stores/chat.ts'
import { useGlobalStore } from '@/stores/global.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { isWindows } from '@/utils/PlatformConstants'

// import { useTauriListener } from '../hooks/useTauriListener'

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
// const { addListener } = useTauriListener()
const { checkMessageAtMe } = useReplaceMsg()
const globalStore = useGlobalStore()
const chatStore = useChatStore()
const { tipVisible } = storeToRefs(globalStore)
const isMouseInWindow = ref(false)
const content = ref<GroupedMessage[]>([])
const msgCount = ref(0)
let homeFocusUnlisten: (() => void) | null = null
let homeBlurUnlisten: (() => void) | null = null

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
    info(`点击消息，打开会话：${JSON.stringify(session)}`)
    emitTo('home', 'search_to_msg', {
      uid: group.roomType === RoomTypeEnum.SINGLE ? session.detailId : session.roomId,
      roomType: group.roomType
    })
    // 收起通知面板
    await debouncedHandleTip()
  } else {
    console.error('找不到对应的会话信息')
  }
}

// 取消状态栏闪烁
const handleTip = async () => {
  globalStore.setTipVisible(false)
  // 取消窗口置顶
  await appWindow?.setAlwaysOnTop(false)

  // 隐藏窗口
  await appWindow?.hide()

  // 清空消息内容
  content.value = []
  msgCount.value = 0

  // 重置窗口高度
  resizeWindow('notify', 280, 140)
}

const debouncedHandleTip = useDebounceFn(handleTip, 100)

// 处理窗口显示和隐藏的逻辑
const showWindow = async (event: Event<any>) => {
  if (tipVisible.value) {
    const notifyWindow = WebviewWindow.getCurrent()
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

// TODO 在托盘图标闪烁的时候鼠标移动到null的图标上的时候会导致Notify窗口消失或者直接不显示Notify，即使已经移动到Notify了也会消失。
onMounted(async () => {
  // 初始化窗口高度
  resizeWindow('notify', 280, 140)

  if (isWindows()) {
    appWindow.listen('notify_enter', async (event: Event<any>) => {
      info('监听到enter事件，打开notify窗口')
      await showWindow(event)
    })

    appWindow.listen('notify_leave', async () => {
      setTimeout(async () => {
        await hideWindow()
      }, 300)
    })

    appWindow.listen('hide_notify', async () => {
      // 只有在tipVisible为true时才需要处理
      if (tipVisible.value) {
        await handleTip()
      }
    })

    appWindow.listen('notify_content', async (event: Event<MessageType>) => {
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
        const senderName = getMessageSenderName(
          msg,
          session?.name || '',
          session?.roomId || msg.message.roomId,
          session?.type
        )

        // 格式化消息内容
        const formattedContent = formatMessageContent(
          msg,
          session?.type || RoomTypeEnum.GROUP,
          senderName,
          session?.roomId || msg.message.roomId
        )

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
          // 使用会话的未读消息数量（当前收到的消息已经包含在 unreadCount 中）
          const messageCount = session?.unreadCount || 1

          content.value.push({
            id: msg.message.id,
            roomId: msg.message.roomId,
            latestContent: formattedContent,
            messageCount: messageCount,
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

        msgCount.value = sumBy(content.value, (group) => group.messageCount)
      }
    })

    homeFocusUnlisten = await appWindow.listen('home_focus', async () => {
      if (tipVisible.value) {
        await handleTip()
      } else {
        await hideWindow()
      }
    })

    homeBlurUnlisten = await appWindow.listen('home_blur', () => {
      // 保留占位，未来若需要在失焦时处理逻辑可扩展
    })
  }
})

onUnmounted(() => {
  if (homeFocusUnlisten) {
    homeFocusUnlisten()
    homeFocusUnlisten = null
  }
  if (homeBlurUnlisten) {
    homeBlurUnlisten()
    homeBlurUnlisten = null
  }
})
</script>
<style scoped lang="scss">
.notify {
  @apply bg-[--center-bg-color] size-full p-8px box-border select-none text-[--text-color] text-12px;
}
</style>

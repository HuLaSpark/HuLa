<template>
  <div class="flex flex-col h-full">
    <!-- 顶部安全区域占位元素 -->
    <SafeAreaPlaceholder type="layout" direction="top" />

    <img src="@/assets/mobile/chat-home/background.webp" class="w-100% fixed top-0" alt="hula" />

    <!-- 页面蒙板 -->
    <div
      v-if="showMask"
      @touchend="maskHandler.close"
      @click="maskHandler.close"
      class="fixed inset-0 bg-black/20 backdrop-blur-sm z-[999] transition-all duration-3000 ease-in-out opacity-100"></div>

    <!-- 键盘蒙板 -->
    <div
      v-if="showKeyboardMask"
      class="keyboard-mask flex-1"
      @touchstart.stop.prevent="closeKeyboardMask"
      @click.stop.prevent="closeKeyboardMask"></div>

    <NavBar>
      <template #left>
        <n-flex @click="toSimpleBio" align="center" :size="6" class="w-full">
          <n-avatar
            :size="38"
            :src="AvatarUtils.getAvatarUrl(userStore.userInfo!.avatar!)"
            fallback-src="/logo.png"
            round />

          <n-flex vertical justify="center" :size="6">
            <p
              style="
                font-weight: bold !important;
                font-family:
                  system-ui,
                  -apple-system,
                  sans-serif;
              "
              class="text-(16px [--text-color])">
              {{ userStore.userInfo!.name }}
            </p>
            <p class="text-(10px [--text-color])">
              {{ groupStore.getUserInfo(userStore.userInfo!.uid)?.locPlace || '未知' }}
            </p>
          </n-flex>
        </n-flex>
      </template>

      <template #right>
        <n-dropdown
          @on-clickoutside="addIconHandler.clickOutside"
          @select="addIconHandler.select"
          trigger="click"
          :show-arrow="true"
          :options="uiViewsData.addOptions">
          <svg @click="addIconHandler.open" class="size-22px bg-white p-5px rounded-8px">
            <use href="#plus"></use>
          </svg>
        </n-dropdown>
      </template>
    </NavBar>

    <div class="px-16px mt-5px">
      <div class="py-5px shrink-0">
        <n-input
          id="search"
          class="rounded-6px w-full bg-white relative text-12px"
          :maxlength="20"
          clearable
          spellCheck="false"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          placeholder="搜索"
          @focus="lockScroll"
          @blur="unlockScroll">
          <template #prefix>
            <svg class="w-12px h-12px"><use href="#search"></use></svg>
          </template>
        </n-input>
      </div>
      <div class="border-b-1 border-solid color-gray-200 px-18px mt-5px"></div>
    </div>

    <PullToRefresh class="flex-1 overflow-auto" @refresh="handleRefresh" ref="pullRefreshRef">
      <div class="flex flex-col h-full px-18px">
        <div class="flex-1">
          <div
            v-for="(item, idx) in sessionList"
            :key="`${item.id}-${idx}`"
            @click="intoRoom(item)"
            @dblclick="handleMsgDblclick(item)"
            class="grid grid-cols-[2.2rem_1fr_4rem] items-start px-2 py-3 gap-1">
            <!-- 头像：单独居中 -->
            <div class="flex-shrink-0">
              <n-badge :offset="[-6, 6]" :value="item.unreadCount" :max="99">
                <n-avatar :size="52" :src="AvatarUtils.getAvatarUrl(item.avatar)" fallback-src="/logo.png" round />
              </n-badge>
            </div>
            <!-- 中间：两行内容 -->
            <div class="truncate pl-7 flex pt-5px gap-10px flex-col">
              <div class="text-16px leading-tight font-bold flex-1 truncate text-#333 truncate">{{ item.name }}</div>
              <div class="text-12px text-#333 truncate">
                {{ item.text }}
              </div>
            </div>

            <!-- 时间：靠顶 -->
            <div class="text-12px pt-9px text-right flex gap-1 items-center justify-right">
              <span v-if="item.hotFlag === IsAllUserEnum.Yes">
                <svg class="size-22px select-none outline-none cursor-pointer color-#13987f">
                  <use href="#auth"></use>
                </svg>
              </span>
              <span class="text-#555">
                {{ formatTimestamp(item?.activeTime) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </PullToRefresh>
  </div>
</template>

<script setup lang="ts">
import PullToRefresh from '#/components/PullToRefresh.vue'
import SafeAreaPlaceholder from '#/components/placeholders/SafeAreaPlaceholder.vue'
import NavBar from '#/layout/navBar/index.vue'
import type { IKeyboardDidShowDetail } from '#/mobile-client/interface/adapter'
import { mobileClient } from '#/mobile-client/MobileClient'
import addFriendIcon from '@/assets/mobile/chat-home/add-friend.webp'
import groupChatIcon from '@/assets/mobile/chat-home/group-chat.webp'
import { RoomTypeEnum } from '@/enums'
import { useMessage } from '@/hooks/useMessage.ts'
import { useReplaceMsg } from '@/hooks/useReplaceMsg'
import { IsAllUserEnum } from '@/services/types.ts'
import rustWebSocketClient from '@/services/webSocketRust'
import { useChatStore } from '@/stores/chat.ts'
import { useGlobalStore } from '@/stores/global'
import { useGroupStore } from '@/stores/group'
import { useUserStore } from '@/stores/user.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { formatTimestamp } from '@/utils/ComputedTime.ts'

const groupStore = useGroupStore()

// 新代码
const globalStore = useGlobalStore()

// 会话列表 TODO: 需要后端返回对应字段
const sessionList = computed(() => {
  return (
    chatStore.sessionList
      .map((item) => {
        // 获取最新的头像
        let latestAvatar = item.avatar
        if (item.type === RoomTypeEnum.SINGLE && item.id) {
          latestAvatar = groupStore.getUserInfo(item.id)?.avatar || item.avatar
        }

        // 获取群聊备注名称（如果有）
        let displayName = item.name
        if (item.type === RoomTypeEnum.GROUP && item.remark) {
          // 使用群组备注（如果存在）
          displayName = item.remark
        }

        const { checkRoomAtMe, getMessageSenderName, formatMessageContent } = useReplaceMsg()
        // 获取该会话的所有消息用于检查@我
        const messages = chatStore.chatMessageListByRoomId(item.roomId)
        // 检查是否有@我的消息
        const isAtMe = checkRoomAtMe(
          item.roomId,
          item.type,
          globalStore.currentSession?.roomId!,
          messages,
          item.unreadCount
        )

        // 处理显示消息
        let displayMsg = ''

        const lastMsg = messages[messages.length - 1]
        if (lastMsg) {
          const senderName = getMessageSenderName(lastMsg, '', item.roomId)
          displayMsg = formatMessageContent(lastMsg, item.type, senderName, isAtMe)
        }

        return {
          ...item,
          avatar: latestAvatar,
          name: displayName, // 使用可能修改过的显示名称
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
// 新代码结束

const chatStore = useChatStore()

const pullRefreshRef = ref()

const getSessionList = async () => {
  await chatStore.getSessionList(true)
}

const userStore = useUserStore()

/**
 * export interface IKeyboardDidShowDetail {
   bottomInset: number
   height: number
   keyboardVisible: boolean
   screenHeight: number
   timestamp: number
   visibleHeight: number
 }

 */

onMounted(async () => {
  await rustWebSocketClient.setupBusinessMessageListeners()
  console.log('个人数据：', userStore.userInfo)
  getSessionList()

  const { removeHideFunction, removeShowFunction } = await mobileClient.keyboardListener(
    // 键盘打开
    (detail: IKeyboardDidShowDetail) => {
      console.log('键盘打开', detail)
      openKeyboardMask()
    },
    // 键盘关闭
    () => {
      console.log('键盘关闭')
      closeKeyboardMask()
    }
  )

  // 如果需要在组件卸载时移除监听
  onBeforeUnmount(() => {
    removeHideFunction()
    removeShowFunction()
  })
})

const handleRefresh = async () => {
  await getSessionList()
  // 完成刷新
  pullRefreshRef.value?.finishRefresh()
}

/**
 * 渲染图片图标的函数工厂
 * @param {string} src - 图标图片路径
 * @returns {() => import('vue').VNode} 返回一个渲染图片的函数组件
 */
const renderImgIcon = (src: string) => {
  return () =>
    h('img', {
      src,
      style: 'display:block; width: 26px; height: 26px; vertical-align: middle;'
    })
}

/**
 * UI 视图数据，包含菜单选项及其图标
 * @type {import('vue').Ref<{ addOptions: { label: string; key: string; icon: () => import('vue').VNode }[] }>}
 */
const uiViewsData = ref({
  addOptions: [
    {
      label: '发起群聊',
      key: '/mobile/mobileFriends/startGroupChat',
      icon: renderImgIcon(groupChatIcon)
    },
    {
      label: '加好友/群',
      key: '/mobile/mobileFriends/addFriends',
      icon: renderImgIcon(addFriendIcon)
    }
  ]
})

/**
 * 页面蒙板显示状态
 * @type {import('vue').Ref<boolean>}
 */
const showMask = ref(false)

/**
 * 当前页面滚动的纵向位置，避免打开蒙板时页面跳动
 * @type {number}
 */
let scrollY = 0

/**
 * 控制页面蒙板的对象，包含打开和关闭方法
 */
const maskHandler = {
  /**
   * 打开蒙板，并锁定滚动位置
   */
  open: () => {
    scrollY = window.scrollY
    showMask.value = true
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
  },

  /**
   * 关闭蒙板，恢复滚动状态和位置
   */
  close: () => {
    setTimeout(() => {
      showMask.value = false
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.scrollTo(0, scrollY) // 恢复滚动位置
    }, 200)
  }
}

/**
 * 添加按钮相关事件处理对象
 */
const addIconHandler = {
  /**
   * 选项选择时关闭蒙板
   */
  select: (item: string) => {
    console.log('选择的项：', item)
    router.push(item)
    maskHandler.close()
  },

  /**
   * 点击加号按钮打开蒙板
   */
  open: () => {
    maskHandler.open()
  },

  /**
   * 点击下拉菜单外部区域关闭蒙板
   */
  clickOutside: () => {
    maskHandler.close()
  }
}

const router = useRouter()

const { handleMsgClick, handleMsgDblclick } = useMessage()

const intoRoom = (item: any) => {
  handleMsgClick(item)
  setTimeout(() => {
    router.push(`/mobile/chatRoom/chatMain`)
    console.log('进入页面', item)
  }, 0)
}
const toSimpleBio = () => {
  // 切成你想要的离场动画
  router.push('/mobile/mobileMy/simpleBio')
}

// 锁滚动（和蒙板一样）
const lockScroll = () => {
  console.log('锁定触发')
  const scrollEl = document.querySelector('.flex-1.overflow-auto') as HTMLElement
  if (scrollEl) {
    scrollEl.style.overflow = 'hidden'
  }
}

const unlockScroll = () => {
  console.log('锁定解除')
  const scrollEl = document.querySelector('.flex-1.overflow-auto') as HTMLElement
  if (scrollEl) {
    scrollEl.style.overflow = 'auto'
  }
}

// 键盘蒙板显示状态
const showKeyboardMask = ref(false)

const openKeyboardMask = () => {
  showKeyboardMask.value = true
  document.body.style.overflow = 'hidden'
  document.body.style.position = 'fixed'
}

const closeKeyboardMask = () => {
  showKeyboardMask.value = false
  document.body.style.overflow = ''
  document.body.style.position = ''
  // 让 input 失焦
  const activeEl = document.activeElement as HTMLElement
  if (activeEl && typeof activeEl.blur === 'function') {
    activeEl.blur()
  }
}
</script>

<style scoped lang="scss">
// .message-item {
//   @apply flex justify-around items-center p-3 hover:bg-#DEEDE7 hover:rounded-10px transition-colors cursor-pointer;
// }

.keyboard-mask {
  position: fixed;
  inset: 0;
  background: transparent; // 透明背景
  z-index: 1400; // 低于 Naive 弹层，高于页面内容
  pointer-events: auto; // 确保能接收事件
  touch-action: none; // 禁止滚动
}

::deep(#search) {
  position: relative;
  z-index: 1500; // 高于键盘蒙层，低于 Naive 弹层
}
</style>

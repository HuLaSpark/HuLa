<template>
  <div class="flex flex-col h-full">
    <!-- 顶部安全区域占位元素 -->
    <SafeAreaPlaceholder type="layout" direction="top" />

    <img src="@/assets/mobile/chat-home/background.webp" class="w-100% fixed top-0" alt="hula" />

    <!-- 页面蒙板 -->
    <div
      v-if="showMask"
      @touchend="maskHandler.close"
      @mouseup="maskHandler.close"
      :class="[
        longPressState.longPressActive
          ? ''
          : 'bg-black/20 backdrop-blur-sm transition-all duration-3000 ease-in-out opacity-100'
      ]"
      class="fixed inset-0 z-[999]"></div>

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
            :src="AvatarUtils.getAvatarUrl(userStore.userInfo?.avatar ? userStore.userInfo.avatar : '/logoD.png')"
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
              {{ userStore.userInfo?.name ? userStore.userInfo.name : '无名字' }}
            </p>
            <p class="text-(10px [--text-color])">
              {{
                userStore.userInfo?.uid ? groupStore.getUserInfo(userStore.userInfo!.uid)?.locPlace || '中国' : '中国'
              }}
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
            <svg class="w-12px h-12px">
              <use href="#search"></use>
            </svg>
          </template>
        </n-input>
      </div>
      <div class="border-b-1 border-solid color-gray-200 px-18px mt-5px"></div>
    </div>

    <van-pull-refresh
      class="h-full"
      :pull-distance="100"
      :disabled="!isEnablePullRefresh"
      v-model="loading"
      @refresh="onRefresh">
      <div class="flex flex-col h-full px-18px">
        <div class="flex-1 overflow-auto" @scroll.prevent="onScroll" ref="scrollContainer">
          <van-swipe-cell
            @open="handleSwipeOpen"
            @close="handleSwipeClose"
            v-for="(item, idx) in sessionList"
            v-on-long-press="[(e: PointerEvent) => handleLongPress(e, item), longPressOption]"
            :key="`${item.id}-${idx}`"
            :class="item.top ? 'bg-gray-200' : ''">
            <!-- 长按项 -->
            <div @click="intoRoom(item)" class="grid grid-cols-[2.2rem_1fr_4rem] items-start px-2 py-3 gap-1">
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
            <template #right>
              <div class="flex w-auto flex-wrap h-full">
                <div
                  class="h-full text-14px w-80px bg-#13987f text-white flex items-center justify-center"
                  @click="handleToggleTop(item)">
                  {{ item.top ? '取消置顶' : '置顶' }}
                </div>
                <div
                  class="h-full text-14px w-80px bg-red text-white flex items-center justify-center"
                  @click="handleDelete(item)">
                  删除
                </div>
              </div>
            </template>
          </van-swipe-cell>
        </div>
      </div>
    </van-pull-refresh>

    <teleport to="body">
      <div
        v-if="longPressState.showLongPressMenu"
        :style="{ top: longPressState.longPressMenuTop + 'px' }"
        class="fixed gap-10px z-999 left-1/2 transform -translate-x-1/2">
        <div class="flex justify-between p-[8px_15px_8px_15px] text-14px gap-10px rounded-10px bg-#4e4e4e">
          <div class="text-white" @click="handleDelete(currentLongPressItem)">删除</div>
          <div class="text-white" @click="handleToggleTop(currentLongPressItem)">
            {{ currentLongPressItem?.top ? '取消置顶' : '置顶' }}
          </div>
          <div class="text-white" @click="handleMarkUnread">未读</div>
        </div>
        <div class="flex w-full justify-center h-15px">
          <svg width="35" height="13" viewBox="0 0 35 13">
            <path
              d="M0 0
           Q17.5 5 17.5 12
           Q17.5 13 18.5 13
           Q17.5 13 17.5 12
           Q17.5 5 35 0
           Z"
              fill="#4e4e4e" />
          </svg>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { debounce, throttle } from 'lodash-es'
import SafeAreaPlaceholder from '#/components/placeholders/SafeAreaPlaceholder.vue'
import NavBar from '#/layout/navBar/index.vue'
import type { IKeyboardDidShowDetail } from '#/mobile-client/interface/adapter'
import { mobileClient } from '#/mobile-client/MobileClient'
import addFriendIcon from '@/assets/mobile/chat-home/add-friend.webp'
import groupChatIcon from '@/assets/mobile/chat-home/group-chat.webp'
import { RoomTypeEnum } from '@/enums'
import { useMessage } from '@/hooks/useMessage.ts'
import { useReplaceMsg } from '@/hooks/useReplaceMsg'
import { IsAllUserEnum, type SessionItem } from '@/services/types.ts'
import rustWebSocketClient from '@/services/webSocketRust'
import { useChatStore } from '@/stores/chat.ts'
import { useGlobalStore } from '@/stores/global'
import { useGroupStore } from '@/stores/group'
import { useUserStore } from '@/stores/user.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { formatTimestamp } from '@/utils/ComputedTime.ts'
import { vOnLongPress } from '@vueuse/components'
import { setSessionTop } from '@/utils/ImRequestUtils'

const loading = ref(false)
const count = ref(0)
const currentLongPressItem = ref<SessionItem | null>(null)
const groupStore = useGroupStore()
const chatStore = useChatStore()
const userStore = useUserStore()
const globalStore = useGlobalStore()

// 加载更多ui事件处理（开始）

const isEnablePullRefresh = ref(true) // 是否启用下拉刷新，现在设置为滚动到顶才启用
const scrollContainer = ref(null) // 消息滚动容器

let scrollTop = 0 // 记住当前滑动到哪了

const enablePullRefresh = debounce((top: number) => {
  isEnablePullRefresh.value = top === 0
}, 100)

const disablePullRefresh = throttle(() => {
  isEnablePullRefresh.value = false
}, 200)

const onScroll = (e: any) => {
  scrollTop = e.target.scrollTop
  if (scrollTop < 100) {
    enablePullRefresh(scrollTop)
  } else {
    disablePullRefresh()
  }
}

// 加载更多ui事件处理（结束）

const longPressState = ref({
  showLongPressMenu: false,
  longPressMenuTop: 0,
  longPressActive: false,
  // 禁用所有事件
  enable: () => {
    // 设置长按激活状态
    longPressState.value.longPressActive = true
    disablePullRefresh()
  },

  disable: () => {
    longPressState.value.showLongPressMenu = false
    longPressState.value.longPressMenuTop = 0
    longPressState.value.longPressActive = false
    isEnablePullRefresh.value = true
    enablePullRefresh(scrollTop)
  }
})

const allUserMap = computed(() => {
  const map = new Map<string, any>() // User 是你定义的用户类型
  groupStore.allUserInfo.forEach((user) => {
    map.set(user.uid, user)
  })
  return map
})

// 会话列表
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

// 删除会话
const handleDelete = async (item: SessionItem | null) => {
  if (!item) return

  try {
    await handleMsgDelete(item.roomId)
  } catch (error) {
    console.error('删除会话失败:', error)
  } finally {
    maskHandler.close()
  }
}

// 置顶/取消置顶
const handleToggleTop = async (item: SessionItem | null) => {
  if (!item) return

  try {
    const newTopState = !item.top

    await setSessionTop({
      roomId: item.roomId,
      top: newTopState
    })

    // 更新本地会话状态
    chatStore.updateSession(item.roomId, { top: newTopState })
  } catch (error) {
    console.error('置顶操作失败:', error)
  } finally {
    maskHandler.close()
  }
}

// 标记未读
const handleMarkUnread = async () => {
  if (!currentLongPressItem.value) return

  try {
    const item = currentLongPressItem.value

    // 重置未读计数为1
    chatStore.updateSession(item.roomId, {
      unreadCount: 1
    })

    // 更新全局未读计数
    globalStore.updateGlobalUnreadCount()

    window.$message.success('已标记为未读')
  } catch (error) {
    window.$message.error('标记未读失败')
    console.error('标记未读失败:', error)
  } finally {
    maskHandler.close()
  }
}

const onRefresh = () => {
  // 如果没到0.5秒就延迟0.5秒，如果接口执行时间超过0.5秒那就以getSessionList时间为准
  loading.value = true
  count.value++

  const apiPromise = chatStore.getSessionList(true)
  const delayPromise = new Promise((resolve) => setTimeout(resolve, 500))

  Promise.all([apiPromise, delayPromise])
    .then(([res]) => {
      // 接口和延时都完成后执行
      loading.value = false
      console.log('刷新完成', res)
    })
    .catch((error) => {
      loading.value = false
      console.log('刷新会话列表失败：', error)
    })
}

onMounted(async () => {
  await rustWebSocketClient.setupBusinessMessageListeners()

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

// 页面蒙板相关处理（开始）

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
    const closeModal = () => {
      showMask.value = false
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.scrollTo(0, scrollY) // 恢复滚动位置
    }

    setTimeout(closeModal, 60)

    longPressState.value.disable()
  }
}

// 页面蒙板相关处理（结束）

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
const { handleMsgClick, handleMsgDelete } = useMessage()

// 阻止消息的点击事件，为false时不阻止
let preventClick = false

const handleSwipeOpen = () => {
  preventClick = true
}

const handleSwipeClose = () => {
  preventClick = false
}

const intoRoom = (item: any) => {
  if (longPressState.value.longPressActive) {
    return
  }

  if (preventClick) {
    return
  }

  handleMsgClick(item)
  const foundedUser = allUserMap.value.get(item.detailId)

  setTimeout(() => {
    // 如果找到用户，就表示该会话属于好友，那就传入好友的uid;同时排除id为1的hula小管家
    if (foundedUser && foundedUser.uid !== '1') {
      router.push({
        name: 'mobileChatMain',
        params: {
          uid: item.detailId
        }
      })
    } else {
      router.push({
        name: 'mobileChatMain'
      })
    }
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

// 长按事件处理（开始）

const longPressOption = ref({
  delay: 200,
  modifiers: {
    prevent: true,
    stop: true
  },
  reset: true,
  windowResize: true,
  windowScroll: true,
  immediate: true,
  updateTiming: 'sync'
})

const handleLongPress = (e: PointerEvent, item: SessionItem) => {
  const latestItem = chatStore.sessionList.find((session) => session.roomId === item.roomId)
  if (!latestItem) return

  currentLongPressItem.value = latestItem

  e.stopPropagation()

  maskHandler.open()

  longPressState.value.enable()

  // 设置长按菜单top值
  const setLongPressMenuTop = () => {
    const target = e.target as HTMLElement

    if (!target) {
      return
    }

    const currentTarget = target.closest('.grid') // 向上找父级，找到grid就停止

    if (!currentTarget) {
      return
    }

    const rect = currentTarget.getBoundingClientRect()

    longPressState.value.longPressMenuTop = rect.top - rect.height / 3
  }

  setLongPressMenuTop()

  longPressState.value.showLongPressMenu = true // 显示长按菜单
}

// 长按事件处理（结束）
</script>

<style scoped lang="scss">
.van-swipe-cell {
  width: 100%;
  transition: background-color 0.3s ease;

  /* 置顶时的背景色 - 新设计 */
  &.bg-gray-200 {
    background-color: #f0f7ff; /* 柔和的浅蓝色背景 */
    border-left: 4px solid #1890ff; /* 左侧蓝色标识条 */

    /* 右侧操作按钮的背景色 */
    :deep() .van-swipe-cell__right {
      background-color: #f0f7ff;
    }

    /* 悬停效果 */
    &:hover {
      background-color: #e1efff;
    }
  }
}

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

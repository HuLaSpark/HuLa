<template>
  <div class="absolute-x-center top-20px" v-if="!messageOptions?.isLoading && chatMessageList?.length === 0">
    <span v-if="chatStore.isGroup" class="text-(14px #909090)">暂无消息，快来发送第一条消息吧~</span>
    <span v-else class="text-(14px #909090)">你们已成功添加为好友，现在可以开始聊天了!</span>
  </div>
  <n-flex justify="center" class="absolute-x-center top-10px" v-if="messageOptions?.isLoading">
    <img class="size-16px" src="@/assets/img/loading-one.svg" alt="" />
    <span class="text-(14px #909090)">加载中</span>
  </n-flex>
  <!-- 中间聊天内容(使用虚拟列表) -->
  <n-virtual-list
    id="image-chat-main"
    ref="virtualListInst"
    @scroll="handleScroll($event)"
    style="max-height: calc(100vh - 260px)"
    :class="{ 'right-1px': activeItem.type === RoomTypeEnum.SINGLE }"
    class="relative h-100vh"
    ignore-item-resize
    item-resizable
    :padding-top="10"
    :item-size="itemSize"
    :items="chatMessageList">
    <template #default="{ item, index }">
      <n-flex
        vertical
        :key="index"
        class="flex-y-center"
        :class="[
          item.message.type === MsgEnum.RECALL ? 'min-h-22px' : 'min-h-62px',
          chatStore.isGroup ? 'p-[14px_20px]' : 'chat-single p-[4px_20px_10px_20px]',
          { 'active-reply': activeReply === item.message.id }
        ]">
        <!-- 信息间隔时间 -->
        <span class="text-(12px #909090) select-none p-4px" v-if="item.timeBlock">
          {{ item.timeBlock }}
        </span>
        <!--  消息为撤回消息  -->
        <div v-if="item.message.type === MsgEnum.RECALL">
          <template v-if="chatStore.isGroup">
            <span v-if="item.fromUser.uid === userUid" class="text-12px color-#909090 select-none">
              你撤回了一条消息
            </span>
            <span v-else class="text-12px color-#909090 select-none" v-html="item.message.body"></span>
          </template>
          <template v-else>
            <span class="text-12px color-#909090 select-none">
              {{ item.fromUser.uid === userUid ? '你撤回了一条消息' : '对方撤回了一条消息' }}
            </span>
          </template>
        </div>
        <!-- 好友或者群聊的信息 -->
        <div
          v-else
          class="flex flex-col w-full"
          :class="[{ 'items-end': item.fromUser.uid === userUid }, chatStore.isGroup ? 'gap-18px' : 'gap-2px']">
          <!-- 信息时间(单聊) -->
          <div
            v-if="!chatStore.isGroup"
            class="text-(12px #909090) h-12px w-fit select-none"
            :class="
              item.fromUser.uid === userUid
                ? activeReply === item.message.id
                  ? 'pr-68px'
                  : 'pr-42px'
                : activeReply === item.message.id
                  ? 'pl-68px'
                  : 'pl-42px'
            ">
            <Transition name="fade">
              <span v-if="hoverBubble.key === item.message.id">
                {{ formatTimestamp(item.message.sendTime, true) }}
              </span>
            </Transition>
          </div>
          <div class="flex items-start flex-1" :class="item.fromUser.uid === userUid ? 'flex-row-reverse' : ''">
            <!-- 回复消息提示的箭头 -->
            <svg
              v-if="activeReply === item.message.id"
              class="size-16px pt-4px color-#909090"
              :class="item.fromUser.uid === userUid ? 'ml-8px' : 'mr-8px'">
              <use :href="item.fromUser.uid === userUid ? `#corner-down-left` : `#corner-down-right`"></use>
            </svg>
            <!-- 头像  -->
            <n-popover
              @update:show="handlePopoverUpdate(item.message.id)"
              trigger="click"
              placement="right"
              :show-arrow="false"
              v-model:show="infoPopover"
              style="padding: 0; background: var(--bg-info); backdrop-filter: blur(10px)">
              <template #trigger>
                <ContextMenu
                  @select="$event.click(item, 'Main')"
                  :menu="chatStore.isGroup ? optionsList : void 0"
                  :special-menu="report">
                  <n-avatar
                    round
                    :color="'#fff'"
                    :size="34"
                    @click="selectKey = item.message.id"
                    class="select-none"
                    :src="
                      item.fromUser.uid === userUid
                        ? login.accountInfo.avatar
                        : useUserInfo(item.fromUser.uid).value.avatar
                    "
                    :class="item.fromUser.uid === userUid ? '' : 'mr-10px'"></n-avatar>
                </ContextMenu>
              </template>
              <!-- 用户个人信息框 -->
              <InfoPopover v-if="selectKey === item.message.id" :uid="item.fromUser.uid" />
            </n-popover>
            <n-flex
              vertical
              justify="center"
              :size="6"
              class="color-[--text-color] flex-1"
              :class="item.fromUser.uid === userUid ? 'items-end mr-10px' : ''">
              <n-flex
                :size="4"
                align="center"
                :style="item.fromUser.uid === userUid ? 'flex-direction: row-reverse' : ''">
                <ContextMenu
                  @select="$event.click(item)"
                  :menu="chatStore.isGroup ? optionsList : []"
                  :special-menu="report">
                  <n-flex
                    :size="6"
                    class="select-none"
                    align="center"
                    v-if="chatStore.isGroup"
                    :style="item.fromUser.uid === userUid ? 'flex-direction: row-reverse' : ''">
                    <!-- 用户徽章 -->
                    <n-popover trigger="hover">
                      <template #trigger>
                        <img
                          v-if="useBadgeInfo(useUserInfo(item.fromUser.uid).value.wearingItemId).value.img"
                          class="size-18px"
                          :src="useBadgeInfo(useUserInfo(item.fromUser.uid).value.wearingItemId).value.img"
                          alt="badge" />
                      </template>
                      <span>{{ useBadgeInfo(useUserInfo(item.fromUser.uid).value.wearingItemId).value.describe }}</span>
                    </n-popover>
                    <!-- 用户名 -->
                    <span class="text-12px select-none color-#909090 inline-block align-top">
                      {{ useUserInfo(item.fromUser.uid).value.name }}
                    </span>
                    <!-- 消息归属地 -->
                    <span class="text-(12px #909090)">
                      ({{ useUserInfo(item.fromUser.uid).value.locPlace || '未知' }})
                    </span>
                  </n-flex>
                </ContextMenu>
                <!-- 群主 -->
                <div
                  v-if="chatStore.isGroup && item.message.id === 1"
                  class="flex p-4px rounded-4px bg-#f5dadf size-fit select-none">
                  <span class="text-(10px #d5304f)">群主</span>
                </div>
                <!-- 管理员 -->
                <div
                  v-if="chatStore.isGroup && item.message.id === 2"
                  class="flex p-4px rounded-4px bg-#13987F66 size-fit select-none">
                  <span class="text-(10px #13987f)">管理员</span>
                </div>
                <!-- 信息时间(群聊) -->
                <Transition name="fade">
                  <span v-if="chatStore.isGroup && hoverBubble.key === item.message.id" class="text-(12px #909090)">
                    {{ formatTimestamp(item.message.sendTime, true) }}
                  </span>
                </Transition>
              </n-flex>
              <!--  气泡样式  -->
              <ContextMenu
                @mouseenter="handleMouseEnter(item.message.id)"
                @mouseleave="handleMouseLeave"
                class="w-fit"
                :data-key="item.fromUser.uid === userUid ? `U${item.message.id}` : `Q${item.message.id}`"
                @select="$event.click(item)"
                :menu="handleItemType(item.message.type)"
                :emoji="chatStore.isGroup ? emojiList : []"
                :special-menu="specialMenuList"
                @reply-emoji="handleEmojiSelect($event.label, item)"
                @click="handleMsgClick(item)">
                <!--                &lt;!&ndash; 渲染消息内容体 &ndash;&gt;-->
                <!--                <RenderMessage :message="message" />-->
                <!--  消息为文本类型或者回复消息  -->
                <div
                  v-if="item.message.type === MsgEnum.TEXT"
                  style="white-space: pre-wrap"
                  :class="[
                    { active: activeBubble === item.message.id },
                    item.fromUser.uid === userUid ? 'bubble-oneself' : 'bubble'
                  ]">
                  <span v-html="item.message.body.content"></span>
                </div>

                <!--  消息为为图片类型(不固定宽度和高度), 多张图片时渲染  -->
                <n-image-group v-if="Array.isArray(item.content) && item.type === MsgEnum.IMAGE">
                  <n-flex class="photo-wall" vertical>
                    <n-image
                      class="select-none"
                      v-for="(src, index) in item.content"
                      :key="index"
                      :img-props="{ style: { maxWidth: '325px', maxHeight: '165px', width: '100%', height: 'auto' } }"
                      show-toolbar-tooltip
                      style="border-radius: 8px"
                      :fallback-src="'https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg'"
                      :src="src"></n-image>
                  </n-flex>
                </n-image-group>

                <!-- 单张图片时渲染 -->
                <n-image
                  class="select-none"
                  v-if="typeof item.content === 'string' && item.type === MsgEnum.IMAGE"
                  :img-props="{ style: { maxWidth: '325px', maxHeight: '165px', width: '100%', height: 'auto' } }"
                  show-toolbar-tooltip
                  style="border-radius: 8px"
                  :fallback-src="'https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg'"
                  :src="item.content"></n-image>

                <!-- 消息为文件 -->
                <n-image
                  class="select-none"
                  v-if="typeof item.content === 'string' && item.type === MsgEnum.FILE"
                  :img-props="{ style: { maxWidth: '325px', maxHeight: '165px' } }"
                  show-toolbar-tooltip
                  preview-disabled
                  style="border-radius: 8px"
                  :src="item.content"></n-image>
              </ContextMenu>

              <!-- 回复的内容 -->
              <n-flex
                align="center"
                :size="6"
                v-if="item.message.body.reply"
                @click="jumpToReplyMsg(item.message.body.reply.id)"
                class="reply-bubble relative w-fit custom-shadow">
                <svg class="size-14px"><use href="#to-top"></use></svg>
                <span>{{ `${item.message.body.reply.username}：` }}</span>
                <!-- 当回复消息为图片时渲染 -->
                <!--                <n-image-->
                <!--                  v-if="item.reply.content.startsWith('data:image/')"-->
                <!--                  :img-props="{ style: { maxWidth: '50px', maxHeight: '50px' } }"-->
                <!--                  show-toolbar-tooltip-->
                <!--                  style="border-radius: 4px"-->
                <!--                  @click.stop-->
                <!--                  :fallback-src="'https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg'"-->
                <!--                  :src="item.reply.content" />-->
                <!-- 当回复消息为文本时渲染(判断是否有aitSpan标签) -->
                <span class="content-span">
                  {{ handleReply(item.message.body.reply.body) }}
                </span>
                <!--                &lt;!&ndash; 多个图片时计数器样式 &ndash;&gt;-->
                <!--                <div v-if="item.reply.imgCount" class="reply-img-sub">-->
                <!--                  {{ item.reply.imgCount }}-->
                <!--                </div>-->
              </n-flex>

              <!-- 群聊回复emoji表情 -->
              <n-flex :size="4" v-if="chatStore.isGroup && item.emojiList">
                <n-flex
                  :size="2"
                  align="center"
                  class="emoji-reply-bubble"
                  @click.stop="cancelReplyEmoji(item, index)"
                  v-for="(emoji, index) in item.emojiList"
                  :key="index">
                  {{ emoji.label }}
                  <span class="text-(12px #eee)">{{ emoji.count }}</span>
                </n-flex>
              </n-flex>
            </n-flex>
          </div>
        </div>
      </n-flex>
    </template>
  </n-virtual-list>

  <!-- 弹出框 -->
  <n-modal v-model:show="modalShow" class="w-350px border-rd-8px">
    <div class="bg-[--bg-popover] w-360px h-full p-6px box-border flex flex-col">
      <div
        v-if="type() === 'macos'"
        @click="modalShow = false"
        class="mac-close z-999 size-13px shadow-inner bg-#ed6a5eff rounded-50% select-none absolute left-6px">
        <svg class="hidden size-7px color-#000 font-bold select-none absolute top-3px left-3px">
          <use href="#close"></use>
        </svg>
      </div>

      <svg v-if="type() === 'windows'" @click="modalShow = false" class="w-12px h-12px ml-a cursor-pointer select-none">
        <use href="#close"></use>
      </svg>
      <div class="flex flex-col gap-30px p-[22px_10px_10px_22px] select-none">
        <span class="text-14px">{{ tips }}</span>

        <n-flex justify="end">
          <n-button @click="handleConfirm" class="w-78px" color="#13987f">确定</n-button>
          <n-button @click="modalShow = false" class="w-78px" secondary>取消</n-button>
        </n-flex>
      </div>
    </div>
  </n-modal>

  <!--  悬浮按钮提示(头部悬浮) // TODO 要结合已读未读功能来判断之前的信息有多少没有读，当现在的距离没有到最底部并且又有新消息来未读的时候显示下标的更多信息 (nyh -> 2024-03-07 01:27:22)-->
  <!--  <header class="float-header" :class="isGroup ? 'right-220px' : 'right-50px'">-->
  <!--    <div class="float-box">-->
  <!--      <n-flex justify="space-between" align="center">-->
  <!--        <n-icon :color="'#13987f'">-->
  <!--          <svg><use href="#double-up"></use></svg>-->
  <!--        </n-icon>-->
  <!--        <span class="text-12px">xx条新信息</span>-->
  <!--      </n-flex>-->
  <!--    </div>-->
  <!--  </header>-->

  <!-- 悬浮按钮提示(底部悬浮) -->
  <footer
    class="float-footer"
    v-if="floatFooter && newMsgNum > 0"
    :class="chatStore.isGroup ? 'right-220px' : 'right-50px'">
    <div class="float-box" :class="{ max: newMsgNum > 99 }" @click="scrollBottom">
      <n-flex justify="space-between" align="center">
        <n-icon :color="newMsgNum > 99 ? '#ce304f' : '#13987f'">
          <svg><use href="#double-down"></use></svg>
        </n-icon>
        <span class="text-12px" :class="{ 'color-#ce304f': newMsgNum > 99 }">
          {{ newMsgNum > 99 ? '99+' : newMsgNum }}条新消息
        </span>
      </n-flex>
    </div>
  </footer>
</template>
<script setup lang="ts">
import { EventEnum, MittEnum, MsgEnum, RoomTypeEnum } from '@/enums'
import { type MessageType, SessionItem } from '@/services/types.ts'
import Mitt from '@/utils/Bus.ts'
import { invoke } from '@tauri-apps/api/core'
import { usePopover } from '@/hooks/usePopover.ts'
import { useWindow } from '@/hooks/useWindow.ts'
import { listen } from '@tauri-apps/api/event'
import { useChatMain } from '@/hooks/useChatMain.ts'
import { VirtualListInst } from 'naive-ui'
import { delay } from 'lodash-es'
import { useCommon } from '@/hooks/useCommon.ts'
import { setting } from '@/stores/setting.ts'
import { formatTimestamp } from '@/utils/ComputedTime.ts'
import { useUserInfo, useBadgeInfo } from '@/hooks/useCached.ts'
import { useChatStore } from '@/stores/chat.ts'
import { type } from '@tauri-apps/plugin-os'

const { activeItem } = defineProps<{
  activeItem: SessionItem
}>()
const activeItemRef = ref<SessionItem>({ ...activeItem })
const settingStore = setting()
const chatStore = useChatStore()
// const userInfo = useUserStore()?.userInfo
/** 消息列表 */
const chatMessageList = computed(() => chatStore.chatMessageList)
const messageOptions = computed(() => chatStore.currentMessageOptions)
const { login } = storeToRefs(settingStore)
const { createWebviewWindow } = useWindow()
/** 是否是超级管理员 */
// const isAdmin = computed(() => userInfo?.power === PowerEnum.ADMIN)
/** 跳转回复消息后选中效果 */
const activeReply = ref(-1)
/** item最小高度，用于计算滚动大小和位置 */
const itemSize = computed(() => (chatStore.isGroup ? 90 : 76))
/** 虚拟列表 */
const virtualListInst = ref<VirtualListInst>()
/** 手动触发Popover显示 */
const infoPopover = ref(false)
/** 鼠标悬浮的气泡显示对应的时间 */
const hoverBubble = ref<{
  key: number
  timer?: NodeJS.Timeout
}>({
  key: -1
})
const { removeTag, userUid } = useCommon()
const {
  handleScroll,
  handleMsgClick,
  handleConfirm,
  handleItemType,
  activeBubble,
  newMsgNum,
  floatFooter,
  tips,
  modalShow,
  specialMenuList,
  optionsList,
  report,
  selectKey,
  emojiList,
  scrollTop
} = useChatMain(activeItem)
const { handlePopoverUpdate } = usePopover(selectKey, 'image-chat-main')

watch(activeItemRef, (value, oldValue) => {
  if (oldValue.roomId !== value.roomId) {
    nextTick(() => {
      console.log('切换房间')
      virtualListInst.value?.scrollTo({ position: 'bottom', debounce: true })
    })
  }
})

watch(chatMessageList, (value, oldValue) => {
  if (scrollTop.value === 0 && value.length > 20) {
    nextTick(() => {
      // 跳转的下标
      virtualListInst.value?.scrollTo({ index: value.length - oldValue.length, debounce: true })
    })
  } else {
    nextTick(() => {
      virtualListInst.value?.scrollTo({ position: 'bottom', debounce: true })
    })
  }
})

// 当鼠标进入时触发的处理函数
const handleMouseEnter = (key: any) => {
  // 设置定时器，在1600毫秒后更新悬浮气泡的key值
  hoverBubble.value.timer = setTimeout(() => {
    hoverBubble.value.key = key
  }, 1600)
}

// 当鼠标离开时触发的处理函数
const handleMouseLeave = () => {
  // 如果定时器存在，则清除定时器并重置为undefined
  if (hoverBubble.value.timer) {
    clearTimeout(hoverBubble.value.timer)
    hoverBubble.value.timer = void 0
  }
  // 重置悬浮气泡的key值为-1
  hoverBubble.value.key = -1
}

/** 取消回复emoji表情 */
const cancelReplyEmoji = (item: any, index: number) => {
  // 判断item.emojiList数组中的count是否为1，如果为1则删除该元素，否则count-1
  if (item.emojiList[index].count === 1) {
    item.emojiList.splice(index, 1)
  } else {
    item.emojiList[index].count--
  }
}

/** 处理emoji表情回应 */
const handleEmojiSelect = (label: string, item: any) => {
  if (!item.emojiList) {
    item.emojiList = [{ label: label, count: 1 }]
  } else {
    // 比较label是否存在，存在则计数+1，不存在则新增
    const index = item.emojiList.findIndex((item: any) => item.label === label)
    if (index > -1) {
      item.emojiList[index].count++
    } else {
      item.emojiList.push({ label: label, count: 1 })
    }
  }
}

/** 处理回复消息中的 AIT 标签 */
const handleReply = (content: string) => {
  return content.includes('id="aitSpan"') ? removeTag(content) : content
}

/** 跳转到回复消息 */
const jumpToReplyMsg = (key: number) => {
  nextTick(() => {
    virtualListInst.value?.scrollTo({ key: key })
    activeReply.value = key
  })
}

/**
 * 给气泡添加动画
 * @param index 下标
 * @param id 用户ID
 */
const addToDomUpdateQueue = (index: number, id: number) => {
  // 使用 nextTick 确保虚拟列表渲染完最新的项目后进行滚动
  nextTick(() => {
    if (!floatFooter.value || id === userUid.value) {
      virtualListInst.value?.scrollTo({ position: 'bottom', debounce: true })
    }
    /** data-key标识的气泡,添加前缀用于区分用户消息，不然气泡动画会被覆盖 */
    const dataKey = id === userUid.value ? `U${index}` : `Q${index}`
    const lastMessageElement = document.querySelector(`[data-key="${dataKey}"]`) as HTMLElement
    if (lastMessageElement) {
      // 添加动画类
      lastMessageElement.classList.add('bubble-animation')
      // 监听动画结束事件
      const handleAnimationEnd = () => {
        lastMessageElement.classList.remove('bubble-animation')
        lastMessageElement.removeEventListener('animationend', handleAnimationEnd)
      }
      lastMessageElement.addEventListener('animationend', handleAnimationEnd)
    }
  })
  chatStore.clearNewMsgCount()
}

/** 点击后滚动到底部 */
const scrollBottom = () => {
  nextTick(() => {
    virtualListInst.value?.scrollTo({ position: 'bottom', behavior: 'instant', debounce: true })
  })
}

const closeMenu = (event: any) => {
  if (!event.target.matches('.bubble', 'bubble-oneself')) {
    activeBubble.value = -1
  }
  if (!event.target.matches('.active-reply')) {
    /** 解决更替交换回复气泡时候没有触发动画的问题 */
    if (!event.target.matches('.reply-bubble *')) {
      nextTick(() => {
        const activeReplyElement = document.querySelector('.active-reply') as HTMLElement
        if (activeReplyElement) {
          activeReplyElement.classList.add('reply-exit')
          delay(() => {
            activeReplyElement.classList.remove('reply-exit')
            activeReply.value = -1
          }, 300)
        }
      })
    }
  }
}

onMounted(() => {
  nextTick(() => {
    // 滚动到底部
    virtualListInst.value?.scrollTo({ position: 'bottom', debounce: true })
  })
  /**! 启动图标闪烁 需要设置"resources": ["sec-tauri/图标放置的文件夹"]*/
  invoke('tray_blink', {
    isRun: true,
    ms: 500,
    iconPath1: 'tray/msg.png',
    iconPath2: 'tray/msg-sub.png'
  }).catch((error) => {
    console.error('设置图标失败:', error)
  })
  Mitt.on(MittEnum.SEND_MESSAGE, (event: MessageType) => {
    nextTick(() => {
      addToDomUpdateQueue(event.message.id, event.fromUser.uid)
    })
  })
  Mitt.on(`${MittEnum.INFO_POPOVER}-Main`, (event: any) => {
    selectKey.value = event
    infoPopover.value = true
    handlePopoverUpdate(event)
  })
  Mitt.on(MittEnum.MSG_BOX_SHOW, (event: any) => {
    activeItemRef.value = event.item
  })
  listen(EventEnum.SHARE_SCREEN, async () => {
    await createWebviewWindow('共享屏幕', 'sharedScreen', 840, 840)
  })
  window.addEventListener('click', closeMenu, true)
  // let index = items.value.length > 0 ? items.value[items.value.length - 1].key : 0
  //
  // setInterval(() => {
  //   index++
  //   const message = {
  //     value: '按你说的就撒了大家',
  //     key: index,
  //     accountId: activeItem.accountId,
  //     avatar: 'https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg',
  //     content: '123',
  //     type: MsgEnum.TEXT,
  //     reply: null
  //   }
  //   items.value.push(message)
  //   addToDomUpdateQueue(index - 1, activeItem.accountId)
  // }, 2000)
})

onUnmounted(() => {
  clearTimeout(hoverBubble.value.timer)
  hoverBubble.value.timer = void 0
  hoverBubble.value.key = -1
  window.removeEventListener('click', closeMenu, true)
})
</script>

<style scoped lang="scss">
@use '@/styles/scss/chat-main';
</style>

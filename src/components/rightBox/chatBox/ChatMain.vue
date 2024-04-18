<template>
  <!-- 中间聊天内容(使用虚拟列表) -->
  <n-virtual-list
    id="image-chat-main"
    ref="virtualListInst"
    @scroll="handleScroll($event)"
    style="max-height: calc(100vh - 260px)"
    :class="{ 'right-1px': activeItem.type === RoomTypeEnum.SINGLE }"
    class="relative h-100vh"
    item-resizable
    :padding-top="10"
    :item-size="itemSize"
    :items="items">
    <template #default="{ item }">
      <main
        :key="item.key"
        class="flex-y-center min-h-58px"
        :class="[
          [activeItem.type === RoomTypeEnum.GROUP ? 'p-[18px_20px]' : 'chat-single p-[4px_20px_10px_20px]'],
          { 'active-reply': activeReply === item.key }
        ]">
        <!-- 好友或者群聊的信息 -->
        <article
          class="flex flex-col w-full gap-18px"
          :class="{
            'items-end': item.accountId === userId
          }">
          <div class="flex items-start flex-1" :class="item.accountId === userId ? 'flex-row-reverse' : ''">
            <!-- 回复消息提示的箭头 -->
            <svg
              v-if="activeReply === item.key"
              class="size-16px pt-4px color-#909090"
              :class="item.accountId === userId ? 'ml-8px' : 'mr-8px'">
              <use :href="item.accountId === userId ? `#corner-down-left` : `#corner-down-right`"></use>
            </svg>
            <!-- 头像  -->
            <n-popover
              @update:show="handlePopoverUpdate(item.key)"
              trigger="click"
              placement="right-start"
              :show-arrow="false"
              style="padding: 0; background: var(--bg-info); backdrop-filter: blur(10px)">
              <template #trigger>
                <ContextMenu
                  @select="$event.click(item)"
                  :menu="activeItem.type === RoomTypeEnum.GROUP ? optionsList : []"
                  :special-menu="report">
                  <n-avatar
                    lazy
                    round
                    :color="'#fff'"
                    :size="34"
                    @click="selectKey = item.key"
                    class="select-none"
                    :src="item.accountId === userId ? item.avatar : activeItem.avatar"
                    :class="item.accountId === userId ? '' : 'mr-10px'"
                    fallback-src="/logo.png"
                    :render-placeholder="() => null"
                    :intersection-observer-options="{
                      root: '#image-chat-main'
                    }"></n-avatar>
                </ContextMenu>
              </template>
              <!-- 用户个人信息框 -->
              <InfoPopover :info="activeItemRef" />
            </n-popover>
            <n-flex
              vertical
              justify="center"
              :size="8"
              class="color-[--text-color] flex-1"
              :class="item.accountId === userId ? 'items-end mr-10px' : ''">
              <ContextMenu
                @select="$event.click(item)"
                :menu="activeItem.type === RoomTypeEnum.GROUP ? optionsList : []"
                :special-menu="report">
                <span class="text-12px select-none color-#909090" v-if="activeItem.type === RoomTypeEnum.GROUP">
                  {{ item.value }}
                </span>
              </ContextMenu>
              <!--  气泡样式  -->
              <ContextMenu
                class="size-fit"
                :data-key="item.accountId === userId ? `U${item.key}` : `Q${item.key}`"
                @select="$event.click(item)"
                :menu="handleItemType(item.type)"
                :special-menu="specialMenuList"
                @click="handleMsgClick(item)">
                <!--                &lt;!&ndash; 渲染消息内容体 &ndash;&gt;-->
                <!--                <RenderMessage :message="message" />-->
                <!--  消息为文本类型  -->
                <div
                  v-if="item.type === MsgEnum.TEXT"
                  style="white-space: pre-wrap"
                  :class="[
                    { active: activeBubble === item.key },
                    item.accountId === userId ? 'bubble-oneself' : 'bubble'
                  ]">
                  <span v-html="item.content"></span>
                </div>

                <!--  消息为为图片类型(不固定宽度和高度), 多张图片时渲染  -->
                <n-image-group v-if="Array.isArray(item.content) && item.type === MsgEnum.IMAGE">
                  <n-flex class="photo-wall" vertical>
                    <n-image
                      class="select-none"
                      v-for="(src, index) in item.content"
                      :key="index"
                      :img-props="{ style: { maxWidth: '325px', maxHeight: '165px' } }"
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
                  :img-props="{ style: { maxWidth: '325px', maxHeight: '165px' } }"
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

                <!-- 消息为回复消息 -->
                <div
                  v-if="item.type === MsgEnum.REPLY"
                  style="white-space: pre-wrap"
                  :class="[
                    { active: activeBubble === item.key },
                    item.accountId === userId ? 'bubble-oneself' : 'bubble'
                  ]">
                  <span v-html="item.content"></span>
                </div>
              </ContextMenu>

              <!-- 回复的内容 -->
              <n-flex
                align="center"
                :size="6"
                v-if="item.reply && item.type === MsgEnum.REPLY"
                @click="jumpToReplyMsg(item.reply.key)"
                class="reply-bubble">
                <svg class="size-14px"><use href="#to-top"></use></svg>
                <span>{{ `${item.reply.accountName}：` }}</span>
                <span class="content-span">
                  {{ item.reply.content }}
                </span>
              </n-flex>
            </n-flex>
          </div>
        </article>
      </main>
    </template>
  </n-virtual-list>

  <!-- 弹出框 -->
  <n-modal v-model:show="modalShow" class="w-350px border-rd-8px">
    <div class="bg-[--bg-popover] w-360px h-full p-6px box-border flex flex-col">
      <svg @click="modalShow = false" class="w-12px h-12px ml-a cursor-pointer select-none">
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
  <header class="float-header" :class="activeItem.type === RoomTypeEnum.GROUP ? 'right-220px' : 'right-50px'">
    <div class="float-box">
      <n-flex justify="space-between" align="center">
        <n-icon :color="'#13987f'">
          <svg><use href="#double-up"></use></svg>
        </n-icon>
        <span class="text-12px">xx条新信息</span>
      </n-flex>
    </div>
  </header>

  <!-- 悬浮按钮提示(底部悬浮) -->
  <footer
    class="float-footer"
    v-if="floatFooter && newMsgNum > 0"
    :class="activeItem.type === RoomTypeEnum.GROUP ? 'right-220px' : 'right-50px'">
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
import { MockItem } from '@/services/types.ts'
import Mitt from '@/utils/Bus.ts'
import { invoke } from '@tauri-apps/api/tauri'
import { optionsList, report } from './config.ts'
import { usePopover } from '@/hooks/usePopover.ts'
import { useWindow } from '@/hooks/useWindow.ts'
import { listen } from '@tauri-apps/api/event'
import { useChatMain } from '@/hooks/useChatMain.ts'
import { VirtualListInst } from 'naive-ui'
import { delay } from 'lodash-es'

const { activeItem } = defineProps<{
  activeItem: MockItem
}>()
const activeItemRef = ref({ ...activeItem })
const { createWebviewWindow } = useWindow()
/* 当前点击的用户的key */
const selectKey = ref()
/* 跳转回复消息后选中效果 */
const activeReply = ref(-1)
/* item最小高度，用于计算滚动大小和位置 */
const itemSize = computed(() => (activeItem.type === RoomTypeEnum.GROUP ? 98 : 70))
/* 虚拟列表 */
const virtualListInst = ref<VirtualListInst>()
const { handlePopoverUpdate } = usePopover(selectKey, 'image-chat-main')
const {
  handleScroll,
  handleMsgClick,
  handleConfirm,
  handleItemType,
  items,
  activeBubble,
  newMsgNum,
  floatFooter,
  historyIndex,
  tips,
  modalShow,
  userId,
  specialMenuList,
  itemComputed
} = useChatMain(activeItem)
// // 创建一个符合 TextBody 类型的对象
// const textBody = {
//   content: '123',
//   reply: {
//     /* 填充合适的回复对象 */
//   },
//   urlContentMap: {
//     // 填充合适的 URL 映射信息，如果没有，则可以是空对象
//   }
// }
//
// // 使用 ref 创建一个响应式的 MsgType 对象
// const msg = ref({
//   id: 123456, // 假设的消息 ID
//   roomId: 123, // 假设的房间 ID
//   type: MsgEnum.TEXT, // 假设消息类型为文本
//   body: textBody, // 上面创建的 TextBody 对象
//   sendTime: Date.now(), // 发送消息的时间戳
//   messageMark: {
//     /* 填充合适的 MessageMarkType 对象 */
//   }
// })
// const message = computed(() => msg.value)

watchEffect(() => {
  newMsgNum.value = itemComputed.value - historyIndex.value
  activeItemRef.value = { ...activeItem }
})

/* 发送信息 */
const handleSendMessage = (msg: any) => {
  nextTick(() => {
    // 检查是否为图片消息
    if (msg.type === MsgEnum.IMAGE || msg.type === MsgEnum.FILE) {
      // 查找所有的img标签并存入数组
      const imgSrcArray = [...msg.content.matchAll(/<img.*?src="(.*?)"/g)].map((match) => match[1])
      if (imgSrcArray.length > 1) {
        // 图片数量大于1，储存整个数组以便后面在模板中使用
        msg.content = imgSrcArray
      } else if (imgSrcArray.length === 1) {
        // 图片数量为1，只存储单张图片的src
        msg.content = imgSrcArray[0]
      }
    }
    const index = items.value.length > 0 ? items.value[items.value.length - 1].key : 0
    items.value.push({
      value: '我',
      key: index + 1,
      accountId: userId.value,
      avatar: 'https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg',
      content: msg.content,
      type: msg.type,
      reply: msg.type === MsgEnum.REPLY ? msg.reply : null
    })
    addToDomUpdateQueue(index, userId.value)
  })
}

/* 跳转到回复消息 */
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
    if (!floatFooter.value || id === userId.value) {
      virtualListInst.value?.scrollTo({ position: 'bottom', debounce: true })
    }
    /* data-key标识的气泡,添加前缀用于区分用户消息，不然气泡动画会被覆盖 */
    const dataKey = id === userId.value ? `U${index + 1}` : `Q${index + 1}`
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
}

/* 点击后滚动到底部 */
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
    /* 解决更替交换回复气泡时候没有触发动画的问题 */
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
  /*! 启动图标闪烁 需要设置"resources": ["sec-tauri/图标放置的文件夹"]*/
  invoke('tray_blink', {
    isRun: true,
    ms: 500,
    iconPath1: 'tray/msg.png',
    iconPath2: 'tray/msg-sub.png'
  }).catch((error) => {
    console.error('设置图标失败:', error)
  })
  Mitt.on(MittEnum.SEND_MESSAGE, (event) => {
    handleSendMessage(event)
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
  window.removeEventListener('click', closeMenu, true)
})
</script>

<style scoped lang="scss">
@import '@/styles/scss/chat-main';
</style>

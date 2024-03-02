<template>
  <!-- 中间聊天内容(使用虚拟列表) -->
  <n-virtual-list
    ref="virtualListInst"
    style="max-height: calc(100vh - 260px)"
    item-resizable
    padding-bottom="10px"
    :item-size="42"
    :items="items">
    <template #default="{ item }">
      <main
        :key="item.key"
        class="flex-y-center min-h-58px"
        :class="activeItem.type === RoomTypeEnum.Group ? 'p-[18px_20px]' : 'chat-single p-[2px_20px]'">
        <!-- 好友或者群聊的信息 -->
        <article class="flex flex-col w-full gap-18px" :class="item.accountId === userId ? 'items-end' : ''">
          <div
            class="flex items-start"
            :class="item.accountId === userId ? 'flex-row-reverse' : ''"
            style="max-width: calc(100% - 54px)">
            <!-- 头像  -->
            <img
              :class="item.accountId === userId ? '' : 'mr-10px'"
              class="w-34px rounded-50% select-none"
              :src="item.accountId === userId ? item.avatar : activeItem.avatar"
              alt="" />
            <div
              class="flex flex-col gap-8px color-[--text-color]"
              :class="item.accountId === userId ? 'items-end mr-10px' : ''">
              <span class="text-13px select-none" v-if="activeItem.type === RoomTypeEnum.Group">
                {{ item.accountId === userId ? item.value : activeItem.accountName }}
              </span>
              <!--  右键菜单及其气泡样式  -->
              <ContextMenu
                @select="$event.click(item.key)"
                :menu="menuList"
                :special-menu="specialMenuList"
                @click="handleMsgClick(item)">
                <!--                &lt;!&ndash; 渲染消息内容体 &ndash;&gt;-->
                <!--                <RenderMessage :message="message" />-->
                <!--  消息为文本类型  -->
                <div
                  v-if="item.type === MsgEnum.TEXT"
                  :class="[
                    { active: activeBubble === item.key },
                    activeItem.type === RoomTypeEnum.Group ? '' : 'm-[10px_0]',
                    item.accountId === userId ? 'bubble-oneself' : 'bubble'
                  ]"
                  v-html="item.content"></div>

                <!--  消息为为图片类型(不固定宽度和高度), 多张图片时渲染  -->
                <n-image-group v-if="Array.isArray(item.content) && item.type === MsgEnum.IMAGE">
                  <n-space class="photo-wall" vertical>
                    <n-image
                      v-for="(src, index) in item.content"
                      :key="index"
                      :img-props="{ style: { maxWidth: '325px', maxHeight: '165px' } }"
                      show-toolbar-tooltip
                      style="border-radius: 8px"
                      :class="activeItem.type === RoomTypeEnum.Group ? '' : 'm-[10px_0]'"
                      :src="src"></n-image>
                  </n-space>
                </n-image-group>

                <!-- 单张图片时渲染 -->
                <n-image
                  v-else-if="typeof item.content === 'string' && item.type === MsgEnum.IMAGE"
                  :img-props="{ style: { maxWidth: '325px', maxHeight: '165px' } }"
                  show-toolbar-tooltip
                  style="border-radius: 8px"
                  :class="activeItem.type === RoomTypeEnum.Group ? '' : 'm-[10px_0]'"
                  :src="item.content"></n-image>
              </ContextMenu>
            </div>
          </div>
        </article>
      </main>
    </template>
  </n-virtual-list>
</template>
<script setup lang="ts">
import { MsgEnum, RoomTypeEnum } from '@/enums'
import { Menu, MockItem } from '@/services/types.ts'
import Mitt from '@/utils/Bus.ts'
import { VirtualListInst } from 'naive-ui'

const activeBubble = ref(-1)
const userId = ref(10086)
const copyright = ref('-HuLa©-版权所有')
/* 虚拟列表的距离 */
const virtualListInst = ref<VirtualListInst>()
const { activeItem } = defineProps<{
  activeItem: MockItem
}>()
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

/* 右键菜单列表 */
const menuList = ref<Menu>([
  {
    label: '复制',
    icon: 'copy',
    click: (index: number) => {
      // 复制内容到剪贴板
      navigator.clipboard.writeText(items.value[index].content + copyright.value)
    }
  },
  {
    label: '转发',
    icon: 'share',
    click: () => {}
  },
  { label: '收藏', icon: 'collection-files' },
  { label: '回复', icon: 'reply' }
])
/* 右键菜单下划线后的列表 */
const specialMenuList = ref<Menu>([
  {
    label: '删除',
    icon: 'delete',
    click: (key: number) => {
      // 根据key找到items中对应的下标
      let index = items.value.findIndex((item) => item.key === key)
      items.value.splice(index, 1)
    }
  }
])

/*! 模拟信息列表 */
const items = ref(
  Array.from({ length: 5 }, (_, i) => ({
    value: `${i}安老师`,
    key: i,
    accountId: activeItem.accountId,
    avatar: activeItem.avatar,
    content: '123',
    type: MsgEnum.TEXT
  }))
)

/* 点击气泡消息时候监听用户是否按下ctrl+c来复制内容 */
const handleMsgClick = (item: any) => {
  activeBubble.value = item.key
  // 启用键盘监听
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'c') {
      navigator.clipboard.writeText(items.value[item.key].content + copyright.value)
      // 取消监听键盘事件，以免多次绑定
      document.removeEventListener('keydown', handleKeyPress)
    }
  }
  // 绑定键盘事件到 document
  document.addEventListener('keydown', handleKeyPress)
}

/* 发送信息 */
const handleSendMessage = (msg: any) => {
  // 检查是否为图片消息
  if (msg.type === MsgEnum.IMAGE) {
    // 移除 span 标签(在输入框的时候多个img标签会生成span标签提供padding效果)
    msg.content = msg.content.replace(/<\/?span[^>]*>/g, '')
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
  let index = items.value.length > 0 ? items.value[items.value.length - 1].key : 0
  items.value.push({
    value: '我',
    key: index + 1,
    accountId: userId.value,
    avatar: 'https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg',
    content: msg.content,
    type: msg.type
  })
  // 使用 nextTick 确保虚拟列表渲染完最新的项目后进行滚动
  nextTick(() => {
    virtualListInst.value?.scrollTo({ position: 'bottom' })
  })
}

const closeMenu = (event: any) => {
  if (!event.target.matches('.bubble', 'bubble-oneself')) {
    activeBubble.value = -1
  }
}

onMounted(() => {
  Mitt.on('handleSendMessage', (event) => {
    handleSendMessage(event)
  })
  window.addEventListener('click', closeMenu, true)
})

onUnmounted(() => {
  window.removeEventListener('click', closeMenu, true)
})
</script>

<style scoped lang="scss">
/* 气泡样式 */
@mixin bubble {
  @apply w-fit max-w-55vw min-h-1em p-[8px_12px] text-15px line-height-22px bg-[--bg-bubble] rounded-[2px_18px_18px];
  word-break: break-all; /* 强制连续文本换行 */
  &.active {
    background-color: var(--bg-bubble-active);
    color: var(--text-color);
  }
}
.chat-single:first-child {
  padding-top: 16px;
}
.bubble {
  @include bubble;
}
.bubble-oneself {
  @include bubble;
  @apply rounded-[18px_2px_18px_18px] color-#fff;
  background-color: rgba(5, 150, 105, 0.8);
}
.photo-wall {
  @extend .bubble-oneself;
  @apply flex flex-col items-start gap-6px max-w-380px;
}
</style>

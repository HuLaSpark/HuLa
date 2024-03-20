<template>
  <!-- 中间聊天内容(使用虚拟列表) -->
  <n-virtual-list
    ref="virtualListInst"
    style="max-height: calc(100vh - 260px); position: relative"
    item-resizable
    padding-bottom="10px"
    :item-size="42"
    :items="items"
    @scroll="handleScroll($event)">
    <template #default="{ item }">
      <main
        :key="item.key"
        class="flex-y-center min-h-58px"
        :class="activeItem.type === RoomTypeEnum.GROUP ? 'p-[18px_20px]' : 'chat-single p-[2px_20px]'">
        <!-- 好友或者群聊的信息 -->
        <article class="flex flex-col w-full gap-18px" :class="item.accountId === userId ? 'items-end' : ''">
          <div
            class="flex items-start"
            :class="item.accountId === userId ? 'flex-row-reverse' : ''"
            style="max-width: calc(100% - 54px)">
            <!-- 头像  -->
            <ContextMenu :menu="optionsList" :special-menu="report">
              <img
                :class="item.accountId === userId ? '' : 'mr-10px'"
                class="w-34px rounded-50% select-none"
                :src="item.accountId === userId ? item.avatar : activeItem.avatar"
                alt="" />
            </ContextMenu>
            <div
              class="flex flex-col gap-8px color-[--text-color]"
              :class="item.accountId === userId ? 'items-end mr-10px' : ''">
              <ContextMenu :menu="optionsList" :special-menu="report">
                <span class="text-12px select-none color-#909090" v-if="activeItem.type === RoomTypeEnum.GROUP">
                  {{ item.accountId === userId ? item.value : activeItem.accountName }}
                </span>
              </ContextMenu>
              <!--  气泡样式  -->
              <ContextMenu
                :data-key="item.accountId === userId ? `U${item.key}` : `Q${item.key}`"
                @select="$event.click(item.key)"
                :menu="menuList"
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
                  <n-space class="photo-wall" vertical>
                    <n-image
                      v-for="(src, index) in item.content"
                      :key="index"
                      :img-props="{ style: { maxWidth: '325px', maxHeight: '165px' } }"
                      show-toolbar-tooltip
                      style="border-radius: 8px"
                      :src="src"></n-image>
                  </n-space>
                </n-image-group>

                <!-- 单张图片时渲染 -->
                <n-image
                  v-else-if="typeof item.content === 'string' && item.type === MsgEnum.IMAGE"
                  :img-props="{ style: { maxWidth: '325px', maxHeight: '165px' } }"
                  show-toolbar-tooltip
                  style="border-radius: 8px"
                  :src="item.content"></n-image>
              </ContextMenu>
            </div>
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
          <n-button @click="handleConfirm" class="w-78px" color="#059669">确定</n-button>
          <n-button @click="modalShow = false" class="w-78px" secondary>取消</n-button>
        </n-flex>
      </div>
    </div>
  </n-modal>

  <!--  悬浮按钮提示(头部悬浮) // TODO 要结合已读未读功能来判断之前的信息有多少没有读，当现在的距离没有到最底部并且又有新消息来未读的时候显示下标的更多信息 (nyh -> 2024-03-07 01:27:22)-->
  <header class="float-header">
    <div class="float-box">
      <n-flex justify="space-between" align="center">
        <n-icon :color="'rgba(5,150,105,0.5)'">
          <svg><use href="#double-up"></use></svg>
        </n-icon>
        <span class="text-12px">xx条新信息</span>
      </n-flex>
    </div>
  </header>

  <!-- 悬浮按钮提示(底部悬浮) -->
  <footer class="float-footer" v-if="floatFooter && newMsgNum > 0">
    <div class="float-box" :class="{ max: newMsgNum > 99 }" @click="scrollBottom">
      <n-flex justify="space-between" align="center">
        <n-icon :color="newMsgNum > 99 ? '#ce304f' : 'rgba(5,150,105,0.5)'">
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
import { MsgEnum, RoomTypeEnum } from '@/enums'
import { MockItem } from '@/services/types.ts'
import Mitt from '@/utils/Bus.ts'
import { VirtualListInst } from 'naive-ui'
import { invoke } from '@tauri-apps/api/tauri'

const activeBubble = ref(-1)
const userId = ref(10086)
const copyright = ref('-HuLa©-版权所有')
const copyrightComputed = computed(() => {
  const copy = (index: number) => {
    items.value[index].content.endsWith(copyright.value)
      ? navigator.clipboard.writeText(items.value[index].content)
      : navigator.clipboard.writeText(items.value[index].content + copyright.value)
  }
  return { copy }
})
/* 提醒框标题 */
const tips = ref()
const modalShow = ref(false)
/* 需要删除信息的下标 */
const delIndex = ref(0)
/* 悬浮的页脚 */
const floatFooter = ref(false)
/* 记录历史消息下标 */
const historyIndex = ref(0)
/* 新消息数 */
const newMsgNum = ref(0)
/* 计算出触发页脚后的历史消息下标 */
const itemComputed = computed(() => {
  return items.value.filter((item) => item.accountId !== userId.value).length
})
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

/* 右键用户信息菜单(单聊的时候显示) */
const optionsList = computed(() => {
  if (activeItem.type === RoomTypeEnum.GROUP) {
    return [
      {
        label: '发送信息',
        icon: 'message-action',
        click: () => {}
      },
      {
        label: 'TA',
        icon: 'aite',
        click: () => {}
      },
      {
        label: '查看资料',
        icon: 'notes',
        click: () => {}
      },
      {
        label: '添加好友',
        icon: 'people-plus',
        click: () => {}
      }
    ]
  }
})
/* 举报选项 */
const report = computed(() => {
  if (activeItem.type === RoomTypeEnum.GROUP) {
    return [
      {
        label: '举报',
        icon: 'caution',
        click: () => {}
      }
    ]
  }
})
/* 右键消息菜单列表 */
const menuList = ref<OPT.RightMenu[]>([
  {
    label: '复制',
    icon: 'copy',
    click: (index: number) => {
      // 复制内容到剪贴板
      copyrightComputed.value.copy(index)
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
const specialMenuList = ref<OPT.RightMenu[]>([
  {
    label: '删除',
    icon: 'delete',
    click: (key: number) => {
      tips.value = '删除后将不会出现在你的消息记录中，确定删除吗?'
      modalShow.value = true
      delIndex.value = key
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

watchEffect(() => {
  newMsgNum.value = itemComputed.value - historyIndex.value
})

/* 处理滚动事件(用于页脚显示功能) */
const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  // 获取已滚动的距离，即从顶部到当前滚动位置的距离
  const scrollTop = target.scrollTop
  // 获取整个滚动容器的高度
  const scrollHeight = target.scrollHeight
  // 获取容器的可视区域高度
  const clientHeight = target.clientHeight
  // 计算距离底部的距离
  const distanceFromBottom = scrollHeight - scrollTop - clientHeight
  // 判断是否大于100
  if (distanceFromBottom > 100) {
    floatFooter.value = true
    // 更新历史消息下标
    historyIndex.value = itemComputed.value
  } else {
    floatFooter.value = false
    historyIndex.value = 0
    newMsgNum.value = 0
  }
}

/* 删除信息事件 */
const handleConfirm = () => {
  // 根据key找到items中对应的下标
  let index = items.value.findIndex((item) => item.key === delIndex.value)
  items.value.splice(index, 1)
  modalShow.value = false
}

/* 点击气泡消息时候监听用户是否按下ctrl+c来复制内容 */
const handleMsgClick = (item: any) => {
  activeBubble.value = item.key
  // 启用键盘监听
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'c') {
      copyrightComputed.value.copy(item.key)
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
  addToDomUpdateQueue(index, userId.value)
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
      virtualListInst.value?.scrollTo({ position: 'bottom' })
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
    virtualListInst.value?.scrollTo({ position: 'bottom' })
  })
}

const closeMenu = (event: any) => {
  if (!event.target.matches('.bubble', 'bubble-oneself')) {
    activeBubble.value = -1
  }
}

onMounted(() => {
  invoke('set_tray_icon').catch((error) => {
    console.error('设置图标失败:', error)
  })
  Mitt.on('handleSendMessage', (event) => {
    handleSendMessage(event)
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
  //     type: MsgEnum.TEXT
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

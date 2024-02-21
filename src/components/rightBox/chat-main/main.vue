<template>
  <!-- 中间聊天内容(使用虚拟列表) -->
  <n-virtual-list style="max-height: calc(100vh - 260px)" item-resizable :item-size="42" :items="items">
    <template #default="{ item, index }">
      <main :key="item.key" class="flex-y-center p-[0_20px] min-h-58px m-[26px_0]">
        <article class="flex items-start" style="max-width: calc(100% - 54px)">
          <!-- 头像  -->
          <img class="w-34px rounded-50% mr-10px select-none" :src="item.avatar" alt="" />
          <div class="flex flex-col gap-8px color-[--text-color]">
            <span class="font-size-13px select-none"> {{ item.value }}</span>
            <!--  气泡  -->
            <div class="bubble" :class="{ active: activeBubble === index }" @click="activeBubble = index">
              <!-- 渲染消息内容体 -->
              <RenderMessage :message="message" />
            </div>
          </div>
        </article>
      </main>
    </template>
  </n-virtual-list>
</template>
<script setup lang="ts">
import RenderMessage from '../render-message/index.vue'
import { MsgEnum } from '@/enums'

const activeBubble = ref(-1)
// 创建一个符合 TextBody 类型的对象
const textBody = {
  content: `123`,
  reply: {
    /* 填充合适的回复对象 */
  },
  urlContentMap: {
    // 填充合适的 URL 映射信息，如果没有，则可以是空对象
  }
}

// 使用 ref 创建一个响应式的 MsgType 对象
const msg = ref({
  id: 123456, // 假设的消息 ID
  roomId: 123, // 假设的房间 ID
  type: MsgEnum.TEXT, // 假设消息类型为文本
  body: textBody, // 上面创建的 TextBody 对象
  sendTime: Date.now(), // 发送消息的时间戳
  messageMark: {
    /* 填充合适的 MessageMarkType 对象 */
  }
})
const message = computed(() => msg.value)
const avatars = [
  'https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg',
  'https://avatars.githubusercontent.com/u/20943608?s=60&v=4',
  'https://avatars.githubusercontent.com/u/46394163?s=60&v=4',
  'https://avatars.githubusercontent.com/u/39197136?s=60&v=4',
  'https://avatars.githubusercontent.com/u/19239641?s=60&v=4'
]

const items = Array.from({ length: 100 }, (_, i) => ({
  value: `${i}安老师`,
  key: i,
  avatar: avatars[i % avatars.length]
}))

const closeMenu = (event: any) => {
  if (!event.target.matches('.bubble')) {
    activeBubble.value = -1
  }
}

onMounted(() => {
  window.addEventListener('click', closeMenu, true)
})

onUnmounted(() => {
  window.removeEventListener('click', closeMenu, true)
})
</script>

<style scoped lang="scss">
.bubble {
  @apply w-fit min-h-1em p-[8px_12px] font-size-15px line-height-22px bg-[--bg-bubble] rounded-[2px_18px_18px];
}
.active {
  background-color: #059669;
}
</style>

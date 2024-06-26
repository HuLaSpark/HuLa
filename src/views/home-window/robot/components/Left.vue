<template>
  <n-flex
    vertical
    :size="0"
    data-tauri-drag-region
    class="bg-[--chat-left-bg] select-none w-300px h-full p-[40px_20px_6px_20px] box-border">
    <n-flex vertical :size="30">
      <!-- 标题 -->
      <n-flex justify="space-between" align="center" :size="0">
        <n-flex :size="4" vertical>
          <n-flex :size="0">
            <p class="text-(20px [--chat-text-color]) font-semibold select-none">HuLa-</p>
            <p class="gpt-subtitle">ChatBot</p>
          </n-flex>
          <p class="text-(12px #909090)">建立一个属于自己AI</p>
        </n-flex>
        <svg class="size-44px color-#13987f opacity-20"><use href="#GPT"></use></svg>
      </n-flex>

      <!-- 头像和插件 -->
      <n-flex align="center" justify="space-between" :size="0">
        <n-flex align="center">
          <n-avatar bordered round :src="login.accountInfo.avatar" :size="48" />
          <n-flex vertical>
            <p class="text-(14px [--chat-text-color]) font-semibold">{{ login.accountInfo.name }}</p>
            <p class="text-(12px #909090)">剩余：28天过期</p>
          </n-flex>
        </n-flex>

        <div class="plugins">
          <svg class="size-22px"><use href="#plugins"></use></svg>
          <p>插件</p>
        </div>
      </n-flex>
      <!-- 会话列表 -->
      <n-scrollbar ref="scrollbar" style="max-height: calc(100vh - 266px); padding-right: 8px">
        <n-flex vertical :size="10" style="padding: 4px">
          <TransitionGroup name="list" tag="div" class="flex flex-col-center gap-12px">
            <n-flex
              vertical
              :size="12"
              v-for="item in chatList"
              :key="item.id"
              @click="activeItem = item.id"
              :class="{ 'outline outline-2 outline-#13987f outline-offset-1': activeItem === item.id }"
              class="chat-item">
              <div class="absolute flex flex-col gap-14px w-full p-[8px_14px] box-border">
                <n-flex justify="space-between" align="center" :size="0" class="leading-22px">
                  <p class="text-(14px [--chat-text-color]) font-semibold select-none">{{ item.name }}</p>
                  <svg
                    @click.stop="deleteChat(item)"
                    class="color-[--chat-text-color] size-20px opacity-0 absolute right-0px top-4px">
                    <use href="#squareClose"></use>
                  </svg>
                </n-flex>
                <n-flex justify="space-between" align="center" :size="0" class="text-(12px #909090)">
                  <p>0条对话</p>
                  <p>{{ item.time }}</p>
                </n-flex>
              </div>
            </n-flex>
          </TransitionGroup>
        </n-flex>
      </n-scrollbar>
    </n-flex>

    <!-- 底部选项栏 -->
    <n-flex justify="space-between" align="center" class="m-[auto_4px_10px_4px]">
      <div
        class="bg-[--chat-bt-color] color-[--chat-text-color] size-fit p-[8px_9px] rounded-8px shadow-md cursor-pointer">
        <svg class="size-18px"><use href="#settings"></use></svg>
      </div>

      <n-flex
        :size="4"
        align="center"
        @click="add"
        class="bg-[--chat-bt-color] select-none text-(14px [--chat-text-color]) size-fit p-8px rounded-8px shadow-md cursor-pointer">
        <svg class="size-18px"><use href="#plus"></use></svg>
        <p>新的聊天</p>
      </n-flex>
    </n-flex>
  </n-flex>
</template>
<script setup lang="ts">
import { setting } from '@/stores/setting.ts'
import { storeToRefs } from 'pinia'
import { NIcon, VirtualListInst } from 'naive-ui'

const settingStore = setting()
const { login } = storeToRefs(settingStore)
const activeItem = ref(0)
const scrollbar = ref<VirtualListInst>()
const chatList = ref([
  {
    id: 1,
    name: '新的聊天1',
    time: '2022-01-01 12:00:00'
  },
  {
    id: 2,
    name: '新的聊天2',
    time: '2022-01-01 12:00:00'
  },
  {
    id: 3,
    name: '新的聊天3',
    time: '2022-01-01 12:00:00'
  },
  {
    id: 4,
    name: '新的聊天4',
    time: '2022-01-01 12:00:00'
  }
])

const add = () => {
  const id = chatList.value.length + 1
  chatList.value.push({ id: id, name: `新的聊天${id}`, time: '2022-01-01 12:00:00' })
  // 滚动到最底部
  nextTick(() => {
    scrollbar.value?.scrollTo({ position: 'bottom', debounce: true })
  })
}

const deleteChat = (item: any) => {
  const index = chatList.value.indexOf(item)
  if (index > -1) {
    chatList.value.splice(index, 1)
    window.$message.success(`已删除 ${item.name}`, {
      icon: () => h(NIcon, null, { default: () => h('svg', null, [h('use', { href: '#face' })]) })
    })
    // 判断是否只有一个内容
    if (chatList.value.length === 0) {
      nextTick(() => {
        add()
      })
    }
  }
}
</script>
<style scoped lang="scss">
.gpt-subtitle {
  --un-gradient-from-position: 0%;
  --un-gradient-from: rgba(56, 189, 248, 20) var(--un-gradient-from-position);
  --un-gradient-stops: var(--un-gradient-from), var(--un-gradient-to);
  --un-gradient-to-position: 100%;
  --un-gradient-to: rgba(19, 152, 127, 80) var(--un-gradient-to-position);
  --un-gradient-shape: to right;
  --un-gradient: var(--un-gradient-shape), var(--un-gradient-stops);
  background-image: linear-gradient(var(--un-gradient));
  -webkit-background-clip: text;
  background-clip: text;
  font-size: 20px;
  font-weight: 800;
  color: transparent;
}
.plugins {
  @apply size-fit bg-[--chat-bt-color] rounded-8px shadow-md p-[8px_14px]
  flex items-center gap-10px select-none cursor-pointer
  text-14px color-[--chat-text-color];
}
.chat-item {
  @apply relative bg-[--chat-bt-color] cursor-pointer shadow-md rounded-8px w-full h-65px;
  &:hover {
    @apply bg-[--chat-hover-color];
    svg {
      @apply opacity-100 -translate-x-1 transition-all duration-800 ease-in-out;
    }
  }
}

.list-move, /* 对移动中的元素应用的过渡 */
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-100%);
}
</style>

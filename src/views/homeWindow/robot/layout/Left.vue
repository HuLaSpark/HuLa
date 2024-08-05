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
        <VueDraggable dragClass="outline-none" v-model="chatList" :animation="150" target=".sort-target">
          <TransitionGroup name="list" tag="div" style="padding: 4px" class="sort-target flex flex-col-center gap-12px">
            <n-flex
              vertical
              :size="12"
              v-for="item in chatList"
              :key="item.id"
              @click="handleActive(item)"
              :class="{ 'outline-dashed outline-2 outline-#13987f outline-offset-1': activeItem === item.id }"
              class="chat-item">
              <ContextMenu
                :menu="menuList"
                :special-menu="specialMenuList"
                class="msg-box w-full h-75px mb-5px"
                @select="$event.click(item)">
                <div class="absolute flex flex-col gap-14px w-full p-[8px_14px] box-border">
                  <n-flex justify="space-between" align="center" :size="0" class="leading-22px">
                    <n-ellipsis
                      style="width: calc(100% - 20px)"
                      class="text-(14px [--chat-text-color]) truncate font-semibold select-none">
                      {{ item.title }}
                    </n-ellipsis>
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
              </ContextMenu>
            </n-flex>
          </TransitionGroup>
        </VueDraggable>
      </n-scrollbar>
    </n-flex>

    <!-- 底部选项栏 -->
    <n-flex justify="space-between" align="center" class="m-[auto_4px_10px_4px]">
      <n-flex :size="12" align="center">
        <div
          @click="jump"
          class="bg-[--chat-bt-color] border-(1px solid [--line-color]) color-[--chat-text-color] size-fit p-[8px_9px] rounded-8px custom-shadow cursor-pointer">
          <svg class="size-18px"><use href="#settings"></use></svg>
        </div>
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://github.com/nongyehong/HuLa-IM-Tauri"
          class="bg-[--chat-bt-color] border-(1px solid [--line-color]) color-[--chat-text-color] size-fit p-[8px_9px] rounded-8px custom-shadow cursor-pointer">
          <svg class="size-18px"><use href="#github"></use></svg>
        </a>
      </n-flex>

      <n-flex
        :size="4"
        align="center"
        @click="add"
        class="bg-[--chat-bt-color] border-(1px solid [--line-color]) select-none text-(14px [--chat-text-color]) size-fit p-8px rounded-8px custom-shadow cursor-pointer">
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
import Mitt from '@/utils/Bus.ts'
import { VueDraggable } from 'vue-draggable-plus'
import router from '@/router'

const settingStore = setting()
const { login } = storeToRefs(settingStore)
const activeItem = ref(0)
const scrollbar = ref<VirtualListInst>()
const chatList = ref(
  Array.from({ length: 20 }, (_, index) => ({
    id: index + 1,
    title: `新的聊天${index + 1}`,
    time: '2022-01-01 12:00:00'
  }))
)
const menuList = ref<OPT.RightMenu[]>([
  {
    label: '置顶',
    icon: 'topping',
    click: (item: any) => {
      const index = chatList.value.findIndex((e) => e.id === item.id)
      // 实现置顶功能
      if (index !== 0) {
        // 交换元素位置
        const temp = chatList.value[index]
        chatList.value[index] = chatList.value[0]
        chatList.value[0] = temp
      }
    }
  },
  {
    label: '打开独立聊天窗口',
    icon: 'freezing-line-column',
    click: (item: any) => {
      console.log(item)
    }
  }
])
const specialMenuList = ref<OPT.RightMenu[]>([
  {
    label: '删除',
    icon: 'delete',
    click: (item: any) => {
      deleteChat(item)
    }
  }
])

/** 跳转到设置 */
const jump = () => {
  router.push('/chatSettings')
  activeItem.value = 0
}

/** 选中会话 */
const handleActive = (item: any) => {
  activeItem.value = item.id
  router.push('/chat').then(() => {
    nextTick(() => {
      Mitt.emit('chat-active', item)
    })
  })
}

/** 添加会话 */
const add = () => {
  const id = chatList.value.length + 1
  chatList.value.push({ id: id, title: `新的聊天${id}`, time: '2022-01-01 12:00:00' })
  // 滚动到最底部
  nextTick(() => {
    scrollbar.value?.scrollTo({ position: 'bottom', debounce: true })
  })
}

/** 删除会话 */
const deleteChat = (item: any) => {
  // 根据key找到items中对应的下标
  const index = chatList.value.indexOf(item)

  /**
   * 删除最后一个元素后触发新增元素的函数
   * @param isActive 是否选中新增的元素
   */
  function triggeringAdd(isActive?: boolean) {
    if (chatList.value.length === 0) {
      nextTick(() => {
        add()
        // 选择新增的元素
        if (isActive) {
          handleActive(chatList.value[0])
          window.$message.success(`已删除 ${item.title}`, {
            icon: () => h(NIcon, null, { default: () => h('svg', null, [h('use', { href: '#face' })]) })
          })
        }
      })
    }
  }

  // 如果找到了对应的元素，则移除
  if (index !== -1) {
    const removeItem = chatList.value.splice(index, 1)[0]
    if (activeItem.value === removeItem.id) {
      if (index < chatList.value.length) {
        // 需要使用新的索引位置找到key更新activeItem.value
        activeItem.value = chatList.value[index].id
        handleActive(chatList.value[index])
      } else {
        // 如果选中chatList,并且是最后一个元素则触发新增
        triggeringAdd(true)
        // 如果我们删除的是最后一个元素，则需要选中前一个元素
        activeItem.value = chatList.value[chatList.value.length - 1].id
        handleActive(chatList.value[chatList.value.length - 1])
      }
    }
    // 如果是最后一个元素则触发新增
    triggeringAdd()
    window.$message.success(`已删除 ${item.title}`, {
      icon: () => h(NIcon, null, { default: () => h('svg', null, [h('use', { href: '#face' })]) })
    })
  }
}

onMounted(() => {
  // /** 默认选择第一个聊天内容 */
  // handleActive(chatList.value[0])
  /** 刚加载的时候默认跳转到欢迎页面 */
  router.push('/welcome')
  Mitt.on('update-chat-title', (e) => {
    chatList.value.filter((item) => {
      if (item.id === e.id) {
        item.title = e.title
      }
    })
  })
  Mitt.on('return-chat', () => {
    handleActive(chatList.value[0])
  })
})
</script>
<style scoped lang="scss">
.gpt-subtitle {
  @apply bg-clip-text text-transparent bg-gradient-to-r from-#38BDF8 to-#13987F text-20px font-800;
}
.plugins {
  @apply size-fit bg-[--chat-bt-color] rounded-8px custom-shadow p-[8px_14px]
  flex items-center gap-10px select-none cursor-pointer
  text-14px color-[--chat-text-color] border-(1px solid [--line-color]);
}
.chat-item {
  @apply relative bg-[--chat-bt-color] border-(1px solid [--line-color]) cursor-pointer custom-shadow rounded-8px w-full h-65px;
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

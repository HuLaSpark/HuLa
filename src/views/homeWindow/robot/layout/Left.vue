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
          <n-flex :size="0" align="center">
            <p class="text-(20px [--chat-text-color]) font-semibold select-none">HuLa-</p>
            <p class="gpt-subtitle">ChatBot</p>
            <div class="ml-6px p-[4px_8px] size-fit bg-[--bate-bg] rounded-8px text-(12px [--bate-color] center)">
              Beta
            </div>
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
            <p class="text-(14px [--chat-text-color]) font-500">{{ login.accountInfo.name }}</p>
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
              v-for="(item, index) in chatList"
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
                      v-if="editingItemId !== item.id"
                      style="width: calc(100% - 20px)"
                      class="text-(14px [--chat-text-color]) truncate font-500 select-none">
                      {{ item.title || `新的聊天${index + 1}` }}
                    </n-ellipsis>
                    <n-input
                      v-else
                      @blur="handleBlur(item, index)"
                      ref="inputInstRef"
                      v-model:value="item.title"
                      clearable
                      placeholder="输入标题"
                      type="text"
                      size="tiny"
                      style="width: 200px"
                      class="h-22px lh-22px rounded-6px">
                    </n-input>
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
    <n-flex :size="6" justify="space-between" align="center" class="m-[auto_0_10px_0]">
      <n-flex :size="4" align="center">
        <div
          @click="jump"
          class="bg-[--chat-bt-color] border-(1px solid [--line-color]) color-[--chat-text-color] size-fit p-[8px_9px] rounded-8px custom-shadow cursor-pointer">
          <svg class="size-18px"><use href="#settings"></use></svg>
        </div>
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://github.com/HuLaSpark/HuLa-IM-Tauri"
          class="bg-[--chat-bt-color] border-(1px solid [--line-color]) color-[--chat-text-color] size-fit p-[8px_9px] rounded-8px custom-shadow cursor-pointer">
          <svg class="size-18px"><use href="#github"></use></svg>
        </a>
      </n-flex>

      <n-flex :size="4" align="center">
        <div
          @click="add"
          class="flex items-center justify-center gap-4px bg-[--chat-bt-color] border-(1px solid [--line-color]) select-none text-(12px [--chat-text-color]) size-fit w-80px h-32px rounded-8px custom-shadow cursor-pointer">
          <svg class="size-15px pb-2px"><use href="#plus"></use></svg>
          <p>新的聊天</p>
        </div>
        <n-popconfirm v-model:show="showDeleteConfirm">
          <template #icon>
            <svg class="size-22px"><use href="#explosion"></use></svg>
          </template>
          <template #action>
            <n-button size="small" tertiary @click.stop="showDeleteConfirm = false">取消</n-button>
            <n-button size="small" type="error" @click.stop="deleteChat()">删除</n-button>
          </template>
          <template #trigger>
            <div
              class="flex items-center justify-center gap-4px bg-[--chat-bt-color] border-(1px solid [--line-color]) select-none text-(12px [--chat-text-color]) size-fit w-80px h-32px rounded-8px custom-shadow cursor-pointer">
              <svg class="size-15px pb-2px"><use href="#delete"></use></svg>
              <p>全部删除</p>
            </div>
          </template>
          你确定要删除全部会话吗？
        </n-popconfirm>
      </n-flex>
    </n-flex>
  </n-flex>
</template>
<script setup lang="ts">
import { setting } from '@/stores/setting.ts'
import { NIcon, VirtualListInst, InputInst } from 'naive-ui'
import Mitt from '@/utils/Bus.ts'
import { VueDraggable } from 'vue-draggable-plus'
import router from '@/router'

const settingStore = setting()
const { login } = storeToRefs(settingStore)
const activeItem = ref(0)
const scrollbar = ref<VirtualListInst>()
const inputInstRef = ref<InputInst | null>(null)
const editingItemId = ref<number | null>()
/** 原始标题 */
const originalTitle = ref('')
const showDeleteConfirm = ref(false)
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
  },
  {
    label: '重命名',
    icon: 'edit',
    click: (item: any) => {
      renameChat(item)
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
const deleteChat = (item?: any) => {
  showDeleteConfirm.value = false
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

  //如果没有传值，则删除全部
  if (!item) {
    //删除全部的逻辑
    if (chatList.value.length > 0) {
      chatList.value.shift()
      deleteChat()
    } else {
      triggeringAdd(true)
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

/** 重命名 */
const renameChat = (item: any) => {
  originalTitle.value = item.title
  editingItemId.value = item.id
  nextTick(() => {
    inputInstRef.value?.select()
  })
}

const handleBlur = (item: any, index: number) => {
  editingItemId.value = null
  if (originalTitle.value === item.title) {
    return
  }
  if (chatList.value[index].title === '') {
    chatList.value[index].title = `新的聊天${item.id}`
    return
  }
  const newTitle = chatList.value[index].title
  window.$message.success(`已重命名为 ${newTitle}`, {
    icon: () => h(NIcon, null, { default: () => h('svg', null, [h('use', { href: '#face' })]) })
  })
  Mitt.emit('left-chat-title', { id: item.id, title: newTitle })
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

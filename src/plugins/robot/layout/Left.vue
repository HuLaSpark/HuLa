<template>
  <n-flex
    data-tauri-drag-region
    vertical
    :size="0"
    class="bg-[--chat-left-bg] select-none w-300px h-full p-[40px_20px_6px_20px] box-border">
    <n-flex vertical :size="30" data-tauri-drag-region>
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
          <n-avatar bordered round :src="AvatarUtils.getAvatarUrl(userStore.userInfo!.avatar!)" :size="48" />
          <n-flex vertical>
            <p class="text-(14px [--chat-text-color]) font-500">{{ userStore.userInfo!.name }}</p>
            <p class="text-(12px #909090)">剩余：28天过期</p>
          </n-flex>
        </n-flex>

        <div class="plugins">
          <svg class="size-22px"><use href="#plugins"></use></svg>
          <p>插件</p>
        </div>
      </n-flex>
      <!-- 会话列表 -->
      <n-scrollbar
        ref="scrollbar"
        style="max-height: calc(100vh / var(--page-scale, 1) - 266px); padding-right: 8px"
        @scroll="handleScroll">
        <!-- 加载状态 -->
        <div v-if="loading && pageNo === 1" class="flex justify-center items-center py-20px">
          <n-spin size="small" />
          <span class="ml-10px text-(12px #909090)">加载中...</span>
        </div>

        <!-- 空状态 -->
        <div
          v-else-if="chatList.length === 0"
          class="flex flex-col items-center justify-center py-20px text-(12px #909090)">
          <svg class="size-40px mb-10px opacity-50"><use href="#empty"></use></svg>
          <p>暂无会话，点击下方按钮开始新的聊天</p>
        </div>

        <TransitionGroup
          v-else
          name="list"
          tag="div"
          style="padding: 4px"
          class="sort-target flex flex-col-center gap-12px">
          <div
            v-for="(item, index) in chatList"
            :key="item.id"
            @click="handleActive(item)"
            :class="['chat-item', activeItem === item.id ? 'chat-item-active' : '']">
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
                    {{ item.title || `会话 ${index + 1}` }}
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
                    spellCheck="false"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    style="width: 200px"
                    class="h-22px lh-22px rounded-6px"></n-input>
                  <svg
                    @click.stop="deleteChat(item)"
                    class="color-[--chat-text-color] size-20px opacity-0 absolute right-0px top-4px">
                    <use href="#squareClose"></use>
                  </svg>
                </n-flex>
                <n-flex justify="space-between" align="center" :size="0" class="text-(12px #909090)">
                  <p>{{ item.messageCount || 0 }}条对话</p>
                  <p>{{ formatTime(item.createTime) }}</p>
                </n-flex>
              </div>
            </ContextMenu>
          </div>
        </TransitionGroup>

        <!-- 加载更多 -->
        <div v-if="hasMore" class="flex justify-center items-center py-16px">
          <n-button v-if="!loadingMore" size="small" tertiary @click="loadMore">加载更多</n-button>
          <n-spin v-else size="small" />
          <span v-if="loadingMore" class="ml-10px text-(12px #909090)">加载中...</span>
        </div>

        <!-- 没有更多数据 -->
        <div v-else-if="chatList.length > 0" class="flex justify-center items-center py-16px text-(12px #909090)">
          <span>没有更多会话了</span>
        </div>
      </n-scrollbar>
    </n-flex>

    <!-- 底部选项栏 -->
    <n-flex data-tauri-drag-region :size="6" justify="space-between" align="center" class="m-[auto_0_10px_0]">
      <n-flex :size="4" align="center">
        <div
          @click="jump"
          class="bg-[--chat-bt-color] border-(1px solid [--line-color]) color-[--chat-text-color] size-fit p-[8px_9px] rounded-8px custom-shadow cursor-pointer">
          <svg class="size-18px"><use href="#settings"></use></svg>
        </div>
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://github.com/HuLaSpark/HuLa"
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
            <n-button size="small" type="error" @click.stop="deleteAllChats">删除</n-button>
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
import { type InputInst, type VirtualListInst, NSpin, NButton } from 'naive-ui'
import { useMitt } from '@/hooks/useMitt.ts'
import router from '@/router'
import { useUserStore } from '@/stores/user.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { conversationPage, conversationCreateMy, conversationDeleteMy } from '@/utils/ImRequestUtils'

const userStore = useUserStore()
const activeItem = ref<string>('')
const scrollbar = ref<VirtualListInst>()
const inputInstRef = ref<InputInst | null>(null)
const editingItemId = ref<string | null>()
const loading = ref(false)
const loadingMore = ref(false)
/** 原始标题 */
const originalTitle = ref('')
const showDeleteConfirm = ref(false)

// 分页参数
const pageNo = ref(1)
const pageSize = ref(20)
const hasMore = ref(true)
const total = ref(0)

// 会话列表数据
interface ChatItem {
  id: string
  title?: string
  createTime: string
  messageCount?: number
  isPinned?: boolean
}

const chatList = ref<ChatItem[]>([])

// 获取会话列表
const fetchConversationList = async (isLoadMore = false) => {
  if (isLoadMore) {
    loadingMore.value = true
  } else {
    loading.value = true
    pageNo.value = 1
    hasMore.value = true
  }

  try {
    const data = await conversationPage({
      pageNo: pageNo.value,
      pageSize: pageSize.value
    })

    if (data && data.list) {
      const newChats = data.list.map((item: any) => ({
        id: item.id,
        title: item.title || `会话 ${item.id}`,
        createTime: item.createTime,
        messageCount: item.messageCount || 0,
        isPinned: item.isPinned || false
      }))

      if (isLoadMore) {
        // 加载更多时追加数据
        chatList.value = [...chatList.value, ...newChats]
      } else {
        // 首次加载时替换数据
        chatList.value = newChats
      }

      // 更新分页信息
      total.value = data.total || 0
      hasMore.value = chatList.value.length < total.value

      // 如果还有更多数据，增加页码
      if (hasMore.value) {
        pageNo.value++
      }
    }
  } catch (error) {
    console.error('获取会话列表失败:', error)
    window.$message.error('获取会话列表失败')
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

// 加载更多
const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return
  await fetchConversationList(true)
}

// 滚动事件处理
const handleScroll = (e: Event) => {
  const scrollElement = e.target as HTMLElement
  const { scrollTop, scrollHeight, clientHeight } = scrollElement

  // 滚动到底部时自动加载更多（距离底部100px时触发）
  if (scrollHeight - scrollTop - clientHeight < 100 && !loadingMore.value && hasMore.value) {
    loadMore()
  }
}

// 刷新会话列表
const refreshConversationList = async () => {
  pageNo.value = 1
  await fetchConversationList(false)
}

// 格式化时间显示
const formatTime = (timeStr: string) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
  }
}

const menuList = ref<OPT.RightMenu[]>([
  {
    label: '置顶',
    icon: 'topping',
    click: (item: ChatItem) => {
      const index = chatList.value.findIndex((e) => e.id === item.id)
      if (index !== 0) {
        const temp = chatList.value[index]
        chatList.value[index] = chatList.value[0]
        chatList.value[0] = temp
      }
    }
  },
  {
    label: '打开独立聊天窗口',
    icon: 'freezing-line-column',
    click: (item: ChatItem) => {
      console.log('打开独立窗口:', item)
    }
  },
  {
    label: '重命名',
    icon: 'edit',
    click: (item: ChatItem) => {
      renameChat(item)
    }
  }
])

const specialMenuList = ref<OPT.RightMenu[]>([
  {
    label: '删除',
    icon: 'delete',
    click: (item: ChatItem) => {
      deleteChat(item)
    }
  }
])

/** 跳转到设置 */
const jump = () => {
  router.push('/chatSettings')
  activeItem.value = ''
}

/** 选中会话 */
const handleActive = (item: ChatItem) => {
  activeItem.value = item.id
  router.push('/chat').then(() => {
    nextTick(() => {
      useMitt.emit('chat-active', item)
    })
  })
}

/** 添加会话 */
const add = async () => {
  try {
    const response = await conversationCreateMy({
      roleId: undefined,
      knowledgeId: undefined,
      title: '新的会话'
    })

    if (response.code === 200 && response.data) {
      const newChat: ChatItem = {
        id: response.data,
        title: '新的会话',
        createTime: new Date().toISOString(),
        messageCount: 0
      }

      // 新会话添加到列表顶部
      chatList.value.unshift(newChat)
      activeItem.value = newChat.id

      // 滚动到顶部
      nextTick(() => {
        scrollbar.value?.scrollTo({ position: 'top' })
      })

      window.$message.success('会话创建成功')
    }
  } catch (error) {
    console.error('创建会话失败:', error)
    window.$message.error('创建会话失败')
  }
}

/** 删除单个会话 */
const deleteChat = async (item: ChatItem) => {
  try {
    const response = await conversationDeleteMy({ id: item.id })

    if (response.code === 200) {
      const index = chatList.value.findIndex((chat) => chat.id === item.id)
      if (index !== -1) {
        chatList.value.splice(index, 1)

        // 如果删除的是当前选中的会话，需要重新选择
        if (activeItem.value === item.id) {
          if (chatList.value.length > 0) {
            activeItem.value = chatList.value[0]?.id || ''
          } else {
            activeItem.value = ''
            await add() // 如果没有会话了，创建一个新的
          }
        }

        window.$message.success('会话删除成功')
      }
    }
  } catch (error) {
    console.error('删除会话失败:', error)
    window.$message.error('删除会话失败')
  }
}

/** 删除全部会话 */
const deleteAllChats = async () => {
  try {
    // 这里需要调用删除全部会话的接口
    // 暂时先清空本地列表
    chatList.value = []
    activeItem.value = ''
    showDeleteConfirm.value = false

    // 如果没有会话了，自动创建一个新的
    await add()

    window.$message.success('全部会话已删除')
  } catch (error) {
    console.error('删除全部会话失败:', error)
    window.$message.error('删除全部会话失败')
  }
}

/** 重命名 */
const renameChat = (item: ChatItem) => {
  originalTitle.value = item.title || ''
  editingItemId.value = item.id
  nextTick(() => {
    inputInstRef.value?.select()
  })
}

const handleBlur = async (item: ChatItem, index: number) => {
  editingItemId.value = null

  if (originalTitle.value === item.title) {
    return
  }

  if (!item.title || item.title.trim() === '') {
    chatList.value[index].title = `会话 ${item.id}`
    return
  }

  window.$message.success(`已重命名为 ${item.title}`)
  useMitt.emit('left-chat-title', { id: item.id, title: item.title })
}

onMounted(() => {
  // 加载会话列表
  fetchConversationList()

  /** 刚加载的时候默认跳转到欢迎页面 */
  router.push('/welcome')

  useMitt.on('update-chat-title', (e: any) => {
    chatList.value.filter((item) => {
      if (item.id === e.id) {
        item.title = e.title
      }
    })
  })

  useMitt.on('return-chat', () => {
    if (chatList.value.length > 0) {
      handleActive(chatList.value[0])
    }
  })

  // 监听会话刷新事件
  useMitt.on('refresh-conversations', () => {
    refreshConversationList()
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
  transition: all 0.2s ease;

  &:hover {
    @apply bg-[--chat-hover-color];
    svg {
      @apply opacity-100 -translate-x-1 transition-all duration-800 ease-in-out;
    }
  }
}

.chat-item-active {
  border: 1px dashed #13987f;
  box-shadow: 0 0 0 1px rgba(19, 152, 127, 0.1) inset;
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

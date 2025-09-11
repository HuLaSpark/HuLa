<template>
  <div class="chat-history-container">
    <!--顶部操作栏-->
    <ActionBar :shrink="false" />

    <!-- 搜索栏 -->
    <div class="search-section select-none">
      <n-input v-model:value="searchKeyword" placeholder="搜索" clearable @input="handleSearch">
        <template #prefix>
          <svg class="search-icon"><use href="#search"></use></svg>
        </template>
      </n-input>
    </div>

    <!-- Tab 选项卡和筛选按钮 -->
    <div class="tab-section select-none">
      <n-tabs v-model:value="activeTab" @update:value="handleTabChange">
        <n-tab-pane name="all" tab="全部" />
        <n-tab-pane name="image" tab="图片/视频" />
        <n-tab-pane name="file" tab="文件" />
      </n-tabs>

      <div class="filter-section">
        <n-button quaternary circle @click="showDatePicker = true">
          <template #icon>
            <svg class="filter-icon"><use href="#filter"></use></svg>
          </template>
        </n-button>
      </div>
    </div>

    <!-- 消息列表 -->
    <div class="flex-1 overflow-hidden select-none">
      <n-infinite-scroll :distance="10" @load="loadMore">
        <div v-if="loading" class="flex-center h-200px">
          <n-spin size="medium" />
        </div>

        <div v-else-if="messages.length === 0" class="flex-center h-200px">
          <n-empty description="暂无消息记录" />
        </div>

        <div v-else class="px-20px py-16px">
          <!-- 按日期分组的消息 -->
          <div v-for="(group, date) in groupedMessages" :key="date" class="date-group">
            <n-tag type="warning" class="text-12px rounded-8px">{{ formatTimestamp(Number(new Date(date))) }}</n-tag>

            <template v-for="message in group" :key="message.message.id">
              <div v-if="message.message.type !== MsgEnum.BOT" class="px-4px py-12px mb-16px">
                <!-- 消息头像和信息 -->
                <div class="flex">
                  <n-avatar
                    :size="32"
                    :src="getAvatarSrc(message.fromUser.uid)"
                    class="rounded-6px mr-8px"
                    fallback-src="/default-avatar.png" />

                  <div class="flex-y-center gap-12px h-fit">
                    <p class="text-(14px #909090)">{{ getUserDisplayName(message.fromUser.uid) }}</p>
                    <p class="text-(12px #909090)">{{ formatTime(message.message.sendTime) }}</p>
                  </div>
                </div>

                <ContextMenu
                  :content="message"
                  style="user-select: text !important"
                  class="w-fit relative flex flex-col pl-44px text-(14px [--text-color]) leading-26px"
                  :data-key="message.fromUser.uid === userUid ? `U${message.message.id}` : `Q${message.message.id}`"
                  :style="{ '--bubble-max-width': isGroup ? '32vw' : '50vw' }"
                  @select="$event.click(message)">
                  <RenderMessage :message="message.message" :from-user-uid="message.fromUser.uid" />
                </ContextMenu>
              </div>
            </template>
          </div>
        </div>
      </n-infinite-scroll>
    </div>

    <!-- 日期选择器模态框 -->
    <n-modal v-model:show="showDatePicker" preset="card" title="筛选日期">
      <div class="date-picker-content">
        <n-date-picker v-model:value="dateRange" type="daterange" clearable placeholder="选择日期范围" />

        <div class="date-picker-actions">
          <n-button @click="showDatePicker = false">取消</n-button>
          <n-button type="primary" @click="applyDateFilter">确定</n-button>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useDebounceFn } from '@vueuse/core'
import { useRoute } from 'vue-router'
import { MsgEnum, TauriCommand } from '@/enums'
import type { MessageType } from '@/services/types'
import { useChatStore } from '@/stores/chat'
import { useGroupStore } from '@/stores/group'
import { useUserStore } from '@/stores/user'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { formatTimestamp } from '@/utils/ComputedTime.ts'

type ChatHistoryResponse = {
  messages: MessageType[]
  total: number
  hasMore: boolean
  currentPage: number
}

const route = useRoute()
const userStore = useUserStore()
const groupStore = useGroupStore()
const chatStore = useChatStore()

const isGroup = computed(() => chatStore.isGroup)
const userUid = computed(() => userStore.userInfo!.uid)

// 响应式数据
const messages = ref<MessageType[]>([])
const loading = ref(false)
const hasMore = ref(true)
const currentPage = ref(1)
const total = ref(0)

// 搜索和筛选
const searchKeyword = ref('')
const activeTab = ref<'all' | 'image' | 'file'>('all')
const showDatePicker = ref(false)
const dateRange = ref<[number, number] | null>(null)

// 从路由参数获取房间ID
const roomId = computed(() => route.query.roomId as string)

// 防抖搜索
const handleSearch = useDebounceFn(() => {
  resetAndReload()
}, 500)

// 获取用户头像
const getAvatarSrc = (uid: string) => {
  const avatar = uid === userUid.value ? userStore.userInfo!.avatar : groupStore.getUserInfo(uid)?.avatar
  return AvatarUtils.getAvatarUrl(avatar as string)
}

// 我的群昵称
const getUserDisplayName = computed(() => (uid: string) => {
  const user = groupStore.userList.find((user) => user.uid === uid)
  return user?.myName || user?.name || ''
})

// Tab切换处理
const handleTabChange = () => {
  resetAndReload()
}

// 应用日期筛选
const applyDateFilter = () => {
  showDatePicker.value = false
  resetAndReload()
}

// 重置并重新加载
const resetAndReload = () => {
  messages.value = []
  currentPage.value = 1
  hasMore.value = true
  loadMessages()
}

// 按日期分组消息
const groupedMessages = computed(() => {
  const groups: Record<string, MessageType[]> = {}

  messages.value.forEach((i) => {
    if (i.message.sendTime) {
      const date = new Date(i.message.sendTime).toDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(i)
    }
  })

  return groups
})

// 格式化时间
const formatTime = (timestamp?: number) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 加载消息
const loadMessages = async () => {
  if (!roomId.value) return

  if (currentPage.value === 1) {
    loading.value = true
  }

  try {
    const params = {
      roomId: roomId.value,
      messageType: activeTab.value,
      searchKeyword: searchKeyword.value || undefined,
      sortOrder: 'desc',
      pagination: {
        page: currentPage.value,
        pageSize: 50
      }
    }

    const response = await invoke<ChatHistoryResponse>(TauriCommand.QUERY_CHAT_HISTORY, { param: params })

    if (currentPage.value === 1) {
      messages.value = response.messages
    } else {
      messages.value.push(...response.messages)
    }

    total.value = response.total
    hasMore.value = response.hasMore
  } catch (error) {
    console.error('加载聊天记录失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载更多
const loadMore = () => {
  if (hasMore.value) {
    currentPage.value++
    loadMessages()
  }
}

// 监听房间ID变化
watch(
  roomId,
  () => {
    if (roomId.value) {
      resetAndReload()
    }
  },
  { immediate: true }
)

onMounted(async () => {
  await getCurrentWebviewWindow().show()
  if (roomId.value) {
    loadMessages()
  }
})
</script>

<style scoped lang="scss">
.chat-history-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-left-menu);
}

.chat-history-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--header-bg);

  .header-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-color);
  }
}

.search-section {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);

  .search-icon {
    width: 16px;
    height: 16px;
    color: var(--text-color);
  }
}

.tab-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid var(--border-color);

  .filter-section {
    .filter-icon {
      width: 16px;
      height: 16px;
    }
  }
}

.message-content {
  margin-left: 44px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-color);
  word-wrap: break-word;
  word-break: break-all;
}

.text-message {
  line-height: 1.5;
  color: var(--text-color);
}

.image-message {
  .message-image {
    max-width: 200px;
    max-height: 200px;
    border-radius: 8px;
    cursor: pointer;
    transition: transform 0.2s ease;
  }
}

.file-message {
  .file-info {
    display: flex;
    align-items: center;
    padding: 12px;
    background: var(--file-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover {
      background: var(--file-hover-bg);
    }

    .file-icon {
      width: 24px;
      height: 24px;
      color: var(--primary-color);
      margin-right: 12px;
    }

    .file-details {
      .file-name {
        font-size: 14px;
        color: var(--text-color);
        margin-bottom: 2px;
      }

      .file-size {
        font-size: 12px;
        color: var(--text-color);
      }
    }
  }
}

.date-picker-content {
  .date-picker-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 16px;
  }
}
</style>

<template>
  <div class="chat-history-container">
    <!--顶部操作栏-->
    <ActionBar :shrink="false" />

    <!-- 搜索栏 -->
    <div class="search-section select-none">
      <n-input
        spellCheck="false"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        v-model:value="searchKeyword"
        size="small"
        :placeholder="t('chatHistory.search.placeholder')"
        clearable
        @input="handleSearch">
        <template #prefix>
          <svg class="search-icon"><use href="#search"></use></svg>
        </template>
      </n-input>
    </div>

    <!-- Tab 选项卡和筛选按钮 -->
    <div class="tab-section select-none">
      <n-tabs v-model:value="activeTab" @update:value="resetAndReload">
        <n-tab-pane name="all" :tab="t('chatHistory.tabs.all')" />
        <n-tab-pane name="image" :tab="t('chatHistory.tabs.imageVideo')" />
        <n-tab-pane name="file" :tab="t('chatHistory.tabs.file')" />
      </n-tabs>

      <n-date-picker
        v-model:value="dateRange"
        type="daterange"
        :placeholder="t('chatHistory.datePicker.placeholder')"
        clearable
        size="small"
        @update:value="handleDateChange"
        :start-placeholder="t('chatHistory.datePicker.start')"
        :end-placeholder="t('chatHistory.datePicker.end')"
        format="yyyy-MM-dd"
        value-format="timestamp" />
    </div>

    <!-- 消息列表 -->
    <div class="flex-1 overflow-auto select-none">
      <n-infinite-scroll :distance="10" @load="loadMore">
        <div v-if="messages.length === 0 && !loading" class="flex-center h-200px">
          <n-empty :description="t('chatHistory.empty.noData')" />
        </div>

        <div v-else class="px-20px py-16px">
          <!-- 按日期分组的消息 -->
          <div v-for="(group, date) in groupedMessages" :key="date">
            <n-tag type="warning" class="date-tag-sticky text-12px rounded-8px">
              {{ formatDateGroupLabel(group.timestamp) }}
            </n-tag>

            <template v-for="item in group.messages" :key="item.message.id">
              <div class="px-4px py-12px mb-16px">
                <!-- 消息头像和信息 -->
                <div class="flex cursor-default">
                  <n-avatar
                    :size="32"
                    :src="getAvatarSrc(item.fromUser.uid)"
                    class="rounded-10px mr-12px"
                    fallback-src="/default-avatar.png" />

                  <div class="flex-y-center gap-12px h-fit">
                    <p class="text-(14px #909090)">{{ getUserDisplayName(item.fromUser.uid) }}</p>
                    <p class="text-(12px #909090)">{{ formatTime(item.message.sendTime) }}</p>
                  </div>
                </div>

                <ContextMenu
                  :content="item"
                  class="w-fit max-w-80vw break-words relative flex flex-col pl-44px text-(14px [--text-color]) leading-26px user-select-text"
                  :data-key="item.fromUser.uid === userUid ? `U${item.message.id}` : `Q${item.message.id}`"
                  :special-menu="specialMenuList(item.message.type)"
                  @select="$event.click(item)">
                  <RenderMessage
                    :message="item"
                    :from-user="item.fromUser"
                    :is-group="isGroup"
                    :on-image-click="handleImageClick"
                    :on-video-click="handleVideoClick"
                    :search-keyword="searchKeyword"
                    :history-mode="true" />
                </ContextMenu>
              </div>
            </template>
          </div>
        </div>
      </n-infinite-scroll>
    </div>
  </div>
</template>

<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useDebounceFn } from '@vueuse/core'
import { useRoute } from 'vue-router'
import { MsgEnum, TauriCommand } from '@/enums'
import { useChatMain } from '@/hooks/useChatMain'
import { useImageViewer } from '@/hooks/useImageViewer'
import { useVideoViewer } from '@/hooks/useVideoViewer'
import type { MessageType } from '@/services/types'
import { useChatStore } from '@/stores/chat'
import { useGroupStore } from '@/stores/group'
import { useUserStore } from '@/stores/user'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { formatDateGroupLabel } from '@/utils/ComputedTime'
import { useI18n } from 'vue-i18n'

type ChatHistoryResponse = {
  messages: MessageType[]
  hasMore: boolean
  currentPage: number
}

const route = useRoute()
const userStore = useUserStore()
const groupStore = useGroupStore()
const chatStore = useChatStore()
const { openImageViewer } = useImageViewer()
const { openVideoViewer } = useVideoViewer()
const { specialMenuList } = useChatMain(true, { disableHistoryActions: true })
const { t } = useI18n()

const isGroup = computed(() => chatStore.isGroup)
const userUid = computed(() => userStore.userInfo!.uid)

// 响应式数据
const messages = ref<MessageType[]>([])
const loading = ref(false)
const hasMore = ref(true)
const currentPage = ref(1)

// 搜索和筛选
const searchKeyword = ref('')
const activeTab = ref<'all' | 'image' | 'file'>('all')
const dateRange = ref<[number, number] | null>(null)

// 从路由参数获取房间ID
const roomId = computed(() => route.query.roomId as string)

// 我的群昵称
const getUserDisplayName = computed(() => (uid: string) => {
  const user = groupStore.getUserInfo(uid)
  return user?.myName || user?.name || ''
})

// 获取当前页面的所有视频URL
const getAllVideoUrls = computed(() => {
  const videoUrls: string[] = []
  messages.value.forEach((message) => {
    if (message.message.type === MsgEnum.VIDEO && message.message.body?.url) {
      videoUrls.push(message.message.body.url)
    }
  })
  return videoUrls
})

// 按日期分组消息
const groupedMessages = computed(() => {
  const groups: Record<string, { messages: MessageType[]; timestamp: number }> = {}

  messages.value.forEach((i) => {
    // 排除BOT、SYSTEM以及撤回类消息
    if (
      i.message.sendTime &&
      i.message.type !== MsgEnum.BOT &&
      i.message.type !== MsgEnum.SYSTEM &&
      i.message.type !== MsgEnum.RECALL
    ) {
      const date = new Date(i.message.sendTime).toDateString()
      if (!groups[date]) {
        groups[date] = {
          messages: [],
          timestamp: i.message.sendTime
        }
      }
      groups[date].messages.push(i)
    }
  })

  return groups
})

// 防抖搜索
const handleSearch = useDebounceFn(() => {
  resetAndReload()
}, 300)

// 处理日期筛选变化
const handleDateChange = useDebounceFn((value) => {
  if (Array.isArray(value) && value.length === 2 && value[0] && value[1]) {
    // 修复日期边界问题：如果选择同一天，结束时间应该是当天的23:59:59.999
    let startTime = value[0]
    let endTime = value[1]

    const startDate = new Date(startTime)
    const endDate = new Date(endTime)

    // 检查是否是同一天（日期选择器可能返回同样的时间戳）
    const isSameDay = startDate.toDateString() === endDate.toDateString()

    if (isSameDay) {
      // 如果是同一天，调整时间范围
      const adjustedStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0)
      const adjustedEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999)

      startTime = adjustedStart.getTime()
      endTime = adjustedEnd.getTime()

      // 更新 dateRange 的值
      dateRange.value = [startTime, endTime]
    } else {
      // 如果是不同天，确保结束时间是当天的最后一刻
      const adjustedEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999)
      endTime = adjustedEnd.getTime()

      if (endTime !== value[1]) {
        dateRange.value = [startTime, endTime]
      }
    }
  }

  resetAndReload()
}, 300)

// 获取用户头像
const getAvatarSrc = (uid: string) => {
  const avatar = uid === userUid.value ? userStore.userInfo!.avatar : groupStore.getUserInfo(uid)?.avatar
  return AvatarUtils.getAvatarUrl(avatar as string)
}

// 重置并重新加载
const resetAndReload = () => {
  messages.value = []
  currentPage.value = 1
  hasMore.value = true
  loadMessages()
}

// 格式化时间
const formatTime = (timestamp?: number) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取当前页面的所有图片和表情URL
const getAllImageUrls = computed(() => {
  const imageUrls: string[] = []
  messages.value.forEach((message) => {
    if (
      (message.message.type === MsgEnum.IMAGE || message.message.type === MsgEnum.EMOJI) &&
      message.message.body?.url
    ) {
      imageUrls.push(message.message.body.url)
    }
  })
  return imageUrls
})

// 处理图片和表情点击事件
const handleImageClick = async (imageUrl: string) => {
  const imageList = getAllImageUrls.value
  await openImageViewer(imageUrl, [MsgEnum.IMAGE, MsgEnum.EMOJI], imageList)
}

// 处理视频点击事件
const handleVideoClick = async (videoUrl: string) => {
  const videoList = getAllVideoUrls.value
  const currentIndex = videoList.indexOf(videoUrl)

  if (currentIndex === -1) {
    await openVideoViewer(videoUrl, [MsgEnum.VIDEO], [videoUrl])
  } else {
    // 使用多视频模式
    await openVideoViewer(videoUrl, [MsgEnum.VIDEO], videoList)
  }
}

// 加载消息
const loadMessages = async () => {
  if (!roomId.value) return

  loading.value = true

  try {
    const params = {
      roomId: roomId.value,
      messageType: activeTab.value,
      searchKeyword: searchKeyword.value || undefined,
      sortOrder: 'desc',
      dateRange: dateRange.value
        ? {
            startTime: dateRange.value[0],
            endTime: dateRange.value[1]
          }
        : undefined,
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
}

.date-tag-sticky {
  position: sticky;
  top: 4px;
  z-index: 10;
  padding: 6px 12px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.user-select-text {
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
  user-select: text !important;
}
</style>
<style lang="scss">
.n-date-panel .n-date-panel-dates .n-date-panel-date.n-date-panel-date--selected::after {
  background-color: #13987f;
}
.n-date-panel.n-date-panel--daterange {
  border-radius: 14px;
}

.n-date-panel-actions .n-button {
  background-color: rgba(19, 152, 127, 0.1) !important;
  border: none !important;
  color: #13987f !important;
}
</style>

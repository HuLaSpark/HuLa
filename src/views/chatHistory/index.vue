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
      <n-tabs v-model:value="activeTab" @update:value="resetAndReload">
        <n-tab-pane name="all" tab="全部" />
        <n-tab-pane name="image" tab="图片/视频" />
        <n-tab-pane name="file" tab="文件" />
      </n-tabs>
    </div>

    <!-- 消息列表 -->
    <div class="flex-1 overflow-auto select-none">
      <n-infinite-scroll :distance="10" @load="loadMore">
        <div v-if="messages.length === 0 && !loading" class="flex-center h-200px">
          <n-empty description="暂无消息记录" />
        </div>

        <div v-else class="px-20px py-16px">
          <!-- 按日期分组的消息 -->
          <div v-for="(group, date) in groupedMessages" :key="date">
            <n-tag type="warning" class="date-tag-sticky text-12px rounded-8px">
              {{ formatDateGroupLabel(group.timestamp) }}
            </n-tag>

            <template v-for="message in group.messages" :key="message.message.id">
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
                  <RenderMessage
                    :message="message"
                    :from-user="message.fromUser"
                    :is-group="isGroup"
                    :on-image-click="handleImageClick"
                    :on-video-click="handleVideoClick"
                    :search-keyword="searchKeyword" />
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
import { useImageViewer } from '@/hooks/useImageViewer'
import { useVideoViewer } from '@/hooks/useVideoViewer'
import type { MessageType } from '@/services/types'
import { useChatStore } from '@/stores/chat'
import { useGroupStore } from '@/stores/group'
import { useUserStore } from '@/stores/user'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { formatDateGroupLabel } from '@/utils/ComputedTime'

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

// 从路由参数获取房间ID
const roomId = computed(() => route.query.roomId as string)

// 我的群昵称
const getUserDisplayName = computed(() => (uid: string) => {
  const user = groupStore.userList.find((user) => user.uid === uid)
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
    if (i.message.sendTime) {
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
}, 500)

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
    console.warn('视频不在当前列表中，使用单视频模式')
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
</style>

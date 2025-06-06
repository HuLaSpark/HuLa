<template>
  <n-flex :size="14" vertical justify="center" class="p-14px text-(12px #909090)">
    <!-- 搜索结果为空时显示建议和历史记录 -->
    <template v-if="searchResults.length === 0 && !searchQuery">
      <!-- 搜索建议 -->
      <p class="text-(12px #909090)">搜索建议</p>
      <n-flex align="center" class="text-(12px #909090)">
        <p class="p-6px bg-[--search-color] rounded-8px cursor-pointer" @click="applySearchTerm('hula')">hula</p>
      </n-flex>

      <span :class="{ 'mb-10px': historyList.length > 0 }" class="w-full h-1px bg-[--line-color]"></span>

      <!-- 历史记录 -->
      <n-flex v-if="historyList.length > 0" align="center" justify="space-between">
        <p class="text-(12px #909090)">历史记录</p>
        <p class="cursor-pointer text-(12px #13987f)" @click="clearHistory">清除</p>
      </n-flex>

      <n-flex
        v-else
        align="center"
        :size="14"
        class="p-6px mb-6px mr-10px cursor-pointer rounded-8px hover:bg-[--list-hover-color]">
        <n-avatar :size="38" round src="msgAction/clapping.png" />
        <p class="text-(12px [--chat-text-color]) flex-1 truncate">在搜索框内搜索</p>
      </n-flex>

      <n-scrollbar style="max-height: calc(100vh - 212px)">
        <template v-for="(item, _index) in historyList" :key="_index">
          <n-flex
            align="center"
            :size="14"
            class="p-6px mb-6px mr-10px cursor-pointer rounded-8px hover:bg-[--list-hover-color]"
            @click="openConversation(item)">
            <n-avatar :size="38" round bordered :src="AvatarUtils.getAvatarUrl(item.avatar)" />
            <p class="text-(14px [--text-color]) flex-1 truncate">{{ item.name }}</p>
          </n-flex>
        </template>
      </n-scrollbar>
    </template>

    <!-- 搜索结果 -->
    <template v-else-if="searchResults.length > 0">
      <p class="text-(12px #909090) mb-6px">搜索结果</p>

      <n-scrollbar style="max-height: calc(100vh - 142px)">
        <template v-for="item in searchResults" :key="item.roomId">
          <n-flex
            align="center"
            :size="14"
            class="p-6px mb-6px mr-10px cursor-pointer rounded-8px hover:bg-[--list-hover-color]"
            @click="openConversation(item)">
            <n-avatar :size="38" round bordered :src="AvatarUtils.getAvatarUrl(item.avatar)" />
            <p class="text-(14px [--text-color])">{{ item.name }}</p>
          </n-flex>
        </template>
      </n-scrollbar>
    </template>

    <!-- 没有搜索结果时 -->
    <template v-else-if="searchQuery && searchResults.length === 0">
      <div style="height: calc(100vh - 212px)" class="flex-col-center gap-12px">
        <img class="size-64px" src="/msgAction/exploding-head.png" />
        <p class="text-(12px [--chat-text-color])">未找到相关结果</p>
      </div>
    </template>
  </n-flex>
</template>

<script setup lang="ts">
import { AvatarUtils } from '@/utils/AvatarUtils'
import { useChatStore } from '@/stores/chat.ts'
import { useRouter } from 'vue-router'
import { useCommon } from '@/hooks/useCommon.ts'
import { MittEnum, RoomTypeEnum } from '@/enums'
import { useMitt } from '@/hooks/useMitt'

type SessionItem = {
  avatar: string
  name: string
  id?: string
  roomId: string
  type: number
}
type HistoryItem = {
  avatar: string
  name: string
  id: string
  roomId: string
  type: number
  timestamp?: number
}

const router = useRouter()
const chatStore = useChatStore()
const { openMsgSession } = useCommon()
// 从路由参数或共享状态中获取搜索查询
const searchQuery = ref('')
// 搜索结果
const searchResults = ref<SessionItem[]>([])
// 历史记录 - 使用localStorage存储
const HISTORY_STORAGE_KEY = 'HULA_SEARCH_HISTORY'
const historyList = ref<HistoryItem[]>([])

// 监听搜索框输入变化
useMitt.on('search_input_change', (value) => {
  searchQuery.value = value
  handleSearch(value)
})

// 处理搜索
const handleSearch = (value: string) => {
  if (!value) {
    searchResults.value = []
    return
  }
  // 从chatStore获取会话列表并根据关键字进行过滤
  const sessionList = chatStore.sessionList
  // 根据名称和最后一条消息内容进行搜索匹配
  searchResults.value = sessionList.filter((session) => {
    // 在名称中搜索
    const nameMatch = session.name.toLowerCase().includes(value.toLowerCase())
    // 在最后一条消息中搜索
    // const lastMsgMatch = session.lastMsg && session.lastMsg.toLowerCase().includes(value.toLowerCase())

    // 返回名称或最后一条消息匹配的结果
    // return nameMatch || lastMsgMatch

    return nameMatch
  })
  // 如果有搜索关键词，这里可以保存到关键词历史记录（当前实现还不保存搜索关键词）
  if (value) {
    saveToHistory(value)
  }
}

// 应用搜索词
const applySearchTerm = (term: string) => {
  searchQuery.value = term
  handleSearch(term)
}

// 加载历史记录
const loadHistory = () => {
  try {
    const history = localStorage.getItem(HISTORY_STORAGE_KEY)
    if (history) {
      historyList.value = JSON.parse(history)
      // 按时间戳降序排序，最近访问的放在前面
      historyList.value.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      // 只保留前10条记录
      if (historyList.value.length > 10) {
        historyList.value = historyList.value.slice(0, 10)
        // 同步到localStorage
        saveHistoryToStorage()
      }
    }
  } catch (error) {
    console.error('加载历史记录失败:', error)
    // 如果加载失败，重置为空数组
    historyList.value = []
  }
}

// 将历史记录保存到localStorage
const saveHistoryToStorage = () => {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historyList.value))
  } catch (error) {
    console.error('保存历史记录失败:', error)
  }
}

// 保存搜索关键词到历史记录
const saveToHistory = (term: string) => {
  console.log(`保存搜索记录: ${term}`)
  // 可以实现关键词搜索记录的保存
}

// 保存会话到历史记录
const saveSessionToHistory = (session: SessionItem) => {
  // 确保会话有足够的数据
  if (!session || !session.roomId) return

  // 创建一个历史记录项
  const historyItem: HistoryItem = {
    avatar: session.avatar || '',
    name: session.name || '',
    id: session.id || session.roomId,
    roomId: session.roomId,
    type: session.type || RoomTypeEnum.SINGLE,
    timestamp: Date.now() // 添加当前时间戳
  }

  // 检查是否已存在相同的记录
  const existingIndex = historyList.value.findIndex((item) => item.roomId === session.roomId)

  if (existingIndex !== -1) {
    // 如果已存在，删除它（稍后会添加到列表头部）
    historyList.value.splice(existingIndex, 1)
  }

  // 将新的记录添加到列表头部
  historyList.value.unshift(historyItem)

  // 限制历史记录数量为10个
  if (historyList.value.length > 10) {
    historyList.value = historyList.value.slice(0, 10)
  }

  // 保存到localStorage
  saveHistoryToStorage()
}

// 清除历史记录
const clearHistory = () => {
  historyList.value = []
  // 清除localStorage中的记录
  localStorage.removeItem(HISTORY_STORAGE_KEY)
}

// 打开会话
const openConversation = (item: SessionItem | HistoryItem) => {
  // 保存会话到历史记录
  saveSessionToHistory(item)
  // 保存搜索记录
  if (searchQuery.value) {
    saveToHistory(searchQuery.value)
  }
  // 返回上一页（关闭搜索页面）
  router.go(-1)
  // 打开对应会话
  const id = item.type === RoomTypeEnum.GROUP ? item.roomId : item.id
  openMsgSession(id || item.roomId, item.type)
  // 定位到对应的会话（让聊天列表滚动到选中的会话）
  nextTick(() => {
    useMitt.emit(MittEnum.LOCATE_SESSION, { roomId: item.roomId })
  })
}

onMounted(() => {
  // 加载历史记录
  loadHistory()
})
</script>

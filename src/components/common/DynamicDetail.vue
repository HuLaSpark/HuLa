<template>
  <div
    class="max-w-full h-full overflow-y-auto overflow-x-hidden"
    :class="mode === 'mobile' ? 'p-16px bg-white' : 'p-24px bg-white rounded-8px'">
    <!-- 加载状态 -->
    <div v-if="loading" class="flex items-center justify-center h-full py-80px">
      <div class="flex flex-col items-center gap-16px">
        <div class="relative">
          <div class="loading-spinner w-48px h-48px border-4px border-#13987F/30 border-t-#13987F rounded-full"></div>
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-24px h-24px bg-#13987F/20 rounded-full animate-pulse"></div>
          </div>
        </div>
        <div class="flex flex-col items-center gap-8px">
          <span class="text-15px text-#666 font-500">加载中...</span>
          <span class="text-12px text-#999">正在获取动态详情</span>
        </div>
      </div>
    </div>

    <!-- 动态详情内容 -->
    <div v-else-if="feedDetail" class="w-full max-w-full overflow-hidden animate-fadeIn">
      <!-- 头部 - 用户信息 -->
      <div
        class="flex items-center gap-12px mb-20px p-16px rounded-12px bg-gradient-to-r from-#f8f9fa to-#ffffff border border-#e5e5e5 shadow-sm">
        <div class="relative">
          <n-avatar
            :size="mode === 'mobile' ? 52 : 60"
            round
            :src="getUserAvatar(feedDetail)"
            class="ring-2 ring-#13987F/20" />
          <div class="absolute bottom-0 right-0 w-16px h-16px bg-#52c41a rounded-full border-2 border-white"></div>
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-17px font-700 text-#333 truncate mb-6px">
            {{ getUserName(feedDetail) }}
          </div>
          <div class="flex items-center gap-8px text-13px text-#999">
            <svg class="w-14px h-14px" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" stroke-width="2" />
              <path d="M12 6v6l4 2" stroke-width="2" stroke-linecap="round" />
            </svg>
            <span>{{ formatTimestamp(feedDetail.createTime!) }}</span>
          </div>
        </div>
      </div>

      <!-- 动态内容 -->
      <div class="relative">
        <div
          class="pl-20px pr-8px py-12px text-16px text-#333 leading-loose mb-20px whitespace-pre-wrap break-words bg-#fafafa rounded-8px border-l-4 border-#13987F/30">
          {{ feedDetail.content }}
        </div>
      </div>

      <!-- 图片区域 -->
      <div v-if="feedDetail.urls && feedDetail.urls.length > 0" class="mb-20px w-full max-w-full overflow-hidden">
        <!-- 单张图片 -->
        <div v-if="feedDetail.urls.length === 1" class="w-full max-w-full overflow-hidden group">
          <div class="relative rounded-12px overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
            <img
              :src="feedDetail.urls[0]"
              alt="图片"
              class="w-full max-w-full h-auto max-h-500px object-contain cursor-pointer bg-gradient-to-br from-#f5f5f5 to-#e5e5e5 block transform group-hover:scale-105 transition-transform duration-300"
              @click.stop="handlePreviewImage(feedDetail.urls, 0)" />
            <div
              class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 pointer-events-none"></div>
            <!-- 查看大图提示 -->
            <div
              class="absolute bottom-12px right-12px bg-black/60 text-white px-12px py-6px rounded-full text-12px opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm">
              <svg class="w-14px h-14px inline-block mr-4px" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round" />
              </svg>
              查看大图
            </div>
          </div>
        </div>
        <!-- 多张图片 - 九宫格布局 -->
        <div
          v-else
          class="grid gap-8px w-full max-w-full"
          :class="[
            feedDetail.urls.length === 2 ? 'grid-cols-2' : feedDetail.urls.length === 4 ? 'grid-cols-2' : 'grid-cols-3'
          ]">
          <div
            v-for="(img, idx) in feedDetail.urls.slice(0, 9)"
            :key="idx"
            class="aspect-square overflow-hidden rounded-8px bg-gradient-to-br from-#f5f5f5 to-#e5e5e5 cursor-pointer w-full group relative shadow-md hover:shadow-lg transition-all duration-300"
            @click.stop="handlePreviewImage(feedDetail.urls, idx)">
            <img
              :src="img"
              alt="图片"
              class="w-full h-full object-cover block transform group-hover:scale-110 transition-transform duration-300" />
            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
            <!-- 图片序号 -->
            <div
              class="absolute top-8px right-8px bg-black/50 text-white w-24px h-24px rounded-full flex items-center justify-center text-12px font-600 backdrop-blur-sm">
              {{ idx + 1 }}
            </div>
          </div>
        </div>
      </div>

      <!-- 视频区域 -->
      <div
        v-else-if="feedDetail.videoUrl"
        class="mb-20px relative rounded-12px overflow-hidden cursor-pointer bg-gradient-to-br from-#f5f5f5 to-#e5e5e5 w-full max-w-full group shadow-lg hover:shadow-xl transition-all duration-300"
        @click.stop="handleVideoPlay(feedDetail.videoUrl)">
        <img
          :src="feedDetail.videoUrl"
          alt="视频"
          class="w-full max-w-full h-auto max-h-500px object-contain block transform group-hover:scale-105 transition-transform duration-300" />
        <!-- 遮罩层 -->
        <div class="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors duration-300"></div>
        <!-- 播放图标 -->
        <div class="absolute inset-0 flex items-center justify-center">
          <div
            class="w-72px h-72px rounded-full bg-#13987F/90 flex items-center justify-center backdrop-blur-md shadow-2xl transform group-hover:scale-110 transition-all duration-300 ring-4 ring-white/30">
            <svg class="w-32px h-32px text-white ml-2px" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        <!-- 视频标签 -->
        <div
          class="absolute top-12px left-12px bg-black/60 text-white px-12px py-6px rounded-full text-12px font-500 backdrop-blur-sm flex items-center gap-6px">
          <svg class="w-14px h-14px" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 4h16v12H4z" />
            <path d="M8 20h8" />
            <path d="M12 16v4" />
          </svg>
          视频
        </div>
        <!-- 播放提示 -->
        <div
          class="absolute bottom-12px right-12px bg-black/60 text-white px-12px py-6px rounded-full text-12px opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm">
          点击播放
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div class="flex items-center justify-between pt-20px mt-20px border-t-2 border-#f0f0f0">
        <!-- 动态统计信息 -->
        <div class="flex items-center gap-16px text-13px text-#999">
          <div class="flex items-center gap-6px">
            <svg class="w-16px h-16px" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke-width="2" />
              <circle cx="12" cy="12" r="3" stroke-width="2" />
            </svg>
            <span>浏览</span>
          </div>
          <div class="flex items-center gap-6px">
            <svg class="w-16px h-16px" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                stroke-width="2" />
            </svg>
            <span>收藏</span>
          </div>
        </div>
        <!-- 更多操作 -->
        <n-dropdown :options="getMoreOptions(feedDetail)" @select="handleMoreAction(feedDetail, $event)">
          <div
            class="cursor-pointer px-12px py-8px rounded-8px text-#666 hover:text-#13987F hover:bg-#13987F/5 transition-all duration-200 active:scale-95"
            @click.stop>
            <svg class="w-20px h-20px" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </div>
        </n-dropdown>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="flex flex-col items-center justify-center h-full text-#999 py-80px">
      <svg class="w-80px h-80px mb-16px text-#d0d0d0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="10" stroke-width="2" />
        <path d="M12 8v4M12 16h.01" stroke-width="2" stroke-linecap="round" />
      </svg>
      <span class="text-15px">动态不存在或已被删除</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFeedStore, type FeedItem } from '@/stores/feed'
import { useUserStore } from '@/stores/user'
import { useGroupStore } from '@/stores/group'
import { formatTimestamp } from '@/utils/ComputedTime'
import { AvatarUtils } from '@/utils/AvatarUtils'

// Props定义
interface Props {
  feedId: string // 动态ID
  mode?: 'pc' | 'mobile' // 显示模式
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'mobile'
})

// Emits定义
const emit = defineEmits<{
  previewImage: [images: string[], index: number]
  videoPlay: [url: string]
}>()

const feedStore = useFeedStore()
const userStore = useUserStore()
const groupStore = useGroupStore()

const loading = ref(true)
const feedDetail = ref<FeedItem | null>(null)

// 获取用户头像
const getUserAvatar = (feed: FeedItem) => {
  const userInfo = groupStore.getUserInfo(feed.uid)
  return AvatarUtils.getAvatarUrl(userInfo?.avatar || '')
}

// 获取用户名称
const getUserName = (feed: FeedItem) => {
  const userInfo = groupStore.getUserInfo(feed.uid)
  return userInfo?.name || feed.uid || '未知用户'
}

// 更多操作选项
const getMoreOptions = (feed: FeedItem) => {
  const options = [
    {
      label: '复制链接',
      key: 'copy'
    },
    {
      label: '举报',
      key: 'report'
    }
  ]

  // 如果是自己的动态，添加删除选项
  if (feed.uid === userStore.userInfo?.uid) {
    options.unshift({
      label: '删除动态',
      key: 'delete'
    })
  }

  return options
}

// 处理更多操作
const handleMoreAction = async (feed: FeedItem, action: string) => {
  switch (action) {
    case 'delete':
      try {
        await feedStore.deleteFeed(feed.id)
        window.$message.success('删除成功')
        // 删除后返回上一页
        window.history.back()
      } catch (error) {
        console.error('删除动态失败:', error)
        window.$message.error('删除失败，请重试')
      }
      break
    case 'copy':
      navigator.clipboard.writeText(`${window.location.origin}/feed/${feed.id}`)
      window.$message.success('链接已复制')
      break
    case 'report':
      window.$message.info('举报功能开发中')
      break
  }
}

// 图片预览
const handlePreviewImage = (images: string[], index: number) => {
  emit('previewImage', images, index)
}

// 视频播放
const handleVideoPlay = (url: string) => {
  emit('videoPlay', url)
}

// 获取动态详情
const fetchFeedDetail = async () => {
  loading.value = true
  try {
    // 从store中查找动态
    const feed = feedStore.feedList.find((item) => item.id === props.feedId)
    if (feed) {
      feedDetail.value = feed
    } else {
      // 如果store中没有，可以调用API获取单个动态详情
      // TODO: 实现获取单个动态详情的API
      feedDetail.value = null
    }
  } catch (error) {
    console.error('获取动态详情失败:', error)
    window.$message.error('获取动态详情失败')
  } finally {
    loading.value = false
  }
}

// 初始化
onMounted(async () => {
  await fetchFeedDetail()
})

// 监听 feedId 变化，重新加载数据
watch(
  () => props.feedId,
  async (newFeedId, oldFeedId) => {
    if (newFeedId && newFeedId !== oldFeedId) {
      await fetchFeedDetail()
    }
  }
)
</script>

<style scoped>
.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

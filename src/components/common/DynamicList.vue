<template>
  <div class="dynamic-list-container">
    <!-- 加载状态 -->
    <div v-if="feedOptions.isLoading && feedList.length === 0" class="flex justify-center items-center py-60px">
      <n-spin size="large" />
    </div>

    <!-- 空状态 -->
    <div v-else-if="feedList.length === 0" class="flex flex-col justify-center items-center py-80px text-gray-400">
      <svg class="w-80px h-80px mb-16px color-#ddd">
        <use href="#empty"></use>
      </svg>
      <p class="text-14px">{{ emptyText }}</p>
    </div>

    <!-- 动态列表 -->
    <div v-else class="flex flex-col gap-12px">
      <div
        v-for="item in feedList"
        :key="item.id"
        :class="itemClass"
        class="bg-white rounded-12px p-16px shadow hover:shadow-md transition-shadow"
        @click="handleItemClick(item)">
        <!-- 用户信息 -->
        <div class="flex items-center gap-12px mb-12px">
          <n-avatar :size="avatarSize" round :src="getUserAvatar(item)" />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-6px">
              <span class="text-15px font-600 text-#333 truncate">
                {{ getUserName(item) }}
              </span>
            </div>
          </div>
        </div>

        <!-- 动态内容 -->
        <div class="text-15px text-#333 leading-relaxed mb-12px whitespace-pre-wrap break-words">
          {{ item.content }}
        </div>

        <!-- 图片区域 -->
        <div v-if="item.urls && item.urls.length > 0" class="mb-12px">
          <!-- 单张图片 -->
          <div v-if="item.urls.length === 1" class="inline-block max-w-full">
            <n-image
              :src="item.urls[0]"
              alt="图片"
              :width="singleImageSize.width"
              :height="singleImageSize.height"
              :class="singleImageClass"
              class="rounded-8px object-cover cursor-pointer"
              @click.stop="handlePreviewImage(item.urls, 0)" />
          </div>
          <!-- 多张图片 - 九宫格布局 -->
          <div
            v-else
            class="grid gap-4px"
            :class="[item.urls.length === 2 ? 'grid-cols-2' : item.urls.length === 4 ? 'grid-cols-2' : 'grid-cols-3']"
            :style="gridMaxWidth">
            <n-image
              v-for="(img, idx) in item.urls.slice(0, 9)"
              :key="idx"
              :src="img"
              alt="图片"
              :width="gridImageSize.width"
              :height="gridImageSize.height"
              :class="gridImageClass"
              class="rounded-8px object-cover cursor-pointer"
              @click.stop="handlePreviewImage(item.urls, idx)" />
          </div>
        </div>

        <!-- 视频区域 -->
        <div v-else-if="item.videoUrl" class="mb-12px relative rounded-8px overflow-hidden">
          <n-image
            :src="item.videoUrl"
            alt="视频"
            :width="videoSize.width"
            :height="videoSize.height"
            :class="videoClass"
            class="object-cover cursor-pointer"
            @click.stop="handleVideoPlay(item.videoUrl)" />
          <!-- 播放图标 -->
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div :class="playIconSize" class="rounded-full bg-black/50 flex items-center justify-center">
              <svg :class="playIconInnerSize" class="color-white">
                <use href="#play"></use>
              </svg>
            </div>
          </div>
        </div>

        <!-- 底部操作栏 - 统一样式：左边时间，右边操作 -->
        <div class="flex items-center justify-between mt-12px pt-8px border-t border-#f0f0f0">
          <span class="text-13px text-#999">{{ formatTimestamp(item.createTime!) }}</span>
          <!-- 更多操作 -->
          <n-dropdown :options="getMoreOptions(item)" @select="handleMoreAction(item, $event)">
            <div class="cursor-pointer p-4px text-#999 hover:text-#576b95 transition-colors" @click.stop>
              <svg class="w-16px h-16px">
                <use href="#more"></use>
              </svg>
            </div>
          </n-dropdown>
        </div>
      </div>

      <!-- 加载更多 -->
      <div v-if="!feedOptions.isLast" class="flex justify-center py-20px">
        <n-button :loading="feedOptions.isLoading" @click="handleLoadMore" type="primary" text>
          {{ feedOptions.isLoading ? '加载中...' : '加载更多' }}
        </n-button>
      </div>

      <!-- 已加载全部 -->
      <div v-else-if="showLoadedAll" class="flex justify-center py-20px text-13px text-gray-400">已加载全部动态</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useFeedStore, type FeedItem } from '@/stores/feed'
import { useUserStore } from '@/stores/user'
import { useGroupStore } from '@/stores/group'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { formatTimestamp } from '@/utils/ComputedTime'
import { useMessage } from 'naive-ui'

// Props定义
interface Props {
  // 样式相关
  mode?: 'pc' | 'mobile' // 显示模式
  avatarSize?: number // 头像大小
  itemClass?: string // 动态项额外类名
  emptyText?: string // 空状态文本
  showLoadedAll?: boolean // 是否显示"已加载全部"提示
  // 图片尺寸配置
  singleImageSize?: { width?: string; height?: string }
  gridImageSize?: { width?: string; height?: string }
  videoSize?: { width?: string; height?: string }
  gridMaxWidth?: string
  // 样式类配置
  singleImageClass?: string
  gridImageClass?: string
  videoClass?: string
  playIconSize?: string
  playIconInnerSize?: string
}

withDefaults(defineProps<Props>(), {
  mode: 'mobile',
  avatarSize: 42,
  itemClass: '',
  emptyText: '暂无动态内容',
  showLoadedAll: true,
  singleImageSize: () => ({ width: undefined, height: undefined }),
  gridImageSize: () => ({ width: undefined, height: undefined }),
  videoSize: () => ({ width: undefined, height: undefined }),
  gridMaxWidth: '',
  singleImageClass: 'max-w-full max-h-400px',
  gridImageClass: 'w-full aspect-square',
  videoClass: 'w-full aspect-video',
  playIconSize: 'w-56px h-56px',
  playIconInnerSize: 'w-28px h-28px'
})

// Emits定义
const emit = defineEmits<{
  previewImage: [images: string[], index: number]
  videoPlay: [url: string]
  loadMore: []
  itemClick: [feedId: string]
}>()

// Store
const feedStore = useFeedStore()
const userStore = useUserStore()
const groupStore = useGroupStore()
const message = useMessage()

const { feedList, feedOptions } = storeToRefs(feedStore)

// 获取用户头像
const getUserAvatar = (item: FeedItem) => {
  if (item.uid) {
    const userInfo = groupStore.getUserInfo(item.uid)
    if (userInfo?.avatar) {
      return AvatarUtils.getAvatarUrl(userInfo.avatar)
    }
  }
  return AvatarUtils.getAvatarUrl('')
}

// 获取用户名称
const getUserName = (item: FeedItem) => {
  if (item.uid) {
    const userInfo = groupStore.getUserInfo(item.uid)
    if (userInfo?.name || userInfo?.myName) {
      return userInfo.name || userInfo.myName
    }
  }
  return '未知用户'
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
        message.success('删除成功')
      } catch (error) {
        console.error('删除动态失败:', error)
        message.error('删除失败，请重试')
      }
      break
    case 'copy':
      navigator.clipboard.writeText(`${window.location.origin}/feed/${feed.id}`)
      message.success('链接已复制')
      break
    case 'report':
      message.info('举报功能开发中')
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

// 加载更多
const handleLoadMore = () => {
  emit('loadMore')
}

// 处理动态项点击
const handleItemClick = (feed: FeedItem) => {
  emit('itemClick', feed.id)
}
</script>

<style scoped lang="scss">
.dynamic-list-container {
  width: 100%;
}
</style>

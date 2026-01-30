<template>
  <div class="flex flex-col gap-4 pb-4 border-b border-gray-100">
    <!-- 头像数据 -->
    <div class="grid grid-cols-[38px_1fr] items-start gap-1">
      <!-- 头像：单独居中 -->
      <div class="self-center h-38px">
        <n-avatar :size="40" :src="avatarUrl" fallback-src="/logo.png" round />
      </div>

      <!-- 中间：两行内容 -->
      <div class="truncate pl-4 flex gap-10px flex-col">
        <n-text class="text-14px leading-tight font-bold flex-1 truncate flex items-center gap-2">
          <span>{{ userName }}</span>
        </n-text>
        <div class="text-12px text-#666 truncate">{{ formatTime(feedItem.createTime) }}</div>
      </div>
    </div>

    <!-- 动态内容 -->
    <div class="grid grid-cols-[38px_1fr] items-start gap-1">
      <!-- 留空 -->
      <div></div>
      <div class="flex flex-col gap-2 text-14px">
        <!-- 文本内容 -->
        <n-text depth="3" class="leading-relaxed whitespace-pre-wrap break-words">
          {{ feedItem.content }}
        </n-text>

        <!-- 图片网格 - 根据图片数量动态调整 -->
        <div v-if="feedItem.urls && feedItem.urls.length > 0" :class="getImageGridClass(feedItem.urls.length)">
          <div
            v-for="(image, index) in feedItem.urls"
            :key="index"
            class="relative w-full aspect-square rounded-10px mask-rounded overflow-hidden"
            @click="handleImageClick(index)">
            <img :src="image" class="absolute inset-0 rounded-10px w-full h-full object-cover" alt="动态图片" />
          </div>
        </div>

        <!-- 视频 -->
        <div
          v-if="feedItem.videoUrl"
          class="relative w-full aspect-video rounded-10px overflow-hidden"
          @click="handleVideoClick">
          <video :src="feedItem.videoUrl" class="w-full h-full object-cover" />
          <!-- 播放按钮 -->
          <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
            <svg class="w-48px h-48px color-white opacity-80">
              <use href="#play"></use>
            </svg>
          </div>
        </div>

        <!-- 底部操作栏 -->
        <div class="w-full flex justify-end mt-5px gap-5 items-center text-12px text-#666 dark:invert">
          <!-- 分享 -->
          <div class="flex items-center gap-1 cursor-pointer active:opacity-60" @click="handleShare">
            <svg class="iconpark-icon w-20px h-20px"><use href="#fenxiang"></use></svg>
          </div>

          <!-- 评论 -->
          <div class="flex items-center gap-1 cursor-pointer active:opacity-60" @click="handleComment">
            <svg class="iconpark-icon w-20px h-20px"><use href="#huifu"></use></svg>
            <span v-if="feedItem.commentCount && feedItem.commentCount > 0">
              {{ formatCount(feedItem.commentCount) }}
            </span>
          </div>

          <!-- 点赞 -->
          <div class="flex items-center gap-1 cursor-pointer active:opacity-60" @click="handleLike">
            <svg class="iconpark-icon w-20px h-20px">
              <use :href="isLiked ? '#dianzan' : '#weidianzan'"></use>
            </svg>
            <span v-if="likeCount > 0">{{ formatCount(likeCount) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FeedItem } from '@/stores/feed'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { useGroupStore } from '@/stores/group'

interface Props {
  feedItem: FeedItem
}

const props = defineProps<Props>()
const groupStore = useGroupStore()

const isLiked = ref(false)
const likeCount = ref(0)

// 计算头像URL - 使用 uid 从 groupStore 获取用户信息
const avatarUrl = computed(() => {
  if (props.feedItem.uid) {
    const userInfo = groupStore.getUserInfo(props.feedItem.uid)
    if (userInfo?.avatar) {
      return AvatarUtils.getAvatarUrl(userInfo.avatar)
    }
  }
  return AvatarUtils.getAvatarUrl('')
})

// 计算用户名称
const userName = computed(() => {
  if (props.feedItem.uid) {
    const userInfo = groupStore.getUserInfo(props.feedItem.uid)
    if (userInfo?.name || userInfo?.myName) {
      return userInfo.name || userInfo.myName
    }
  }
  return '未知用户'
})

// 格式化时间
const formatTime = (timestamp?: number) => {
  if (!timestamp) return ''

  const now = Date.now()
  const diff = now - timestamp

  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const month = 30 * day

  if (diff < minute) {
    return '刚刚'
  } else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`
  } else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`
  } else if (diff < month) {
    return `${Math.floor(diff / day)}天前`
  } else {
    const date = new Date(timestamp)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
}

// 格式化数字
const formatCount = (count: number) => {
  if (count < 1000) return count.toString()
  if (count < 10000) return `${(count / 1000).toFixed(1)}K`
  return `${(count / 10000).toFixed(1)}W`
}

// 根据图片数量获取网格类名
const getImageGridClass = (count: number) => {
  if (count === 1) return 'grid grid-cols-1 gap-2'
  if (count === 2) return 'grid grid-cols-2 gap-2'
  if (count === 4) return 'grid grid-cols-2 gap-2'
  return 'grid grid-cols-3 gap-2'
}

// 处理图片点击
const handleImageClick = (index: number) => {
  console.log('点击图片', index)
  // TODO: 实现图片预览功能
}

// 处理视频点击
const handleVideoClick = () => {
  console.log('点击视频')
  // TODO: 实现视频播放功能
}

// 处理分享
const handleShare = () => {
  console.log('分享动态', props.feedItem.id)
  // TODO: 实现分享功能
}

// 处理评论
const handleComment = () => {
  console.log('评论动态', props.feedItem.id)
  // TODO: 实现评论功能
}

// 处理点赞
const handleLike = () => {
  isLiked.value = !isLiked.value
  likeCount.value += isLiked.value ? 1 : -1
  console.log('点赞动态', props.feedItem.id, isLiked.value)
  // TODO: 实现点赞功能
}
</script>

<style scoped>
.mask-rounded {
  -webkit-mask-image: radial-gradient(circle, white 100%, transparent 100%);
  mask-image: radial-gradient(circle, white 100%, transparent 100%);
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
}
</style>

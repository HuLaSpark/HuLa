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
        class="bg-white rounded-12px p-16px shadow hover:shadow-md transition-shadow cursor-pointer"
        @click="handleItemClick($event, item)">
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

        <!-- 底部操作栏 -->
        <div class="mt-12px pt-8px border-t border-#f0f0f0">
          <!-- 操作按钮 - 固定高度防止闪烁 -->
          <div class="flex items-center justify-between gap-8px mb-8px h-28px">
            <span class="text-12px text-#999">{{ formatTimestamp(item.createTime!) }}</span>
            <div class="flex items-center justify-end gap-8px">
              <!-- 点赞按钮 -->
              <div
                class="flex items-center justify-center gap-4px py-6px px-12px rounded-6px cursor-pointer transition-colors"
                :class="item.hasLiked ? 'bg-#f0f0f0 text-#ff6b6b' : 'hover:bg-#f5f5f5 text-#999'"
                @click.stop="handleToggleLike(item)">
                <svg class="w-16px h-16px" :class="{ 'heart-filled': item.hasLiked }">
                  <use href="#heart"></use>
                </svg>
                <span class="text-13px">{{ item.hasLiked ? '已赞' : '赞' }}</span>
              </div>
              <!-- 评论按钮 -->
              <div
                class="flex items-center justify-center gap-4px py-6px px-12px rounded-6px cursor-pointer hover:bg-#f5f5f5 transition-colors text-#999"
                @click.stop="handleShowCommentInput(item)">
                <svg class="w-16px h-16px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span class="text-13px">{{ item.commentCount ? `评论 ${item.commentCount}` : '评论' }}</span>
              </div>
              <!-- 更多操作 -->
              <n-dropdown :options="getMoreOptions(item)" @select="handleMoreAction(item, $event)">
                <div
                  class="flex items-center justify-center py-6px px-12px rounded-6px cursor-pointer hover:bg-#f5f5f5 transition-colors text-#999"
                  @click.stop>
                  <svg class="w-16px h-16px">
                    <use href="#more"></use>
                  </svg>
                </div>
              </n-dropdown>
            </div>
          </div>
          <!-- 点赞人名称显示 - 固定高度防止闪烁 -->
          <div class="min-h-20px mb-8px">
            <div v-if="(item.likeList || []).length > 0" class="text-12px text-#999">
              <span>👍</span>
              <span>{{ (item.likeList || []).map((like) => like.userName).join('、') }}</span>
            </div>
          </div>

          <!-- 评论列表显示 - 固定最小高度防止闪烁 -->
          <div class="min-h-20px">
            <div v-if="item.commentList && item.commentList.length > 0" class="bg-#f9f9f9 rounded-8px p-12px">
              <div v-for="comment in item.commentList.slice(0, 3)" :key="comment.id" class="mb-8px last:mb-0">
                <div class="text-12px text-#666">
                  <span class="font-600">{{ comment.userName }}</span>
                  <!-- 如果是回复评论，显示被回复人信息 -->
                  <span v-if="comment.replyUserName" class="text-#999">
                    回复
                    <span class="font-600">{{ comment.replyUserName }}</span>
                  </span>
                  <span>：</span>
                  <span>{{ comment.content }}</span>
                </div>
              </div>
              <div v-if="item.commentList.length > 3" class="text-12px text-#999 mt-8px pt-8px border-t border-#e5e5e5">
                还有 {{ item.commentList.length - 3 }} 条评论，点击查看全部
              </div>
            </div>
          </div>
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

    <!-- 评论输入框 Modal -->
    <n-modal
      v-model:show="showCommentInput"
      :show-icon="false"
      preset="dialog"
      class="comment-modal"
      style="
        width: 100%;
        max-width: 100%;
        height: auto;
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        border-radius: 12px 12px 0 0;
      "
      :mask-closable="true"
      :segmented="false">
      <template #header>
        <div class="text-16px font-600">发表评论</div>
      </template>
      <div class="flex flex-col gap-12px">
        <n-input
          v-model:value="commentContent"
          type="textarea"
          placeholder="说点什么..."
          :rows="3"
          :maxlength="500"
          show-count />
        <div class="flex gap-8px justify-end">
          <n-button @click="showCommentInput = false">取消</n-button>
          <n-button type="primary" :loading="commentLoading" @click="handleSubmitComment">发送</n-button>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useFeedStore, type FeedItem } from '@/stores/feed'
import { useUserStore } from '@/stores/user'
import { useGroupStore } from '@/stores/group'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { formatTimestamp } from '@/utils/ComputedTime'

interface Props {
  mode?: 'pc' | 'mobile'
  avatarSize?: number
  itemClass?: string
  emptyText?: string
  showLoadedAll?: boolean
  singleImageSize?: { width?: string; height?: string }
  gridImageSize?: { width?: string; height?: string }
  videoSize?: { width?: string; height?: string }
  gridMaxWidth?: string
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

const emit = defineEmits<{
  previewImage: [images: string[], index: number]
  videoPlay: [url: string]
  loadMore: []
  itemClick: [feedId: string]
}>()

const feedStore = useFeedStore()
const userStore = useUserStore()
const groupStore = useGroupStore()

const { feedList, feedOptions } = storeToRefs(feedStore)

const showCommentInput = ref(false)
const commentContent = ref('')
const commentLoading = ref(false)
const currentCommentFeed = ref<FeedItem | null>(null)

const getUserAvatar = (item: FeedItem) => {
  if (item.uid) {
    const userInfo = groupStore.getUserInfo(item.uid)
    if (userInfo?.avatar) {
      return AvatarUtils.getAvatarUrl(userInfo.avatar)
    }
  }
  return AvatarUtils.getAvatarUrl('')
}

const getUserName = (item: FeedItem) => {
  if (item.uid) {
    const userInfo = groupStore.getUserInfo(item.uid)
    if (userInfo?.name || userInfo?.myName) {
      return userInfo.name || userInfo.myName
    }
  }
  return '未知用户'
}

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

  if (feed.uid === userStore.userInfo?.uid) {
    options.unshift({
      label: '删除动态',
      key: 'delete'
    })
  }

  return options
}

const handleMoreAction = async (feed: FeedItem, action: string) => {
  switch (action) {
    case 'delete':
      try {
        await feedStore.deleteFeed(feed.id)
        window.$message.success('删除成功')
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

const handlePreviewImage = (images: string[], index: number) => {
  emit('previewImage', images, index)
}

const handleVideoPlay = (url: string) => {
  emit('videoPlay', url)
}

const handleLoadMore = () => {
  emit('loadMore')
}

const handleItemClick = (event: MouseEvent, feed: FeedItem) => {
  const target = event.target as HTMLElement
  const isActionButton =
    target.closest('.action-button') ||
    target.closest('[class*="flex items-center justify-end"]') ||
    (target.closest('svg') && target.closest('[class*="flex items-center justify-center"]'))

  if (!isActionButton) {
    emit('itemClick', feed.id)
  }
}

const handleToggleLike = async (feed: FeedItem) => {
  try {
    const wasLiked = feed.hasLiked
    const actType = wasLiked ? 2 : 1

    feed.hasLiked = !wasLiked
    if (actType === 1) {
      feed.likeCount = (feed.likeCount || 0) + 1
    } else {
      feed.likeCount = Math.max(0, (feed.likeCount || 1) - 1)
    }

    await feedStore.toggleLike(feed.id, actType)

    try {
      const likeListResult = await feedStore.getLikeList(feed.id)
      if (likeListResult && Array.isArray(likeListResult)) {
        const feedIndex = feedList.value.findIndex((f) => f.id === feed.id)
        if (feedIndex !== -1) {
          feedList.value[feedIndex].likeList = likeListResult
        }
      }
    } catch (error) {
      console.error('获取点赞列表失败:', error)
    }
  } catch (error) {
    console.error('点赞失败:', error)
    feed.hasLiked = !feed.hasLiked
    feed.likeCount = (feed.likeCount || 0) + (feed.hasLiked ? 1 : -1)
    window.$message.error('操作失败，请重试')
  }
}

const handleShowCommentInput = (feed: FeedItem) => {
  currentCommentFeed.value = feed
  showCommentInput.value = true
}

const handleSubmitComment = async () => {
  if (!currentCommentFeed.value || !commentContent.value.trim()) {
    window.$message.warning('请输入评论内容')
    return
  }

  commentLoading.value = true
  try {
    const feed = currentCommentFeed.value
    const content = commentContent.value.trim()

    await feedStore.addComment(feed.id, content)

    try {
      const commentListResult = await feedStore.getCommentList(feed.id)
      if (Array.isArray(commentListResult)) {
        feed.commentList = commentListResult
        feed.commentCount = commentListResult.length
      }
    } catch (error) {
      console.error('获取评论列表失败:', error)
    }

    commentContent.value = ''
    showCommentInput.value = false
    currentCommentFeed.value = null
  } catch (error) {
    console.error('发表评论失败:', error)
    window.$message.error('评论失败，请重试')
  } finally {
    commentLoading.value = false
  }
}
</script>

<style scoped lang="scss">
.dynamic-list-container {
  width: 100%;
  /* 隐藏滚动条 */
  &::-webkit-scrollbar {
    display: none;
  }
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* 心形图标填充效果 */
.heart-filled {
  fill: currentColor;
}
</style>

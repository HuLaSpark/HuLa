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
          <span class="text-15px text-#666 font-500">{{ t('dynamic.common.loading_title') }}</span>
          <span class="text-12px text-#999">{{ t('dynamic.common.loading_desc') }}</span>
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
              :alt="t('dynamic.common.image_alt')"
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
              {{ t('dynamic.detail.content.view_image') }}
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
              :alt="t('dynamic.common.image_alt')"
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
          :alt="t('dynamic.common.video_alt')"
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
          {{ t('dynamic.detail.content.video_tag') }}
        </div>
        <!-- 播放提示 -->
        <div
          class="absolute bottom-12px right-12px bg-black/60 text-white px-12px py-6px rounded-full text-12px opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm">
          {{ t('dynamic.detail.content.video_cta') }}
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div class="pt-20px mt-20px border-t-2 border-#f0f0f0">
        <!-- 点赞用户头像显示 - 固定高度防止闪烁 -->
        <div class="mb-16px min-h-48px flex items-center gap-8px">
          <span v-if="(feedDetail.likeList || []).length > 0" class="text-13px text-#999 font-500 flex-shrink-0">
            {{ t('dynamic.detail.stats.liked_by') }}
          </span>
          <div v-if="(feedDetail.likeList || []).length > 0" class="flex items-center -space-x-12px flex-wrap">
            <n-avatar
              v-for="(like, idx) in feedDetail.likeList || []"
              :key="idx"
              :size="32"
              round
              :src="AvatarUtils.getAvatarUrl(like.userAvatar || '')"
              :title="like.userName" />
          </div>
        </div>
        <!-- 动态统计信息 - 固定高度防止闪烁 -->
        <div class="flex items-center justify-between mb-16px text-13px text-#999 min-h-24px">
          <div class="flex items-center gap-16px">
            <div class="flex items-center gap-6px">
              <svg class="w-16px h-16px" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke-width="2" />
                <circle cx="12" cy="12" r="3" stroke-width="2" />
              </svg>
              <span>{{ t('dynamic.detail.stats.views') }}</span>
            </div>
            <div v-if="feedDetail.likeCount" class="flex items-center gap-6px">
              <span>👍 {{ t('dynamic.detail.stats.like') }} {{ feedDetail.likeCount }}</span>
            </div>
            <div v-if="feedDetail.commentCount" class="flex items-center gap-6px">
              <span>{{ t('dynamic.detail.stats.comments', { count: feedDetail.commentCount }) }}</span>
            </div>
          </div>
        </div>
        <!-- 操作按钮 - 靠右对齐 - 固定高度防止闪烁 -->
        <div class="flex items-center justify-end gap-8px h-40px">
          <!-- 点赞按钮 -->
          <div
            class="flex items-center justify-center gap-6px py-10px px-16px rounded-8px cursor-pointer transition-all duration-200"
            :class="feedDetail.hasLiked ? 'bg-#ff6b6b/10 text-#ff6b6b' : 'hover:bg-#f5f5f5 text-#666'"
            @click.stop="handleToggleLike">
            <svg class="w-18px h-18px" :class="{ 'heart-filled': feedDetail.hasLiked }">
              <use href="#heart"></use>
            </svg>
            <span class="text-14px font-500">
              {{ feedDetail.hasLiked ? t('dynamic.detail.stats.liked') : t('dynamic.detail.stats.like') }}
            </span>
          </div>
          <!-- 评论按钮 -->
          <div
            class="flex items-center justify-center gap-6px py-10px px-16px rounded-8px cursor-pointer hover:bg-#f5f5f5 transition-all duration-200 text-#666"
            @click.stop="showCommentInput = true">
            <svg class="w-18px h-18px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span class="text-14px font-500">{{ t('dynamic.detail.actions.comment') }}</span>
          </div>
          <!-- 更多操作 -->
          <n-dropdown :options="getMoreOptions(feedDetail)" @select="handleMoreAction(feedDetail, $event)">
            <div
              class="flex items-center justify-center py-10px px-16px rounded-8px cursor-pointer hover:bg-#f5f5f5 transition-all duration-200 text-#666"
              @click.stop>
              <svg class="w-18px h-18px" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </div>
          </n-dropdown>
        </div>
      </div>

      <!-- 评论列表 -->
      <div v-if="commentList.length > 0" class="mt-20px pt-20px border-t-2 border-#f0f0f0">
        <div class="text-14px font-600 mb-16px text-#333">
          {{ t('dynamic.detail.stats.comments', { count: feedDetail.commentCount || 0 }) }}
        </div>
        <div class="space-y-12px">
          <div v-for="comment in commentList" :key="comment.id" class="p-12px bg-#f5f5f5 rounded-8px">
            <div class="flex items-start gap-8px">
              <n-avatar :size="32" round :src="getCommentUserAvatar(comment)" />
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-4px">
                  <span class="text-13px font-500 text-#333">{{ getCommentUserName(comment) }}</span>
                  <span class="text-12px text-#999">{{ formatTimestamp(comment.createTime) }}</span>
                </div>
                <!-- 如果是回复评论，显示被回复人信息 -->
                <div v-if="comment.replyUserName" class="text-12px text-#999 mb-4px">
                  {{ t('dynamic.detail.actions.reply') }}
                  <span class="font-500">{{ comment.replyUserName }}</span>
                </div>
                <div class="text-13px text-#666 break-words">{{ comment.content }}</div>
                <div class="flex items-center gap-12px mt-8px text-12px text-#999">
                  <span class="cursor-pointer hover:text-#13987F" @click="handleReplyComment(comment)">
                    {{ t('dynamic.detail.actions.reply') }}
                  </span>
                  <span
                    v-if="comment.uid === userStore.userInfo?.uid"
                    class="cursor-pointer hover:text-#ff6b6b"
                    @click="handleDeleteComment(comment.id)">
                    {{ t('dynamic.detail.actions.delete') }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="flex flex-col items-center justify-center h-full text-#999 py-80px">
      <svg class="w-80px h-80px mb-16px text-#d0d0d0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="10" stroke-width="2" />
        <path d="M12 8v4M12 16h.01" stroke-width="2" stroke-linecap="round" />
      </svg>
      <span class="text-15px">{{ t('dynamic.detail.empty') }}</span>
    </div>
  </div>

  <!-- 底部评论输入框 -->
  <n-modal
    v-model:show="showCommentInput"
    preset="dialog"
    :title="t('dynamic.detail.modal.title')"
    :positive-text="t('dynamic.detail.modal.send')"
    :negative-text="t('dynamic.detail.modal.cancel')"
    :loading="commentLoading"
    @positive-click="handleSubmitComment"
    @negative-click="showCommentInput = false">
    <div class="space-y-12px">
      <div v-if="replyingComment" class="p-12px bg-#f5f5f5 rounded-8px border-l-4 border-#13987F">
        <div class="text-12px text-#999 mb-4px">
          {{ t('dynamic.detail.modal.replying', { name: getCommentUserName(replyingComment) }) }}
        </div>
        <div class="text-13px text-#666">{{ replyingComment.content }}</div>
      </div>
      <n-input
        v-model:value="commentContent"
        type="textarea"
        :placeholder="t('dynamic.detail.modal.placeholder')"
        :rows="4"
        :maxlength="500"
        clearable
        show-count />
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useFeedStore, type FeedItem } from '@/stores/feed'
import { useUserStore } from '@/stores/user'
import { useGroupStore } from '@/stores/group'
import { formatTimestamp } from '@/utils/ComputedTime'
import { AvatarUtils } from '@/utils/AvatarUtils'

interface Props {
  feedId: string
  mode?: 'pc' | 'mobile'
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'mobile'
})

const emit = defineEmits<{
  previewImage: [images: string[], index: number]
  videoPlay: [url: string]
}>()

const { t } = useI18n()
const feedStore = useFeedStore()
const userStore = useUserStore()
const groupStore = useGroupStore()

const loading = ref(true)
const feedDetail = ref<FeedItem | null>(null)
const showCommentInput = ref(false)
const commentContent = ref('')
const commentLoading = ref(false)
const commentList = ref<any[]>([])
const replyingComment = ref<any | null>(null)

const getUserAvatar = (feed: FeedItem) => {
  return AvatarUtils.getAvatarUrl(feed.userAvatar || '')
}

const getUserName = (feed: FeedItem) => {
  return feed.userName || t('dynamic.common.unknown_user')
}

const getMoreOptions = (feed: FeedItem) => {
  const options = [
    {
      label: t('dynamic.detail.dropdown.copy'),
      key: 'copy'
    },
    {
      label: t('dynamic.detail.dropdown.report'),
      key: 'report'
    }
  ]

  if (feed.uid === userStore.userInfo?.uid) {
    options.unshift({
      label: t('dynamic.detail.dropdown.delete'),
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
        window.$message.success(t('dynamic.messages.delete_success'))
        window.history.back()
      } catch (error) {
        console.error('删除动态失败:', error)
        window.$message.error(t('dynamic.messages.delete_fail'))
      }
      break
    case 'copy':
      navigator.clipboard.writeText(`${window.location.origin}/feed/${feed.id}`)
      window.$message.success(t('dynamic.messages.copy_success'))
      break
    case 'report':
      window.$message.info(t('dynamic.messages.report_todo'))
      break
  }
}

const handlePreviewImage = (images: string[], index: number) => {
  emit('previewImage', images, index)
}

const handleVideoPlay = (url: string) => {
  emit('videoPlay', url)
}

const handleToggleLike = async () => {
  if (!feedDetail.value) return
  try {
    const wasLiked = feedDetail.value.hasLiked
    const actType = wasLiked ? 2 : 1

    feedDetail.value.hasLiked = !wasLiked
    if (actType === 1) {
      feedDetail.value.likeCount = (feedDetail.value.likeCount || 0) + 1
    } else {
      feedDetail.value.likeCount = Math.max(0, (feedDetail.value.likeCount || 1) - 1)
    }

    await feedStore.toggleLike(feedDetail.value.id, actType)

    try {
      const likeListResult = await feedStore.getLikeList(feedDetail.value.id)
      if (likeListResult && Array.isArray(likeListResult)) {
        feedDetail.value.likeList = likeListResult
        const feedIndex = feedStore.feedList.findIndex((f) => f.id === feedDetail.value!.id)
        if (feedIndex !== -1) {
          feedStore.feedList[feedIndex].likeList = likeListResult
          feedStore.feedList[feedIndex].likeCount = likeListResult.length
        }
      }
    } catch (error) {
      console.error('获取点赞列表失败:', error)
    }
  } catch (error) {
    console.error('点赞失败:', error)
    if (feedDetail.value) {
      feedDetail.value.hasLiked = !feedDetail.value.hasLiked
      feedDetail.value.likeCount = (feedDetail.value.likeCount || 0) + (feedDetail.value.hasLiked ? 1 : -1)
    }
    window.$message.error(t('dynamic.messages.like_fail'))
  }
}

const getCommentUserAvatar = (comment: any) => {
  const userInfo = groupStore.getUserInfo(comment.uid)
  return AvatarUtils.getAvatarUrl(userInfo?.avatar || '')
}

const getCommentUserName = (comment: any) => {
  const userInfo = groupStore.getUserInfo(comment.uid)
  return userInfo?.name || comment.uid || t('dynamic.common.unknown_user')
}

const handleSubmitComment = async () => {
  if (!feedDetail.value || !commentContent.value.trim()) {
    window.$message.warning(t('dynamic.messages.comment_empty'))
    return
  }

  commentLoading.value = true
  try {
    const content = commentContent.value.trim()

    feedDetail.value.commentCount = (feedDetail.value.commentCount || 0) + 1

    await feedStore.addComment(feedDetail.value.id, content, replyingComment.value?.id, replyingComment.value?.uid)

    commentContent.value = ''
    replyingComment.value = null
    showCommentInput.value = false

    await loadCommentList()
  } catch (error) {
    console.error('发表评论失败:', error)
    if (feedDetail.value) {
      feedDetail.value.commentCount = Math.max(0, (feedDetail.value.commentCount || 1) - 1)
    }
    window.$message.error(t('dynamic.messages.comment_fail'))
  } finally {
    commentLoading.value = false
  }
}

const handleReplyComment = (comment: any) => {
  replyingComment.value = comment
  showCommentInput.value = true
}

const handleDeleteComment = async (commentId: string) => {
  if (!feedDetail.value) return
  try {
    await feedStore.deleteComment(commentId, feedDetail.value.id)
    await loadCommentList()
  } catch (error) {
    console.error('删除评论失败:', error)
    window.$message.error(t('dynamic.messages.comment_delete_fail'))
  }
}

const loadCommentList = async () => {
  if (!feedDetail.value) return
  try {
    const result = await feedStore.getCommentList(feedDetail.value.id)
    const commentListData = Array.isArray(result) ? result : []
    commentList.value = commentListData
    if (feedDetail.value) {
      feedDetail.value.commentList = commentListData
    }
  } catch (error) {
    console.error('加载评论列表失败:', error)
  }
}

const fetchFeedDetail = async () => {
  loading.value = true
  try {
    const feed = feedStore.feedList.find((item) => item.id === props.feedId)

    if (feed) {
      feedDetail.value = JSON.parse(JSON.stringify(feed))
    } else {
      const result = await feedStore.getFeedDetail(props.feedId)
      if (result) {
        feedDetail.value = result
      } else {
        feedDetail.value = null
        window.$message.error(t('dynamic.messages.detail_missing'))
      }
    }

    if (feedDetail.value) {
      await loadCommentList()
    }
  } catch (error) {
    console.error('获取动态详情失败:', error)
    window.$message.error(t('dynamic.messages.detail_fetch_fail'))
    feedDetail.value = null
  } finally {
    loading.value = false
  }
}

watch(
  () => props.feedId,
  async (newFeedId) => {
    if (newFeedId) {
      await fetchFeedDetail()
    } else {
      loading.value = false
    }
  },
  { immediate: true }
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

/* 心形图标填充效果 */
.heart-filled {
  fill: currentColor;
}
</style>

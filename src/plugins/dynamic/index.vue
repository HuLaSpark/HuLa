<template>
  <main class="size-full rounded-8px bg-[--right-bg-color]">
    <ActionBar
      :shrink="false"
      :max-w="false"
      :top-win-label="WebviewWindow.getCurrent().label"
      :current-label="WebviewWindow.getCurrent().label" />

    <!-- 头部用户信息栏 -->
    <n-flex
      data-tauri-drag-region
      align="center"
      justify="center"
      :size="20"
      class="login-box relative h-160px w-full select-none">
      <n-avatar :size="120" round bordered :src="AvatarUtils.getAvatarUrl(userStore.userInfo!.avatar)" />
      <n-flex vertical justify="center" :size="20">
        <p class="text-(24px [--chat-text-color]) font-500">{{ userStore.userInfo!.name }}</p>

        <n-flex align="center" justify="space-between" :size="30" class="mt-5px">
          <template v-for="item in titleList" :key="item.label">
            <n-flex vertical align="center" class="cursor-pointer">
              <p class="text-[--text-color]">{{ item.total }}</p>
              <p class="text-(16px #808080)">{{ item.label }}</p>
            </n-flex>
          </template>
        </n-flex>
      </n-flex>

      <div class="absolute top-30px right-30px cursor-pointer" @click="handleInfoTip">
        <n-badge :value="unreadCount" :max="100" :show="unreadCount > 0">
          <svg class="size-24px color-[--text-color]"><use href="#remind"></use></svg>
        </n-badge>
      </div>
    </n-flex>

    <!-- 动态列表 -->
    <div class="flex flex-col items-center text-[--text-color] bg-[--right-bg-color]">
      <n-scrollbar
        style="max-height: calc(100vh / var(--page-scale, 1) - 184px)"
        class="w-full rounded-b-8px bg-[--center-bg-color] border-(solid 1px [--line-color]) p-[10px_0] box-border">
        <!-- 加载状态 -->
        <div v-if="feedOptions.isLoading" class="flex justify-center items-center py-20px">
          <n-spin size="large" />
        </div>

        <!-- 空状态 -->
        <div v-else-if="dynamicList.length === 0" class="flex justify-center items-center py-40px text-gray-500">
          暂无动态，快去发布第一条吧！
        </div>

        <!-- 动态内容 -->
        <n-flex v-else justify="center">
          <n-flex
            vertical
            v-for="item in dynamicList"
            :key="item.id"
            class="w-450px h-fit border-(solid 1px [--line-color]) custom-shadow rounded-8px bg-[--right-bg-color] p-10px box-border mb-15px">
            <!-- 用户信息区域 -->
            <n-flex align="center" class="mb-10px">
              <n-flex vertical style="flex: 1" class="ml-10px">
                <n-flex justify="space-between" align="center">
                  <label class="text-14px flex items-center gap-5px">
                    <span :class="item.author?.isAuth ? 'text-#13987f' : ''">
                      {{ item.author?.name || '未知用户' }}
                    </span>
                    <n-popover trigger="hover" v-if="item.author?.isAuth">
                      <template #trigger>
                        <svg class="size-20px color-#13987f select-none outline-none cursor-pointer">
                          <use href="#auth"></use>
                        </svg>
                      </template>
                      <span>认证用户</span>
                    </n-popover>
                  </label>
                  <span class="text-(12px #707070)">发布于：{{ formatTime(item.createTime!) }}</span>
                </n-flex>
                <span class="text-(12px #707070)">{{ item.author?.signature || '暂无签名' }}</span>
              </n-flex>
            </n-flex>

            <!-- 动态内容 -->
            <div class="mb-10px">
              <p class="text-14px leading-6">{{ item.content }}</p>

              <!-- 图片展示 -->
              <n-image-group v-if="item.images && item.images.length > 0">
                <n-flex class="mt-10px">
                  <n-image
                    v-for="(image, index) in item.images"
                    :key="index"
                    :src="image"
                    alt="动态图片"
                    width="134px"
                    height="120px"
                    class="rounded-6px cursor-pointer"
                    @click="previewImage(item.images, index)" />
                </n-flex>
              </n-image-group>

              <!-- 视频展示 -->
              <div v-if="item.videoUrl" class="mt-10px">
                <video
                  :src="item.videoUrl"
                  controls
                  class="w-full max-h-300px rounded-6px"
                  @click="handleVideoPlay(item.videoUrl)" />
              </div>
            </div>

            <!-- 互动操作区域 -->
            <n-flex align="center" justify="space-between" class="pt-10px border-t border-[--line-color]">
              <n-flex align="center" :size="20">
                <!-- 评论按钮 -->
                <n-button text @click="handleComment(item)">
                  <template #icon>
                    <n-icon>
                      <svg><use href="#comment"></use></svg>
                    </n-icon>
                  </template>
                  评论 {{ item.commentCount || 0 }}
                </n-button>
              </n-flex>

              <!-- 更多操作 -->
              <n-dropdown :options="getMoreOptions(item)" @select="handleMoreAction(item, $event)">
                <n-button text>
                  <template #icon>
                    <n-icon>
                      <svg><use href="#more"></use></svg>
                    </n-icon>
                  </template>
                </n-button>
              </n-dropdown>
            </n-flex>
          </n-flex>
        </n-flex>

        <!-- 加载更多 -->
        <div v-if="!feedOptions.isLast" class="flex justify-center py-15px">
          <n-button :loading="feedOptions.isLoading" @click="loadMore" type="primary" text>
            {{ feedOptions.isLoading ? '加载中...' : '加载更多' }}
          </n-button>
        </div>
      </n-scrollbar>
    </div>

    <!-- 评论弹出框 -->
    <n-modal v-model:show="showCommentModal" class="w-500px border-rd-8px">
      <div class="bg-[--bg-popover] h-full p-6px box-border flex flex-col">
        <div class="flex justify-between items-center mb-15px">
          <h3 class="text-16px font-bold">评论列表</h3>
          <n-button text @click="showCommentModal = false">
            <template #icon>
              <n-icon><use href="#close"></use></n-icon>
            </template>
          </n-button>
        </div>

        <!-- 评论列表 -->
        <n-scrollbar style="max-height: 400px">
          <div v-if="currentComments.length === 0" class="text-center text-gray-500 py-20px">暂无评论</div>
          <div v-else>
            <n-flex
              vertical
              v-for="comment in currentComments"
              :key="comment.id"
              class="p-10px border-b border-[--line-color]">
              <n-flex align="center">
                <n-avatar :size="32" round :src="AvatarUtils.getAvatarUrl(comment.userAvatar)" />
                <div class="ml-10px">
                  <p class="text-14px font-medium">{{ comment.userName }}</p>
                  <p class="text-12px text-gray-500">{{ formatTime(comment.createTime) }}</p>
                </div>
              </n-flex>
              <p class="text-14px mt-5px">{{ comment.content }}</p>
            </n-flex>
          </div>
        </n-scrollbar>

        <!-- 发表评论 -->
        <div class="mt-15px p-10px border-t border-[--line-color]">
          <n-input
            v-model:value="newComment"
            placeholder="请输入评论内容..."
            type="textarea"
            :rows="2"
            @keydown.enter="submitComment" />
          <n-button type="primary" class="mt-10px" @click="submitComment" :disabled="!newComment.trim()">
            发表评论
          </n-button>
        </div>
      </div>
    </n-modal>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useUserStore } from '@/stores/user.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { feedList, delFeed } from '@/utils/ImRequestUtils'

const userStore = useUserStore()

// 响应式数据 - 使用游标分页
const dynamicList = ref<FeedItem[]>([])

// 朋友圈分页选项 - 与联系人store保持一致
const feedOptions = ref({
  isLast: false,
  isLoading: false,
  cursor: ''
})

const showCommentModal = ref(false)
const newComment = ref('')
const currentFeedId = ref<string>('')
const currentComments = ref<CommentItem[]>([])

const titleList = [
  {
    label: '动态',
    total: 0
  },
  {
    label: '关注',
    total: 0
  },
  {
    label: '粉丝',
    total: 0
  }
]

// FeedItem 类型定义
interface FeedItem {
  id: string
  content: string
  images?: string[]
  videoUrl?: string
  createTime?: number
  commentCount: number
  author: {
    id: string
    name: string
    avatar: string
    isAuth: boolean
    signature?: string
  }
}

interface CommentItem {
  id: string
  content: string
  createTime: number
  userName: string
  userAvatar: string
}

// 计算属性
const unreadCount = computed(() => {
  return dynamicList.value.reduce((total, feed) => {
    return total + (feed.commentCount || 0)
  }, 0)
})

// 格式化时间显示
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * 获取朋友圈列表 - 使用游标分页
 * @param isFresh 是否刷新列表，true则重新加载，false则加载更多
 */
const fetchFeedList = async (isFresh = false) => {
  // 非刷新模式下，如果已经加载完或正在加载中，则直接返回
  if (!isFresh) {
    if (feedOptions.value.isLast || feedOptions.value.isLoading) return
  }

  feedOptions.value.isLoading = true

  try {
    const response = await feedList({
      pageSize: 20, // 使用固定分页大小，与联系人store保持一致
      cursor: isFresh ? '' : feedOptions.value.cursor
    })

    if (!response) return

    const data = response

    // 刷新模式下替换整个列表，否则追加到列表末尾
    if (isFresh) {
      dynamicList.value.splice(0, dynamicList.value.length, ...data.list)
    } else {
      dynamicList.value.push(...data.list)
    }

    // 更新分页信息
    feedOptions.value.cursor = data.cursor
    feedOptions.value.isLast = data.isLast

    // 更新统计信息
    titleList[0].total = data.total || dynamicList.value.length
  } catch (error) {
    console.error('获取朋友圈列表失败:', error)
  } finally {
    feedOptions.value.isLoading = false
  }
}

/**
 * 加载更多朋友圈
 */
const loadMore = async () => {
  await fetchFeedList(false)
}

/**
 * 刷新朋友圈列表
 */
const refreshFeedList = async () => {
  await fetchFeedList(true)
}

// 获取动态评论
const fetchComments = async (_feedId: string) => {
  try {
    // 这里应该调用评论接口，但当前接口不存在
    currentComments.value = []
  } catch (error) {
    console.error('获取评论失败:', error)
  }
}

// 评论操作
const handleComment = async (feed: FeedItem) => {
  currentFeedId.value = feed.id
  await fetchComments(feed.id)
  showCommentModal.value = true
}

// 提交评论（由于接口不存在，暂时为空实现）
const submitComment = async () => {
  if (!newComment.value.trim()) return

  try {
    // 这里应该调用发表评论接口，但当前接口不存在
    console.log('发表评论:', newComment.value)

    // 模拟评论成功
    await fetchComments(currentFeedId.value)
    newComment.value = ''

    // 更新动态的评论数量
    const feed = dynamicList.value.find((item) => item.id === currentFeedId.value)
    if (feed) {
      feed.commentCount = (feed.commentCount || 0) + 1
    }
  } catch (error) {
    console.error('发表评论失败:', error)
  }
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
  if (feed.author?.id === userStore.userInfo!.uid) {
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
        await delFeed({ feedId: feed.id })
        // 从列表中移除已删除的朋友圈
        dynamicList.value = dynamicList.value.filter((item) => item.id !== feed.id)
      } catch (error) {
        console.error('删除动态失败:', error)
      }
      break
    case 'copy':
      // 复制链接逻辑
      navigator.clipboard.writeText(`${window.location.origin}/feed/${feed.id}`)
      break
    case 'report':
      // 举报逻辑
      break
  }
}

// 图片预览
const previewImage = (images: string[], index: number) => {
  // 实现图片预览逻辑
  console.log('预览图片:', images, index)
}

// 视频播放
const handleVideoPlay = (url: string) => {
  // 实现视频播放逻辑
  console.log('播放视频:', url)
}

// 处理信息提示
const handleInfoTip = () => {
  showCommentModal.value = true
}

// 初始化数据
onMounted(async () => {
  // 初始加载朋友圈列表
  await refreshFeedList()

  // 显示窗口
  const currentWindow = WebviewWindow.getCurrent()
  if (currentWindow) {
    await currentWindow.show()
  }
})
</script>

<style scoped lang="scss">
@use '@/styles/scss/global/login-bg';

.mac-close:hover {
  svg {
    display: block;
  }
}

.custom-shadow {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

// 响应式设计
@media (max-width: 768px) {
  .login-box {
    height: 120px;

    .n-avatar {
      width: 80px;
      height: 80px;
    }
  }
}
</style>

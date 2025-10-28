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

      <div class="absolute top-30px right-30px flex items-center gap-15px">
        <!-- 闹铃图标 -->
        <div class="cursor-pointer" @click="handleInfoTip">
          <n-badge :value="unreadCount" :max="100" :show="unreadCount > 0">
            <svg class="size-24px color-[--text-color]">
              <use href="#remind"></use>
            </svg>
          </n-badge>
        </div>
        <!-- 添加动态按钮 -->
        <div class="cursor-pointer" @click="showAddFeedModal = true">
          <n-popover trigger="hover">
            <template #trigger>
              <svg class="size-24px color-[--text-color]">
                <use href="#plus"></use>
              </svg>
            </template>
            <span>发布动态</span>
          </n-popover>
        </div>
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
        <n-flex v-else vertical class="w-full">
          <div
            v-for="item in dynamicList"
            :key="item.id"
            class="w-full border-b border-[--line-color] bg-[--right-bg-color] p-15px box-border cursor-pointer hover:bg-[--bg-hover-color]">
            <!-- 主要内容区域 -->
            <n-flex align="start" justify="space-between">
              <!-- 左侧：头像和内容 -->
              <n-flex align="start" style="flex: 1; min-width: 0">
                <!-- 用户头像 -->
                <n-avatar :size="40" round :src="AvatarUtils.getAvatarUrl(userStore.userInfo!.avatar)" />

                <!-- 内容区域 -->
                <n-flex vertical style="flex: 1; min-width: 0" class="ml-10px">
                  <!-- 用户名和时间 -->
                  <n-flex align="center" :size="8" class="mb-5px">
                    <span class="text-14px font-500 text-[--text-color]">
                      {{ userStore.userInfo!.name }}
                    </span>
                    <n-popover trigger="hover" v-if="item.author?.isAuth">
                      <template #trigger>
                        <svg class="size-16px color-#13987f">
                          <use href="#auth"></use>
                        </svg>
                      </template>
                      <span>认证用户</span>
                    </n-popover>
                  </n-flex>

                  <!-- 动态内容 - 最多显示3行 -->
                  <n-ellipsis :line-clamp="3" class="text-14px text-[--text-color] leading-5 mb-8px">
                    {{ item.content }}
                  </n-ellipsis>

                  <!-- 底部信息：时间和操作 -->
                  <n-flex align="center" justify="space-between" class="mt-5px">
                    <span class="text-12px text-#999">{{ formatTime(item.createTime!) }}</span>

                    <n-flex align="center" :size="15">
                      <!-- 评论 -->
                      <n-button text size="tiny" @click.stop="handleComment(item)">
                        <template #icon>
                          <n-icon size="16">
                            <svg>
                              <use href="#comment"></use>
                            </svg>
                          </n-icon>
                        </template>
                        <span class="text-12px text-#999">{{ item.commentCount || 0 }}</span>
                      </n-button>

                      <!-- 更多操作 -->
                      <n-dropdown :options="getMoreOptions(item)" @select="handleMoreAction(item, $event)">
                        <n-button text size="tiny" @click.stop>
                          <template #icon>
                            <n-icon size="16">
                              <svg>
                                <use href="#more"></use>
                              </svg>
                            </n-icon>
                          </template>
                        </n-button>
                      </n-dropdown>
                    </n-flex>
                  </n-flex>
                </n-flex>
              </n-flex>

              <!-- 右侧：缩略图 -->
              <div v-if="item.images && item.images.length > 0" class="ml-10px flex-shrink-0">
                <n-image
                  :src="item.images[0]"
                  alt="缩略图"
                  width="80px"
                  height="80px"
                  object-fit="cover"
                  class="rounded-6px"
                  @click.stop="previewImage(item.images, 0)" />
              </div>

              <!-- 视频缩略图 -->
              <div v-else-if="item.videoUrl" class="ml-10px flex-shrink-0 relative">
                <n-image
                  :src="item.videoUrl"
                  alt="视频"
                  width="80px"
                  height="80px"
                  object-fit="cover"
                  class="rounded-6px"
                  @click.stop="handleVideoPlay(item.videoUrl)" />
                <!-- 播放图标 -->
                <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <svg class="size-24px color-white opacity-80">
                    <use href="#play"></use>
                  </svg>
                </div>
              </div>
            </n-flex>
          </div>
        </n-flex>

        <!-- 加载更多 -->
        <div v-if="!feedOptions.isLast" class="flex justify-center py-15px">
          <n-button :loading="feedOptions.isLoading" @click="loadMore" type="primary" text>
            {{ feedOptions.isLoading ? '加载中...' : '加载更多' }}
          </n-button>
        </div>
      </n-scrollbar>
    </div>

    <!-- 添加动态弹窗 -->
    <n-modal v-model:show="showAddFeedModal" class="w-600px border-rd-8px">
      <div class="bg-[--bg-popover] p-20px box-border flex flex-col">
        <div class="flex justify-between items-center mb-20px">
          <h3 class="text-18px font-bold text-[--text-color]">发布动态</h3>
          <n-button text @click="handleCloseModal">
            <template #icon>
              <n-icon>
                <svg class="size-16px">
                  <use href="#close"></use>
                </svg>
              </n-icon>
            </template>
          </n-button>
        </div>

        <!-- 动态内容输入 -->
        <n-input
          v-model:value="newFeedContent"
          type="textarea"
          placeholder="分享新鲜事..."
          :rows="6"
          :maxlength="500"
          show-count
          class="mb-15px" />

        <!-- 权限选择 -->
        <div class="mb-15px">
          <p class="text-14px text-[--text-color] mb-10px">谁可以看</p>
          <n-select
            v-model:value="permission"
            :options="permissionOptions"
            placeholder="选择可见范围"
            @update:value="handlePermissionChange" />
        </div>

        <!-- 选择用户列表 -->
        <div v-if="permission === 'partVisible' || permission === 'notAnyone'" class="mb-15px">
          <p class="text-14px text-[--text-color] mb-10px">
            {{ permission === 'partVisible' ? '选择可见的人' : '选择不可见的人' }}
          </p>
          <n-button @click="showUserSelectModal = true" size="small">
            选择用户 (已选 {{ selectedUsers.length }} 人)
          </n-button>
          <div v-if="enrichedSelectedUsers.length > 0" class="mt-10px">
            <n-tag
              v-for="user in enrichedSelectedUsers"
              :key="user.uid"
              closable
              @close="removeSelectedUser(user.uid)"
              class="mr-5px mb-5px">
              {{ user.name }}
            </n-tag>
          </div>
        </div>

        <!-- 操作按钮 -->
        <n-flex justify="end" :size="10">
          <n-button @click="handleCloseModal">取消</n-button>
          <n-button type="primary" :loading="isPublishing" :disabled="!isPublishValid" @click="handlePublishFeed">
            发布
          </n-button>
        </n-flex>
      </div>
    </n-modal>

    <!-- 用户选择弹窗 -->
    <n-modal v-model:show="showUserSelectModal" class="w-500px border-rd-8px">
      <div class="bg-[--bg-popover] p-20px box-border flex flex-col">
        <div class="flex justify-between items-center mb-20px">
          <h3 class="text-16px font-bold text-[--text-color]">选择用户</h3>
          <n-button text @click="showUserSelectModal = false">
            <template #icon>
              <n-icon>
                <svg class="size-16px">
                  <use href="#close"></use>
                </svg>
              </n-icon>
            </template>
          </n-button>
        </div>

        <!-- 搜索框 -->
        <n-input v-model:value="userSearchKeyword" placeholder="搜索用户..." class="mb-15px" clearable>
          <template #prefix>
            <n-icon>
              <svg>
                <use href="#search"></use>
              </svg>
            </n-icon>
          </template>
        </n-input>

        <!-- 用户列表 -->
        <n-scrollbar style="max-height: 400px">
          <n-checkbox-group v-model:value="selectedUserIds">
            <n-flex vertical :size="8">
              <div
                v-for="user in filteredContactsList"
                :key="user.uid"
                class="user-item p-10px rounded-6px hover:bg-[--hover-color]">
                <n-checkbox :value="user.uid" class="w-full">
                  <n-flex align="center" :size="10">
                    <n-avatar
                      :size="36"
                      round
                      :src="AvatarUtils.getAvatarUrl(groupStore.getUserInfo(user.uid)?.avatar || '')" />
                    <div>
                      <p class="text-14px font-medium text-[--text-color]">
                        {{ groupStore.getUserInfo(user.uid)?.name || user.remark || user.uid }}
                      </p>
                      <p class="text-12px text-gray-500">{{ user.uid }}</p>
                    </div>
                  </n-flex>
                </n-checkbox>
              </div>
            </n-flex>
          </n-checkbox-group>
        </n-scrollbar>

        <!-- 确认按钮 -->
        <n-flex justify="end" :size="10" class="mt-15px">
          <n-button @click="showUserSelectModal = false">取消</n-button>
          <n-button type="primary" @click="confirmUserSelection">确定 ({{ selectedUserIds.length }})</n-button>
        </n-flex>
      </div>
    </n-modal>

    <!-- 评论弹出框 -->
    <n-modal v-model:show="showCommentModal" class="w-500px border-rd-8px">
      <div class="bg-[--bg-popover] h-full p-6px box-border flex flex-col">
        <div class="flex justify-between items-center mb-15px">
          <h3 class="text-16px font-bold">评论列表</h3>
          <n-button text @click="showCommentModal = false">
            <template #icon>
              <n-icon>
                <use href="#close"></use>
              </n-icon>
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
import { useContactStore } from '@/stores/contacts.ts'
import { useFeedStore, type FeedItem } from '@/stores/feed.ts'
import { useGroupStore } from '@/stores/group.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { useMessage } from 'naive-ui'
import type { FriendItem } from '@/services/types'
import { storeToRefs } from 'pinia'

const userStore = useUserStore()
const contactStore = useContactStore()
const feedStore = useFeedStore()
const groupStore = useGroupStore()
const message = useMessage()

// 从store中获取响应式数据
const { feedList: dynamicList, feedOptions, feedStats } = storeToRefs(feedStore)

const showCommentModal = ref(false)
const newComment = ref('')
const currentFeedId = ref<string>('')
const currentComments = ref<CommentItem[]>([])

// 添加动态相关状态
const showAddFeedModal = ref(false)
const newFeedContent = ref('')
const isPublishing = ref(false)

// 媒体类型: 固定为纯文本
const mediaType = ref(0)

// 权限设置
const permission = ref<'open' | 'partVisible' | 'notAnyone'>('open')
const permissionOptions = [
  { label: '公开', value: 'open' },
  { label: '部分可见', value: 'partVisible' },
  { label: '不给谁看', value: 'notAnyone' }
]

// 用户选择相关
const showUserSelectModal = ref(false)
const selectedUserIds = ref<string[]>([])
const selectedUsers = ref<FriendItem[]>([])
const userSearchKeyword = ref('')

const titleList = computed(() => [
  {
    label: '动态',
    total: feedStats.value.total
  },
  {
    label: '关注',
    total: feedStats.value.followCount
  },
  {
    label: '粉丝',
    total: feedStats.value.fansCount
  }
])

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

// 验证发布内容是否有效（只验证文本内容）
const isPublishValid = computed(() => {
  return newFeedContent.value.trim().length > 0
})

// 过滤后的联系人列表（排除 uid 为 1 的好友）
const filteredContactsList = computed(() => {
  // 先过滤掉 uid 为 1 的好友
  const validContacts = contactStore.contactsList.filter((user) => user.uid !== '1')

  if (!userSearchKeyword.value.trim()) {
    return validContacts
  }
  const keyword = userSearchKeyword.value.toLowerCase()
  return validContacts.filter((user) => {
    const userInfo = groupStore.getUserInfo(user.uid)
    const name = userInfo?.name || user.remark || user.uid || ''
    return name.toLowerCase().includes(keyword) || user.uid.toLowerCase().includes(keyword)
  })
})

// 丰富selectedUsers数据，添加name属性
const enrichedSelectedUsers = computed(() => {
  return selectedUsers.value.map((user) => {
    const userInfo = groupStore.getUserInfo(user.uid)
    return {
      ...user,
      name: userInfo?.name || user.remark || user.uid || '未知用户'
    }
  })
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
 * 加载更多朋友圈
 */
const loadMore = async () => {
  await feedStore.loadMore()
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
        await feedStore.deleteFeed(feed.id)
        message.success('删除成功')
      } catch (error) {
        console.error('删除动态失败:', error)
        message.error('删除失败，请重试')
      }
      break
    case 'copy':
      // 复制链接逻辑
      navigator.clipboard.writeText(`${window.location.origin}/feed/${feed.id}`)
      message.success('链接已复制')
      break
    case 'report':
      // 举报逻辑
      message.info('举报功能开发中')
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

// 权限选择相关方法
const handlePermissionChange = (value: string) => {
  // 如果切换到公开，清空已选用户
  if (value === 'open') {
    selectedUserIds.value = []
    selectedUsers.value = []
  }
}

// 用户选择相关方法
const confirmUserSelection = () => {
  // 更新选中的用户列表
  selectedUsers.value = contactStore.contactsList.filter((user) => selectedUserIds.value.includes(user.uid))
  showUserSelectModal.value = false
}

const removeSelectedUser = (uid: string) => {
  const index = selectedUserIds.value.indexOf(uid)
  if (index > -1) {
    selectedUserIds.value.splice(index, 1)
  }
  selectedUsers.value = selectedUsers.value.filter((user) => user.uid !== uid)
}

// 关闭弹窗
const handleCloseModal = () => {
  showAddFeedModal.value = false
  resetAddFeedForm()
}

// 重置添加动态表单
const resetAddFeedForm = () => {
  newFeedContent.value = ''
  mediaType.value = 0
  permission.value = 'open'
  selectedUserIds.value = []
  selectedUsers.value = []
  userSearchKeyword.value = ''
}

// 发布动态
const handlePublishFeed = async () => {
  // 验证内容
  if (!newFeedContent.value.trim()) {
    message.warning('请输入动态内容')
    return
  }

  // 验证权限设置
  if ((permission.value === 'partVisible' || permission.value === 'notAnyone') && selectedUsers.value.length === 0) {
    message.warning(`请选择${permission.value === 'partVisible' ? '可见' : '不可见'}的用户`)
    return
  }

  isPublishing.value = true

  try {
    const feedData: any = {
      uid: Number(userStore.userInfo?.uid), // 发布人id
      content: newFeedContent.value,
      mediaType: mediaType.value, // 固定为 0 (纯文本)
      permission: permission.value
    }

    // 添加权限限制的用户ID列表
    if (permission.value === 'partVisible' || permission.value === 'notAnyone') {
      feedData.uidList = selectedUsers.value.map((user) => Number(user.uid))
    }

    // 调用发布接口
    const response = await feedStore.publishFeed(feedData)

    // 后端会返回生成的朋友圈ID
    console.log('发布成功，返回数据:', response)

    message.success('发布成功！')

    // 关闭弹窗
    showAddFeedModal.value = false

    // 重置表单
    resetAddFeedForm()
  } catch (error) {
    console.error('发布动态失败:', error)
    message.error('发布失败，请稍后重试')
  } finally {
    isPublishing.value = false
  }
}

// 初始化数据
onMounted(async () => {
  // 初始加载朋友圈列表
  await feedStore.getFeedList(true)

  // 加载联系人列表
  try {
    await contactStore.getContactList(true)
  } catch (error) {
    console.error('加载联系人列表失败:', error)
  }

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

// 用户选择项样式
.user-item {
  transition: all 0.3s;

  &:hover {
    background: var(--hover-color);
  }
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

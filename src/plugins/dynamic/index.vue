<template>
  <main class="size-full rounded-8px bg-#fff dark:bg-#303030">
    <!-- 头像栏 -->
    <div class="flex flex-col h-32vh relative">
      <div class="flex h-95% w-full relative">
        <ActionBar
          style="position: absolute; top: 0; left: 0; width: 100vw"
          :shrink="false"
          :max-w="false"
          :icon-color="'white'"
          :top-win-label="WebviewWindow.getCurrent().label"
          :current-label="WebviewWindow.getCurrent().label">
          <div data-tauri-drag-region class="w-87% flex gap-10px items-center">
            <div class="cursor-pointer ms-15px" @click="handleInfoTip">
              <n-badge :value="unreadCount" :max="100" :show="unreadCount > 0">
                <svg class="size-18px color-white iconpark-icon">
                  <use href="#remind"></use>
                </svg>
              </n-badge>
            </div>

            <div class="cursor-pointer" @click="showAddFeedModal = true">
              <n-popover trigger="hover">
                <template #trigger>
                  <svg class="size-24px color-white text-white iconpark-icon">
                    <use href="#plus"></use>
                  </svg>
                </template>
                <span>发布动态</span>
              </n-popover>
            </div>

            <div class="cursor-pointer" @click="handleRefresh">
              <n-popover trigger="hover">
                <template #trigger>
                  <svg class="size-20px color-white iconpark-icon"><use href="#refresh"></use></svg>
                </template>
                <span>刷新</span>
              </n-popover>
            </div>
          </div>
        </ActionBar>
        <div class="size-full flex-center bg-#90909048 dark:bg-[#202020]">
          <!-- TODO: 默认的图片是这个格式，如果动态替换需要更改对应其他的格式 -->
          <img data-tauri-drag-region class="size-76% object-contain" src="/hula.png" alt="" />
        </div>
      </div>
      <div class="flex absolute right-20px bottom-0 gap-15px">
        <div class="text-#fff items-center flex">
          {{ userStore.userInfo?.name }}
        </div>
        <div>
          <n-avatar :size="65" round bordered :src="AvatarUtils.getAvatarUrl(userStore.userInfo!.avatar)" />
        </div>
      </div>
    </div>

    <!-- 动态列表 -->
    <div class="flex flex-col items-center px-20px h-full mt-15px">
      <n-scrollbar style="max-height: calc(100vh / var(--page-scale, 1) - 184px)" class="w-full rounded-b-8px">
        <DynamicList
          mode="pc"
          :avatar-size="42"
          item-class="w-full mb-10px p-10px box-border cursor-pointer hover:bg-#f5f5f5 transition-colors duration-200"
          empty-text="暂无动态，快去发布第一条吧！"
          :show-loaded-all="false"
          :single-image-size="{ width: '200px', height: '200px' }"
          :grid-image-size="{ width: '136px', height: '136px' }"
          :video-size="{ width: '200px', height: '200px' }"
          grid-max-width="max-width: 420px"
          single-image-class="rounded-4px"
          grid-image-class="rounded-4px"
          video-class="rounded-4px"
          play-icon-size="w-48px h-48px"
          play-icon-inner-size="size-24px"
          @preview-image="previewImage"
          @video-play="handleVideoPlay"
          @load-more="loadMore"
          @item-click="handleItemClick" />
      </n-scrollbar>
    </div>

    <!-- 添加动态弹窗 -->
    <n-modal v-model:show="showAddFeedModal" class="w-80vw border-rd-8px">
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
    <n-modal v-model:show="showUserSelectModal" class="w-75vw border-rd-8px">
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
    <n-modal v-model:show="showCommentModal" class="w-75vw border-rd-8px">
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
import { sumBy } from 'es-toolkit'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useUserStore } from '@/stores/user.ts'
import { useContactStore } from '@/stores/contacts.ts'
import { useFeedStore } from '@/stores/feed.ts'
import { useGroupStore } from '@/stores/group.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { formatTimestamp } from '@/utils/ComputedTime'
import type { FriendItem } from '@/services/types'
import { storeToRefs } from 'pinia'
import DynamicList from '@/components/common/DynamicList.vue'
import { useWindow } from '@/hooks/useWindow'

const { createWebviewWindow, sendWindowPayload, checkWinExist } = useWindow()
const userStore = useUserStore()
const contactStore = useContactStore()
const feedStore = useFeedStore()
const groupStore = useGroupStore()

// 从store中获取响应式数据
const {
  feedList: dynamicList
  //  feedStats
} = storeToRefs(feedStore)

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

// const titleList = computed(() => [
//   {
//     label: '动态',
//     total: feedStats.value.total
//   },
//   {
//     label: '关注',
//     total: feedStats.value.followCount
//   },
//   {
//     label: '粉丝',
//     total: feedStats.value.fansCount
//   }
// ])

interface CommentItem {
  id: string
  content: string
  createTime: number
  userName: string
  userAvatar: string
}

// 计算属性
const unreadCount = computed(() => sumBy(dynamicList.value, (feed) => feed.commentCount || 0))

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

// 格式化时间显示（评论弹窗使用） - 使用项目统一的时间格式化函数
const formatTime = (timestamp: number) => {
  return formatTimestamp(timestamp)
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

// 处理刷新
const handleRefresh = async () => {
  try {
    await feedStore.refresh()
    window.$message.success('刷新成功')
  } catch (error) {
    console.error('刷新动态失败:', error)
    window.$message.error('刷新失败，请重试')
  }
}

// 处理动态项点击 - 在新窗口中打开
const handleItemClick = async (feedId: string) => {
  const windowLabel = `dynamicDetail`

  // 先检查窗口是否已存在
  const existingWindow = await WebviewWindow.getByLabel(windowLabel)
  if (existingWindow) {
    // 如果窗口已存在，激活它并更新内容
    await checkWinExist(windowLabel)
    // 发送事件通知窗口更新内容
    await existingWindow.emit('window-payload-updated', { feedId })
    return
  }

  // 创建新的webview窗口来显示动态详情
  const webview = await createWebviewWindow(
    '动态详情', // 窗口标题
    windowLabel, // 窗口标签
    800, // 宽度
    900, // 高度
    undefined, // 不需要关闭其他窗口
    true, // 可调整大小
    600, // 最小宽度
    700, // 最小高度
    false, // 不透明
    false // 初始不显示（等待加载完成）
  )

  // 窗口创建后，发送payload
  if (webview) {
    await sendWindowPayload(windowLabel, { feedId })
  }
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
    window.$message.warning('请输入动态内容')
    return
  }

  // 验证权限设置
  if ((permission.value === 'partVisible' || permission.value === 'notAnyone') && selectedUsers.value.length === 0) {
    window.$message.warning(`请选择${permission.value === 'partVisible' ? '可见' : '不可见'}的用户`)
    return
  }

  isPublishing.value = true

  try {
    const feedData: any = {
      uid: userStore.userInfo?.uid, // 发布人id
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

    window.$message.success('发布成功！')

    // 关闭弹窗
    showAddFeedModal.value = false

    // 重置表单
    resetAddFeedForm()
  } catch (error) {
    console.error('发布动态失败:', error)
    window.$message.error('发布失败，请稍后重试')
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

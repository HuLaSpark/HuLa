<template>
  <div class="h-full w-full bg-[--center-bg-color] select-none cursor-default">
    <!-- 窗口头部 -->
    <ActionBar
      class="absolute right-0 w-full z-999"
      :shrink="false"
      :max-w="false"
      :current-label="WebviewWindow.getCurrent().label" />

    <!-- 标题 -->
    <p
      class="absolute-x-center h-fit pt-6px text-(13px [--text-color]) select-none cursor-default"
      data-tauri-drag-region>
      全网搜索
    </p>

    <!-- 主要内容 -->
    <n-flex vertical :size="14" class="p-[45px_0_18px]" data-tauri-drag-region>
      <!-- 搜索框 -->
      <div class="px-12px">
        <n-input
          v-model:value="searchValue"
          type="text"
          size="small"
          style="border-radius: 8px; border: 1px solid #ccc"
          :placeholder="searchPlaceholder[searchType]"
          :maxlength="20"
          round
          clearable
          @keydown.enter="handleSearch"
          @clear="handleClear">
          <template #prefix>
            <n-icon>
              <svg class="icon" aria-hidden="true">
                <use href="#search" />
              </svg>
            </n-icon>
          </template>
        </n-input>
      </div>

      <!-- 搜索类型切换 -->
      <n-tabs v-model:value="searchType" animated size="small" @update:value="handleTypeChange">
        <n-tab-pane v-for="tab in tabs" :key="tab.name" :name="tab.name" :tab="tab.label">
          <template>
            <span>{{ tab.label }}</span>
          </template>

          <!-- 初始加载状态 -->
          <template v-if="initialLoading">
            <n-spin class="flex-center" style="height: calc(100vh - 200px)" size="large" />
          </template>

          <!-- 搜索结果 -->
          <template v-else-if="searchResults.length">
            <FloatBlockList
              :data-source="searchResults"
              item-key="id"
              :item-height="68"
              max-height="calc(100vh - 128px)"
              style-id="search-hover-classes">
              <template #item="{ item }">
                <div class="p-[0_20px] box-border">
                  <n-flex align="center" :size="12" class="p-[8px_0] rounded-lg">
                    <n-avatar :size="48" :src="AvatarUtils.getAvatarUrl(item.avatar)" fallback-src="/logo.png" round />
                    <n-flex vertical justify="center" :size="10" class="flex-1">
                      <n-space align="center" :size="10">
                        <span class="text-(14px [--text-color])">{{ item.name }}</span>
                        <template v-for="id in item.itemIds" :key="id">
                          <img class="size-20px" :src="useBadgeInfo(id).value.img" alt="" />
                        </template>
                      </n-space>
                      <span class="text-(12px [--chat-text-color])">{{ `账号：${item.uid}` }}</span>
                    </n-flex>

                    <!-- 三种状态的按钮 -->
                    <n-button
                      secondary
                      :type="getButtonType(item.uid)"
                      size="small"
                      class="action-button"
                      @click="handleButtonClick(item)">
                      {{ getButtonText(item.uid) }}
                    </n-button>
                  </n-flex>
                </div>
              </template>
            </FloatBlockList>
          </template>

          <!-- 搜索中状态 -->
          <template v-else-if="loading">
            <n-spin class="flex-center" style="height: calc(100vh - 200px)" size="large" />
          </template>

          <!-- 搜索无结果状态 -->
          <template v-else-if="hasSearched">
            <n-empty class="flex-center" style="height: calc(100vh - 200px)" description="未找到相关结果" />
          </template>

          <!-- 默认空状态 -->
          <template v-else>
            <n-empty style="height: calc(100vh - 200px)" class="flex-center" description="输入关键词搜索">
              <template #icon>
                <n-icon>
                  <svg><use href="#explosion"></use></svg>
                </n-icon>
              </template>
            </n-empty>
          </template>
        </n-tab-pane>
      </n-tabs>
    </n-flex>
  </div>
</template>

<script setup lang="ts">
import { WebviewWindow, getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useWindow } from '@/hooks/useWindow'
import { debounce } from 'lodash-es'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { emitTo } from '@tauri-apps/api/event'
import { RoomTypeEnum } from '@/enums/index.ts'
import { useCachedStore } from '@/stores/cached'
import { useBadgeInfo } from '@/hooks/useCached.ts'
import FloatBlockList from '@/components/common/FloatBlockList.vue'
import { useContactStore } from '@/stores/contacts'
import { ContactItem } from '@/services/types'
import { useUserStore } from '@/stores/user'
import { useGlobalStore } from '@/stores/global'

const { createWebviewWindow } = useWindow()
const cachedStore = useCachedStore()
const contactStore = useContactStore()
const userStore = useUserStore()
const globalStore = useGlobalStore()

// 定义标签页
const tabs = ref([
  { name: 'recommend', label: '推荐' },
  { name: 'user', label: '找好友' },
  { name: 'group', label: '找群聊' }
])
// 搜索类型
const searchType = ref<'recommend' | 'user' | 'group'>('recommend')
// 搜索类型对应的placeholder映射
const searchPlaceholder = {
  recommend: '输入推荐关键词',
  user: '输入昵称或账号搜索好友',
  group: '输入群昵称或群号搜索群聊'
}
// 搜索值
const searchValue = ref('')
// 搜索结果
const searchResults = ref<any[]>([])
// 是否已经搜索过
const hasSearched = ref(false)
// 加载状态
const loading = ref(false)
// 初始加载状态
const initialLoading = ref(true)

// 从缓存存储中获取用户数据
const getCachedUsers = () => {
  // 从缓存中获取所有用户
  const users = Object.values(cachedStore.userCachedList)

  // 筛选出需要显示的用户（ID在20016-20030之间的用户）
  return users
    .filter((user) => {
      const uid = user.uid as string
      return uid >= '20016' && uid <= '20030'
    })
    .map((user) => ({
      id: user.uid,
      uid: user.uid,
      name: user.name || `用户${user.uid}`, // 如果没有名称就使用默认名称
      avatar: user.avatar,
      itemIds: user.itemIds || null
    }))
}

// 清空搜索结果
const clearSearchResults = () => {
  searchResults.value = []
  hasSearched.value = false
  searchValue.value = ''
}

// 处理清空按钮点击
const handleClear = () => {
  clearSearchResults()

  // 如果是推荐标签，重新加载推荐用户
  if (searchType.value === 'recommend') {
    searchResults.value = getCachedUsers()
  }
}

// 处理搜索
const handleSearch = debounce(async () => {
  if (!searchValue.value.trim()) {
    // 如果搜索框为空且是推荐标签，显示所有推荐用户
    if (searchType.value === 'recommend') {
      searchResults.value = getCachedUsers()
    }
    return
  }

  loading.value = true
  hasSearched.value = true

  try {
    // 模拟搜索API调用
    await new Promise((resolve) => setTimeout(resolve, 800))

    const cachedUsers = getCachedUsers()

    // 根据搜索类型和搜索值过滤结果
    if (searchType.value === 'user' || searchType.value === 'recommend') {
      searchResults.value = cachedUsers.filter(
        (user) => user.name.includes(searchValue.value) || (user.uid && user.uid.toString().includes(searchValue.value))
      )
    } else if (searchType.value === 'group') {
      // 群聊搜索逻辑（示例）
      searchResults.value = []
    }
  } finally {
    loading.value = false
  }
})

// 处理选项卡切换
const handleTypeChange = () => {
  clearSearchResults()

  if (searchType.value === 'recommend') {
    searchResults.value = getCachedUsers()
  }
}

// 判断是否已经是好友
const isFriend = (uid: number | string) => {
  return contactStore.contactsList.some((contact: ContactItem) => contact.uid === uid)
}

// 判断是否是当前登录用户
const isCurrentUser = (uid: string) => {
  return userStore.userInfo.uid === uid
}

// 获取按钮文本
const getButtonText = (uid: string) => {
  if (isCurrentUser(uid)) return '编辑资料'
  if (isFriend(uid)) return '发消息'
  return '添加'
}

// 获取按钮类型
const getButtonType = (uid: string) => {
  if (isCurrentUser(uid)) return 'default'
  if (isFriend(uid)) return 'info'
  return 'primary'
}

// 处理按钮点击
const handleButtonClick = (item: any) => {
  if (isCurrentUser(item.uid)) {
    handleEditProfile()
  } else if (isFriend(item.uid)) {
    handleSendMessage(item)
  } else {
    handleAddFriend(item.uid)
  }
}

// 处理添加好友或群聊
const handleAddFriend = async (uid: string) => {
  if (searchType.value === 'user' || searchType.value === 'recommend') {
    await createWebviewWindow('申请加好友', 'addFriendVerify', 380, 300, '', false, 380, 300)
    globalStore.addFriendModalInfo.show = true
    globalStore.addFriendModalInfo.uid = uid
  } else {
    window.$message.info('加入群聊功能开发中')
  }
}

// 处理编辑个人资料
const handleEditProfile = async () => {
  // 获取主窗口
  const homeWindow = await WebviewWindow.getByLabel('home')
  // 激活主窗口
  await homeWindow?.setFocus()
  // 打开个人资料编辑窗口
  emitTo('home', 'open_edit_info')
}

// 处理发送消息
const handleSendMessage = async (item: any) => {
  // 获取主窗口
  const homeWindow = await WebviewWindow.getByLabel('home')

  // 激活主窗口
  await homeWindow?.setFocus()
  emitTo('home', 'search_to_msg', { uid: item.uid, roomType: RoomTypeEnum.SINGLE })
}

onMounted(async () => {
  await getCurrentWebviewWindow().show()

  try {
    // 初始化联系人列表
    await contactStore.getContactList(true)

    // 从缓存中获取推荐用户
    const cachedUsers = getCachedUsers()

    // 默认展示推荐用户
    if (searchType.value === 'recommend') {
      searchResults.value = cachedUsers
    }
  } finally {
    initialLoading.value = false
  }
})
</script>

<style scoped lang="scss">
.action-button {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0.9;
}

.action-button:hover {
  opacity: 1;
  transform: scale(1.06);
  box-shadow: 0 2px 8px rgba(var(--primary-color-rgb), 0.25);
}

.action-button:active {
  transform: scale(0.98);
}

/* 移除标签内容的内边距 */
:deep(.n-tab-pane) {
  padding: 0 !important;
}

:deep(.n-tabs .n-tabs-nav-scroll-wrapper) {
  padding: 0 20px 10px !important;
}
</style>

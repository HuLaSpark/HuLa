<template>
  <div class="min-w-0 cursor-default select-none flex-1 flex flex-col bg-[--right-bg-color] overflow-hidden">
    <!-- 内容头部 -->
    <div class="content-header p-20px pb-16px border-b border-solid border-[--line-color]">
      <div class="header-info">
        <h2 class="content-title text-18px font-600 text-[--text-color] m-0">
          {{ getContentTitle() }}
        </h2>
        <p class="content-subtitle text-14px text-[--text-color] opacity-60 m-0 mt-4px">
          {{ getContentSubtitle() }}
        </p>
      </div>
    </div>

    <!-- 文件列表区域 -->
    <div class="relative overflow-hidden">
      <!-- 文件列表 -->
      <n-scrollbar v-if="timeGroupedFiles.length > 0" class="file-list-scroll">
        <div class="file-list-content p-20px">
          <!-- 时间分组 -->
          <div v-for="timeGroup in timeGroupedFiles" :key="timeGroup.date" class="time-group mb-32px">
            <!-- 时间分组标题 -->
            <!-- <div class="time-group-header sticky top-0 bg-[--right-bg-color] py-12px mb-16px z-10">
              <h3 class="time-group-title text-16px font-600 text-[--text-color] m-0">
                {{ timeGroup.date }}
              </h3>
              <div class="time-group-divider h-1px bg-[--line-color] mt-8px"></div>
            </div> -->

            <!-- 文件列表 -->
            <div :class="['files-grid']">
              <div v-for="file in timeGroup.files" :key="file.id" class="flex flex-col gap-8px">
                <File :body="convertToFileBody(file)" :search-keyword="searchKeyword" />
                <!-- 文件元信息 -->
                <div class="file-meta-info">
                  <div class="flex-center gap-4px">
                    <p>来自：</p>
                    <p class="file-sender">{{ getUserDisplayName(file.sender?.id) }}</p>
                  </div>
                  <p class="file-time">{{ file.uploadTime }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </n-scrollbar>

      <!-- 空状态 -->
      <EmptyState v-else :icon="getEmptyStateIcon()" :title="getEmptyStateTitle()">
        <template #actions>
          <n-button v-if="searchKeyword" @click="clearSearch" secondary type="primary" size="small">清除搜索</n-button>

          <n-button v-if="selectedUser" @click="clearUserFilter" ghost color="#13987f" size="small">
            显示全部用户
          </n-button>
        </template>
      </EmptyState>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FileBody } from '@/services/types'
import { useGroupStore } from '@/stores/group'
import EmptyState from './EmptyState.vue'

interface TimeGroup {
  date: string
  files: any[]
}

interface User {
  id: string
  name: string
}

interface FileManagerState {
  timeGroupedFiles: Ref<TimeGroup[]>
  loading: Ref<boolean>
  searchKeyword: Ref<string>
  activeNavigation: Ref<string>
  selectedUser: Ref<string>
  userList: Ref<User[]>
  setSearchKeyword: (keyword: string) => void
  setSelectedUser: (userId: string) => void
}

const groupStore = useGroupStore()
const fileManagerState = inject<FileManagerState>('fileManagerState')!
const { timeGroupedFiles, searchKeyword, activeNavigation, selectedUser, userList, setSearchKeyword, setSelectedUser } =
  fileManagerState

// 根据 uid 获取用户显示名称
const getUserDisplayName = (uid: string) => {
  const groupName = groupStore.getUserDisplayName(uid)
  if (groupName) {
    return groupName
  }
  return '未知用户'
}

// 获取内容标题
const getContentTitle = () => {
  const navigationTitles: { [key: string]: string } = {
    myFiles: '我的文件',
    senders: '按发送人分类',
    sessions: '按会话分类',
    groups: '按群组分类'
  }

  return navigationTitles[activeNavigation.value] || '文件列表'
}

// 获取内容副标题
const getContentSubtitle = () => {
  const totalFiles = timeGroupedFiles.value.reduce((sum: number, group: TimeGroup) => sum + group.files.length, 0)

  if (selectedUser.value) {
    const user = userList.value.find((u: User) => u.id === selectedUser.value)
    if (user) {
      return `${user.name} 的文件 · 共 ${totalFiles} 个文件`
    }
  }

  if (searchKeyword.value) {
    return `搜索"${searchKeyword.value}" · 找到 ${totalFiles} 个文件`
  }

  return `共 ${totalFiles} 个文件`
}

// 获取空状态图标
const getEmptyStateIcon = () => {
  if (searchKeyword.value) {
    return 'search'
  }

  const navigationIcons: { [key: string]: string } = {
    myFiles: 'folder',
    senders: 'user',
    sessions: 'message'
  }

  return navigationIcons[activeNavigation.value] || 'folder'
}

// 获取空状态标题
const getEmptyStateTitle = () => {
  if (searchKeyword.value) {
    return '未找到相关文件'
  }

  if (selectedUser.value) {
    const user = userList.value.find((u: User) => u.id === selectedUser.value)
    return user ? `${user.name} 暂无文件` : '暂无文件'
  }

  const navigationTitles: { [key: string]: string } = {
    myFiles: '暂无文件',
    senders: '暂无发送人',
    sessions: '暂无会话文件'
  }

  return navigationTitles[activeNavigation.value] || '暂无文件'
}

// 清除搜索
const clearSearch = () => {
  setSearchKeyword('')
}

// 清除用户筛选
const clearUserFilter = () => {
  setSelectedUser('')
}

// 转换文件数据为 FileBody 格式
const convertToFileBody = (file: any): FileBody => {
  return {
    fileName: file.fileName || '',
    size: file.fileSize || 0,
    url: file.url || file.downloadUrl || ''
  }
}
</script>

<style scoped lang="scss">
.content-header {
  flex-shrink: 0;
}

.content-title {
  line-height: 1.2;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  flex-direction: column;
}

.file-list-scroll {
  height: 100%;

  :deep(.n-scrollbar-rail) {
    right: 8px;
  }
}

.file-list-content {
  padding-bottom: 40px; // 额外的底部间距
}

.time-group {
  &:last-child {
    margin-bottom: 0;
  }
}

.time-group-header {
  margin-left: -20px;
  margin-right: -20px;
  padding-left: 20px;
  padding-right: 20px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.time-group-title {
  line-height: 1.2;
}

.files-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.file-meta-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4px;
  font-size: 12px;
  color: #909090;
}

.file-sender {
  color: #13987f;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

.file-time {
  opacity: 0.8;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 400px;

  h3 {
    line-height: 1.2;
  }

  p {
    line-height: 1.4;
  }
}

// 响应式适配
@media (max-width: 1200px) {
  .file-list-content {
    padding: 16px;
  }

  .time-group-header {
    margin-left: -16px;
    margin-right: -16px;
    padding-left: 16px;
    padding-right: 16px;
  }
}

@media (max-width: 800px) {
  .content-header {
    padding: 16px;
    padding-bottom: 12px;
  }

  .file-list-content {
    padding: 12px;
  }

  .time-group-header {
    margin-left: -12px;
    margin-right: -12px;
    padding-left: 12px;
    padding-right: 12px;
  }

  .content-title {
    font-size: 16px;
  }

  .content-subtitle {
    font-size: 13px;
  }

  .empty-state {
    padding: 20px;
  }

  .empty-content {
    svg {
      width: 48px;
      height: 48px;
      margin-bottom: 12px;
    }

    h3 {
      font-size: 16px;
      margin-bottom: 6px;
    }

    p {
      font-size: 13px;
    }
  }
}

.mobile-filter-actions {
  flex-wrap: wrap;

  .n-button {
    :deep(.n-button__content) {
      font-size: 12px;
    }
  }
}

.mobile-search {
  :deep(.n-input) {
    border-radius: 20px;
  }
}

.mobile-user-select {
  :deep(.n-base-selection) {
    border-radius: 8px;
  }
}

.files-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;

  &--mobile {
    gap: 12px;
  }
}

// 滚动条样式
.file-list-scroll {
  :deep(.n-scrollbar-content) {
    height: 100%;
  }

  :deep(.n-scrollbar-rail--vertical) {
    width: 6px;

    .n-scrollbar-rail__scrollbar {
      background-color: rgba(0, 0, 0, 0.2);
      border-radius: 3px;

      &:hover {
        background-color: rgba(0, 0, 0, 0.4);
      }
    }
  }
}

// 深色主题适配
html[data-theme='dark'] {
  .time-group-header {
    background-color: var(--right-bg-color);
  }

  .file-list-scroll {
    :deep(.n-scrollbar-rail--vertical) {
      .n-scrollbar-rail__scrollbar {
        background-color: rgba(255, 255, 255, 0.2);

        &:hover {
          background-color: rgba(255, 255, 255, 0.4);
        }
      }
    }
  }
}
</style>

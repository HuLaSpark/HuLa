<template>
  <div class="min-w-0 cursor-default select-none flex-1 flex flex-col bg-[--right-bg-color] overflow-hidden">
    <!-- 内容头部 -->
    <div class="flex-shrink-0 px-20px py-16px border-b border-solid border-[--line-color]">
      <div class="flex items-center justify-between gap-32px">
        <n-flex vertical class="flex-shrink-0">
          <h2 class="text-18px font-600 text-[--text-color] m-0">
            {{ getContentTitle() }}
          </h2>
          <p class="text-14px text-[--text-color] opacity-60 m-0 mt-4px">
            {{ getContentSubtitle() }}
          </p>
        </n-flex>

        <!-- 搜索框 -->
        <n-input
          v-model:value="fileSearchKeyword"
          :placeholder="getFileSearchPlaceholder()"
          :input-props="{ spellcheck: false }"
          clearable
          spellCheck="false"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          style="width: 200px"
          class="rounded-6px border-(solid 1px [--line-color])"
          size="small">
          <template #prefix>
            <svg class="size-16px text-[--text-color] opacity-60">
              <use href="#search"></use>
            </svg>
          </template>
        </n-input>
      </div>
    </div>

    <!-- 文件列表区域 -->
    <div class="relative overflow-hidden flex-1">
      <!-- 文件列表 -->
      <n-scrollbar v-if="displayedTimeGroupedFiles.length > 0">
        <div class="p-20px flex flex-col gap-24px">
          <!-- 时间分组 -->
          <div v-for="timeGroup in displayedTimeGroupedFiles" :key="timeGroup.date" class="flex flex-col gap-12px">
            <div class="time-group">
              <span class="text-14px font-600">{{ timeGroup.displayDate || timeGroup.date }}</span>
              <span class="text-12px">{{ timeGroup.files.length }} 个文件</span>
            </div>
            <!-- 文件列表 -->
            <div class="flex flex-col gap-15px">
              <ContextMenu
                v-for="file in timeGroup.files"
                :key="file.id"
                :menu="fileContextMenu"
                :content="file"
                class="flex flex-col gap-8px"
                @select="handleFileMenuSelect($event, file)">
                <File :body="convertToFileBody(file)" :search-keyword="fileSearchKeyword" />
                <!-- 文件元信息 -->
                <div class="file-meta-info">
                  <div class="flex-center gap-4px">
                    <p>来自：</p>
                    <p class="file-sender">{{ getUserDisplayName(file.sender?.id) }}</p>
                  </div>
                  <p class="opacity-80">{{ file.uploadTime }}</p>
                </div>
              </ContextMenu>
            </div>
          </div>
        </div>
      </n-scrollbar>

      <!-- 空状态 -->
      <EmptyState v-else :icon="getEmptyStateIcon()" :title="getEmptyStateTitle()">
        <template #actions>
          <n-button v-if="hasActiveSearch" @click="clearSearch" secondary type="primary" size="small">
            清除搜索
          </n-button>

          <n-button v-if="selectedUser" @click="clearUserFilter" ghost color="#13987f" size="small">
            显示全部用户
          </n-button>
        </template>
      </EmptyState>
    </div>
  </div>
</template>

<script setup lang="ts">
import { sumBy } from 'es-toolkit'
import ContextMenu from '@/components/common/ContextMenu.vue'
import { useDownload } from '@/hooks/useDownload'
import type { FileBody } from '@/services/types'
import { useGroupStore } from '@/stores/group'
import { saveFileAttachmentAs, saveVideoAttachmentAs } from '@/utils/AttachmentSaver'
import EmptyState from './EmptyState.vue'

type TimeGroup = {
  date: string
  displayDate: string
  files: any[]
}

type User = {
  id: string
  name: string
}

type FileManagerState = {
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

const fileSearchKeyword = computed({
  get: () => searchKeyword.value,
  set: (value: string) => {
    if (value === searchKeyword.value) {
      return
    }
    setSearchKeyword(value)
  }
})

const normalizedFileSearchKeyword = computed(() => fileSearchKeyword.value.trim().toLowerCase())
const hasActiveSearch = computed(() => normalizedFileSearchKeyword.value.length > 0)

// 检查文件是否匹配搜索关键词
const matchesFileByKeyword = (file: any, keyword: string) => {
  if (!keyword) {
    return true
  }

  const candidates = [
    file.fileName,
    file.name,
    file.originalName,
    file.title,
    file.sender?.name,
    file.fileType,
    file.downloadUrl,
    file.url
  ]

  return candidates.some((candidate) => {
    if (candidate == null) {
      return false
    }
    return String(candidate).toLowerCase().includes(keyword)
  })
}

// 过滤显示的时间分组文件
const displayedTimeGroupedFiles = computed(() => {
  const keyword = normalizedFileSearchKeyword.value
  if (!keyword) {
    return timeGroupedFiles.value
  }

  return timeGroupedFiles.value
    .map((group) => {
      const matchedFiles = group.files.filter((file: any) => matchesFileByKeyword(file, keyword))
      if (matchedFiles.length === 0) {
        return null
      }

      const filteredGroup: TimeGroup = {
        ...group,
        files: matchedFiles
      }

      return filteredGroup
    })
    .filter((group): group is TimeGroup => group !== null)
})

// 计算过滤后的文件总数
const totalDisplayedFiles = computed(() => sumBy(displayedTimeGroupedFiles.value, (group) => group.files.length))

const { downloadFile } = useDownload()

const fileContextMenu: OPT.RightMenu[] = [
  {
    label: '另存为',
    icon: 'Importing',
    click: async (targetFile: any) => {
      const downloadUrl = targetFile.downloadUrl || targetFile.url
      const defaultName = targetFile.fileName ? String(targetFile.fileName) : undefined
      const isVideo = targetFile.fileType === 'video'
      const saveParams = {
        url: downloadUrl,
        downloadFile,
        defaultFileName: defaultName,
        successMessage: isVideo ? '视频保存成功' : '文件保存成功',
        errorMessage: isVideo ? '保存视频失败' : '保存文件失败'
      }
      try {
        if (isVideo) {
          await saveVideoAttachmentAs(saveParams)
        } else {
          await saveFileAttachmentAs(saveParams)
        }
      } catch (error) {
        console.error('文件另存为失败:', error)
      }
    }
  }
]

const handleFileMenuSelect = async (menuItem: OPT.RightMenu | null, file: any) => {
  if (!menuItem || typeof menuItem.click !== 'function') {
    return
  }

  try {
    await menuItem.click(file)
  } catch (error) {
    console.error('执行文件菜单操作失败:', error)
  }
}

// 根据 uid 获取用户显示名称
const getUserDisplayName = (uid: string) => {
  const groupName = groupStore.getUserDisplayName(uid)
  if (groupName) {
    return groupName
  }
  return '未知用户'
}

// 获取文件搜索占位符
const getFileSearchPlaceholder = () => {
  switch (activeNavigation.value) {
    case 'myFiles':
      return '搜索我的文件'
    case 'senders':
      return '搜索发送人文件'
    case 'sessions':
      return '搜索会话文件'
    case 'groups':
      return '搜索群组文件'
    default:
      return '搜索文件'
  }
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
  const totalFiles = totalDisplayedFiles.value

  if (selectedUser.value) {
    const user = userList.value.find((u: User) => u.id === selectedUser.value)
    if (user) {
      return `${user.name} 的文件 · 共 ${totalFiles} 个文件`
    }
  }

  const keyword = fileSearchKeyword.value.trim()
  if (keyword) {
    return `找到 ${totalFiles} 个文件`
  }

  return `共 ${totalFiles} 个文件`
}

const getEmptyStateIcon = () => {
  if (hasActiveSearch.value) {
    return 'search'
  }

  const navigationIcons: { [key: string]: string } = {
    myFiles: 'folder',
    senders: 'user',
    sessions: 'message',
    groups: 'group'
  }

  return navigationIcons[activeNavigation.value] || 'folder'
}

const getEmptyStateTitle = () => {
  if (hasActiveSearch.value) {
    return '未找到相关文件'
  }

  if (selectedUser.value) {
    const user = userList.value.find((u: User) => u.id === selectedUser.value)
    return user ? `${user.name} 暂无文件` : '暂无文件'
  }

  const navigationTitles: { [key: string]: string } = {
    myFiles: '暂无文件',
    senders: '暂无发送人文件',
    sessions: '暂无会话文件',
    groups: '暂无群组文件'
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
.time-group {
  @apply sticky top-10px z-10 flex items-center justify-between p-12px rounded-6px text-[--text-color] bg-#e3e3e380 dark:bg-#30303080 backdrop-blur-md;
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
</style>

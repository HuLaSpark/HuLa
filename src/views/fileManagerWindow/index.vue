<template>
  <div class="size-full rounded-8px bg-[--right-bg-color] flex flex-col">
    <ActionBar :shrink="false" :current-label="WebviewWindow.getCurrent().label" />

    <!-- 主内容区域 -->
    <div class="flex-1 flex overflow-hidden">
      <!-- 左侧导航区域 -->
      <SideNavigation />

      <!-- 中间用户列表区域 -->
      <UserList />

      <!-- 右侧文件展示区域 -->
      <FileContent :class="{ 'file-content--full-width': activeNavigation === 'myFiles' }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWebviewWindow, WebviewWindow } from '@tauri-apps/api/webviewWindow'
import FileContent from '@/components/fileManager/FileContent.vue'
import SideNavigation from '@/components/fileManager/SideNavigation.vue'
import UserList from '@/components/fileManager/UserList.vue'

// 定义文件管理的响应式状态
const activeNavigation = ref('myFiles')
const selectedUser = ref('')
const selectedRoom = ref('')
const searchKeyword = ref('')
const timeGroupedFiles = ref<any[]>([])
const userList = ref<any[]>([])
const loading = ref(false)
const navigationItems = ref<any[]>([])

// 查询文件
const queryFiles = async () => {
  try {
    loading.value = true

    // 根据导航类型确定查询参数
    const queryParam = {
      navigationType: activeNavigation.value,
      selectedUser: undefined,
      searchKeyword: searchKeyword.value || undefined,
      roomId: undefined,
      page: 1,
      pageSize: 50
    } as any

    // 根据不同的导航类型设置查询参数
    switch (activeNavigation.value) {
      case 'myFiles':
        // 我的文件：查询所有文件，不过滤用户或房间
        break
      case 'senders':
        // 发送人：按用户过滤
        queryParam.selectedUser = selectedUser.value || undefined
        break
      case 'sessions':
      case 'groups':
        // 会话/群聊：按房间过滤
        queryParam.roomId = selectedRoom.value || undefined
        break
    }

    const response = (await invoke('query_files', {
      param: queryParam
    })) as any

    timeGroupedFiles.value = response.timeGroupedFiles
    userList.value = response.userList
  } catch (error) {
    console.error('查询文件失败:', error)
  } finally {
    loading.value = false
  }
}

// 获取导航菜单项
const getNavigationItems = async () => {
  try {
    const items = (await invoke('get_navigation_items')) as any[]
    navigationItems.value = items
  } catch (error) {
    console.error('获取导航菜单失败:', error)
  }
}

// 设置激活的导航项
const setActiveNavigation = (key: string) => {
  activeNavigation.value = key
  navigationItems.value.forEach((item) => {
    item.active = item.key === key
  })

  // 切换导航时重置选择状态
  selectedUser.value = ''
  selectedRoom.value = ''

  queryFiles() // 重新查询文件
}

// 设置选中的用户
const setSelectedUser = (userId: string) => {
  selectedUser.value = userId
  queryFiles() // 重新查询文件
}

// 设置选中的房间
const setSelectedRoom = (roomId: string) => {
  selectedRoom.value = roomId
  queryFiles() // 重新查询文件
}

// 设置搜索关键词
const setSearchKeyword = (keyword: string) => {
  searchKeyword.value = keyword
  queryFiles() // 重新查询文件
}

// 提供给子组件使用的方法和状态
provide('fileManagerState', {
  activeNavigation: readonly(activeNavigation),
  selectedUser: readonly(selectedUser),
  selectedRoom: readonly(selectedRoom),
  searchKeyword: readonly(searchKeyword),
  timeGroupedFiles: readonly(timeGroupedFiles),
  userList: readonly(userList),
  loading: readonly(loading),
  navigationItems: readonly(navigationItems),
  setActiveNavigation,
  setSelectedUser,
  setSelectedRoom,
  setSearchKeyword
})

onMounted(async () => {
  await getCurrentWebviewWindow().show()
  // 加载导航菜单和文件数据
  await getNavigationItems()
  await queryFiles()
})
</script>

<style scoped lang="scss">
// 当用户列表隐藏时，文件内容区域占满剩余空间
:deep(.file-content--full-width) {
  flex: 1;
  max-width: none;
}

// 响应式设计
@media (max-width: 1200px) {
  .file-content--full-width {
    margin-left: 0;
  }
}
</style>

<template>
  <div
    v-show="shouldShowUserList"
    class="w-240px flex-shrink-0 flex flex-col bg-[--center-bg-color] border-r border-solid border-[--line-color]">
    <!-- 搜索栏 -->
    <div class="p-16px pb-12px">
      <n-input
        v-model:value="searchKeyword"
        :placeholder="getSearchPlaceholder()"
        :input-props="{ spellcheck: false }"
        clearable
        spellCheck="false"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        class="rounded-6px border-(solid 1px [--line-color]) w-full relative text-12px"
        size="small">
        <template #prefix>
          <svg class="size-16px text-[--text-color] opacity-60">
            <use href="#search"></use>
          </svg>
        </template>
      </n-input>
    </div>

    <!-- 动态内容区域 -->
    <div class="flex-1 px-8px overflow-hidden">
      <div class="pl-4px mb-12px">
        <span class="text-14px font-500 text-[--text-color]">{{ getSectionTitle() }}</span>
      </div>

      <n-scrollbar style="height: calc(100vh / var(--page-scale, 1) - 110px)">
        <div class="pr-12px">
          <!-- 全部选项 -->
          <UserItem
            :user="getAllOption()"
            :is-selected="selectedUser === '' && selectedRoom === ''"
            @click="handleItemClick"
            class="mb-8px" />

          <!-- 动态列表内容 -->
          <component
            :is="getItemComponent()"
            v-for="item in filteredList"
            :key="(item as any).id || (item as any).roomId || (item as any).uid"
            :user="item"
            :room="item"
            :contact="item"
            :is-selected="isItemSelected(item)"
            @click="handleItemClick"
            class="mb-8px" />

          <!-- 空状态 -->
          <div v-if="filteredList.length === 0 && searchKeyword && !loading" class="flex-center h-200px">
            <div class="flex-col-center">
              <svg class="size-48px text-[--text-color] opacity-30 mb-12px">
                <use href="#search"></use>
              </svg>
              <p class="text-14px text-[--text-color] opacity-60 m-0">{{ getEmptyMessage() }}</p>
            </div>
          </div>

          <!-- 加载状态 -->
          <div v-if="loading" class="flex-center h-200px">
            <n-spin size="small" />
            <span class="ml-8px text-14px text-[--text-color] opacity-60">加载中</span>
          </div>
        </div>
      </n-scrollbar>
    </div>
  </div>
</template>

<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core'
import { useContactStore } from '@/stores/contacts.ts'
import { useGroupStore } from '@/stores/group'
import { AvatarUtils } from '@/utils/AvatarUtils'
import UserItem from './UserItem.vue'

type FileManagerState = {
  activeNavigation: Ref<string>
  userList: Ref<any[]>
  selectedUser: Ref<string>
  selectedRoom: Ref<string>
  setSearchKeyword: (keyword: string) => void
  setSelectedUser: (userId: string) => void
  setSelectedRoom: (roomId: string) => void
}

const fileManagerState = inject<FileManagerState>('fileManagerState')!
const { activeNavigation, selectedUser, selectedRoom, setSelectedUser, setSelectedRoom } = fileManagerState

// Store 实例
const contactStore = useContactStore()
const groupStore = useGroupStore()

// 本地状态
const searchKeyword = ref('')
const loading = ref(false)
const contactList = ref<any[]>([])
const sessionList = ref<any[]>([])

// 是否显示用户列表
const shouldShowUserList = computed(() => {
  return activeNavigation.value !== 'myFiles'
})

// 获取当前显示的列表
const currentList = computed(() => {
  switch (activeNavigation.value) {
    case 'senders':
      return enrichedContactsList.value
    case 'sessions':
      return sessionList.value
    case 'groups':
      return groupChatList.value
    default:
      return []
  }
})

// 丰富好友数据
const enrichedContactsList = computed(() => {
  return contactStore.contactsList.map((item) => {
    const userInfo = groupStore.getUserInfo(item.uid)
    return {
      ...item,
      name: userInfo?.name || item.remark || '未知用户',
      avatar: AvatarUtils.getAvatarUrl(userInfo?.avatar || '/logoD.png'),
      activeStatus: item.activeStatus
    }
  })
})

// 群聊列表
const groupChatList = computed(() => {
  return [...groupStore.groupDetails]
    .map((item) => ({
      ...item,
      avatar: AvatarUtils.getAvatarUrl(item.avatar)
    }))
    .sort((a, b) => {
      // 将roomId为'1'的群聊排在最前面
      if (a.roomId === '1' && b.roomId !== '1') return -1
      if (a.roomId !== '1' && b.roomId === '1') return 1
      return 0
    })
})

// 过滤后的列表
const filteredList = computed(() => {
  if (!searchKeyword.value) {
    return currentList.value
  }

  return currentList.value.filter((item: any) => {
    const name = item.name || item.roomName || item.groupName || item.nickname || ''
    return name.toLowerCase().includes(searchKeyword.value.toLowerCase())
  })
})

// 获取搜索占位符
const getSearchPlaceholder = () => {
  switch (activeNavigation.value) {
    case 'senders':
      return '搜索发送人'
    case 'sessions':
      return '搜索会话'
    case 'groups':
      return '搜索群聊'
    default:
      return '搜索'
  }
}

// 获取区域标题
const getSectionTitle = () => {
  const count = filteredList.value.length
  switch (activeNavigation.value) {
    case 'senders':
      return `发送人 (${count})`
    case 'sessions':
      return `会话 (${count})`
    case 'groups':
      return `群聊 (${count})`
    default:
      return `列表 (${count})`
  }
}

// 获取全部选项
const getAllOption = () => {
  switch (activeNavigation.value) {
    case 'senders':
      return { id: '', name: '全部发送人', avatar: '' }
    case 'sessions':
      return { roomId: '', roomName: '全部会话', avatar: '' }
    case 'groups':
      return { roomId: '', roomName: '全部群聊', avatar: '' }
    default:
      return { id: '', name: '全部', avatar: '' }
  }
}

// 获取列表项组件
const getItemComponent = () => {
  // 都使用 UserItem 组件，但传入不同的数据
  return UserItem
}

// 判断项目是否被选中
const isItemSelected = (item: any) => {
  switch (activeNavigation.value) {
    case 'senders':
      return selectedUser.value === (item.id || item.uid)
    case 'sessions':
    case 'groups':
      return selectedRoom.value === (item.roomId || item.id)
    default:
      return false
  }
}

// 获取空状态消息
const getEmptyMessage = () => {
  switch (activeNavigation.value) {
    case 'senders':
      return '未找到匹配的发送人'
    case 'sessions':
      return '未找到匹配的会话'
    case 'groups':
      return '未找到匹配的群聊'
    default:
      return '未找到匹配项'
  }
}

// 处理项目点击
const handleItemClick = (item: any) => {
  switch (activeNavigation.value) {
    case 'senders':
      setSelectedUser(item.uid || item.id || '')
      break
    case 'sessions':
    case 'groups':
      setSelectedRoom(item.roomId || item.id || '')
      break
  }
}

// 加载联系人列表
const loadContacts = async () => {
  try {
    loading.value = true
    await contactStore.getContactList()
  } catch (error) {
    console.error('加载联系人失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载联系人列表 (恢复原始方式)
const loadContactsOriginal = async () => {
  try {
    loading.value = true
    const contacts = (await invoke('list_contacts_command')) as any[]
    contactList.value = contacts
  } catch (error) {
    console.error('加载联系人失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载会话列表 (恢复原始方式)
const loadSessions = async () => {
  try {
    loading.value = true
    // 使用联系人作为会话列表，并处理头像
    sessionList.value = contactList.value.map((item) => ({
      ...item,
      avatar: AvatarUtils.getAvatarUrl(item.avatar)
    }))
  } catch (error) {
    console.error('加载会话失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载群聊列表 (群组数据通过 groupStore 获取)
const loadGroups = async () => {
  try {
    loading.value = true
    // 群组数据已经在 groupStore 中管理，无需额外加载
    // 如果需要刷新群组数据，可以调用相应的 store 方法
  } catch (error) {
    console.error('加载群聊失败:', error)
  } finally {
    loading.value = false
  }
}

// 监听导航变化
watch(
  activeNavigation,
  async (newNav) => {
    if (!shouldShowUserList.value) return

    switch (newNav) {
      case 'senders':
        // 发送人列表使用好友列表，确保联系人数据已加载
        if (contactStore.contactsList.length === 0) {
          await loadContacts()
        }
        break
      case 'sessions':
        if (contactList.value.length === 0) {
          await loadContactsOriginal()
        }
        await loadSessions()
        break
      case 'groups':
        await loadGroups()
        break
    }
  },
  { immediate: true }
)
</script>

<style scoped lang="scss"></style>

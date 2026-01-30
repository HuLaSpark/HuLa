<template>
  <MobileLayout>
    <div class="flex w-full flex-col h-full">
      <HeaderBar
        :isOfficial="false"
        :hidden-right="true"
        :enable-default-background="false"
        :enable-shadow="false"
        room-name="邀请群友" />

      <!-- 顶部搜索框 -->
      <div class="px-16px mt-10px flex gap-3">
        <div class="flex-1 py-5px shrink-0">
          <n-input
            v-model:value="keyword"
            class="rounded-10px w-full relative text-14px"
            placeholder="搜索联系人~"
            clearable
            spellCheck="false"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off">
            <template #prefix>
              <svg class="w-12px h-12px"><use href="#search"></use></svg>
            </template>
          </n-input>
        </div>
        <div class="flex justify-end items-center">
          <n-button class="py-5px" @click="doSearch">搜索</n-button>
        </div>
      </div>

      <!-- 好友列表 -->
      <div ref="scrollArea" class="flex-1 overflow-y-auto px-16px mt-10px" :style="{ height: scrollHeight + 'px' }">
        <n-scrollbar style="max-height: calc(100vh - 150px)">
          <n-checkbox-group v-model:value="selectedList" class="flex flex-col gap-2">
            <div
              v-for="item in filteredContacts"
              :key="item.uid"
              class="rounded-10px border border-gray-200 overflow-hidden">
              <n-checkbox
                :value="item.uid"
                size="large"
                class="w-full flex items-center px-5px"
                :class="[
                  'cursor-pointer select-none transition-colors duration-150',
                  selectedList.includes(item.uid)
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                    : 'data-[active=true]:hover:bg-blue-100 dark:data-[active=true]:hover:bg-blue-500/20'
                ]">
                <template #default>
                  <div class="flex items-center gap-10px px-8px py-10px">
                    <!-- 头像 -->
                    <n-avatar
                      round
                      :size="44"
                      :src="AvatarUtils.getAvatarUrl(groupStore.getUserInfo(item.uid)?.avatar!)"
                      fallback-src="/logo.png"
                      style="border: 1px solid var(--avatar-border-color)" />
                    <!-- 文字信息 -->
                    <div class="flex flex-col leading-tight truncate">
                      <span class="text-14px font-medium truncate">
                        {{ groupStore.getUserInfo(item.uid)?.name }}
                      </span>
                      <div class="text-12px text-gray-500 flex items-center gap-4px truncate">
                        <n-badge :color="item.activeStatus === OnlineEnum.ONLINE ? '#1ab292' : '#909090'" dot />
                        {{ item.activeStatus === OnlineEnum.ONLINE ? '在线' : '离线' }}
                      </div>
                    </div>
                  </div>
                </template>
              </n-checkbox>
            </div>
          </n-checkbox-group>
        </n-scrollbar>
      </div>

      <!-- 底部操作栏 -->
      <div class="px-16px py-10px bg-white border-t border-gray-200 flex justify-between items-center">
        <span class="text-14px">已选择 {{ selectedList.length }} 人</span>
        <n-button type="primary" :disabled="selectedList.length === 0" :loading="isLoading" @click="handleInvite">
          邀请
        </n-button>
      </div>
    </div>
  </MobileLayout>
</template>

<script setup lang="ts">
import { OnlineEnum } from '@/enums'
import { useContactStore } from '@/stores/contacts.ts'
import { useGlobalStore } from '@/stores/global'
import { useGroupStore } from '@/stores/group'
import { useChatStore } from '@/stores/chat'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { inviteGroupMember } from '@/utils/ImRequestUtils'
import router from '@/router'

defineOptions({
  name: 'mobileInviteGroupMember'
})

const contactStore = useContactStore()
const globalStore = useGlobalStore()
const groupStore = useGroupStore()

const keyword = ref('')
const selectedList = ref<string[]>([])
const isLoading = ref(false)
const scrollHeight = ref(0)
const scrollArea = ref<HTMLElement>()

// 获取所有好友列表（排除已在群中的成员和机器人）
const allContacts = computed(() => {
  return contactStore.contactsList.filter((item) => {
    // 排除机器人（uid === '1'）
    if (item.uid === '1') {
      return false
    }

    // 排除已在群中的成员
    const isInGroup = groupStore.memberList.some((member) => member.uid === item.uid)
    return !isInGroup
  })
})

// 搜索过滤
const filteredContacts = computed(() => {
  if (!keyword.value.trim()) {
    return allContacts.value
  }

  const searchKeyword = keyword.value.toLowerCase()
  return allContacts.value.filter((item) => {
    const userInfo = groupStore.getUserInfo(item.uid)
    if (!userInfo) return false
    return userInfo.name.toLowerCase().includes(searchKeyword) || userInfo.account.toLowerCase().includes(searchKeyword)
  })
})

// 搜索功能
const doSearch = () => {
  // 搜索逻辑已在 filteredContacts 中实现
}

// 处理邀请
const handleInvite = async () => {
  if (selectedList.value.length === 0) {
    window.$message.warning('请选择要邀请的好友')
    return
  }

  isLoading.value = true
  try {
    await inviteGroupMember({
      roomId: globalStore.currentSessionRoomId,
      uidList: selectedList.value
    })

    window.$message.success(`成功邀请 ${selectedList.value.length} 位好友`)
    // 返回群设置页面
    router.back()
  } catch (error) {
    console.error('邀请失败:', error)
    window.$message.error('邀请失败，请重试')
  } finally {
    isLoading.value = false
  }
}

// 计算滚动区域高度
const calculateScrollHeight = () => {
  if (scrollArea.value) {
    const rect = scrollArea.value.getBoundingClientRect()
    scrollHeight.value = window.innerHeight - rect.top - 60
  }
}

// 初始化时获取群成员列表和所有用户信息
onMounted(async () => {
  try {
    // 先加载所有群的成员数据，确保 groupStore.allUserInfo 有数据
    const chatStore = useChatStore()
    const groupSessions = chatStore.getGroupSessions()

    // 加载当前群的成员列表
    if (globalStore.currentSessionRoomId) {
      await groupStore.getGroupUserList(globalStore.currentSessionRoomId)
    }

    // 加载其他群的成员列表以获取所有用户信息
    await Promise.all(
      groupSessions
        .filter((session: any) => session.roomId !== globalStore.currentSessionRoomId)
        .map((session: any) => groupStore.getGroupUserList(session.roomId))
    )
  } catch (error) {
    console.error('加载用户信息失败:', error)
  }

  calculateScrollHeight()
  window.addEventListener('resize', calculateScrollHeight)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', calculateScrollHeight)
})
</script>

<style scoped></style>

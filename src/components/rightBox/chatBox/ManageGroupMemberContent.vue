<template>
  <div class="flex w-full flex-col h-full">
    <!-- PC端头部 -->
    <div class="pc-header">
      <div class="flex items-center justify-between px-20px py-16px border-b border-[--line-color]">
        <h2 class="text-16px font-medium text-[--text-color]">管理群成员</h2>
      </div>
    </div>

    <!-- 顶部搜索框 -->
    <div class="px-20px mt-16px flex gap-3">
      <div class="flex-1 py-5px shrink-0">
        <n-input
          v-model:value="keyword"
          class="rounded-8px w-full search-input relative text-14px"
          placeholder="搜索成员~"
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

    <!-- 成员列表 -->
    <div ref="scrollArea" class="flex-1 overflow-y-auto px-20px mt-10px">
      <n-scrollbar style="max-height: 450px">
        <n-checkbox-group v-model:value="selectedList" class="flex flex-col gap-2">
          <div
            v-for="item in filteredMembers"
            :key="item.uid"
            class="rounded-8px border border-[--line-color] overflow-hidden">
            <n-checkbox
              :value="item.uid"
              size="large"
              class="w-full flex items-center px-5px"
              :class="[
                'cursor-pointer select-none transition-colors duration-150',
                selectedList.includes(item.uid) ? 'bg-blue-50 border-blue-300' : 'hover:bg-[--hover-color]'
              ]">
              <template #default>
                <div class="flex items-center gap-10px px-8px py-10px">
                  <!-- 头像 -->
                  <n-avatar
                    round
                    :size="40"
                    :src="AvatarUtils.getAvatarUrl(groupStore.getUserInfo(item.uid)?.avatar!)"
                    fallback-src="/logo.png"
                    style="border: 1px solid var(--avatar-border-color)" />
                  <!-- 文字信息 -->
                  <div class="flex flex-col leading-tight truncate">
                    <span class="text-13px font-medium truncate text-[--text-color]">
                      {{ groupStore.getUserInfo(item.uid)?.name }}
                    </span>
                    <div class="text-11px text-[--chat-text-color] flex items-center gap-4px truncate">
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
    <div class="px-20px py-12px bg-[--bg-popover] border-t border-[--line-color] flex justify-between items-center">
      <span class="text-13px text-[--text-color]">已选择 {{ selectedList.length }} 人</span>
      <n-button type="error" :disabled="selectedList.length === 0" :loading="isLoading" @click="handleRemove">
        踢出群聊
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { OnlineEnum, RoleEnum } from '@/enums'
import { useGroupStore } from '@/stores/group'
import { useGlobalStore } from '@/stores/global'
import { AvatarUtils } from '@/utils/AvatarUtils'

defineOptions({
  name: 'ManageGroupMemberContent'
})

const emit = defineEmits<{
  close: []
}>()

const groupStore = useGroupStore()
const globalStore = useGlobalStore()
const dialog = useDialog()

const keyword = ref('')
const selectedList = ref<string[]>([])
const isLoading = ref(false)
const scrollArea = ref<HTMLElement>()

// 获取非管理员的普通成员列表
const normalMembers = computed(() => {
  return groupStore.memberList.filter((item) => {
    // 只显示普通成员（不是群主，不是管理员）
    return item.roleId === RoleEnum.NORMAL
  })
})

// 搜索过滤
const filteredMembers = computed(() => {
  if (!keyword.value.trim()) {
    return normalMembers.value
  }

  const searchKeyword = keyword.value.toLowerCase()
  return normalMembers.value.filter((item) => {
    const userInfo = groupStore.getUserInfo(item.uid)
    if (!userInfo) return false
    return userInfo.name.toLowerCase().includes(searchKeyword) || userInfo.account.toLowerCase().includes(searchKeyword)
  })
})

// 搜索功能
const doSearch = () => {
  // 搜索逻辑已在 filteredMembers 中实现
}

// 处理踢出群聊
const handleRemove = async () => {
  // 检查是否是频道（roomId === '1'），频道不允许踢人
  if (globalStore.currentSession?.roomId === '1') {
    window.$message.warning('频道不允许踢出成员')
    return
  }

  if (selectedList.value.length === 0) {
    window.$message.warning('请选择要踢出的成员')
    return
  }

  // 确认对话框
  dialog.warning({
    title: '确认踢出',
    content: `确定要踢出 ${selectedList.value.length} 位成员吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      isLoading.value = true
      try {
        // 调用批量踢人接口
        await groupStore.removeGroupMembers(selectedList.value, globalStore.currentSession!.roomId)

        window.$message.success(`成功踢出 ${selectedList.value.length} 位成员`)
        selectedList.value = []
        // 关闭弹窗
        emit('close')
      } catch (error) {
        console.error('踢出失败:', error)
        window.$message.error('踢出失败，请重试')
      } finally {
        isLoading.value = false
      }
    }
  })
}

// 初始化时获取群成员列表
onMounted(async () => {
  // 如果是频道（roomId === '1'），直接关闭弹窗
  if (globalStore.currentSession?.roomId === '1') {
    window.$message.warning('频道不支持管理成员')
    emit('close')
    return
  }

  try {
    // 加载当前群的成员列表
    if (globalStore.currentSession?.roomId) {
      await groupStore.getGroupUserList(globalStore.currentSession.roomId)
    }
  } catch (error) {
    console.error('加载成员列表失败:', error)
  }
})
</script>

<style scoped lang="scss">
.pc-header {
  flex-shrink: 0;
}

/* 搜索框灰色背景 */
.search-input {
  :deep(.n-input__input-el) {
    background-color: #f5f5f5;
  }

  :deep(.n-input-wrapper) {
    background-color: #f5f5f5;
  }

  :deep(.n-input__prefix) {
    background-color: #f5f5f5;
  }

  :deep(.n-input__border),
  :deep(.n-input__state-border) {
    border: none;
  }
}

/* 适配PC端的通用样式 */
:deep(.n-checkbox) {
  width: 100%;
}

:deep(.n-checkbox__label) {
  width: 100%;
  padding: 0;
}
</style>

<template>
  <!-- 移动端布局 -->
  <MobileLayout v-if="isMobileView">
    <div class="flex w-full flex-col h-full">
      <!-- 移动端头部 -->
      <HeaderBar
        :isOfficial="false"
        :hidden-right="true"
        :enable-default-background="false"
        :enable-shadow="false"
        :room-name="t('home.manage_group_member.title')" />

      <!-- 顶部搜索框 -->
      <div class="px-16px mt-10px flex gap-3">
        <div class="flex-1 py-5px shrink-0">
          <n-input
            v-model:value="keyword"
            class="rounded-10px w-full bg-gray-100 relative text-14px"
            :placeholder="t('home.manage_group_member.search_placeholder_mobile')"
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
      </div>

      <!-- 成员列表 -->
      <div ref="scrollArea" class="flex-1 overflow-y-auto px-16px mt-10px" :style="{ height: scrollHeight + 'px' }">
        <n-scrollbar style="max-height: calc(100vh - 150px)">
          <n-checkbox-group v-model:value="selectedList" class="flex flex-col gap-2">
            <div
              v-for="item in filteredMembers"
              :key="item.uid"
              class="rounded-10px border border-gray-200 overflow-hidden">
              <n-checkbox
                :value="item.uid"
                size="large"
                class="w-full flex items-center px-5px"
                :class="[
                  'cursor-pointer select-none transition-colors duration-150',
                  selectedList.includes(item.uid) ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
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
                        {{
                          item.activeStatus === OnlineEnum.ONLINE
                            ? t('home.friends_list.status.online')
                            : t('home.friends_list.status.offline')
                        }}
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
        <span class="text-14px">
          {{ t('home.manage_group_member.selected_count', { count: selectedList.length }) }}
        </span>
        <n-button type="error" :disabled="selectedList.length === 0" :loading="isLoading" @click="handleMobileRemove">
          {{ t('home.manage_group_member.remove_button') }}
        </n-button>
      </div>
    </div>
  </MobileLayout>

  <!-- PC端布局（作为弹窗内容或独立页面） -->
  <div v-else class="flex w-full flex-col h-full">
    <!-- PC端头部 -->
    <div class="flex-shrink-0">
      <div class="flex items-center justify-between px-20px py-16px border-b border-[--line-color]">
        <h2 class="text-16px font-medium text-[--text-color]">{{ t('home.manage_group_member.title') }}</h2>
      </div>
    </div>

    <!-- 顶部搜索框 -->
    <div class="px-20px flex gap-3">
      <div class="flex-1 py-5px shrink-0">
        <n-input
          v-model:value="keyword"
          spellCheck="false"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          class="border-(solid 1px [--line-color]) rounded-8px"
          :placeholder="t('home.manage_group_member.search_placeholder_pc')">
          <template #prefix>
            <svg class="w-12px h-12px"><use href="#search"></use></svg>
          </template>
        </n-input>
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
              class="w-full flex items-center px-12px"
              :class="[
                'cursor-pointer select-none transition-colors duration-150',
                selectedList.includes(item.uid) ? 'bg-#13987f18' : ''
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
                      {{
                        item.activeStatus === OnlineEnum.ONLINE
                          ? t('home.friends_list.status.online')
                          : t('home.friends_list.status.offline')
                      }}
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
      <span class="text-13px text-[--text-color]">
        {{ t('home.manage_group_member.selected_count', { count: selectedList.length }) }}
      </span>
      <n-popconfirm v-model:show="showDeleteConfirm">
        <template #icon>
          <svg class="size-22px"><use href="#explosion"></use></svg>
        </template>
        <template #action>
          <n-button size="small" tertiary @click.stop="showDeleteConfirm = false">
            {{ t('home.manage_group_member.dialog_negative') }}
          </n-button>
          <n-button size="small" type="error" @click.stop="handleRemove">
            {{ t('home.manage_group_member.dialog_positive') }}
          </n-button>
        </template>
        <template #trigger>
          <n-button
            secondary
            class="rounded-14px"
            type="error"
            :disabled="selectedList.length === 0"
            :loading="isLoading">
            {{ t('home.manage_group_member.remove_button') }}
          </n-button>
        </template>
        {{ t('home.manage_group_member.remove_confirm', { count: selectedList.length }) }}
      </n-popconfirm>
    </div>
  </div>
</template>

<script setup lang="ts">
import MobileLayout from '#/components/MobileLayout.vue'
import HeaderBar from '#/components/chat-room/HeaderBar.vue'
import { type } from '@tauri-apps/plugin-os'
import { OnlineEnum, RoleEnum } from '@/enums'
import { useGroupStore } from '@/stores/group'
import { useGlobalStore } from '@/stores/global'
import { AvatarUtils } from '@/utils/AvatarUtils'
import router from '@/router'
import { useI18n } from 'vue-i18n'

defineOptions({
  name: 'ManageGroupMember'
})

const emit = defineEmits<{
  close: []
}>()

const groupStore = useGroupStore()
const globalStore = useGlobalStore()
const dialog = useDialog()
const { t } = useI18n()

const keyword = ref('')
const selectedList = ref<string[]>([])
const isLoading = ref(false)
const showDeleteConfirm = ref(false)
const scrollHeight = ref(0)
const scrollArea = ref<HTMLElement>()

// 判断是否为移动端视图
const isMobileView = computed(() => {
  return type() === 'ios' || type() === 'android'
})

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

// 处理关闭
const handleClose = () => {
  if (isMobileView.value) {
    // 移动端返回上一页
    router.back()
  } else {
    // PC端发送关闭事件
    emit('close')
  }
}

const validateRemoval = () => {
  if (globalStore.currentSessionRoomId === '1') {
    window.$message.warning(t('home.manage_group_member.channel_not_allowed'))
    return false
  }

  if (selectedList.value.length === 0) {
    window.$message.warning(t('home.manage_group_member.select_member_warning'))
    return false
  }

  return true
}

// 实际处理踢出群聊
const handleRemove = async () => {
  showDeleteConfirm.value = false

  if (!validateRemoval()) {
    return false
  }

  const members = [...selectedList.value]
  const count = members.length

  isLoading.value = true
  try {
    await groupStore.removeGroupMembers(members, globalStore.currentSessionRoomId)

    window.$message.success(t('home.manage_group_member.remove_success', { count }))
    selectedList.value = []
    handleClose()
    return true
  } catch (error) {
    console.error('踢出失败:', error)
    window.$message.error(t('home.manage_group_member.remove_failed'))
    return false
  } finally {
    isLoading.value = false
  }
}

// 移动端使用对话框二次确认
const handleMobileRemove = () => {
  if (!validateRemoval()) return

  dialog.warning({
    title: t('home.manage_group_member.confirm_remove_title'),
    content: t('home.manage_group_member.remove_confirm', { count: selectedList.value.length }),
    positiveText: t('home.manage_group_member.dialog_positive'),
    negativeText: t('home.manage_group_member.dialog_negative'),
    onPositiveClick: handleRemove
  })
}

// 计算滚动区域高度（仅移动端需要）
const calculateScrollHeight = () => {
  if (scrollArea.value && isMobileView.value) {
    const rect = scrollArea.value.getBoundingClientRect()
    scrollHeight.value = window.innerHeight - rect.top - 60
  }
}

// 初始化时获取群成员列表
onMounted(async () => {
  // 如果是频道（roomId === '1'），直接返回上一页
  if (globalStore.currentSessionRoomId === '1') {
    window.$message.warning(t('home.manage_group_member.channel_manage_unsupported'))
    handleClose()
    return
  }

  try {
    // 加载当前群的成员列表
    if (globalStore.currentSessionRoomId) {
      await groupStore.getGroupUserList(globalStore.currentSessionRoomId)
    }
  } catch (error) {
    console.error('加载成员列表失败:', error)
  }

  if (isMobileView.value) {
    calculateScrollHeight()
    window.addEventListener('resize', calculateScrollHeight)
  }
})

onBeforeUnmount(() => {
  if (isMobileView.value) {
    window.removeEventListener('resize', calculateScrollHeight)
  }
})
</script>

<style scoped lang="scss"></style>

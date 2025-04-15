<template>
  <div class="h-full w-full bg-[--center-bg-color] select-none cursor-default">
    <!-- 窗口头部 -->
    <ActionBar
      class="absolute right-0 w-full z-999"
      :shrink="false"
      :min-w="false"
      :max-w="false"
      :current-label="WebviewWindow.getCurrent().label" />

    <!-- 标题 -->
    <p
      class="absolute-x-center h-fit pt-6px text-(12px [--text-color]) select-none cursor-default"
      data-tauri-drag-region>
      {{ windowTitle }}
    </p>

    <!-- 内容区域 -->
    <div class="bg-[--bg-edit] pt-24px size-full box-border flex flex-col">
      <n-transfer
        class="h-full text-[--text-color]"
        source-filterable
        target-filterable
        v-model:value="selectedValue"
        :options="filteredOptions"
        :render-source-list="renderSourceList(true)"
        :render-target-label="renderLabel"
        :disabled-options="disabledOptions" />

      <n-flex align="center" justify="end" class="p-16px">
        <n-button color="#13987f" @click="handleInvite">确定</n-button>
        <n-button secondary @click="handleClose">取消</n-button>
      </n-flex>
    </div>
  </div>
</template>
<script setup lang="ts">
import { renderLabel, getDisabledOptions, getFilteredOptions, renderSourceList } from '@/layout/center/model.tsx'
import { WebviewWindow, getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useMitt } from '@/hooks/useMitt'
import { useGlobalStore } from '@/stores/global'
import { useGroupStore } from '@/stores/group'
import apis from '@/services/apis'

const globalStore = useGlobalStore()
const groupStore = useGroupStore()
const windowTitle = ref('')
const selectedValue = ref([])
// 使用model.tsx中的getDisabledOptions
const disabledOptions = computed(() => getDisabledOptions())

// 使用model.tsx中的getFilteredOptions
const filteredOptions = computed(() => getFilteredOptions())

// 初始化群成员数据
const initGroupMembers = async () => {
  if (globalStore.currentSession?.roomId) {
    await groupStore.getGroupUserList(true, globalStore.currentSession.roomId)
  }
}

const handleInvite = async () => {
  if (selectedValue.value.length < 1) return

  try {
    // 调用邀请群成员API
    await apis.inviteGroupMember({
      roomId: globalStore.currentSession?.roomId,
      uidList: selectedValue.value
    })

    window.$message.success('邀请成功')
  } catch (error) {
    console.error('邀请失败:', error)
    window.$message.error('邀请失败，请重试')
  }
}

const handleClose = () => {
  useMitt.emit('handleCloseWin')
}

onMounted(async () => {
  await getCurrentWebviewWindow().show()

  // 获取窗口标题
  windowTitle.value = await getCurrentWebviewWindow().title()

  // 初始化群成员数据
  await initGroupMembers()
})
</script>

<style scoped lang="scss">
@use '@/layout/center/style.scss';
</style>

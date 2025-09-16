<template>
  <!-- 头部 -->
  <ChatHeader />
  <n-flex :class="{ 'shadow-inner': page.shadow }" :size="0" class="h-full">
    <div class="flex-col flex-1 relative">
      <!-- 中间聊天框内容  -->
      <div class="max-h-80%">
        <ChatMain />
      </div>

      <!-- 输入框和操作列表 -->
      <ChatFooter class="max-h-20%" :detail-id="globalStore.currentSession!.detailId" />
    </div>
    <!-- 右侧栏占位：群聊时预留宽度直至 Sidebar 挂载完成，随后由子组件控制宽度（含折叠） -->
    <ChatSidebar />
  </n-flex>
</template>
<script setup lang="ts">
import { useGlobalStore } from '@/stores/global'
import { useSettingStore } from '@/stores/setting.ts'

const settingStore = useSettingStore()
const { page } = storeToRefs(settingStore)
const globalStore = useGlobalStore()
</script>
<style scoped lang="scss"></style>

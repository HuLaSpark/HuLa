<template>
  <div class="flex flex-col flex-1 min-h-0">
    <!-- 头部 -->
    <ChatHeader />

    <div class="flex-1 flex min-h-0">
      <div class="flex-1 min-h-0">
        <n-split direction="vertical" class="h-full" :min="0.55" :max="0.75" :default-size="0.75">
          <template #1>
            <ChatMain />
          </template>
          <template #2>
            <!-- 输入框和操作列表 -->
            <ChatFooter :detail-id="globalStore.currentSession!.detailId" />
          </template>
        </n-split>
      </div>
      <!-- 右侧栏占位：群聊时预留宽度直至 Sidebar 挂载完成，随后由子组件控制宽度（含折叠） -->
      <ChatSidebar />
    </div>
  </div>
</template>
<script setup lang="ts">
import { useGlobalStore } from '@/stores/global'
const globalStore = useGlobalStore()
</script>
<style scoped lang="scss"></style>

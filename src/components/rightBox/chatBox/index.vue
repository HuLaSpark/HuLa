<template>
  <!-- 头部 -->
  <ChatHeader :active-item="globalStore.currentSession!" />
  <n-flex :class="{ 'shadow-inner': page.shadow }" :size="0" class="h-full">
    <div class="flex flex-col flex-1 relative min-h-0">
      <!-- 中间聊天框内容  -->
      <div class="flex-1 min-h-0 relative">
        <ChatMain />
      </div>
      <!-- 输入框和操作列表 -->
      <ChatFooter :detail-id="globalStore.currentSession!.detailId" />
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
<style scoped lang="scss">
/**! 修改naive-ui虚拟列表滚动条的间距 */
:deep(
  .n-scrollbar > .n-scrollbar-rail.n-scrollbar-rail--vertical,
  .n-scrollbar + .n-scrollbar-rail.n-scrollbar-rail--vertical
) {
  right: 0;
}
</style>

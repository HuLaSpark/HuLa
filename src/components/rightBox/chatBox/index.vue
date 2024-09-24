<template>
  <!-- 头部 -->
  <ChatHeader :active-item="activeItemRef as any" />
  <n-flex :class="{ 'shadow-inner': page.shadow }" :size="0" class="h-full">
    <n-flex vertical :size="0" class="flex-1 relative">
      <!-- 中间聊天框内容  -->
      <ChatMain :active-item="activeItemRef as any" />
      <!-- 输入框和操作列表 -->
      <ChatFooter class="flex-1" />
    </n-flex>
    <ChatSidebar />
  </n-flex>
</template>
<script setup lang="ts">
import { MockItem } from '@/services/types.ts'
import { listen } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { setting } from '@/stores/setting.ts'

const settingStore = setting()
const { page } = storeToRefs(settingStore)
const appWindow = WebviewWindow.getCurrent()
const { activeItem } = defineProps<{
  activeItem?: MockItem
}>()
provide('activeItem', { ...activeItem! })
const activeItemRef = ref({ ...activeItem! })

watchEffect(() => {
  activeItemRef.value = { ...activeItem! }
})

listen(appWindow.label, (e) => {
  activeItemRef.value = e.payload as any
})
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

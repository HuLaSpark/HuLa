<template>
  <!-- 头部 -->
  <ChatHeader :active-item="activeItemRef" />
  <n-flex :class="{ 'shadow-inner': page.shadow }" :size="0" class="h-full">
    <n-flex vertical :size="0" class="flex-1 relative">
      <!-- 中间聊天框内容  -->
      <ChatMain :active-item="activeItemRef" />
      <!-- 输入框和操作列表 -->
      <ChatFooter class="flex-1" :detail-id="activeItemRef.detailId" />
    </n-flex>
    <ChatSidebar />
  </n-flex>
</template>
<script setup lang="ts">
import type { SessionItem } from '@/services/types.ts'
import { useSettingStore } from '@/stores/setting.ts'
const settingStore = useSettingStore()
const { page } = storeToRefs(settingStore)
const { activeItem } = defineProps<{
  activeItem?: SessionItem
}>()
provide('activeItem', { ...activeItem! })
const activeItemRef = ref({ ...activeItem! })

watchEffect(() => {
  activeItemRef.value = { ...activeItem! }
})

onMounted(() => {
  // 事件监听已移除，现在使用 channel 方式在 useMsgInput.ts 中直接处理响应
  // addListener(
  //   appWindow.listen(appWindow.label, (e: { payload: SessionItem }) => {
  //     activeItemRef.value = e.payload
  //   })
  // )
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

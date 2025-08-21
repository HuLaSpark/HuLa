<template>
  <!-- 头部 -->
  <ChatHeader :active-item="activeItemRef" />
  <n-flex :class="{ 'shadow-inner': page.shadow }" :size="0" class="h-full">
    <div class="flex flex-col flex-1 relative min-h-0">
      <!-- 中间聊天框内容  -->
      <div class="flex-1 min-h-0 relative">
        <ChatMain :active-item="activeItemRef" />
      </div>
      <!-- 输入框和操作列表 -->
      <ChatFooter :detail-id="activeItemRef.detailId" />
    </div>
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

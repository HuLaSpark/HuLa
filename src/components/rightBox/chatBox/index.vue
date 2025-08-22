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
    <!-- 右侧栏占位：群聊时预留宽度直至 Sidebar 挂载完成，随后由子组件控制宽度（含折叠） -->
    <div :class="[isGroup ? (sidebarReady ? '' : 'w-180px') : 'w-0', 'transition-all duration-300 flex-shrink-0']">
      <ChatSidebar @ready="sidebarReady = true" />
    </div>
  </n-flex>
</template>
<script setup lang="ts">
import { RoomTypeEnum } from '@/enums'
import type { SessionItem } from '@/services/types.ts'
import { useSettingStore } from '@/stores/setting.ts'

const settingStore = useSettingStore()
const { page } = storeToRefs(settingStore)
const { activeItem } = defineProps<{
  activeItem?: SessionItem
}>()
provide('activeItem', { ...activeItem! })
const activeItemRef = ref({ ...activeItem! })

// 是否是群聊（用于右侧栏占位，防止首次渲染抖动）
const isGroup = computed(() => activeItemRef.value?.type === RoomTypeEnum.GROUP)

// Sidebar 就绪标记：在会话切换为群聊时先置为未就绪，待子组件发出 ready 后关闭占位
const sidebarReady = ref(false)

watch(
  () => activeItemRef.value?.roomId,
  () => {
    // 切换会话时重置占位状态
    sidebarReady.value = false
  }
)

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

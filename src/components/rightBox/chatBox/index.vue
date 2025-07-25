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
import { listen } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useTauriListener } from '@/hooks/useTauriListener'
import type { SessionItem } from '@/services/types.ts'
import { useSettingStore } from '@/stores/setting.ts'
import { MessageStatusEnum } from '~/src/enums'
import { useChatStore } from '~/src/stores/chat'

const { addListener } = useTauriListener()
const settingStore = useSettingStore()
const { page } = storeToRefs(settingStore)
const appWindow = WebviewWindow.getCurrent()
const { activeItem } = defineProps<{
  activeItem?: SessionItem
}>()
const chatStore = useChatStore()
provide('activeItem', { ...activeItem! })
const activeItemRef = ref({ ...activeItem! })

watchEffect(() => {
  activeItemRef.value = { ...activeItem! }
})

onMounted(() => {
  addListener(
    listen('send_msg_success', async (event) => {
      const msg = event.payload as any
      chatStore.updateMsg({
        msgId: msg.oldMsgId,
        status: MessageStatusEnum.SUCCESS,
        newMsgId: msg.message.id,
        body: msg.message.body
      })
    })
  )

  addListener(
    listen('send_msg_error', (event) => {
      const msgId = event.payload as any
      chatStore.updateMsg({
        msgId: msgId,
        status: MessageStatusEnum.FAILED
      })
    })
  )

  addListener(
    appWindow.listen(appWindow.label, (e: { payload: SessionItem }) => {
      activeItemRef.value = e.payload
    })
  )
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

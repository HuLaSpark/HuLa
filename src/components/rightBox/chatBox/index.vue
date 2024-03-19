<template>
  <!-- 头部 -->
  <ChatHeader :active-item="activeItemRef" />
  <!-- 中间聊天框内容  -->
  <ChatMain :active-item="activeItemRef" />
  <!-- 输入框和操作列表 -->
  <ChatFooter />
</template>
<script setup lang="ts">
import ChatFooter from './ChatFooter.vue'
import ChatHeader from './ChatHeader.vue'
import ChatMain from './ChatMain.vue'
import { MockItem } from '@/services/types.ts'
import { listen } from '@tauri-apps/api/event'
import { appWindow } from '@tauri-apps/api/window'

const { activeItem } = defineProps<{
  activeItem?: MockItem
}>()
const activeItemRef = ref({ ...activeItem! })

watchEffect(() => {
  activeItemRef.value = { ...activeItem! }
})

listen(appWindow.label, (e) => {
  activeItemRef.value = e.payload as any
})
</script>

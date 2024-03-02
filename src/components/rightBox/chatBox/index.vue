<template>
  <!-- 头部 -->
  <ChatHeader :active-item="activeItem" />
  <!-- 中间聊天框内容  -->
  <ChatMain :active-item="activeItem" />
  <!-- 输入框和操作列表 -->
  <ChatFooter />
</template>
<script setup lang="ts">
import ChatFooter from './chatFooter.vue'
import ChatHeader from './chatHeader.vue'
import ChatMain from './chatMain.vue'
import { MockItem } from '@/services/types.ts'

const { activeItem } = defineProps<{
  activeItem: MockItem
}>()
</script>

<style scoped lang="scss"></style>

<template>
  <!-- 好友详情 -->
  <div class="flex flex-col items-center mt-60px gap-20px">
    <n-image width="146px" height="146px" class="rounded-50%" :src="item.avatar" alt="" />

    <span class="text-20px">{{ item.accountName }}</span>
  </div>
  <div>{{ item }}</div>
  <!-- 群聊详情 -->
</template>
<script setup lang="ts">
import { MockItem } from '@/services/types.ts'

const props = defineProps<{
  content: any[]
}>()
const { content } = toRefs(props)
const item = computed<MockItem>(() => {
  return content.value[0]
})
</script>

<style scoped></style>

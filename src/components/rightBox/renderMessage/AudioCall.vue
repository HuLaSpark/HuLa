<template>
  <!-- 视频通话消息 -->
  <div
    class="dark:bg-[#13987f20] bg-[#13987f30] dark:border-(1px solid #13987f20) border-(1px solid #13987f40) flex items-center gap-8px px-12px py-8px rounded-8px max-w-280px"
    :class="isCurrentUser ? 'flex-row-reverse' : 'flex-row'">
    <!-- 视频通话图标 -->
    <div class="flex-shrink-0">
      <svg class="size-18px color-#13987f">
        <use href="#video-one"></use>
      </svg>
    </div>

    <!-- 消息内容 -->
    <div class="flex-1 text-(12px #13987f) select-none cursor-default">
      {{ props.body }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user'

const props = defineProps<{
  body: string
  fromUserUid: string
}>()

const userStore = useUserStore()

// 判断是否是当前用户发送的消息
const isCurrentUser = computed(() => {
  return userStore.userInfo.uid === props.fromUserUid
})
</script>

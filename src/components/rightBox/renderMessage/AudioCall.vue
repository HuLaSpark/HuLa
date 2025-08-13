<template>
  <!-- 语音通话消息 -->
  <div class="flex-y-center gap-6px" :class="isCurrentUser ? 'flex-row-reverse' : 'flex-row'">
    <!-- 语音通话图标 -->
    <svg class="iconpark-icon size-1.2em" :class="isCurrentUser ? 'scale-x-[-1]' : ''">
      <use href="#phone-telephone"></use>
    </svg>

    <!-- 消息内容 -->
    <div class="select-none cursor-default">
      {{ body }}
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

<template>
  <!-- 公告消息 -->
  <n-flex vertical :size="0" class="w-240px h-170px bg-[--group-notice-bg] rounded-8px custom-shadow">
    <n-flex class="h-34px px-12px select-none cursor-default" align="center" :size="8">
      <svg class="size-16px flex-shrink-0"><use href="#Loudspeaker"></use></svg>
      <p class="text-(12px [--chat-text-color])">公告</p>
    </n-flex>

    <span class="w-full h-1px bg-[--line-color]"></span>

    <p class="flex-1 px-12px pt-12px box-border leading-22px break-words line-clamp-4 text-(14px [--text-color])">
      {{ body.content }}
    </p>

    <p class="select-none cursor-default flex-shrink-0 flex-y-center h-34px px-12px text-(12px [--chat-text-color])">
      {{ formatTimestamp(body.updateTime || body.createTime, true) }}
    </p>
  </n-flex>
</template>

<script setup lang="ts">
import type { AnnouncementBody } from '@/services/types'
import { formatTimestamp } from '@/utils/ComputedTime.ts'

defineProps<{ body: AnnouncementBody }>()
</script>

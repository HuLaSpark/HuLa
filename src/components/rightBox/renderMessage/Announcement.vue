<template>
  <!-- 公告消息 -->
  <n-flex vertical :size="0" class="w-240px h-170px bg-[--group-notice-bg] rounded-8px custom-shadow">
    <n-flex class="px-12px py-8px select-none cursor-default" align="center" :size="8">
      <svg class="size-16px flex-shrink-0"><use href="#Loudspeaker"></use></svg>
      <p class="text-(12px [--chat-text-color])">公告</p>
    </n-flex>

    <span class="w-full h-1px bg-[--line-color]"></span>

    <p class="px-12px pt-12px min-h-100px box-border leading-22px break-words line-clamp-4 text-(14px [--text-color])">
      {{ body.content }}
    </p>

    <p class="select-none cursor-default pt-12px px-12px text-(12px [--chat-text-color])">
      {{ formatTimestamp(body.createdTime || body.updatedTime, true) }}
    </p>
  </n-flex>
</template>

<script setup lang="ts">
import type { AnnouncementBody } from '@/services/types'
import { formatTimestamp } from '@/utils/ComputedTime.ts'

defineProps<{ body: AnnouncementBody }>()
</script>

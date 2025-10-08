<template>
  <!-- 公告消息 -->
  <n-flex vertical :size="0" class="w-240px h-170px bg-[--group-notice-bg] rounded-8px custom-shadow">
    <n-flex class="h-34px px-12px select-none cursor-default" align="center" justify="space-between">
      <n-flex align="center" :size="8">
        <svg class="size-16px flex-shrink-0"><use href="#Loudspeaker"></use></svg>
        <p class="text-(12px [--chat-text-color])">公告</p>
      </n-flex>

      <p class="select-none cursor-default flex-shrink-0 text-(12px [--chat-text-color])">
        {{ formatTimestamp(body.updateTime || body.createTime, true) }}
      </p>
    </n-flex>

    <span class="w-full h-1px bg-[--line-color]"></span>

    <p class="flex-1 px-12px pt-12px box-border leading-22px break-words line-clamp-4 text-(14px [--text-color])">
      <n-highlight
        v-if="searchKeyword"
        :text="body.content"
        :patterns="[searchKeyword]"
        :highlight-style="{
          userSelect: 'text',
          padding: '2px 4px',
          borderRadius: '6px',
          color: '#000',
          background: '#13987f'
        }" />
      <template v-else>{{ body.content }}</template>
    </p>

    <div class="w-full flex-center py-6px cursor-default">
      <n-button
        secondary
        type="primary"
        class="flex-y-center px-12px h-26px text-12px"
        @click.stop="openAnnouncementDetail">
        查看详情
      </n-button>
    </div>
  </n-flex>
</template>

<script setup lang="ts">
import { useWindow } from '@/hooks/useWindow'
import type { AnnouncementBody } from '@/services/types'
import { useGlobalStore } from '@/stores/global'
import { formatTimestamp } from '@/utils/ComputedTime.ts'

defineProps<{
  body: AnnouncementBody
  searchKeyword?: string
}>()

const globalStore = useGlobalStore()
const { createWebviewWindow } = useWindow()

const openAnnouncementDetail = async () => {
  const roomId = globalStore.currentSession?.roomId
  if (!roomId) {
    return
  }
  await createWebviewWindow('查看群公告', `announList/${roomId}/1`, 420, 620)
}
</script>

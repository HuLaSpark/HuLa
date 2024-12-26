<template>
  <div style="white-space: pre-wrap">
    <span v-html="transformMessageContent(props.body.content)"></span>
  </div>
</template>
<script setup lang="ts">
import type { TextBody } from '@/services/types'

const props = defineProps<{ body: TextBody }>()

// 统一的HTML转义函数
const escapeHtml = (content: string) => {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const transformMessageContent = (content: string) => {
  // 对于常规文本，转义 HTML 并转换 URL
  const escapedContent = escapeHtml(content)

  // 将 URL 转换为可点击的链接
  return escapedContent.replace(
    /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g,
    (url) =>
      `<a style="color: inherit;text-underline-offset: 4px" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`
  )
}
</script>

<style scoped></style>

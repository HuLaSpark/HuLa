<template>
  <!--  消息为文本类型或者回复消息  -->
  <div style="white-space: pre-wrap">
    <pre
      style="white-space: pre-wrap"
      v-if="isCodeContent(props.body.content)"><code>{{props.body.content}}</code></pre>
    <span v-else v-html="transformMessageContent(props.body.content)"></span>
  </div>
</template>
<script setup lang="ts">
import type { TextBody } from '@/services/types'

const props = defineProps<{ body: TextBody }>()

const transformMessageContent = (content: string) => {
  // First check if content looks like code (contains multiple line breaks and special characters)
  const hasCodeIndicators = /[{}[\]();\n]/.test(content) && content.split('\n').length > 2

  if (hasCodeIndicators) {
    // If it looks like code, wrap it in a pre tag and escape it
    return `<pre style="background-color: #f5f5f5; padding: 8px; border-radius: 4px; overflow-x: auto; font-family: monospace; white-space: pre;">${content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')}</pre>`
  }

  // For regular text, escape HTML and transform URLs
  const escapedContent = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

  // Convert URLs to clickable links
  return escapedContent.replace(
    /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g,
    (url) =>
      `<a style="color: inherit;text-underline-offset: 4px" href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
  )
}

const isCodeContent = (content: string) => {
  return /[{}[\]();\n]/.test(content) && content.split('\n').length > 2
}
</script>

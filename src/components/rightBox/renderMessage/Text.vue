<template>
  <div style="white-space: pre-wrap" class="message-text">
    <span v-for="(segment, index) in processedContent" :key="index">
      <a
        v-if="segment.type === 'link'"
        :href="segment.content"
        target="_blank"
        rel="noopener noreferrer nofollow"
        class="message-link">
        {{ segment.content }}
      </a>
      <span v-else v-text="segment.content"></span>
    </span>
  </div>
</template>
<script setup lang="ts">
import type { TextBody } from '@/services/types'

const props = defineProps<{ body: TextBody }>()

// 正则表达式常量
const URL_REGEX = /https?:\/\/[^\s<]+[^<.,:;"')\]\s]/g

// 处理消息内容，将其分割成不同类型的片段
const processedContent = computed(() => {
  const content = props.body.content
  const segments: { type: 'text' | 'link'; content: string }[] = []
  let lastIndex = 0

  // 匹配所有URL
  content.replace(URL_REGEX, (url, index) => {
    // 添加URL之前的文本
    if (index > lastIndex) {
      segments.push({
        type: 'text',
        content: content.slice(lastIndex, index)
      })
    }

    // 添加URL
    segments.push({
      type: 'link',
      content: url
    })

    lastIndex = index + url.length
    return url
  })

  // 添加最后一段文本
  if (lastIndex < content.length) {
    segments.push({
      type: 'text',
      content: content.slice(lastIndex)
    })
  }

  return segments
})
</script>

<style scoped>
.message-text {
  word-break: break-word;
  line-height: 1.5;
}

.message-link {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 4px;
  transition: opacity 0.2s ease;
}

.message-link:hover {
  opacity: 0.8;
}
</style>

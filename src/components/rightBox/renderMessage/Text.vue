<template>
  <!--  消息为文本类型或者回复消息  -->
  <div style="white-space: pre-wrap">
    <div v-if="isCode" class="code-block" v-html="highlightedCode"></div>
    <span v-else v-html="transformMessageContent(props.body.content)"></span>
  </div>
</template>
<script setup lang="ts">
import type { TextBody } from '@/services/types'
import { codeToHtml } from 'shiki'

const props = defineProps<{ body: TextBody }>()
const isCode = ref(false)
const highlightedCode = ref('')

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

// 检测是否为代码内容并进行高亮
const detectAndHighlightCode = async (content: string) => {
  // 检查是否可能是代码
  const lines = content.split('\n')

  // 代码特征评分
  let codeScore = 0

  // 如果行数小于3，直接判定为非代码
  if (lines.length < 3) {
    isCode.value = false
    return
  }

  // 检查常见的代码特征
  const codePatterns = [
    /^import\s+.*from/, // import 语句
    /^(const|let|var)\s+.*=/, // 变量声明
    /^function\s+\w+\s*\(/, // 函数声明
    /^class\s+\w+/, // 类声明
    /^\s*if\s*\(/, // if 语句
    /^\s*for\s*\(/, // for 循环
    /^\s*while\s*\(/, // while 循环
    /^\s*return\s/, // return 语句
    /[{}[\]();]/, // 代码符号
    /^\s*\/\//, // 单行注释
    /^\s*\/\*/, // 多行注释开始
    /\*\/\s*$/ // 多行注释结束
  ]

  // 统计符合代码特征的行数
  lines.forEach((line) => {
    if (codePatterns.some((pattern) => pattern.test(line))) {
      codeScore++
    }
  })

  // 如果超过30%的行具有代码特征，则认为是代码
  const threshold = lines.length * 0.3
  if (codeScore >= threshold) {
    try {
      const html = await codeToHtml(content, {
        lang: 'javascript',
        theme: 'slack-dark'
      })
      highlightedCode.value = html
      isCode.value = true
    } catch (error) {
      console.error('Code highlighting failed:', error)
      isCode.value = false
    }
  } else {
    isCode.value = false
  }
}

// 监听 props.body.content 的变化
watchEffect(() => {
  detectAndHighlightCode(props.body.content)
})
</script>

<style scoped>
.code-block :deep(pre) {
  margin: 0;
  padding: 1em;
  white-space: pre-wrap;
  word-wrap: break-word;
  border-radius: 8px;
}

.code-block :deep(code) {
  display: block;
  line-height: 1.8;
  font-size: 0.96em;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>

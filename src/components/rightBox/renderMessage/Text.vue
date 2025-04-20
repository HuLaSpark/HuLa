<template>
  <div>
    <template v-for="(item, index) in fragments" :key="index">
      <span
        v-if="item.startsWith('@') && item.trim() !== '' && item.trim() !== '@'"
        :key="item"
        class="text-#fbb990 cursor-pointer">
        {{ item }}
      </span>
      <template v-else-if="item.startsWith('http')">
        <n-tooltip trigger="hover">
          <template #trigger>
            <svg class="size-12px cursor-pointer pr-4px" @click="handleCopy(item)">
              <use href="#copy"></use>
            </svg>
          </template>
          <span>复制网址</span>
        </n-tooltip>
        {{ item }}
      </template>
      <template v-else>{{ item }}</template>
      <div
        v-if="keys.includes(item)"
        :key="item + index"
        rel="noopener noreferrer"
        target="_blank"
        class="text-card"
        @click="openUrl(item.trim())">
        <div v-if="urlMap[item].image" class="text-card-image-wrapper">
          <img class="text-card-image" :src="urlMap[item].image" @error="onImageLoadError" />
        </div>
        <div class="text-card-link-content">
          <span class="text-14px line-clamp-1"> {{ urlMap[item].title }}</span>
          <span class="text-(12px [rgba(0,0,0,0.6)]) mt-4px line-clamp-2">{{ urlMap[item].description }}</span>
        </div>
      </div>
    </template>
  </div>
</template>
<script setup lang="ts">
import type { TextBody } from '@/services/types'

const props = defineProps<{ body: TextBody }>()
// 获取所有匹配的字符串
const urlMap = props.body.urlContentMap || {}
const keys = Object.keys(urlMap)
// 正则表达式常量用于匹配URL
const URL_REGEX = /https?:\/\/[^\s<]+[^<.,:;"')\]\s]/g

// 处理长链接
const processLongUrls = computed(() => {
  let content = props.body.content || ''
  content = content.replace(/&nbsp;/g, '\u00A0')

  return content.replace(URL_REGEX, (match, url) => {
    // 如果urlMap中已有该链接的信息，添加到urlMap中
    if (!urlMap[match] && url) {
      urlMap[match] = {
        title: url,
        description: '链接',
        image: ''
      }
      // 动态添加到keys中
      if (!keys.includes(match)) {
        keys.push(match)
      }
    }
    return match
  })
})

// 使用匹配字符串创建动态正则表达式，并将文本拆分为片段数组
const fragments = computed(() => {
  let content = processLongUrls.value

  // 创建正则表达式，包含@开头的内容、urlMap中的keys、以及其他内容
  const regex = new RegExp(`(@\\S+\\s|${keys.join('|')}|\\S+\\s)`, 'g')
  return content.split(regex)
})

// 打开链接
const openUrl = (url: string) => {
  if (!url) return

  // 处理以@开头的URL
  if (url.startsWith('@http')) {
    url = url.substring(1) // 移除@符号
  }

  // 当没有协议时，自动添加协议
  window.open(url.startsWith('http') ? url : '//' + url, '_blank')
}

// 处理复制
const handleCopy = (item: string) => {
  if (item) {
    navigator.clipboard.writeText(item)
    window.$message.success('复制成功')
  }
}

const onImageLoadError = (e: Event) => {
  const target = e.target as HTMLImageElement
  if (!target) return
  target.style.opacity = '0'
}
</script>

<style scoped>
.text-card {
  display: flex;
  margin: 8px 0;
  padding: 12px;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.03);
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;
}

.text-card:hover {
  background-color: rgba(0, 0, 0, 0.08);
}

.text-card-image-wrapper {
  width: 60px;
  height: 60px;
  margin-right: 12px;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}

.text-card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 0.2s ease;
}

.text-card-link-content {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex: 1;
  min-width: 0;
}
</style>

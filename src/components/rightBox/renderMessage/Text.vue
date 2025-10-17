<template>
  <div :class="isMobile() ? 'text-16px' : 'text-14px'">
    <template v-for="(item, index) in fragments" :key="index">
      <span
        v-if="mentionTokenSet.has(item)"
        :key="item"
        style="-webkit-user-select: text !important; user-select: text !important"
        class="text-#fbb990 cursor-pointer">
        {{ item }}
      </span>
      <template v-else-if="item.startsWith('http')">
        <n-flex align="center" :wrap="false">
          <n-tooltip trigger="hover" style="flex-shrink: 0">
            <template #trigger>
              <svg class="size-12px cursor-pointer pr-4px" @click="handleCopy(item)">
                <use href="#copy"></use>
              </svg>
            </template>
            <span>复制网址</span>
          </n-tooltip>
          <div style="flex: 1; word-wrap: break-word; overflow-wrap: anywhere">
            <n-highlight
              v-if="props.searchKeyword"
              :text="item"
              :patterns="[props.searchKeyword]"
              :highlight-style="{
                userSelect: 'text',
                padding: '2px 4px',
                borderRadius: '6px',
                color: '#000',
                background: '#13987f'
              }" />
            <p v-else style="margin: 0">{{ item }}</p>
          </div>
        </n-flex>
      </template>
      <n-highlight
        v-else-if="props.searchKeyword"
        :text="item"
        :patterns="[props.searchKeyword]"
        :highlight-style="{
          userSelect: 'text',
          padding: '2px 4px',
          borderRadius: '6px',
          color: '#000',
          background: '#13987f'
        }" />
      <template v-else>{{ item }}</template>
      <div
        v-if="keys.includes(item)"
        :key="item + index"
        rel="noopener noreferrer"
        target="_blank"
        class="text-card"
        @click="openUrl(item)">
        <div v-if="urlMap[item].image" class="text-card-image-wrapper">
          <img class="text-card-image" :src="urlMap[item].image" @error="onImageLoadError" />
        </div>
        <div class="text-card-link-content">
          <span class="text-14px line-clamp-1">{{ urlMap[item].title }}</span>
          <span class="text-(12px [--chat-text-color]) mt-4px line-clamp-2">{{ urlMap[item].description }}</span>
        </div>
      </div>
    </template>
  </div>
</template>
<script setup lang="ts">
import { openExternalUrl } from '@/hooks/useLinkSegments'
import { useGroupStore } from '@/stores/group'
import type { TextBody } from '@/services/types'
import { isMobile } from '@/utils/PlatformConstants'

// 标记结构用于描述需特殊渲染的片段区间
type ContentMarker = {
  start: number
  end: number
  text: string
  type: 'mention' | 'url'
}

const props = defineProps<{
  body: TextBody
  searchKeyword?: string
}>()
// 获取所有匹配的字符串
const urlMap = props.body.urlContentMap || {}
const keys = Object.keys(urlMap)
// 正则表达式常量用于匹配URL
const URL_REGEX = /https?:\/\/[^\s<]+[^<.,:;"')\]\s]/g

const groupStore = useGroupStore()

// 仅依赖后端透出的 atUidList，避免用户手动输入的「@文本」被误判
const mentionTokens = computed(() => {
  if (!Array.isArray(props.body.atUidList) || props.body.atUidList.length === 0) {
    return []
  }
  const tokens = new Set<string>()
  props.body.atUidList.forEach((uid) => {
    const user = groupStore.getUserInfo(uid)
    const name = user?.myName || user?.name
    if (name) {
      tokens.add(`@${name}`)
    }
  })
  return Array.from(tokens)
})
// 使用 Set 快速判断片段是否属于真正的 @ 提及
const mentionTokenSet = computed(() => new Set(mentionTokens.value))

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
  const content = processLongUrls.value

  // 创建一个数组来存储所有的特殊标记位置
  const markers: ContentMarker[] = []

  // 添加@提及的标记，仅基于已匹配的mention列表
  mentionTokens.value.forEach((token) => {
    if (!token) return
    let searchIndex = 0
    while (searchIndex < content.length) {
      const index = content.indexOf(token, searchIndex)
      if (index === -1) break
      markers.push({
        start: index,
        end: index + token.length,
        text: token,
        type: 'mention'
      })
      searchIndex = index + token.length
    }
  })

  // 添加URL的标记
  keys.forEach((key) => {
    let index = 0
    while ((index = content.indexOf(key, index)) !== -1) {
      markers.push({
        start: index,
        end: index + key.length,
        text: key,
        type: 'url'
      })
      index += key.length
    }
  })

  // 按照开始位置排序标记
  markers.sort((a, b) => a.start - b.start)

  // 合并重叠的标记
  for (let i = 0; i < markers.length - 1; i++) {
    if (markers[i + 1].start < markers[i].end) {
      // 如果下一个标记的开始位置在当前标记的结束位置之前，说明有重叠
      // 选择保留较长的标记
      if (markers[i + 1].end - markers[i + 1].start > markers[i].end - markers[i].start) {
        markers.splice(i, 1) // 删除当前标记
      } else {
        markers.splice(i + 1, 1) // 删除下一个标记
      }
      i-- // 重新检查当前位置
    }
  }

  // 构建最终的片段数组
  const result: string[] = []
  let lastEnd = 0

  for (const marker of markers) {
    // 添加标记前的普通文本
    if (marker.start > lastEnd) {
      result.push(content.substring(lastEnd, marker.start))
    }
    // 添加标记的文本
    result.push(marker.text)
    lastEnd = marker.end
  }

  // 添加最后一段普通文本
  if (lastEnd < content.length) {
    result.push(content.substring(lastEnd))
  }

  // 如果没有任何标记，直接返回整个内容
  return result.length > 0 ? result : [content]
})

// 打开链接
const openUrl = (url: string) => openExternalUrl(url)

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

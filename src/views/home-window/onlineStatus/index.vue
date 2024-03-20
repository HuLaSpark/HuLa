<template>
  <main class="wh-full bg-#fff select-none">
    <ActionBar class="absolute right-0 w-full" :shrink="false" :max-w="false" :min-w="false" />

    <n-space
      vertical
      :size="130"
      :style="`background: linear-gradient(to bottom, ${activeItem.bgColor} 0%, #f1f1f1 100%)`"
      class="wh-full p-20px box-border">
      <!-- 当前选中的状态 -->
      <n-flex justify="center" align="center" class="pt-80px">
        <img class="w-34px h-34px" :src="activeItem.url" alt="" />
        <span class="text-22px">{{ activeItem.title }}</span>
      </n-flex>

      <!-- 状态 -->
      <n-space vertical class="w-full h-100vh bg-#f1f1f1 rounded-6px box-border p-13px">
        <n-scrollbar style="max-height: 255px">
          <n-flex align="center" :size="10">
            <n-space
              @click="handleActive(item, index)"
              :class="{ active: activeItem.index === index }"
              v-for="(item, index) in statusItem"
              :key="item.title"
              vertical
              justify="center"
              align="center"
              :size="2"
              class="status-item">
              <img class="w-24px h-24px" :src="item.url" alt="" />
              <span class="text-11px">{{ item.title }}</span>
            </n-space>
          </n-flex>
        </n-scrollbar>
      </n-space>
    </n-space>
  </main>
</template>
<script setup lang="ts">
import { statusItem } from './config.ts'
import { onlineStatus } from '@/stores/onlineStatus.ts'
import { storeToRefs } from 'pinia'
import { listen } from '@tauri-apps/api/event'
import { EventEnum } from '@/enums'

const OLStatusStore = onlineStatus()
const { url, title, bgColor } = storeToRefs(OLStatusStore)
/* 选中的状态 */
const activeItem = reactive({
  index: -1,
  title: title.value,
  url: url.value,
  bgColor: bgColor?.value
})

/**
 * 处理选中的状态
 * @param { OPT.Online } item 状态
 * @param index 选中的下标
 */
const handleActive = async (item: OPT.Online, index: number) => {
  OLStatusStore.setOnlineStatus(item.url, item.title)
  activeItem.index = index
  activeItem.title = item.title
  activeItem.url = item.url
  await listen(EventEnum.SET_OL_STS, (e) => {
    const val = e.payload as OPT.Online
    activeItem.bgColor = val.bgColor
  })
}

onMounted(async () => {
  activeItem.index = statusItem.findIndex((item) => item.title === activeItem.title)
})
</script>
<style scoped lang="scss">
.status-item {
  width: 56px;
  height: 56px;
  &:not(.active):hover {
    background: #ccc;
    border-radius: 8px;
    cursor: pointer;
  }
}

.active {
  background: var(--bg-active-msg);
  border-radius: 8px;
  cursor: pointer;
  span {
    color: #fff;
  }
}

:deep(.action-close) {
  svg {
    color: #404040;
  }
}
/* 隐藏naive UI的滚动条 */
:deep(
    .n-scrollbar > .n-scrollbar-rail.n-scrollbar-rail--vertical > .n-scrollbar-rail__scrollbar,
    .n-scrollbar + .n-scrollbar-rail.n-scrollbar-rail--vertical > .n-scrollbar-rail__scrollbar
  ) {
  display: none;
}
</style>

<template>
  <main class="wh-full bg-#fff select-none">
    <ActionBar class="absolute right-0 w-full" :shrink="false" :max-w="false" :min-w="false" />

    <n-space
      vertical
      :size="130"
      :style="`background: linear-gradient(to bottom, ${RGBA} 0%, #f1f1f1 100%)`"
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
import { EventEnum } from '@/enums'
import { emit } from '@tauri-apps/api/event'
import ColorThief from 'colorthief'

const colorthief = new ColorThief()
const OLStatusStore = onlineStatus()
const RGBA = ref()
const { url, title } = storeToRefs(OLStatusStore)
/* 选中的状态 */
const activeItem = reactive({
  index: -1,
  title: '',
  url: ''
})

/**
 * 处理选中的状态
 * @param { OPT.Online } item 状态
 * @param index 选中的下标
 */
const handleActive = async (item: OPT.Online, index: number) => {
  activeItem.index = index
  activeItem.title = item.title
  activeItem.url = item.url
  OLStatusStore.setOnlineStatus(item.url, item.title)
  await getBGColor(item.url, item.title)
}

/* 获取图片的背景颜色 */
const getBGColor = async (url: string, title: string) => {
  const img = new Image()
  img.src = url
  img.onload = async () => {
    const colors = await colorthief.getColor(img, 3)
    RGBA.value = `rgba(${colors.join(',')}, 0.4)`
    OLStatusStore.setColor(`rgba(${colors.join(',')}, 0.4)`)
    await emit(EventEnum.SET_OL_STS, { url: url, title: title, bgColor: RGBA.value })
  }
}

onMounted(async () => {
  /* 第一次没有选状态的时候随机选中一个状态 */
  activeItem.title = title.value
  activeItem.url = url.value
  activeItem.index = statusItem.findIndex((item) => item.title === activeItem.title)
  await getBGColor(activeItem.url, activeItem.title)
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

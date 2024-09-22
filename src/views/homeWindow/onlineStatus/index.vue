<template>
  <main class="size-full bg-#fff select-none">
    <ActionBar class="absolute right-0 w-full" :shrink="false" :max-w="false" :min-w="false" />

    <n-flex
      vertical
      :size="130"
      :style="`background: linear-gradient(to bottom, ${RGBA} 0%, #f1f1f1 100%)`"
      class="size-full p-20px box-border">
      <!-- 当前选中的状态 -->
      <n-flex justify="center" align="center" class="pt-80px">
        <img class="w-34px h-34px" :src="activeItem.url" alt="" />
        <span class="text-22px">{{ activeItem.title }}</span>
      </n-flex>

      <!-- 状态 -->
      <n-flex vertical class="w-full h-100vh bg-#f1f1f1 rounded-6px box-border p-13px">
        <n-scrollbar style="max-height: 255px">
          <n-flex align="center" :size="10">
            <n-flex
              @click="handleActive(item, index)"
              :class="{ active: activeItem.index === index }"
              v-for="(item, index) in statusItem"
              :key="item.title"
              vertical
              justify="center"
              align="center"
              :size="8"
              class="status-item">
              <img class="w-24px h-24px" :src="item.url" alt="" />
              <span class="text-11px">{{ item.title }}</span>
            </n-flex>
          </n-flex>
        </n-scrollbar>
      </n-flex>
    </n-flex>
  </main>
</template>
<script setup lang="ts">
import { statusItem } from './config.ts'
import { onlineStatus } from '@/stores/onlineStatus.ts'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'

const OLStatusStore = onlineStatus()
const { url, title, bgColor } = storeToRefs(OLStatusStore)
/** 选中的状态 */
const activeItem = reactive({
  index: -1,
  title: title.value,
  url: url.value
})
/** 这里不写入activeItem中是因为v-bind要绑定的值是响应式的 */
const RGBA = ref(bgColor?.value)

watchEffect(() => {
  activeItem.index = statusItem.findIndex((item) => item.title === activeItem.title)
  activeItem.url = url.value
  activeItem.title = title.value
  RGBA.value = bgColor?.value
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
}

onMounted(async () => {
  await getCurrentWebviewWindow().show()
  activeItem.index = statusItem.findIndex((item) => item.title === activeItem.title)
})
</script>
<style scoped lang="scss">
.status-item {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  transition: all 0.4s ease-in-out;
  &:not(.active):hover {
    background: #ccc;
    cursor: pointer;
  }
}

.active {
  background: v-bind(RGBA);
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
/** 隐藏naive UI的滚动条 */
:deep(
    .n-scrollbar > .n-scrollbar-rail.n-scrollbar-rail--vertical > .n-scrollbar-rail__scrollbar,
    .n-scrollbar + .n-scrollbar-rail.n-scrollbar-rail--vertical > .n-scrollbar-rail__scrollbar
  ) {
  display: none;
}
</style>

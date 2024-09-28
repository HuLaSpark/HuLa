<template>
  <main class="login-box size-full select-none">
    <ActionBar :shrink="false" :max-w="false" />

    <n-flex vertical align="center" :size="20" class="size-full pt-100px">
      <div @mousemove="handleMouseMove" @mouseleave="handleMouseLeave" class="box">
        <div id="computer" class="computer">
          <img class="w-224px h-158px relative" src="@/assets/img/win.png" alt="" />
          <div
            style="background: rgba(111, 111, 111, 0.1)"
            class="w-170px h-113px absolute top-9% left-51% transform -translate-x-51% -translate-y-9%"></div>
          <img
            class="drop-shadow-md absolute top-30% left-1/2 transform -translate-x-1/2 -translate-y-30% w-140px h-60px"
            src="@/assets/logo/hula.png"
            alt="" />
        </div>
      </div>

      <n-flex vertical align="center" :size="20">
        <span class="text-(15px #707070)">版本：v{{ _pkg.version }}({{ osArch }})</span>
        <span class="text-(15px #707070)">当前设备：{{ osType }}{{ osVersion }}</span>
        <n-flex vertical class="text-(12px #909090)" :size="8" align="center">
          <span>Copyright © {{ currentYear - 1 }}-{{ currentYear }} nongyehong</span>
          <span>All Rights Reserved.</span>
        </n-flex>
      </n-flex>
    </n-flex>
  </main>
</template>

<script setup lang="ts">
import pkg from '~/package.json'
import dayjs from 'dayjs'
import { type, arch, version } from '@tauri-apps/plugin-os'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'

const _pkg = reactive({
  version: pkg.version
})
const osType = ref()
const osArch = ref()
const osVersion = ref()
// 使用day.js获取当前年份
const currentYear = dayjs().year()

const element = ref<HTMLElement | null>(null)
/** 鼠标移动时，对元素进行旋转的指数 */
const multiple = 20

const transformElement = (x: number, y: number) => {
  if (element.value) {
    const box = element.value.getBoundingClientRect()
    const calcX = -(y - box.y - box.height / 2) / multiple
    const calcY = (x - box.x - box.width / 2) / multiple

    element.value.style.transform = `rotateX(${calcX}deg) rotateY(${calcY}deg)`
  }
}

const handleMouseMove = (event: MouseEvent) => {
  window.requestAnimationFrame(() => {
    transformElement(event.clientX, event.clientY)
  })
}

const handleMouseLeave = () => {
  window.requestAnimationFrame(() => {
    if (element.value) {
      element.value.style.transform = 'rotateX(0) rotateY(0)'
    }
  })
}

onMounted(async () => {
  await getCurrentWebviewWindow().show()
  osType.value = type()
  osArch.value = arch()
  osVersion.value = version()
  if (osType.value === 'windows') {
    let parts = version().split('.')
    let build_number = Number(parts[2])
    osVersion.value = build_number > 22000 ? '11' : '10'
  }
  element.value = document.getElementById('computer')
})
</script>

<style scoped lang="scss">
@use '@/styles/scss/global/login-bg';
:deep(.hover-box) {
  @apply w-28px h24px flex-center hover:bg-#e7e7e7;
  svg {
    color: #404040;
  }
}
:deep(.action-close) {
  svg {
    color: #404040;
  }
}

.box {
  width: 240px;
  height: 200px;
  transform-style: preserve-3d;
  perspective: 500px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  .computer {
    position: relative;
    transition: all 0.2s;
    transform-style: preserve-3d;
  }
}
</style>

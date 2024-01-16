<template>
  <div data-tauri-drag-region class="flex justify-end">
    <!-- 最小化 -->
    <div @click="minimizeWindow" class="w-28px h24px flex-center hover:bg-#e7e7e7">
      <img src="@/assets/svg/minimize.svg" class="w-38px h-34px" alt="" />
    </div>
    <!-- 最大化 -->
    <div @click="restoreWindow" class="w-28px h24px flex-center hover:bg-#e7e7e7">
      <img v-show="!windowMaximized" src="@/assets/svg/maximize.svg" class="w-14px h-14px" alt="" />
      <img v-show="windowMaximized" src="@/assets/svg/normal.svg" class="w-14px h-14px" alt="" />
    </div>
    <!-- 关闭窗口 -->
    <div @click="closeWindow" class="close-box w-28px h24px flex-center cursor-pointer hover:bg-#c22b1c rounded-tr-6px">
      <img src="@/assets/svg/close.svg" class="default-img w-10px h-10px" alt="" />
      <img src="@/assets/svg/close-hover.svg" class="hover-img w-10px h-10px" alt="" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { closeWindow, maximizeWindow, minimizeWindow, unmaximize } from '@/common/WindowEvent.ts'
import { appWindow } from '@tauri-apps/api/window'

const windowMaximized = ref(false)

// // 定义一个可能保存unlisten函数的变量
// let unlistenMoveEvent = null as any
//
// watchEffect(async () => {
//   if (windowMaximized.value) {
//     unlistenMoveEvent = await appWindow.listen('tauri://move', () => {
//       windowMaximized.value = false
//       unlistenMoveEvent()
//       unlistenMoveEvent = null
//     })
//   }
// })

/* 判断当前是否是最大化窗口 */
const checkMaximizedStatus = async () => {
  windowMaximized.value = await appWindow.isMaximized()
}

/* 恢复窗口大小 */
const restoreWindow = async () => {
  if (windowMaximized.value) {
    await unmaximize()
  } else {
    await maximizeWindow()
  }
  await checkMaximizedStatus()
}
</script>

<style scoped lang="scss">
/* 当鼠标悬停在按钮上时，切换显示状态 */
.close-box {
  /* 默认不显示 */
  .hover-img {
    display: none;
  }
  &:hover {
    .default-img {
      display: none;
    }
    .hover-img {
      display: block;
    }
  }
}
</style>

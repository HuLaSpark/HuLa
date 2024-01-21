<template>
  <!--  user-select: none让元素不可以选中 -->
  <div data-tauri-drag-region class="flex justify-end select-none">
    <!-- 收缩页面 -->
    <div v-if="shrink" @click="shrinkWindow" class="w-28px h24px flex-center hover:bg-#e7e7e7">
      <svg class="w-16px h-16px color-#404040 cursor-pointer"><use href="#left-bar"></use></svg>
    </div>
    <!-- 最小化 -->
    <div v-if="minW" @click="minimizeWindow" class="w-28px h24px flex-center hover:bg-#e7e7e7">
      <img src="@/assets/svg/minimize.svg" class="w-38px h-34px" alt="" />
    </div>
    <!-- 最大化 -->
    <div v-if="maxW" @click="restoreWindow" class="w-28px h24px flex-center hover:bg-#e7e7e7">
      <img v-show="!windowMaximized" src="@/assets/svg/maximize.svg" class="w-14px h-14px" alt="" />
      <img v-show="windowMaximized" src="@/assets/svg/normal.svg" class="w-14px h-14px" alt="" />
    </div>
    <!-- 关闭窗口 -->
    <div
      v-if="closeW"
      @click="closeWindow"
      class="close-box w-28px h24px flex-center cursor-pointer hover:bg-#c22b1c rounded-tr-6px">
      <img src="@/assets/svg/close.svg" class="default-img w-10px h-10px" alt="" />
      <img src="@/assets/svg/close-hover.svg" class="hover-img w-10px h-10px" alt="" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { closeWindow, maximizeWindow, minimizeWindow, unmaximize } from '@/common/WindowEvent.ts'
import { appWindow } from '@tauri-apps/api/window'
import Mitt from '@/utils/Bus'
import { useWindow } from '@/hooks/useWindow.ts'

/**
 * 新版defineProps可以直接结构 { minW, maxW, closeW } 如果需要使用默认值withDefaults的时候使用新版解构方式会报错
 * @description W结尾为窗口图标是否显示 shrink表示是否收缩图标 shrinkStatus表示是否收缩状态
 * */
const props = withDefaults(
  defineProps<{
    minW?: boolean
    maxW?: boolean
    closeW?: boolean
    shrink?: boolean
    shrinkStatus?: boolean
  }>(),
  {
    minW: true,
    maxW: true,
    closeW: true,
    shrink: true,
    shrinkStatus: true
  }
)
const { minW, maxW, closeW, shrinkStatus } = toRefs(props)
const windowMaximized = ref(false)
const { resizeWindow } = useWindow()

// todo 放大的时候图个拖动了窗口，窗口会变回原来的大小，但是图标的状态没有改变
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

/* 收缩窗口 */
const shrinkWindow = async () => {
  /*使用mitt给兄弟组件更新*/
  Mitt.emit('shrinkWindow', shrinkStatus.value)
  if (shrinkStatus.value) {
    await resizeWindow('home', 310, 720)
  } else {
    await resizeWindow('home', 1050, 720)
  }
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

<template>
  <!--  user-select: none让元素不可以选中 -->
  <div data-tauri-drag-region class="flex justify-end select-none">
    <!--  固定在最顶层  -->
    <div v-if="topWinLabel !== void 0" @click="handleAlwaysOnTop" class="hover-box">
      <n-popover trigger="hover">
        <template #trigger>
          <svg
            v-if="alwaysOnTopStatus"
            class="w-14px h-14px color-[--action-bar-icon-color] outline-none cursor-pointer">
            <use href="#onTop"></use>
          </svg>
          <svg v-else class="w-16px h-16px color-[--action-bar-icon-color] outline-none cursor-pointer">
            <use href="#notOnTop"></use>
          </svg>
        </template>
        <span v-if="alwaysOnTopStatus">取消置顶</span>
        <span v-else>置顶</span>
      </n-popover>
    </div>
    <!-- 收缩页面 -->
    <div v-if="shrink" @click="shrinkWindow" class="hover-box">
      <svg class="w-16px h-16px color-[--action-bar-icon-color] cursor-pointer"><use href="#left-bar"></use></svg>
    </div>
    <!-- 最小化 -->
    <div v-if="minW" @click="minimizeWindow" class="hover-box">
      <svg class="w-24px h-24px color-[--action-bar-icon-color] opacity-66 cursor-pointer">
        <use href="#maximize"></use>
      </svg>
    </div>
    <!-- 最大化 -->
    <div v-if="maxW" @click="restoreWindow" class="hover-box">
      <svg v-show="!windowMaximized" class="w-18px h-18px color-[--action-bar-icon-color] cursor-pointer">
        <use href="#rectangle-small"></use>
      </svg>
      <svg v-show="windowMaximized" class="w-16px h-16px color-[--action-bar-icon-color] cursor-pointer">
        <use href="#internal-reduction"></use>
      </svg>
    </div>
    <!-- 关闭窗口 -->
    <div v-if="closeW" @click="closeWindow(currentLabel as string)" class="action-close">
      <svg class="w-14px h-14px color-[--action-bar-icon-color] cursor-pointer">
        <use href="#close"></use>
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { closeWindow, maximizeWindow, minimizeWindow, unmaximize } from '@/common/WindowEvent.ts'
import { appWindow } from '@tauri-apps/api/window'
import Mitt from '@/utils/Bus'
import { useWindow } from '@/hooks/useWindow.ts'
import { alwaysOnTop } from '@/stores/alwaysOnTop.ts'
import { listen } from '@tauri-apps/api/event'
import { EventEnum } from '@/enums'

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
    topWinLabel?: string
    currentLabel?: string
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
const { minW, maxW, closeW, topWinLabel, shrinkStatus } = toRefs(props)
const alwaysOnTopStore = alwaysOnTop()
const { resizeWindow } = useWindow()
// 窗口是否最大化状态
const windowMaximized = ref(false)
// 窗口是否置顶状态
const alwaysOnTopStatus = computed(() => {
  if (topWinLabel.value === void 0) return false
  return alwaysOnTopStore.getWindowTop(topWinLabel.value)
})

watchEffect(() => {
  if (alwaysOnTopStatus.value) {
    appWindow.setAlwaysOnTop(alwaysOnTopStatus.value as boolean)
  }
  listen(EventEnum.LOGOUT, async () => {
    /* 退出账号前把窗口全部关闭 */
    if (appWindow.label !== 'login') {
      await appWindow.close()
    }
  })
})

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
    await resizeWindow('home', 310, 700)
  } else {
    await resizeWindow('home', 960, 700)
  }
}

/* 设置窗口置顶 */
const handleAlwaysOnTop = async () => {
  if (topWinLabel.value !== void 0) {
    const isTop = !alwaysOnTopStatus.value
    alwaysOnTopStore.setWindowTop(topWinLabel.value, isTop)
    await appWindow.setAlwaysOnTop(isTop)
  }
}
</script>

<style scoped lang="scss">
.hover-box {
  @apply w-28px h24px flex-center hover:bg-[--action-bar-icon-hover];
}
.action-close {
  @apply w-28px h24px flex-center cursor-pointer hover:bg-#c22b1c svg:hover:color-[#fff];
}
</style>

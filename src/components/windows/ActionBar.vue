<template>
  <!--  user-select: none让元素不可以选中-->
  <div
    :data-tauri-drag-region="isDrag"
    :class="isCompatibility() ? 'flex justify-end select-none' : 'h-24px select-none w-full'">
    <!-- win 和 linux 的DOM -->
    <template v-if="isCompatibility()">
      <!--  登录窗口的代理按钮  -->
      <div v-if="proxy" @click="router.push('/network')" class="w-30px h-24px flex-center">
        <svg class="size-16px color-#404040 cursor-pointer">
          <use href="#settings"></use>
        </svg>
      </div>
      <!--  固定在最顶层  -->
      <div v-if="topWinLabel !== void 0" @click="handleAlwaysOnTop" class="hover-box">
        <n-popover trigger="hover">
          <template #trigger>
            <svg v-if="alwaysOnTopStatus" class="size-14px color-[--action-bar-icon-color] outline-none cursor-pointer">
              <use href="#onTop"></use>
            </svg>
            <svg v-else class="size-16px color-[--action-bar-icon-color] outline-none cursor-pointer">
              <use href="#notOnTop"></use>
            </svg>
          </template>
          <span v-if="alwaysOnTopStatus">取消置顶</span>
          <span v-else>置顶</span>
        </n-popover>
      </div>
      <!-- 收缩页面 -->
      <div v-if="shrink" @click="shrinkWindow" class="hover-box">
        <svg class="size-16px color-[--action-bar-icon-color] cursor-pointer">
          <use href="#left-bar"></use>
        </svg>
      </div>
      <!-- 最小化 -->
      <div v-if="minW" @click="appWindow.minimize()" class="hover-box">
        <svg class="size-24px color-[--action-bar-icon-color] opacity-66 cursor-pointer">
          <use href="#maximize"></use>
        </svg>
      </div>
      <!-- 最大化 -->
      <div v-if="maxW" @click="restoreWindow" class="hover-box">
        <svg v-show="!windowMaximized" class="size-18px color-[--action-bar-icon-color] cursor-pointer">
          <use href="#rectangle-small"></use>
        </svg>
        <svg v-show="windowMaximized" class="size-16px color-[--action-bar-icon-color] cursor-pointer">
          <use href="#internal-reduction"></use>
        </svg>
      </div>
      <!-- 关闭窗口 -->
      <div v-if="closeW" @click="handleCloseWin" :class="{ windowMaximized: 'rounded-rt-8px' }" class="action-close">
        <svg class="size-14px color-[--action-bar-icon-color] cursor-pointer">
          <use href="#close"></use>
        </svg>
      </div>
    </template>
    <!-- 是否退到托盘提示框 -->
    <n-modal v-if="!tips.notTips" v-model:show="tipsRef.show" class="rounded-8px">
      <div class="bg-[--bg-popover] w-290px h-full p-6px box-border flex flex-col">
        <svg @click="tipsRef.show = false" class="size-12px ml-a cursor-pointer select-none">
          <use href="#close"></use>
        </svg>
        <n-flex vertical :size="20" class="p-[22px_10px_10px_22px] select-none">
          <span class="text-16px">最小化还是直接退出程序?</span>
          <label class="text-(14px #707070) flex gap-6px lh-16px items-center">
            <n-radio :checked="tipsRef.type === CloseBxEnum.HIDE" @change="tipsRef.type = CloseBxEnum.HIDE" />
            <span>最小化到系统托盘</span>
          </label>
          <label class="text-(14px #707070) flex gap-6px lh-16px items-center">
            <n-radio :checked="tipsRef.type === CloseBxEnum.CLOSE" @change="tipsRef.type = CloseBxEnum.CLOSE" />
            <span>直接退出程序</span>
          </label>
          <label class="text-(12px #909090) flex gap-6px justify-end items-center">
            <n-checkbox size="small" v-model:checked="tipsRef.notTips" />
            <span>下次不出现此提示</span>
          </label>

          <n-flex justify="end">
            <n-button @click="handleConfirm" class="w-78px" color="#13987f">确定</n-button>
            <n-button @click="tipsRef.show = false" class="w-78px" secondary>取消</n-button>
          </n-flex>
        </n-flex>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { emit } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { info } from '@tauri-apps/plugin-log'
import { exit } from '@tauri-apps/plugin-process'
import { CloseBxEnum, EventEnum, MittEnum } from '@/enums'
import { useMitt } from '@/hooks/useMitt.ts'
import { useTauriListener } from '@/hooks/useTauriListener'
import { useWindow } from '@/hooks/useWindow.ts'
import router from '@/router'
import { useAlwaysOnTopStore } from '@/stores/alwaysOnTop.ts'
import { useSettingStore } from '@/stores/setting.ts'
import { isCompatibility, isMac, isWindows } from '@/utils/PlatformConstants'

const appWindow = WebviewWindow.getCurrent()
const {
  topWinLabel,
  proxy = false,
  minW = true,
  maxW = true,
  closeW = true,
  shrink = true,
  shrinkStatus = true,
  isDrag = true
} = defineProps<{
  minW?: boolean
  maxW?: boolean
  closeW?: boolean
  shrink?: boolean
  topWinLabel?: string
  currentLabel?: string
  shrinkStatus?: boolean
  proxy?: boolean
  isDrag?: boolean
}>()
const { getWindowTop, setWindowTop } = useAlwaysOnTopStore()
const { addListener, cleanup } = useTauriListener()
const settingStore = useSettingStore()
const { tips, escClose } = storeToRefs(settingStore)
const { resizeWindow } = useWindow()
const tipsRef = reactive({
  type: tips.value.type,
  notTips: tips.value.notTips,
  show: false
})
// 窗口是否最大化状态
const windowMaximized = ref(false)
// 窗口是否置顶状态
const alwaysOnTopStatus = computed(() => {
  if (topWinLabel === void 0) return false
  return getWindowTop(topWinLabel)
})

// macOS 关闭按钮拦截的 unlisten 函数
let unlistenCloseRequested: (() => void) | null = null
// resized 事件的 unlisten 函数
let unlistenResized: (() => void) | null = null
// 是否是程序内部触发的关闭操作
let isProgrammaticClose = false

watchEffect(() => {
  tipsRef.type = tips.value.type
  if (alwaysOnTopStatus.value) {
    appWindow.setAlwaysOnTop(alwaysOnTopStatus.value as boolean)
  }
  if (escClose.value && isWindows()) {
    window.addEventListener('keydown', (e) => isEsc(e))
  } else {
    window.removeEventListener('keydown', (e) => isEsc(e))
  }
})

/** 恢复窗口大小 */
const restoreWindow = async () => {
  if (windowMaximized.value) {
    await appWindow.unmaximize()
  } else {
    await appWindow.maximize()
  }
}

/** 收缩窗口 */
const shrinkWindow = async () => {
  /**使用mitt给兄弟组件更新*/
  useMitt.emit(MittEnum.SHRINK_WINDOW, shrinkStatus)
  if (shrinkStatus) {
    await resizeWindow('home', 310, 720)
  } else {
    await resizeWindow('home', 960, 720)
  }
}

/** 设置窗口置顶 */
const handleAlwaysOnTop = async () => {
  if (topWinLabel !== void 0) {
    const isTop = !alwaysOnTopStatus.value
    setWindowTop(topWinLabel, isTop)
    await appWindow.setAlwaysOnTop(isTop)
  }
}

/** 点击确定时 */
const handleConfirm = async () => {
  tips.value.type = tipsRef.type
  tips.value.notTips = tipsRef.notTips
  tipsRef.show = false
  if (tips.value.type === CloseBxEnum.CLOSE) {
    // 设置程序内部关闭标志
    isProgrammaticClose = true
    await emit(EventEnum.EXIT)
  } else {
    await nextTick(() => {
      appWindow.hide()
    })
  }
}

/** 监听是否按下esc */
const isEsc = (e: KeyboardEvent) => {
  // 判断按下的是否是esc
  if (e.key === 'Escape' && escClose.value) {
    handleCloseWin()
  }
}

// 统一更新窗口放大状态（仅 macOS 视为“最大化或全屏”；其他平台仅“最大化”）
const updateWindowMaximized = async () => {
  const maximized = await appWindow.isMaximized()
  if (isMac()) {
    const fullscreen = await appWindow.isFullscreen()
    windowMaximized.value = maximized || fullscreen
  } else {
    windowMaximized.value = maximized
  }
}

/** 处理关闭窗口事件 */
const handleCloseWin = async () => {
  if (appWindow.label === 'home') {
    if (!tips.value.notTips) {
      tipsRef.show = true
    } else {
      if (tips.value.type === CloseBxEnum.CLOSE) {
        await emit(EventEnum.EXIT)
      } else {
        await nextTick(() => {
          appWindow.hide()
        })
      }
    }
  } else if (appWindow.label === 'login') {
    await exit(0)
  } else {
    if (appWindow.label.includes('modal-')) {
      const webviews = await WebviewWindow.getAll()
      const need = webviews.find((item) => item.label === 'home' || item.label === 'login')
      await need?.setEnabled(true)
      await need?.setFocus()
    }
    await emit(EventEnum.WIN_CLOSE, appWindow.label)
    await appWindow.close()
  }
}

useMitt.on('handleCloseWin', handleCloseWin)

onMounted(async () => {
  // 初始化状态
  await updateWindowMaximized()

  unlistenResized = await appWindow.onResized?.(() => {
    updateWindowMaximized()
  })

  await addListener(
    appWindow.listen(EventEnum.EXIT, async () => {
      await exit(0)
    }),
    EventEnum.EXIT
  )

  // 监听 home 窗口的关闭事件
  if (appWindow.label === 'home') {
    appWindow.onCloseRequested((event) => {
      info('[ActionBar]监听[home]窗口关闭事件')
      if (isProgrammaticClose) {
        // 清理监听器
        info('[ActionBar]清理[home]窗口的监听器')
        cleanup()
        exit(0)
      }
      info('[ActionBar]阻止[home]窗口关闭事件')
      event.preventDefault()
      appWindow.hide()
    })
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', (e) => isEsc(e))

  if (unlistenResized) {
    unlistenResized()
    unlistenResized = null
  }

  // 清理 macOS 关闭按钮事件监听器
  if (unlistenCloseRequested) {
    unlistenCloseRequested()
    unlistenCloseRequested = null
  }
})

// 暴露 windowMaximized 状态
defineExpose({
  windowMaximized
})
</script>

<style scoped lang="scss">
.hover-box {
  @apply w-28px h-24px flex-center hover:bg-[--icon-hover-color];
}

.action-close {
  @apply w-28px h-24px flex-center cursor-pointer hover:bg-#c22b1c svg:hover:color-[#fff];
}

.n-modal {
  align-self: start;
  margin: 60px auto;
}
</style>

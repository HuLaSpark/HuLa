<template>
  <!--  user-select: none让元素不可以选中-->
  <div
    :data-tauri-drag-region="isDrag"
    :class="isCompatibility ? 'flex justify-end select-none' : 'h-24px select-none w-full'">
    <template v-if="isCompatibility">
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
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useMitt } from '@/hooks/useMitt.ts'
import { useWindow } from '@/hooks/useWindow.ts'
import { useAlwaysOnTopStore } from '@/stores/alwaysOnTop.ts'
import { useSettingStore } from '@/stores/setting.ts'
import { emit } from '@tauri-apps/api/event'
import { CloseBxEnum, EventEnum, MittEnum } from '@/enums'
import { type } from '@tauri-apps/plugin-os'
import router from '@/router'
import { exit } from '@tauri-apps/plugin-process'
import { useTauriListener } from '@/hooks/useTauriListener'

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
const { pushListeners } = useTauriListener()
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
/** 判断是兼容的系统 */
const isCompatibility = computed(() => type() === 'windows' || type() === 'linux')
// 窗口是否置顶状态
const alwaysOnTopStatus = computed(() => {
  if (topWinLabel === void 0) return false
  return getWindowTop(topWinLabel)
})
/** 判断当前是windows还是mac系统 */
const osType = ref()

// macOS 关闭按钮拦截的 unlisten 函数
let unlistenCloseRequested: (() => void) | null = null
// 是否是程序内部触发的关闭操作
let isProgrammaticClose = false

watchEffect(() => {
  tipsRef.type = tips.value.type
  if (alwaysOnTopStatus.value) {
    appWindow.setAlwaysOnTop(alwaysOnTopStatus.value as boolean)
  }

  // 添加 macOS 关闭按钮拦截逻辑 - 只拦截 home 窗口
  if (type() === 'macos' && appWindow.label === 'home' && !unlistenCloseRequested) {
    // 监听 macOS 原生关闭按钮事件
    appWindow
      .onCloseRequested((event) => {
        // 如果是程序内部触发的关闭操作，不拦截
        if (isProgrammaticClose) {
          return
        }
        // 阻止默认关闭行为
        event.preventDefault()
        if (!tips.value.notTips) {
          tipsRef.show = true
        } else {
          if (tips.value.type === CloseBxEnum.CLOSE) {
            // 用户选择直接退出
            console.log('用户设置为直接退出应用')
            emit(EventEnum.EXIT)
          } else {
            // 用户选择最小化到托盘
            console.log('用户设置为最小化到托盘')
            appWindow.hide()
          }
        }
      })
      .then((unlisten) => {
        console.log('macOS home窗口关闭按钮事件监听器已设置')
        unlistenCloseRequested = unlisten
      })
      .catch((error) => {
        console.error('设置 macOS home窗口关闭按钮监听器失败:', error)
      })
  }

  pushListeners([
    appWindow.listen(EventEnum.LOGOUT, async () => {
      /** 退出账号前把窗口全部关闭 */
      if (appWindow.label !== 'login') {
        await nextTick()
        // 设置程序内部关闭标志
        isProgrammaticClose = true
        // 针对不同系统采用不同关闭策略
        if (type() === 'macos') {
          // macOS 上先隐藏窗口，然后延迟关闭
          await appWindow.hide()
          setTimeout(async () => {
            await appWindow.close()
          }, 300)
        } else {
          // Windows/Linux 直接关闭
          await appWindow.close()
        }
      }
    }),
    appWindow.listen(EventEnum.EXIT, async () => {
      // 设置程序内部关闭标志
      isProgrammaticClose = true
      await exit(0)
    })
  ])

  if (escClose.value && type() === 'windows') {
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

// 判断当前是否是最大化
const handleResize = () => {
  appWindow.isMaximized().then((res) => {
    windowMaximized.value = res
  })
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
      const home = await WebviewWindow.getByLabel('home')
      await home?.setEnabled(true)
      await home?.setFocus()
    }
    await emit(EventEnum.WIN_CLOSE, appWindow.label)
    await appWindow.close()
  }
}

useMitt.on('handleCloseWin', handleCloseWin)
// 添加和移除resize事件监听器
onMounted(async () => {
  window.addEventListener('resize', handleResize)
  osType.value = type()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('keydown', (e) => isEsc(e))

  // 清理 macOS 关闭按钮事件监听器
  if (unlistenCloseRequested) {
    unlistenCloseRequested()
    unlistenCloseRequested = null
  }
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

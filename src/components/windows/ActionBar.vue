<template>
  <!--  user-select: none让元素不可以选中 -->
  <div data-tauri-drag-region class="flex justify-end select-none">
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
      <svg class="size-16px color-[--action-bar-icon-color] cursor-pointer"><use href="#left-bar"></use></svg>
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
    <div v-if="closeW" @click="handleCloseWin" class="action-close">
      <svg class="size-14px color-[--action-bar-icon-color] cursor-pointer">
        <use href="#close"></use>
      </svg>
    </div>

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
import { appWindow } from '@tauri-apps/api/window'
import Mitt from '@/utils/Bus'
import { useWindow } from '@/hooks/useWindow.ts'
import { alwaysOnTop } from '@/stores/alwaysOnTop.ts'
import { setting } from '@/stores/setting.ts'
import { emit, listen } from '@tauri-apps/api/event'
import { CloseBxEnum, EventEnum, MittEnum } from '@/enums'
import { storeToRefs } from 'pinia'
import { PersistedStateOptions } from 'pinia-plugin-persistedstate'
import { exit } from '@tauri-apps/api/process'

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
const settingStore = setting()
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
  if (topWinLabel.value === void 0) return false
  return alwaysOnTopStore.getWindowTop(topWinLabel.value)
})

watchEffect(() => {
  tipsRef.type = tips.value.type
  if (alwaysOnTopStatus.value) {
    appWindow.setAlwaysOnTop(alwaysOnTopStatus.value as boolean)
  }
  listen(EventEnum.LOGOUT, async () => {
    /** 退出账号前把窗口全部关闭 */
    if (appWindow.label !== 'login') {
      await appWindow.close()
    }
  })
  listen(EventEnum.EXIT, async () => {
    await exit(0)
  })

  if (escClose.value) {
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
  Mitt.emit(MittEnum.SHRINK_WINDOW, shrinkStatus.value)
  if (shrinkStatus.value) {
    await resizeWindow('home', 310, 700)
  } else {
    await resizeWindow('home', 960, 700)
  }
}

/** 设置窗口置顶 */
const handleAlwaysOnTop = async () => {
  if (topWinLabel.value !== void 0) {
    const isTop = !alwaysOnTopStatus.value
    alwaysOnTopStore.setWindowTop(topWinLabel.value, isTop)
    await appWindow.setAlwaysOnTop(isTop)
  }
}

/** 点击确定时 */
const handleConfirm = async () => {
  tips.value.type = tipsRef.type
  tips.value.notTips = tipsRef.notTips
  tipsRef.show = false
  if (tips.value.type === CloseBxEnum.CLOSE) {
    await emit(EventEnum.EXIT)
  } else {
    await nextTick(() => {
      appWindow.hide()
    })
  }
}

/** 监听是否按下esc */
const isEsc = (e: PersistedStateOptions) => {
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
    await emit(EventEnum.WIN_CLOSE, appWindow.label)
    await appWindow.close()
  }
}

// 添加和移除resize事件监听器
onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('keydown', (e) => isEsc(e))
})
</script>

<style scoped lang="scss">
.hover-box {
  @apply w-28px h24px flex-center hover:bg-[--action-bar-icon-hover];
}
.action-close {
  @apply w-28px h24px flex-center cursor-pointer hover:bg-#c22b1c svg:hover:color-[#fff];
}
.n-modal {
  align-self: start;
  margin: 60px auto;
}
</style>

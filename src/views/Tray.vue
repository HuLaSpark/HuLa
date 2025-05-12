<template>
  <n-flex v-if="isTrayMenuShow" vertical :size="6" class="tray">
    <n-flex vertical :size="6">
      <n-flex
        v-for="(item, index) in stateList.slice(0, 6)"
        :key="index"
        align="center"
        :size="10"
        @click="toggleStatus(item)"
        class="p-6px rounded-4px hover:bg-[--tray-hover]">
        <img class="size-14px" :src="item.url" alt="" />
        <span>{{ item.title }}</span>
      </n-flex>
      <n-flex
        @click="createWebviewWindow('在线状态', 'onlineStatus', 320, 480)"
        align="center"
        :size="10"
        class="p-6px rounded-4px hover:bg-[--tray-hover]">
        <svg class="size-14px">
          <use href="#more"></use>
        </svg>
        <span>更多状态</span>
      </n-flex>

      <component :is="division" />
      <n-flex align="center" :size="10" class="p-[8px_6px] rounded-4px hover:bg-[--tray-hover]">
        <span>打开所有声音</span>
      </n-flex>

      <component :is="division" />
      <n-flex
        @click="checkWinExist('home')"
        align="center"
        :size="10"
        class="p-[8px_6px] rounded-4px hover:bg-[--tray-hover]">
        <span>打开主面板</span>
      </n-flex>

      <component :is="division" />
      <n-flex @click="handleExit" align="center" :size="10" class="p-[8px_6px] rounded-4px hover:bg-[--tray-hover-e]">
        <span>退出</span>
      </n-flex>
    </n-flex>
  </n-flex>

  <n-flex v-else vertical :size="6" class="tray">
    <n-flex @click="handleExit" align="center" :size="10" class="p-[8px_6px] rounded-4px hover:bg-[--tray-hover-e]">
      <span>退出</span>
    </n-flex>
  </n-flex>
</template>
<script setup lang="tsx">
import { useWindow } from '@/hooks/useWindow.ts'
import { exit } from '@tauri-apps/plugin-process'
import { useUserStatusStore } from '@/stores/userStatus'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useSettingStore } from '@/stores/setting.ts'
import { useGlobalStore } from '@/stores/global.ts'
import { TrayIcon } from '@tauri-apps/api/tray'
import { type } from '@tauri-apps/plugin-os'
import { useTauriListener } from '@/hooks/useTauriListener'
import { UserState } from '@/services/types'

const appWindow = WebviewWindow.getCurrent()
const { checkWinExist, createWebviewWindow } = useWindow()
const userStatusStore = useUserStatusStore()
const settingStore = useSettingStore()
const globalStore = useGlobalStore()
const { lockScreen } = storeToRefs(settingStore)
const { stateList, stateId } = storeToRefs(userStatusStore)
const { tipVisible, isTrayMenuShow } = storeToRefs(globalStore)
const { pushListeners } = useTauriListener()
const isFocused = ref(false)
let home: WebviewWindow | null = null
// 状态栏图标是否显示
const iconVisible = ref(false)
// 创建Timer Worker实例
let timerWorker: Worker | null = null

const division = () => {
  return <div class={'h-1px bg-[--line-color] w-full'}></div>
}

const handleExit = () => {
  /** 退出时关闭锁屏 */
  lockScreen.value.enable = false
  if (localStorage.getItem('wsLogin')) {
    localStorage.removeItem('wsLogin')
  }
  exit(0)
}

const toggleStatus = (item: UserState) => {
  stateId.value = item.id
  appWindow.hide()
}

// 初始化Timer Worker
const initWorker = () => {
  if (!timerWorker) {
    timerWorker = new Worker(new URL('../workers/timer.worker.ts', import.meta.url))

    // 监听Worker消息
    timerWorker.onmessage = async (e) => {
      const { type, msgId } = e.data

      // 处理定时器超时消息
      if (type === 'timeout' && msgId === 'trayIconBlink') {
        // 定时器触发时，切换图标状态
        const tray = await TrayIcon.getById('tray')
        tray?.setIcon(iconVisible.value ? null : 'tray/icon.png')
        iconVisible.value = !iconVisible.value

        // 如果仍需闪烁，重新启动定时器
        if (tipVisible.value && !isFocused.value) {
          startBlinkTimer()
        }
      }
    }

    // 添加错误处理
    timerWorker.onerror = (error) => {
      console.error('[Tray Worker Error]', error)
    }
  }
}

// 启动图标闪烁定时器
const startBlinkTimer = () => {
  if (!timerWorker) {
    initWorker()
  }

  // 确保timerWorker已初始化
  if (timerWorker) {
    // 启动新的定时器，500ms间隔
    timerWorker.postMessage({
      type: 'startTimer',
      msgId: 'trayIconBlink',
      duration: 500 // 闪烁间隔时间
    })
  }
}

// 停止图标闪烁定时器
const stopBlinkTimer = () => {
  if (timerWorker) {
    timerWorker.postMessage({
      type: 'clearTimer',
      msgId: 'trayIconBlink'
    })
  }
}

// 终止Worker
const terminateWorker = () => {
  if (timerWorker) {
    stopBlinkTimer()
    timerWorker.terminate()
    timerWorker = null
  }
}

watchEffect(async () => {
  if (type() === 'windows') {
    if (tipVisible.value && !isFocused.value) {
      initWorker() // 确保Worker已初始化
      startBlinkTimer() // 启动图标闪烁
    } else {
      stopBlinkTimer() // 停止图标闪烁
      const tray = await TrayIcon.getById('tray')
      tray?.setIcon('tray/icon.png') // 恢复默认图标
      isFocused.value = false
      tipVisible.value = false
    }
  }
})

// 可以使用 watch 来观察焦点状态的变化
watch([isFocused, () => tipVisible.value], ([newFocused, newTipVisible]) => {
  console.log('Focus or tip state changed:', { focused: newFocused, tipVisible: newTipVisible })
})

onBeforeMount(() => {
  globalStore.setTipVisible(false)
})

onMounted(async () => {
  home = await WebviewWindow.getByLabel('home')
  isFocused.value = (await home?.isFocused()) || false

  if (home) {
    // 监听窗口焦点变化
    home.listen('tauri://focus', () => {
      isFocused.value = true
    })
    home.listen('tauri://blur', () => {
      isFocused.value = false
    })
    await pushListeners([
      appWindow.listen('show_tip', async () => {
        console.log('Received show_tip event')
        globalStore.setTipVisible(true)
      })
    ])
  }
})

onUnmounted(async () => {
  terminateWorker() // 清理Worker资源
})
</script>

<style scoped lang="scss">
.tray {
  @apply bg-[--center-bg-color] size-full p-8px box-border select-none text-[--text-color] text-12px;
}
</style>

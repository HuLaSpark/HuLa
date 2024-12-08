<template>
  <n-flex v-if="!isLoginWin" vertical :size="6" class="tray">
    <n-flex vertical :size="6">
      <n-flex
        v-for="(item, index) in statusItem.slice(0, 6)"
        :key="index"
        align="center"
        :size="10"
        @click="toggleStatus(item.url, item.title)"
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
import { invoke } from '@tauri-apps/api/core'
import { exit } from '@tauri-apps/plugin-process'
import { statusItem } from '@/views/onlineStatusWindow/config.ts'
import { onlineStatus } from '@/stores/onlineStatus.ts'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { Event, listen } from '@tauri-apps/api/event'
import { useSettingStore } from '@/stores/setting.ts'
import { useGlobalStore } from '@/stores/global.ts'
import { TrayIcon } from '@tauri-apps/api/tray'
import { PhysicalPosition } from '@tauri-apps/api/dpi'
import { type } from '@tauri-apps/plugin-os'

const appWindow = WebviewWindow.getCurrent()
const { checkWinExist, createWebviewWindow, resizeWindow } = useWindow()
const OLStatusStore = onlineStatus()
const settingStore = useSettingStore()
const globalStore = useGlobalStore()
const { lockScreen } = storeToRefs(settingStore)
const { tipVisible } = storeToRefs(globalStore)
const isLoginWin = ref(true)
// 状态栏图标是否显示
const iconVisible = ref(false)
let interval: any

const division = () => {
  return <div class={'h-1px bg-[--line-color] w-full'}></div>
}

const handleExit = () => {
  /** 退出时关闭锁屏 */
  lockScreen.value.enable = false
  exit(0)
  if (localStorage.getItem('wsLogin')) {
    localStorage.removeItem('wsLogin')
  }
}

const toggleStatus = (url: string, title: string) => {
  OLStatusStore.setOnlineStatus(url, title)
  appWindow.hide()
}

watchEffect(async () => {
  if (type() === 'windows') {
    if (tipVisible.value && !interval) {
      interval = setInterval(async () => {
        const tray = await TrayIcon.getById('tray')
        tray?.setIcon(iconVisible.value ? null : 'tray/icon.png')
        iconVisible.value = !iconVisible.value
      }, 500)
    } else {
      const tray = await TrayIcon.getById('tray')
      tray?.setIcon('tray/icon.png')
      clearInterval(interval)
      interval = null
    }
  }
})

onUnmounted(async () => {
  if (interval) {
    clearInterval(interval)
  }
})

onMounted(async () => {
  await listen('login_success', () => {
    isLoginWin.value = false
    resizeWindow('tray', 130, 356)
  })
  await listen('logout_success', () => {
    isLoginWin.value = true
    resizeWindow('tray', 130, 44)
  })
  await listen('show_tip', async () => {
    globalStore.setTipVisible(true)
  })
  await listen('show_notify', async (event: Event<PhysicalPosition>) => {
    if (tipVisible.value) {
      const position = event.payload
      // 显示消息提示
      const notifyWindow = await WebviewWindow.getByLabel('notify')
      const outerSize = await notifyWindow?.outerSize()
      const sf = await notifyWindow?.scaleFactor()
      if (outerSize && sf) {
        await notifyWindow?.setPosition(new PhysicalPosition(position.x, position.y - outerSize.height))
        await notifyWindow?.show()
        await notifyWindow?.unminimize()
        await notifyWindow?.setFocus()
        await notifyWindow?.setAlwaysOnTop(true)
      }
    }
  })
  // 暂停图标闪烁
  await listen('stop', async () => {
    await invoke('tray_blink', { isRun: false }).catch((error) => {
      console.error('暂停闪烁失败:', error)
    })
  })
})
</script>

<style scoped lang="scss">
.tray {
  @apply bg-[--center-bg-color] size-full p-8px box-border select-none text-[--text-color] text-12px;
}
</style>

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
        <svg class="size-14px"><use href="#more"></use></svg>
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
import { statusItem } from '@/views/homeWindow/onlineStatus/config.ts'
import { onlineStatus } from '@/stores/onlineStatus.ts'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { listen } from '@tauri-apps/api/event'
import { useWsLoginStore } from '@/stores/ws.ts'
import { setting } from '@/stores/setting.ts'
import { PhysicalPosition } from '@tauri-apps/api/dpi'

const appWindow = WebviewWindow.getCurrent()
const { checkWinExist, createWebviewWindow, resizeWindow } = useWindow()
const OLStatusStore = onlineStatus()
const settingStore = setting()
const { lockScreen } = storeToRefs(settingStore)
const isLoginWin = ref(true)
const loginStore = useWsLoginStore()
const loginQrCode = computed(() => loginStore.loginQrCode)

const division = () => {
  return <div class={'h-1px bg-[--line-color] w-full'}></div>
}

const handleExit = () => {
  /** 退出时关闭锁屏 */
  lockScreen.value.enable = false
  exit(0)
  if (loginQrCode.value) {
    localStorage.removeItem('wsLogin')
  }
}

const toggleStatus = (url: string, title: string) => {
  OLStatusStore.setOnlineStatus(url, title)
  appWindow.hide()
}

onMounted(async () => {
  // await listen('tray_leave', async () => {
  //   const trayWindow = WebviewWindow.getByLabel('tray')
  //   trayWindow?.hide()
  // })
  // await listen('tray_enter', async () => {
  //   const trayWindow = WebviewWindow.getByLabel('tray')
  //   trayWindow?.show()
  //   trayWindow?.setFocus()
  // })
  await listen('tray_menu', async (event) => {
    const homeWindow = WebviewWindow.getByLabel('tray')
    if (!homeWindow) return

    const position = event.payload as any
    let scaleFactor = await homeWindow.scaleFactor()
    let logicalPosition = new PhysicalPosition(position.x, position.y).toLogical(scaleFactor)
    logicalPosition.y = logicalPosition.y - 360

    let trayWindow = WebviewWindow.getByLabel('tray')
    if (trayWindow) {
      await trayWindow.setAlwaysOnTop(true)
      await trayWindow.setPosition(logicalPosition)
      await trayWindow.show()
      await trayWindow.setFocus()
    }
  })
  await listen('login_success', () => {
    isLoginWin.value = false
    resizeWindow('tray', 130, 356)
  })
  await listen('logout_success', () => {
    isLoginWin.value = true
    resizeWindow('tray', 130, 44)
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

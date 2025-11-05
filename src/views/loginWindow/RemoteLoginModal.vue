<template>
  <n-config-provider :theme="lightTheme" class="remote-login-modal size-full select-none">
    <RemoteLogin :ip="ip" :on-confirm="handleConfirm" />
  </n-config-provider>
</template>

<script setup lang="ts">
import { getCurrentWebviewWindow, WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { lightTheme } from 'naive-ui'
import { RemoteLogin, modalShow } from '@/layout/left/model.tsx'
import { REMOTE_LOGIN_INFO_KEY } from '@/common/constants'

const ip = ref('未知IP')
let currentWindow: WebviewWindow | null = null
let parentWindow: WebviewWindow | null = null
let unlistenClose: (() => void) | undefined

const handleStorageChange = (event: StorageEvent) => {
  if (event.key !== REMOTE_LOGIN_INFO_KEY || !event.newValue) {
    modalShow.value = false
    currentWindow?.close()
    return
  }
  const parsed = JSON.parse(event.newValue) as { ip?: string }
  if (parsed?.ip) {
    ip.value = parsed.ip
  }
}

const assignIpFromCache = () => {
  const cached = localStorage.getItem(REMOTE_LOGIN_INFO_KEY)
  if (!cached) return
  const parsed = JSON.parse(cached) as { ip?: string }
  if (parsed?.ip) {
    ip.value = parsed.ip
  }
}

const handleConfirm = async () => {
  modalShow.value = false
  localStorage.removeItem(REMOTE_LOGIN_INFO_KEY)
  await parentWindow?.setEnabled(true)
  await currentWindow?.close()
}

onMounted(async () => {
  window.addEventListener('storage', handleStorageChange)
  modalShow.value = true
  currentWindow = await getCurrentWebviewWindow()
  parentWindow = await WebviewWindow.getByLabel('login')
  assignIpFromCache()
  await currentWindow.show()
  if (currentWindow) {
    unlistenClose = await currentWindow.onCloseRequested(async () => {
      modalShow.value = false
      localStorage.removeItem(REMOTE_LOGIN_INFO_KEY)
      await parentWindow?.setEnabled(true)
    })
  }
})

onUnmounted(async () => {
  modalShow.value = false
  window.removeEventListener('storage', handleStorageChange)
  localStorage.removeItem(REMOTE_LOGIN_INFO_KEY)
  if (unlistenClose) {
    await unlistenClose()
    unlistenClose = undefined
  }
  await parentWindow?.setEnabled(true)
  currentWindow = null
  parentWindow = null
})
</script>

<style scoped>
.remote-login-modal {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
}
</style>

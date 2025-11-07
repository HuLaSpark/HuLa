<template>
  <n-config-provider :theme="lightTheme" class="remote-login-modal size-full select-none">
    <div class="w-350px h-310px border-rd-8px select-none cursor-default">
      <div class="bg-[--bg-popover] size-full p-6px box-border flex flex-col">
        <svg
          v-if="!isMac()"
          @click="handleConfirm"
          class="w-12px h-12px ml-a cursor-pointer select-none text-[--text-color]">
          <use href="#close"></use>
        </svg>
        <div class="flex flex-col gap-10px p-10px select-none">
          <n-flex vertical align="center" :size="30">
            <span class="text-(14px [--text-color])">下线通知</span>
            <div class="relative">
              <img class="rounded-full size-72px" :src="AvatarUtils.getAvatarUrl(userStore.userInfo?.avatar ?? '')" />
              <div
                class="absolute inset-0 bg-[--avatar-hover-bg] backdrop-blur-[2px] rounded-full flex items-center justify-center">
                <svg class="size-34px text-white animate-pulse">
                  <use href="#cloudError"></use>
                </svg>
              </div>
            </div>
            <div class="text-(13px centent [--text-color]) px-12px leading-loose mb-20px">
              您的账号在其他设备
              <span class="text-#13987f">{{ ip }}</span>
              登录，如非本人登录，请尽快修改密码，建议联系管理员
            </div>
          </n-flex>
          <n-button style="color: #fff" class="w-full" color="#13987f" @click="handleConfirm">知道了</n-button>
        </div>
      </div>
    </div>
  </n-config-provider>
</template>

<script setup lang="ts">
import { getCurrentWebviewWindow, WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { lightTheme } from 'naive-ui'
import { useWindow } from '@/hooks/useWindow.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { useUserStore } from '@/stores/user.ts'
import { isMac } from '@/utils/PlatformConstants'

const ip = ref('未知IP')
const showModal = ref(true)
let currentWindow: WebviewWindow | null = null
let parentWindow: WebviewWindow | null = null
let unlistenClose: (() => void) | undefined
const { getWindowPayload } = useWindow()
const userStore = useUserStore()

const assignIpFromPayload = async () => {
  try {
    const payload = await getWindowPayload<{ ip?: string }>('modal-remoteLogin')
    if (payload?.ip) {
      ip.value = payload.ip
    }
  } catch (error) {
    console.error('获取异地登录信息失败:', error)
  }
}

const handleConfirm = async () => {
  showModal.value = false
  await parentWindow?.setEnabled(true)
  await currentWindow?.close()
}

onMounted(async () => {
  showModal.value = true
  currentWindow = await getCurrentWebviewWindow()
  parentWindow = await WebviewWindow.getByLabel('login')
  await assignIpFromPayload()
  await currentWindow.show()
  if (currentWindow) {
    unlistenClose = await currentWindow.onCloseRequested(async () => {
      showModal.value = false
      await parentWindow?.setEnabled(true)
    })
  }
})

onUnmounted(async () => {
  showModal.value = false
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

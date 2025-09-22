<template>
  <n-config-provider :theme="lightTheme" data-tauri-drag-region class="login-box size-full rounded-8px select-none">
    <!--顶部操作栏-->
    <ActionBar :max-w="false" :shrink="false" proxy data-tauri-drag-region />

    <n-flex justify="center" class="mt-15px" data-tauri-drag-region>
      <img src="@/assets/logo/hula.png" class="w-140px h-60px drop-shadow-xl" alt="" data-tauri-drag-region />
    </n-flex>

    <!-- 二维码 -->
    <n-flex justify="center" class="mt-25px" data-tauri-drag-region>
      <n-skeleton v-if="loading" style="border-radius: 12px" :width="204" :height="204" :sharp="false" size="medium" />
      <div v-else class="relative">
        <n-qr-code
          :size="180"
          class="rounded-12px"
          :class="{ blur: scanStatus.show || refreshing }"
          :value="qrCodeValue"
          :color="qrCodeColor"
          :bg-color="qrCodeBgColor"
          :type="qrCodeType"
          :icon-src="qrCodeIcon"
          :icon-size="36"
          :icon-margin="2"
          :error-correction-level="qrErrorCorrectionLevel"
          @click="refreshQRCode" />
        <!-- 二维码状态 -->
        <n-flex
          v-if="scanStatus.show"
          vertical
          :size="12"
          align="center"
          class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <svg class="size-42px animate-pulse">
            <use :href="`#${scanStatus.icon}`"></use>
          </svg>
          <span class="text-(16px #e3e3e3)">{{ scanStatus.text }}</span>
        </n-flex>

        <n-flex
          v-if="refreshing"
          vertical
          :size="12"
          align="center"
          class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <n-spin size="small" />
          <span class="text-(16px #e3e3e3)">刷新中</span>
        </n-flex>
      </div>
    </n-flex>

    <n-flex justify="center" class="mt-15px text-(14px #808080)">
      {{ loadText }}
    </n-flex>

    <!-- 底部操作栏 -->
    <n-flex justify="center" class="text-14px mt-48px" data-tauri-drag-region>
      <div class="color-#13987f cursor-pointer" @click="router.push('/login')">账密登录</div>
      <div class="w-1px h-14px bg-#ccc"></div>
      <div class="color-#13987f cursor-pointer" @click="createWebviewWindow('注册', 'register', 600, 600)">
        注册账号
      </div>
    </n-flex>
  </n-config-provider>
</template>
<script setup lang="ts">
import { emit } from '@tauri-apps/api/event'
import { lightTheme } from 'naive-ui'
import { useWindow } from '@/hooks/useWindow.ts'
import router from '@/router'
import { getEnhancedFingerprint } from '@/services/fingerprint'
import { useGlobalStore } from '@/stores/global'
import { checkQRStatus, generateQRCode } from '@/utils/ImRequestUtils'
import { loginCommand } from '~/src/services/tauriCommand'

const globalStore = useGlobalStore()
const { createWebviewWindow } = useWindow()
const { isTrayMenuShow } = storeToRefs(globalStore)
const loading = ref(true)
const loadText = ref('加载中...')
const refreshing = ref(false) // 是否正在刷新
const qrCodeValue = ref('')
const qrCodeResp = ref()
const qrCodeColor = ref('#000000')
const qrCodeBgColor = ref('#FFFFFF')
const qrCodeType = ref('canvas' as const)
const qrCodeIcon = ref('/logo.png')
const qrErrorCorrectionLevel = ref('H' as const)
const pollInterval = ref<NodeJS.Timeout | null>(null)

const scanStatus = ref<{
  status: 'error' | 'success' | 'auth'
  icon: 'cloudError' | 'success' | 'Security'
  text: string
  show: boolean
}>({ status: 'success', icon: 'success', text: '扫码失败', show: false })

/** 刷新二维码 */
const refreshQRCode = () => {
  console.log('scanStatus.value.status', scanStatus.value.status)
  if (scanStatus.value.status !== 'error' && scanStatus.value.status !== 'auth') {
    return
  }

  refreshing.value = true
  loadText.value = '刷新中...'

  scanStatus.value = {
    status: 'success',
    icon: 'success',
    text: '',
    show: false
  }

  // 先清除之前的轮询
  if (pollInterval.value) {
    clearInterval(pollInterval.value)
    pollInterval.value = null
  }
  // 重新生成二维码
  handleQRCodeLogin()
}

const startPolling = () => {
  if (pollInterval.value) {
    clearInterval(pollInterval.value)
  }
  pollInterval.value = setInterval(async () => {
    try {
      const res: any = await checkQRStatus({
        qrId: qrCodeResp.value.qrId,
        clientId: localStorage.getItem('clientId') as string,
        deviceHash: qrCodeResp.value.deviceHash,
        deviceType: 'PC'
      })
      console.log('res --> ', res)
      switch (res.status) {
        case 'PENDING':
          // 等待中
          break
        case 'SCANNED':
          // 已扫描，等待确认
          handleAuth()
          break
        case 'CONFIRMED':
          if (pollInterval.value) {
            clearInterval(pollInterval.value)
            pollInterval.value = null
          }
          try {
            // 在 rust 部分设置 token
            await emit('set_user_info', {
              token: res.data.token,
              refreshToken: res.data.refreshToken || '',
              uid: res.data.uid
            })

            await loginCommand({ uid: res.data.uid }, true).then(() => {
              scanStatus.value.show = true
              scanStatus.value = {
                status: 'success',
                icon: 'success',
                text: '登录成功',
                show: true
              }
              loadText.value = '登录中...'
            })
          } catch (error) {
            console.error('获取用户详情失败:', error)
            handleError('登录成功，但获取用户信息失败')
          }
          break
        case 'EXPIRED':
          if (pollInterval.value) {
            clearInterval(pollInterval.value)
            pollInterval.value = null
          }
          handleError('二维码已过期')
          break
        default:
          break
      }
    } catch (error) {
      handleQRCodeLogin()
    }
  }, 2000)
}

/** 处理二维码显示和刷新 */
const handleQRCodeLogin = async () => {
  try {
    qrCodeResp.value = await generateQRCode()

    qrCodeValue.value = qrCodeResp.value.qrId
    loadText.value = '请使用HulaApp扫码登录'
    loading.value = false
    refreshing.value = false

    if (scanStatus.value.show) {
      scanStatus.value.show = false
    }

    // 启动轮询
    startPolling()
  } catch (error) {
    handleError('生成二维码失败')
  }
}

/** 处理失败场景 */
const handleError = (e: any) => {
  loading.value = false
  scanStatus.value = {
    status: 'error',
    icon: 'cloudError',
    text: typeof e === 'string' ? e : '发生错误',
    show: true
  }
  loadText.value = '请稍后再试'
}

onUnmounted(() => {
  // 组件卸载时清除轮询
  if (pollInterval.value) {
    clearInterval(pollInterval.value)
    pollInterval.value = null
  }
})

/** 处理授权场景 */
const handleAuth = () => {
  loading.value = false
  scanStatus.value = {
    status: 'auth',
    icon: 'Security',
    text: '扫码成功,等待授权',
    show: true
  }
  loadText.value = '等待授权...'
}

onMounted(async () => {
  isTrayMenuShow.value = false
  // 存储此次登陆设备指纹
  const clientId = await getEnhancedFingerprint()
  localStorage.setItem('clientId', clientId)

  handleQRCodeLogin()
})
</script>

<style scoped lang="scss">
@use '@/styles/scss/global/login-bg';

:deep(.hover-box) {
  @apply w-28px h24px flex-center hover:bg-#e7e7e7;

  svg {
    color: #404040;
  }
}

:deep(.action-close) {
  svg {
    color: #404040;
  }
}
</style>

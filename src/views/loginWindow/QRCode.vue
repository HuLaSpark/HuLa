<template>
  <n-config-provider :theme="lightTheme" data-tauri-drag-region class="login-box size-full rounded-8px select-none">
    <!--顶部操作栏-->
    <ActionBar :max-w="false" :shrink="false" />

    <n-flex justify="center" class="mt-15px">
      <img src="@/assets/logo/hula.png" class="w-140px h-60px drop-shadow-xl" alt="" />
    </n-flex>

    <!-- 二维码 -->
    <n-flex justify="center" class="mt-25px">
      <n-skeleton v-if="loading" style="border-radius: 12px" :width="204" :height="204" :sharp="false" size="medium" />
      <n-qr-code
        v-else
        :size="180"
        class="rounded-12px relative"
        :class="{ blur: scanStatus.show }"
        :value="QRCode"
        icon-src="/logo.png"
        error-correction-level="H" />
      <!-- 二维码状态 -->
      <n-flex
        v-if="scanStatus.show"
        vertical
        :size="12"
        align="center"
        class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <svg class="size-42px animate-pulse"><use :href="`#${scanStatus.icon}`"></use></svg>
        <span class="text-(16px #e3e3e3)">{{ scanStatus.text }}</span>
      </n-flex>
    </n-flex>

    <n-flex justify="center" class="mt-15px text-(14px #808080)">{{ loadText }}</n-flex>

    <!-- 顶部操作栏 -->
    <n-flex justify="center" class="text-14px mt-48px">
      <div class="color-#13987f cursor-pointer" @click="router.push('/login')">账密登录</div>
      <div class="w-1px h-14px bg-#ccc"></div>
      <div class="color-#13987f cursor-pointer">注册账号</div>
    </n-flex>
  </n-config-provider>
</template>
<script setup lang="ts">
import router from '@/router'
import { delay } from 'lodash-es'
import { lightTheme } from 'naive-ui'
import { WsResEnum } from '@/enums'
import Mitt from '@/utils/Bus.ts'
import { setting } from '@/stores/setting.ts'
import { useLogin } from '@/hooks/useLogin.ts'
import { useWindow } from '@/hooks/useWindow.ts'
import { LoginStatus, useWsLoginStore } from '@/stores/ws.ts'

const settingStore = setting()
const loginStore = useWsLoginStore()
/** 获取登录二维码 */
const loginQrCode = computed(() => loginStore.loginQrCode)
/** 登录状态 */
const loginStatus = computed(() => loginStore.loginStatus)
const { setLoginState } = useLogin()
const { createWebviewWindow } = useWindow()
const loading = ref(true)
const loadText = ref('加载中...')
const QRCode = ref()
const scanStatus = ref<{
  status: 'error' | 'success' | 'auth'
  icon: 'cloudError' | 'success' | 'Security'
  text: string
  show: boolean
}>({ status: 'success', icon: 'success', text: '扫码成功', show: false })

watchEffect(() => {
  // 等待授权中
  if (loginStatus.value === LoginStatus.Waiting) {
    handleAuth()
  }
})

/** 处理二维码显示和刷新 */
const handleQRCodeLogin = () => {
  QRCode.value = loginQrCode.value
  loading.value = false
  loadText.value = '请使用微信扫码登录'
}

/** 处理登录成功 */
const handleLoginSuccess = async (e: any) => {
  scanStatus.value.show = true
  loadText.value = '登录中...'
  delay(async () => {
    await createWebviewWindow('HuLa', 'home', 960, 720, 'login', true)
    settingStore.setAccountInfo({
      avatar: e.avatar,
      name: e.name,
      uid: e.uid,
      token: e.token
    })
    await setLoginState()
  }, 1000)
}

/** 处理失败场景 */
const handleError = (e: any) => {
  loading.value = false
  scanStatus.value = {
    status: 'error',
    icon: 'cloudError',
    text: e,
    show: true
  }
  loadText.value = '请稍后再试'
}

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

// TODO 做一个二维码过期时间重新刷新二维码的功能 (nyh -> 2024-01-27 00:37:18)
onMounted(() => {
  if (!localStorage.getItem('wsLogin')) {
    loginStore.getLoginQrCode()
  } else {
    handleQRCodeLogin()
  }
  Mitt.on(WsResEnum.QRCODE_LOGIN, () => {
    handleQRCodeLogin()
  })
  Mitt.on(WsResEnum.LOGIN_SUCCESS, (e: any) => {
    handleLoginSuccess(e)
  })
  Mitt.on(WsResEnum.WS_ERROR, (e: any) => {
    handleError(e.msg)
  })
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

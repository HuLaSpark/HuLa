<template>
  <!-- 🚀 加载页 DOM -->
  <div id="loading-page" class="h-100vh"></div>
</template>

<script setup lang="ts">
import { useSettingStore } from '@/stores/setting'
import { useLogin } from '@/hooks/useLogin'
import { invoke } from '@tauri-apps/api/core'

const settingStore = useSettingStore()
const router = useRouter()
const { normalLogin } = useLogin()

const init = async () => {
  if (settingStore.login.autoLogin) {
    normalLogin('MOBILE')
    await invoke('hide_splash_screen')
  } else {
    router.push('/mobile/login')
  }
}

onMounted(() => {
  init()
})
</script>

<style scoped lang="scss">
#loading-page {
  z-index: 9999;
  background-image: url('/Mobile/2.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  opacity: 1;
}
</style>

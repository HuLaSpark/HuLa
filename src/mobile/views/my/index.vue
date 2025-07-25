<template>
  <div class="bg-#909090 flex-col-center h-100vh">
    <!--退出登录-->
    <div class="flex-center size-full">
      <n-button type="primary" @click="handleLogout">退出登录</n-button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useLogin } from '@/hooks/useLogin.ts'

const router = useRouter()
const { resetLoginState } = useLogin()

const handleLogout = async () => {
  await resetLoginState()
  router.replace('/mobile/login')
}
</script>
<style scoped></style>

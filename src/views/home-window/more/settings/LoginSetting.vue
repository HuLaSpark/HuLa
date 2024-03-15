<template>
  <!-- 登录设置 -->
  <n-space vertical :size="20">
    <n-space :size="14" vertical class="item-box">
      <n-flex align="center" justify="space-between">
        <span>启动HuLa程序后自动登录账号</span>
        <n-switch size="small" v-model:value="autoLogin" />
      </n-flex>

      <div class="bg-[--line-color] h-1px w-full"></div>

      <n-flex align="center" justify="space-between">
        <span>电脑开机后自动启动HuLa程序</span>
        <n-switch size="small" v-model:value="autoStartup" />
      </n-flex>
    </n-space>

    <n-flex align="center" justify="space-between" class="item-box">
      <n-space vertical>
        <span>清空密码</span>
        <span class="text-12px text-#909090">清空后，下次需要使用扫码或者账密进行登录</span>
      </n-space>
      <n-button secondary type="primary" @click="clearInfo"> 清空密码 </n-button>
    </n-flex>
  </n-space>
</template>

<script setup lang="ts">
import { setting } from '@/stores/setting.ts'
import { storeToRefs } from 'pinia'

const settingStore = setting()
const { login } = storeToRefs(settingStore)
const autoLogin = ref(login.value.autoLogin)
const autoStartup = ref(login.value.autoStartup)

watchEffect(() => {
  settingStore.toggleLogin(autoLogin.value, autoStartup.value)
})

/* 清空账号信息 */
const clearInfo = () => {
  settingStore.clearAccount()
  window.$message.success('密码已清空')
}
</script>

<style scoped lang="scss">
.item-box {
  @apply text-14px text-[--text-color] bg-[--bg-setting-item] rounded-8px p-10px;
}
</style>

<template>
  <!-- 登录设置 -->
  <n-flex vertical :size="20" data-tauri-drag-region>
    <n-flex :size="12" vertical class="item-box">
      <n-flex align="center" justify="space-between">
        <span>启动HuLa程序后自动登录账号</span>
        <n-switch size="small" v-model:value="autoLogin" />
      </n-flex>

      <div class="bg-[--line-color] h-1px w-full"></div>

      <n-flex align="center" justify="space-between">
        <span>电脑开机后自动启动HuLa程序</span>
        <n-switch size="small" v-model:value="autoStartup" @change="handleStartUp" />
      </n-flex>
    </n-flex>

    <!--    <n-flex align="center" justify="space-between" class="item-box">-->
    <!--      <n-flex vertical>-->
    <!--        <span>清空密码</span>-->
    <!--        <span class="text-12px text-#909090">清空后，下次需要使用扫码或者账密进行登录</span>-->
    <!--      </n-flex>-->
    <!--      <n-button secondary type="primary" @click="clearInfo"> 清空密码 </n-button>-->
    <!--    </n-flex>-->
  </n-flex>
</template>

<script setup lang="ts">
import { useSettingStore } from '@/stores/setting.ts'
import { enable, isEnabled, disable } from '@tauri-apps/plugin-autostart'

const settingStore = useSettingStore()
const { login } = storeToRefs(settingStore)
const autoLogin = ref(login.value.autoLogin)
const autoStartup = ref(login.value.autoStartup)

watchEffect(() => {
  settingStore.toggleLogin(autoLogin.value, autoStartup.value)
})

const handleStartUp = async (val: boolean) => {
  await (val ? enable() : disable())
}

onMounted(async () => {
  // 检查是否开启了开机启动
  autoStartup.value = await isEnabled()
})
</script>

<style scoped lang="scss">
.item-box {
  @apply text-14px text-[--text-color] bg-[--bg-setting-item] rounded-8px p-10px border-(solid 1px [--line-color]) custom-shadow;
}
</style>

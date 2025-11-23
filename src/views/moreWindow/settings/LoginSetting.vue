<template>
  <!-- 登录设置 -->
  <n-flex vertical :size="20" data-tauri-drag-region>
    <n-flex :size="12" vertical class="item-box">
      <n-flex align="center" justify="space-between">
        <span>{{ t('setting.login.auto_login_startup') }}</span>
        <n-switch size="small" v-model:value="autoLogin" />
      </n-flex>

      <div class="bg-[--line-color] h-1px w-full"></div>

      <n-flex align="center" justify="space-between">
        <span>{{ t('setting.login.launch_startup') }}</span>
        <n-switch size="small" v-model:value="autoStartup" />
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
import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart'
import { useSettingStore } from '@/stores/setting.ts'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const settingStore = useSettingStore()
const { login } = storeToRefs(settingStore)
const autoLogin = ref(login.value.autoLogin)
const autoStartup = ref(login.value.autoStartup)

watchEffect(() => {
  settingStore.toggleLogin(autoLogin.value, autoStartup.value)
})

// 监听开机启动状态变化
watch(autoStartup, async (val: boolean) => {
  await (val ? enable() : disable())
})

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

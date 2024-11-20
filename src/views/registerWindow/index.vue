<template>
  <!-- 单独使用n-config-provider来包裹不需要主题切换的界面 -->
  <n-config-provider :theme="lightTheme" data-tauri-drag-region class="login-box size-full rounded-8px select-none">
    <!--顶部操作栏-->
    <ActionBar :max-w="false" :shrink="false" />

    <n-flex vertical :size="25" class="pt-80px">
      <n-flex justify="center" align="center">
        <span class="text-(24px #70938c) font-bold textFont">欢迎注册</span>
        <img class="w-100px h-40px" src="@/assets/logo/hula.png" alt="" />
      </n-flex>

      <!-- 注册菜单 -->
      <n-flex class="ma text-center h-full w-260px" vertical :size="16">
        <n-input
          maxlength="8"
          minlength="1"
          size="large"
          v-model:value="info.name"
          type="text"
          :allow-input="noSideSpace"
          :placeholder="namePH"
          @focus="namePH = ''"
          @blur="namePH = '输入HuLa昵称'"
          clearable />

        <n-input
          size="large"
          maxlength="12"
          minlength="6"
          v-model:value="info.account"
          type="text"
          :allow-input="noSideSpace"
          :placeholder="accountPH"
          @focus="accountPH = ''"
          @blur="accountPH = '输入HuLa账号'"
          clearable>
        </n-input>

        <n-input
          maxlength="16"
          minlength="6"
          size="large"
          v-model:value="info.password"
          type="password"
          :allow-input="noSideSpace"
          :placeholder="passwordPH"
          @focus="passwordPH = ''"
          @blur="passwordPH = '输入HuLa密码'"
          clearable />

        <!-- 协议 -->
        <n-flex justify="center" :size="6">
          <n-checkbox v-model:checked="protocol" />
          <div class="text-12px color-#909090 cursor-default lh-14px">
            <span>已阅读并同意</span>
            <span class="color-#13987f cursor-pointer">服务协议</span>
            <span>和</span>
            <span class="color-#13987f cursor-pointer">HuLa隐私保护指引</span>
          </div>
        </n-flex>

        <n-button
          :loading="loading"
          :disabled="btnEnable"
          class="w-full mt-8px mb-50px"
          @click="register"
          color="#13987f">
          {{ btnText }}
        </n-button>
      </n-flex>
    </n-flex>

    <!-- 底部栏 -->
    <n-flex class="text-(12px #909090)" :size="8" justify="center">
      <span>Copyright © {{ currentYear - 1 }}-{{ currentYear }} HuLaSpark All Rights Reserved.</span>
    </n-flex>
  </n-config-provider>
</template>
<script setup lang="ts">
import { lightTheme } from 'naive-ui'
import apis from '@/services/apis.ts'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import dayjs from 'dayjs'
import { RegisterUserReq } from '@/services/types.ts'

/** 账号信息 */
const info = ref({
  account: '',
  password: '',
  name: ''
})
/** 协议 */
const protocol = ref(true)
const btnEnable = ref(false)
const loading = ref(false)
const namePH = ref('输入HuLa昵称')
const accountPH = ref('输入HuLa账号')
const passwordPH = ref('输入HuLa密码')
/** 登录按钮的文本内容 */
const btnText = ref('注册')
// 使用day.js获取当前年份
const currentYear = dayjs().year()

/** 不允许输入空格 */
const noSideSpace = (value: string) => !value.startsWith(' ') && !value.endsWith(' ')

const register = async () => {
  btnEnable.value = true
  loading.value = true
  btnText.value = '注册中...'
  // 注册
  await apis
    .register({ ...info.value } as RegisterUserReq)
    .then(() => {
      window.$message.success('注册成功')
      btnText.value = '注册'
    })
    .finally(() => {
      loading.value = false
      btnEnable.value = false
      btnText.value = '注册'
    })
}

watchEffect(() => {
  btnEnable.value = !(info.value.account && info.value.password && protocol.value)
})

onMounted(async () => {
  await getCurrentWebviewWindow().show()
})

onUnmounted(() => {})
</script>

<style scoped lang="scss">
@use '@/styles/scss/global/login-bg';
@use '@/styles/scss/login';

.textFont {
  font-family: AliFangYuan, sans-serif !important;
}
</style>

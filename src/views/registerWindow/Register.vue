<template>
  <!-- todo 这里设置了 data-tauri-drag-region但是有部分区域不可以拖动 -->
  <!-- 单独使用n-config-provider来包裹不需要主题切换的界面 -->
  <n-config-provider :theme="lightTheme" data-tauri-drag-region class="login-box size-full rounded-8px select-none">
    <!--顶部操作栏-->
    <ActionBar :max-w="false" :shrink="false" />

    <!--  手动登录样式  -->
    <n-flex vertical :size="25" data-tauri-drag-region>
      <!-- 头像 -->
      <n-flex justify="center" class="w-full pt-20px" data-tauri-drag-region>
        <img class="w-32px h-32px rounded-50% bg-#b6d6d9ff border-(2px solid #fff)" src="/logo.png" alt="" />
      </n-flex>

      <!-- 登录菜单 -->
      <n-flex class="ma text-center h-full w-260px" vertical :size="16" data-tauri-drag-region>
        <n-input
          maxlength="16"
          minlength="6"
          size="large"
          v-model:value="info.name"
          type="text"
          :placeholder="namePH"
          @focus="namePH = ''"
          @blur="namePH = '输入HuLa昵称'"
          clearable />

        <n-input
          size="large"
          maxlength="16"
          minlength="6"
          v-model:value="info.account"
          type="text"
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

    <!-- 底部操作栏 -->
    <n-flex justify="center" class="text-14px" id="bottomBar" data-tauri-drag-region>
      <div class="color-#13987f cursor-pointer" @click="router.push('/login')">账号登录</div>
      <div class="w-1px h-14px bg-#ccc"></div>
      <div class="color-#13987f cursor-pointer" @click="router.push('/qrCode')">扫码登录</div>
    </n-flex>
  </n-config-provider>
</template>
<script setup lang="ts">
import router from '@/router'
import { lightTheme } from 'naive-ui'
import apis from '@/services/apis.ts'

/** 账号信息 */
const info = ref({
  account: '',
  password: '',
  name: ''
})
/** 是否中断登录 */
const interruptLogin = ref(false)
/** 协议 */
const protocol = ref(true)
const btnEnable = ref(false)
const loading = ref(false)
const namePH = ref('输入HuLa昵称')
const accountPH = ref('输入HuLa账号')
const passwordPH = ref('输入HuLa密码')
/** 登录按钮的文本内容 */
const btnText = ref('注册')

const register = async () => {
  interruptLogin.value = true
  loading.value = true
  btnText.value = '注册中...'
  // 注册
  await apis
    .register({ ...info.value } as User)
    .then(() => {
      window.$message.success('注册成功')
      btnText.value = '注册'
    })
    .finally(() => {
      loading.value = false
      interruptLogin.value = false
      btnText.value = '注册'
    })
}

watchEffect(() => {
  btnEnable.value = !(info.value.account && info.value.password && protocol.value)
  if (interruptLogin.value) {
    btnEnable.value = false
  }
})

onMounted(async () => {})

onUnmounted(() => {})
</script>

<style scoped lang="scss">
@use '@/styles/scss/global/login-bg';
@use '@/styles/scss/login';
</style>

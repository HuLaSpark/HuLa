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
        <n-form :model="info" :rules="rules" ref="registerForm">
          <n-form-item path="name">
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
          </n-form-item>

          <n-form-item path="account">
            <n-input
              size="large"
              maxlength="12"
              minlength="6"
              v-model:value="info.account"
              type="text"
              :allow-input="onlyAlphaNumeric"
              :placeholder="accountPH"
              @focus="accountPH = ''"
              @blur="accountPH = '输入HuLa账号'"
              clearable />
          </n-form-item>

          <n-form-item path="password">
            <n-input
              class="pl-16px"
              maxlength="16"
              minlength="6"
              size="large"
              show-password-on="click"
              v-model:value="info.password"
              type="password"
              :allow-input="noSideSpace"
              :placeholder="passwordPH"
              @focus="passwordPH = ''"
              @blur="passwordPH = '输入HuLa密码'"
              clearable />
          </n-form-item>
          <!-- 密码提示信息 -->
          <n-flex vertical v-if="info.password">
            <n-flex vertical :size="4">
              <Validation :value="info.password" message="最少6位" :validator="validateMinLength" />
              <Validation :value="info.password" message="由英文和数字构成" :validator="validateAlphaNumeric" />
              <Validation
                :value="info.password"
                message="必须有一个特殊字符!@#¥%.&*"
                :validator="validateSpecialChar" />
            </n-flex>
          </n-flex>
        </n-form>

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
      <span>Copyright {{ currentYear - 1 }}-{{ currentYear }} HuLaSpark All Rights Reserved.</span>
    </n-flex>
  </n-config-provider>
</template>
<script setup lang="ts">
import { lightTheme } from 'naive-ui'
import apis from '@/services/apis.ts'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import dayjs from 'dayjs'
import { RegisterUserReq } from '@/services/types.ts'
import Validation from '@/components/common/Validation.vue'

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
const registerForm = ref()
// 校验规则
const rules = {
  name: {
    required: true,
    message: '请输入昵称',
    trigger: 'blur'
  },
  account: {
    required: true,
    message: '请输入账号',
    trigger: 'blur'
  },
  password: {
    required: true,
    message: '请输入密码',
    trigger: ['blur', 'input']
  }
}

/** 不允许输入空格 */
const noSideSpace = (value: string) => !value.startsWith(' ') && !value.endsWith(' ')

/** 只允许输入英文和数字 */
const onlyAlphaNumeric = (value: string) => /^[a-zA-Z0-9]*$/.test(value)

/** 密码验证函数 */
const validateMinLength = (value: string) => value.length >= 6

/** 检查密码是否包含英文和数字 */
const validateAlphaNumeric = (value: string) => {
  const hasLetter = /[a-zA-Z]/.test(value)
  const hasNumber = /[0-9]/.test(value)
  return hasLetter && hasNumber
}

/** 检查密码是否包含特殊字符 */
const validateSpecialChar = (value: string) => /[!@#¥$%.&*]/.test(value)

/** 检查密码是否满足所有条件 */
const isPasswordValid = computed(() => {
  const password = info.value.password
  return validateMinLength(password) && validateAlphaNumeric(password) && validateSpecialChar(password)
})

/** 注册 */
const register = async () => {
  await registerForm.value.validate((errors: any) => {
    if (!errors) {
      btnEnable.value = true
      loading.value = true
      btnText.value = '注册中...'
      // 注册
      apis
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
  })
}

watchEffect(() => {
  btnEnable.value = !(info.value.account && isPasswordValid.value && protocol.value)
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

:deep(.n-form-item.n-form-item--top-labelled) {
  grid-template-rows: none;
}
</style>

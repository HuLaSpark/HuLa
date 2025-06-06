<template>
  <!-- 单独使用n-config-provider来包裹不需要主题切换的界面 -->
  <n-config-provider :theme="lightTheme" data-tauri-drag-region class="login-box size-full rounded-8px select-none">
    <!--顶部操作栏-->
    <ActionBar :max-w="false" :shrink="false" />

    <n-flex vertical justify="center" :size="25" class="pt-70px w-full">
      <n-flex justify="center" align="center">
        <span class="text-(24px #70938c) font-bold textFont">欢迎注册</span>
        <img class="w-100px h-40px" src="@/assets/logo/hula.png" alt="" />
      </n-flex>

      <!-- 注册菜单 -->
      <n-flex class="ma text-center h-full w-260px" vertical :size="16">
        <n-form :model="info" :rules="rules" ref="registerForm">
          <!-- 第一步：昵称和密码 -->
          <div v-if="currentStep === 1">
            <n-form-item path="name">
              <n-input
                :class="[{ 'pr-20px': info.name }, { 'pr-16px': showNamePrefix && !info.name }]"
                maxlength="8"
                minlength="1"
                size="large"
                v-model:value="info.name"
                type="text"
                spellCheck="false"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                :allow-input="noSideSpace"
                :placeholder="showNamePrefix ? '' : placeholders.name"
                @focus="handleInputState($event, 'name')"
                @blur="handleInputState($event, 'name')"
                clearable>
                <template #prefix v-if="showNamePrefix || info.name">
                  <p class="text-12px">昵称</p>
                </template>
              </n-input>
            </n-form-item>

            <n-form-item path="password">
              <n-input
                :class="{ 'pl-16px': !showPasswordPrefix && !info.password }"
                maxlength="16"
                minlength="6"
                size="large"
                spellCheck="false"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                show-password-on="click"
                v-model:value="info.password"
                type="password"
                :allow-input="noSideSpace"
                :placeholder="showPasswordPrefix ? '' : placeholders.password"
                @focus="handleInputState($event, 'password')"
                @blur="handleInputState($event, 'password')"
                clearable>
                <template #prefix v-if="showPasswordPrefix || info.password">
                  <p class="text-12px">密码</p>
                </template>
              </n-input>
            </n-form-item>

            <n-form-item path="confirmPassword">
              <n-input
                :class="{ 'pl-16px': !showConfirmPasswordPrefix && !confirmPassword }"
                maxlength="16"
                minlength="6"
                size="large"
                spellCheck="false"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                show-password-on="click"
                v-model:value="confirmPassword"
                type="password"
                :allow-input="noSideSpace"
                :placeholder="showConfirmPasswordPrefix ? '' : '二次确认密码'"
                @focus="handleInputState($event, 'confirmPassword')"
                @blur="handleInputState($event, 'confirmPassword')"
                clearable>
                <template #prefix v-if="showConfirmPasswordPrefix || confirmPassword">
                  <p class="text-12px">验证</p>
                </template>
              </n-input>
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

            <!-- 协议 -->
            <n-flex justify="center" :size="6" class="mt-10px">
              <n-checkbox v-model:checked="protocol" />
              <div class="text-12px color-#909090 cursor-default lh-14px">
                <span>已阅读并同意</span>
                <span class="color-#13987f cursor-pointer">服务协议</span>
                <span>和</span>
                <span class="color-#13987f cursor-pointer">HuLa隐私保护指引</span>
              </div>
            </n-flex>
          </div>

          <!-- 第二步：邮箱和验证码 -->
          <div v-if="currentStep === 2">
            <n-form-item path="email">
              <n-auto-complete
                size="large"
                v-model:value="info.email"
                :placeholder="showemailPrefix ? '' : placeholders.email"
                :options="commonEmailDomains"
                :get-show="getShow"
                :append="true"
                clearable
                type="text"
                autocomplete="off"
                @focus="handleInputState($event, 'email')"
                @blur="handleInputState($event, 'email')">
                <template #prefix v-if="showemailPrefix || info.email">
                  <p class="text-12px">邮箱</p>
                </template>
              </n-auto-complete>
            </n-form-item>

            <n-form-item path="code">
              <n-input
                style="width: 140px"
                size="large"
                spellCheck="false"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                v-model:value="info.code"
                :allow-input="noSideSpace"
                :placeholder="showCodePrefix ? '' : placeholders.code"
                @focus="handleInputState($event, 'code')"
                @blur="handleInputState($event, 'code')"
                clearable>
              </n-input>

              <n-image
                width="120"
                height="40"
                class="ml-20px rounded-10px"
                :src="captcha.base64"
                preview-disabled
                @click="getVerifyCode">
                <template #placeholder>
                  <n-skeleton height="40px" width="120px" class="rounded-10px" />
                </template>
              </n-image>
            </n-form-item>
          </div>
        </n-form>

        <n-button
          :loading="loading"
          :disabled="btnEnable"
          class="w-full mt-8px mb-50px"
          @click="handleStepAction"
          color="#13987f">
          {{ btnText }}
        </n-button>
      </n-flex>
    </n-flex>

    <!-- 底部栏 -->
    <n-flex class="text-(12px #909090)" :size="8" justify="center">
      <span>Copyright {{ currentYear - 1 }}-{{ currentYear }} HuLaSpark All Rights Reserved.</span>
    </n-flex>

    <!-- 星标提示框 -->
    <n-modal v-model:show="starTipsModal" :mask-closable="false" class="rounded-8px" transform-origin="center">
      <div class="bg-[--bg-edit] w-380px h-fit box-border flex flex-col">
        <n-flex vertical class="w-full h-fit">
          <video class="w-full h-240px rounded-t-8px object-cover" src="@/assets/video/star.mp4" autoplay loop />
          <n-flex vertical :size="10" class="p-14px">
            <p class="text-(16px [--text-color] font-bold)">在 GitHub 为我们点亮星标</p>
            <p class="text-(12px [--chat-text-color]) leading-5">
              如果您喜爱我们的产品，并希望支持我们，可以去 GitHub
              给我们点一颗星吗？这个小小的动作对我们来说意义重大，能激励我们为您持续提供特性体验。
            </p>

            <n-flex :size="10" class="ml-auto">
              <a
                target="_blank"
                rel="noopener noreferrer"
                @click="handleStar"
                href="https://github.com/HuLaSpark/HuLa"
                class="bg-#363636 cursor-pointer w-70px h-30px rounded-8px flex-center text-(12px #f1f1f1) outline-none no-underline">
                点亮星标
              </a>
            </n-flex>
          </n-flex>
        </n-flex>
      </div>
    </n-modal>

    <!-- 邮箱验证码输入弹窗 -->
    <n-modal v-model:show="emailCodeModal" :mask-closable="false" class="rounded-8px" transform-origin="center">
      <div class="bg-[--bg-edit] w-380px h-fit box-border flex flex-col">
        <n-flex vertical class="w-full h-fit">
          <n-flex vertical :size="10" class="p-20px">
            <p class="text-(16px [--text-color] font-bold) mb-10px">请输入邮箱验证码</p>
            <p class="text-(12px [--chat-text-color]) leading-5 mb-10px">
              验证码已发送至 {{ info.email }}，请查收并输入验证码完成注册
            </p>

            <!-- PIN 输入框 -->
            <div class="mb-20px">
              <PinInput v-model="emailCode" @complete="register" ref="pinInputRef" />
            </div>

            <n-button
              :loading="registerLoading"
              :disabled="!isEmailCodeComplete"
              class="w-full"
              @click="register"
              color="#13987f">
              注册
            </n-button>
          </n-flex>
        </n-flex>
      </div>
    </n-modal>
  </n-config-provider>
</template>

<script setup lang="ts">
import { lightTheme } from 'naive-ui'
import apis from '@/services/apis.ts'
import { getCurrentWebviewWindow, WebviewWindow } from '@tauri-apps/api/webviewWindow'
import dayjs from 'dayjs'
import { RegisterUserReq } from '@/services/types.ts'
import Validation from '@/components/common/Validation.vue'
import PinInput from '@/components/common/PinInput.vue'

// 输入框类型定义
type InputType = 'name' | 'email' | 'password' | 'code' | 'confirmPassword'

/** 注册信息 */
const info = unref(
  ref<RegisterUserReq>({
    avatar: '',
    email: '',
    password: '',
    name: '',
    code: '',
    uuid: ''
  })
)

/** 确认密码 */
const confirmPassword = ref('')

/** 当前步骤 */
const currentStep = ref(1)

/** 协议 */
const protocol = ref(true)
const btnEnable = ref(false)
const loading = ref(false)
const registerLoading = ref(false)

// 占位符
const placeholders: Record<InputType, string> = {
  name: '输入HuLa昵称',
  email: '输入邮箱',
  password: '输入HuLa密码',
  code: '验证码',
  confirmPassword: '输入二次密码'
} as const

// 前缀显示状态
const showNamePrefix = ref(false)
const showemailPrefix = ref(false)
const showPasswordPrefix = ref(false)
const showCodePrefix = ref(false)
const showConfirmPasswordPrefix = ref(false)

// 常用邮箱后缀
const commonEmailDomains = computed(() => {
  return ['gmail.com', '163.com', 'qq.com'].map((suffix) => {
    return {
      label: suffix,
      value: suffix
    }
  })
})

/** 登录按钮的文本内容 */
const btnText = computed(() => {
  return currentStep.value < 3 ? '下一步' : '注册'
})

/** 验证码 */
const captcha = ref({ base64: '', uuid: '' })
/** 验证码冷却时间(秒) */
const captchaCooldown = ref(0)
/** 验证码冷却定时器 */
const captchaCooldownTimer = ref<NodeJS.Timeout>()
// 使用day.js获取当前年份
const currentYear = dayjs().year()
const registerForm = ref()
const starTipsModal = ref(false)
const emailCodeModal = ref(false)

// 邮箱验证码PIN输入
const emailCode = ref('')
const pinInputRef = ref()
const isEmailCodeComplete = computed(() => emailCode.value.length === 6)

// 校验规则
const rules = {
  name: {
    required: true,
    message: '请输入昵称',
    trigger: 'blur'
  },
  email: {
    required: true,
    message: '请输入邮箱',
    trigger: 'blur'
  },
  password: {
    required: true,
    message: '请输入密码',
    trigger: ['blur', 'input']
  },
  confirmPassword: {
    required: true,
    message: '两次密码不一致',
    trigger: 'blur',
    validator() {
      if (confirmPassword.value !== info.password) {
        return false
      }
      return true
    }
  },
  code: {
    required: true,
    message: '请输入验证码',
    trigger: 'blur'
  }
}

const getShow = (value: string) => {
  if (value.endsWith('@')) {
    return true
  }
  return false
}

/** 不允许输入空格 */
const noSideSpace = (value: string) => !value.startsWith(' ') && !value.endsWith(' ')

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
  const password = info.password
  return validateMinLength(password) && validateAlphaNumeric(password) && validateSpecialChar(password)
})

/** 检查第一步是否可以继续 */
const isStep1Valid = computed(() => {
  return info.name && isPasswordValid.value && confirmPassword.value === info.password && protocol.value
})

/** 检查第二步是否可以继续 */
const isStep2Valid = computed(() => {
  return info.email && info.code
})

watchEffect(() => {
  if (currentStep.value === 1) {
    btnEnable.value = !isStep1Valid.value
  } else if (currentStep.value === 2) {
    btnEnable.value = !isStep2Valid.value
  }
})

/**
 * 处理输入框状态变化
 * @param type 输入框类型：name-昵称 / email-邮箱 / password-密码 / confirmPassword-确认密码
 * @param event 事件对象
 */
const handleInputState = (event: FocusEvent, type: InputType): void => {
  const prefixMap: Record<InputType, Ref<boolean>> = {
    name: showNamePrefix,
    email: showemailPrefix,
    password: showPasswordPrefix,
    code: showCodePrefix,
    confirmPassword: showConfirmPasswordPrefix
  }
  prefixMap[type].value = event.type === 'focus'
}

/**
 * 获取验证码
 */
const getVerifyCode = async () => {
  // 如果正在冷却中，直接返回
  if (captchaCooldown.value > 0) {
    window.$message.warning(`请等待 ${captchaCooldown.value} 秒后再试`)
    return
  }

  // 设置10秒冷却时间
  captchaCooldown.value = 10
  // 启动冷却计时器
  captchaCooldownTimer.value = setInterval(() => {
    if (captchaCooldown.value > 0) {
      captchaCooldown.value--
    } else {
      // 清除计时器
      if (captchaCooldownTimer.value) {
        clearInterval(captchaCooldownTimer.value)
      }
    }
  }, 1000)

  const { img, uuid } = await apis.getCaptcha()
  captcha.value = { base64: img, uuid }
}

/** 处理步骤操作 */
const handleStepAction = async () => {
  if (currentStep.value === 1) {
    // 进入第二步
    currentStep.value = 2
    // 获取新的验证码
    getVerifyCode()
  } else if (currentStep.value === 2) {
    loading.value = true
    try {
      // 发送邮箱验证码
      await apis.sendCaptcha({ email: info.email, code: info.code.toString(), uuid: captcha.value.uuid.toString() })
      window.$message.success('验证码已发送')
      loading.value = false
      // 显示邮箱验证码输入弹窗
      emailCodeModal.value = true
      // 清空PIN输入框
      emailCode.value = ''
      // 聚焦第一个输入框
      nextTick(() => {
        if (pinInputRef.value) {
          pinInputRef.value.focus()
        }
      })
    } catch (error) {
      loading.value = false
    }
  }
}

/** 邮箱注册 */
const register = async () => {
  registerLoading.value = true

  // 合并验证码
  info.code = emailCode.value
  info.uuid = captcha.value.uuid

  try {
    // 随机生成头像编号
    const avatarNum = Math.floor(Math.random() * 21) + 1
    const avatarId = avatarNum.toString().padStart(3, '0')
    info.avatar = avatarId

    // 注册
    await apis.register({ ...info })
    window.$message.success('注册成功')

    // 关闭弹窗并跳转到登录页
    emailCodeModal.value = false
    setTimeout(() => {
      WebviewWindow.getByLabel('login').then((win) => {
        win?.setFocus()
      })
      WebviewWindow.getCurrent().close()
    }, 1200)
  } catch (error) {
    window.$message.error('注册失败，请重试')
  } finally {
    registerLoading.value = false
  }
}

const handleStar = () => {
  starTipsModal.value = false
  localStorage.setItem('star', '1')
}

onMounted(async () => {
  await getCurrentWebviewWindow().show()
  await nextTick(() => {
    starTipsModal.value = localStorage.getItem('star') !== '1'
  })
})

// 组件卸载时清理计时器
onUnmounted(() => {
  if (captchaCooldownTimer.value) {
    clearInterval(captchaCooldownTimer.value)
  }
})
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

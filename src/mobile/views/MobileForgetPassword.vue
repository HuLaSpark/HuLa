<template>
  <MobileLayout :safeAreaTop="true" class="overflow-hidden" :safeAreaBottom="true">
    <HeaderBar
      :isOfficial="false"
      :hidden-right="true"
      :enable-default-background="false"
      :enable-shadow="false"
      :room-name="t('mobile_forget_code.title')" />
    <n-flex vertical class="w-full size-full">
      <!-- 步骤条 -->
      <n-steps size="small" class="w-full px-40px mt-20px" :current="currentStep" :status="stepStatus">
        <n-step :title="t('mobile_forget_code.steps.verify_email')" description="" />
        <n-step :title="t('mobile_forget_code.steps.set_new_password')" description="" />
        <n-step :title="t('mobile_forget_code.steps.done')" description="" />
      </n-steps>

      <!-- 第一步：验证邮箱 -->
      <div v-if="currentStep === 1" class="w-full max-w-300px mx-auto mt-30px">
        <n-form ref="formRef" :model="formData" :rules="emailRules">
          <!-- 邮箱输入 -->
          <n-form-item path="email" :label="t('mobile_forget_code.input.label.email')">
            <n-input
              :allow-input="noSideSpace"
              class="border-(1px solid #90909080)"
              v-model:value="formData.email"
              :placeholder="t('mobile_forget_code.input.email')"
              spellCheck="false"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              clearable />
          </n-form-item>

          <!-- 邮箱验证码 -->
          <n-form-item path="emailCode" :label="t('mobile_forget_code.input.label.email_verification_code')">
            <n-flex :size="8">
              <n-input
                :allow-input="noSideSpace"
                class="border-(1px solid #90909080)"
                v-model:value="formData.emailCode"
                :placeholder="t('mobile_forget_code.input.email_code')"
                spellCheck="false"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                maxlength="6" />
              <n-button
                color="#13987f"
                ghost
                :disabled="sendBtnDisabled"
                :loading="sendingEmailCode"
                @click="sendEmailCode"
                class="min-w-100px w-fit h-34px">
                {{ emailCodeBtnText }}
              </n-button>
            </n-flex>
          </n-form-item>

          <n-button
            :loading="verifyLoading"
            :disabled="nextDisabled"
            tertiary
            style="color: #fff"
            @click="verifyEmail"
            class="mt-10px w-full gradient-button">
            {{ t('mobile_forget_code.button.next') }}
          </n-button>
        </n-form>
      </div>

      <!-- 第二步：设置新密码 -->
      <div v-if="currentStep === 2" class="w-full max-w-300px mx-auto mt-30px">
        <n-form ref="passwordFormRef" :model="passwordForm" :rules="passwordRules">
          <!-- 新密码 -->
          <n-form-item path="password" :label="t('mobile_forget_code.input.label.new_pass')">
            <n-flex vertical :size="8" class="w-full">
              <n-input
                :allow-input="noSideSpace"
                class="border-(1px solid #90909080) w-full"
                v-model:value="passwordForm.password"
                type="password"
                show-password-on="click"
                :placeholder="t('mobile_forget_code.input.new_pass', { len: '6-16' })"
                maxlength="16"
                spellCheck="false"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                minlength="6" />
              <n-flex vertical :size="4" class="space-y-4px">
                <Validation
                  :value="passwordForm.password"
                  :message="t('mobile_forget_code.validation.minlength', { len: '6-16' })"
                  :validator="validateMinLength" />
                <Validation
                  :value="passwordForm.password"
                  :message="t('mobile_forget_code.validation.valid_characters')"
                  :validator="validateAlphaNumeric" />
                <Validation
                  :value="passwordForm.password"
                  :message="t('mobile_forget_code.validation.must_special_char')"
                  :validator="validateSpecialChar" />
              </n-flex>
            </n-flex>
          </n-form-item>

          <!-- 确认密码 -->
          <n-form-item path="confirmPassword" :label="t('mobile_forget_code.input.label.confirm_password')">
            <n-flex vertical :size="8" class="w-full">
              <n-input
                :allow-input="noSideSpace"
                class="border-(1px solid #90909080) w-full"
                v-model:value="passwordForm.confirmPassword"
                type="password"
                show-password-on="click"
                :placeholder="t('mobile_forget_code.input.confirm_password')"
                spellCheck="false"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                maxlength="16"
                minlength="6" />
              <n-flex vertical :size="4">
                <Validation
                  :value="passwordForm.confirmPassword"
                  :message="t('mobile_forget_code.validation.passwords_match')"
                  :validator="(value: string) => value === passwordForm.password && value !== ''" />
              </n-flex>
            </n-flex>
          </n-form-item>

          <n-flex :size="16" class="mt-30px">
            <n-button @click="goBack" class="flex-1">{{ t('mobile_forget_code.button.go_back_setp') }}</n-button>
            <n-button
              :loading="submitLoading"
              tertiary
              style="color: #fff"
              @click="submitNewPassword"
              class="flex-1 gradient-button">
              {{ t('mobile_forget_code.button.submit') }}
            </n-button>
          </n-flex>
        </n-form>
      </div>

      <!-- 第三步：完成 -->
      <div v-if="currentStep === 3" class="w-full max-w-300px mx-auto mt-100px text-center">
        <!-- <n-icon size="64" class="text-#13987f">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path fill="currentColor" d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z" />
        </svg>
      </n-icon> -->
        <img class="size-98px" src="/emoji/party-popper.webp" alt="" />

        <div class="mt-16px text-18px">{{ t('mobile_forget_code.password_reset_success') }}</div>
        <div class="mt-16px text-14px text-#666">{{ t('mobile_forget_code.password_reset_success_desc') }}</div>
      </div>
    </n-flex>
  </MobileLayout>
</template>

<script setup lang="ts">
import Validation from '@/components/common/Validation.vue'
import { forgetPassword, getCaptcha, sendCaptcha } from '@/utils/ImRequestUtils'
import { validateAlphaNumeric, validateSpecialChar } from '@/utils/Validate'
import router from '@/router'
import { useI18n } from 'vue-i18n'

// 导入Web Worker
const timerWorker = new Worker(new URL('../../workers/timer.worker.ts', import.meta.url))

const { t } = useI18n()

// 步骤状态
const currentStep = ref(1)
const stepStatus = ref<'error' | 'finish' | 'process' | 'wait' | undefined>('process')

// 第一步表单数据
const formRef = ref(null)
const formData = ref({
  email: '',
  emailCode: '',
  uuid: '' // 图片验证码uuid
})

// 图片验证码相关
const captchaImage = ref('')
const sendBtnDisabled = ref(false)
const emailCodeBtnText = ref(t('mobile_forget_code.button.send_email_code'))
const countDown = ref(60)
const verifyLoading = ref(false)
// 发送验证码loading状态
const sendingEmailCode = ref(false)
// 上次获取图片验证码的时间
const lastCaptchaTime = ref(0)
// 图片验证码获取间隔时间(毫秒)
const captchaInterval = 10000
// 图片验证码是否在冷却中
const captchaInCooldown = ref(false)
// 图片验证码冷却剩余时间
const captchaCooldownRemaining = ref(0)
// 验证码计时器的唯一ID
const EMAIL_TIMER_ID = 'email_verification_timer'
// 图片验证码限制计时器ID
const CAPTCHA_TIMER_ID = 'captcha_cooldown_timer'

// 邮箱校验规则
const emailRules = {
  email: [
    { required: true, message: t('mobile_forget_code.rules.email_require'), trigger: 'blur' },
    {
      pattern: /^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/,
      message: t('mobile_forget_code.rules.email_invalid'),
      trigger: 'blur'
    }
  ],
  emailCode: [
    { required: true, message: t('mobile_forget_code.rules.email_code_require'), trigger: 'input' },
    { min: 6, max: 6, message: t('mobile_forget_code.rules.code_length', { len: 6 }), trigger: 'blur' }
  ]
}

// 第二步密码表单
const passwordFormRef = ref(null)
const passwordForm = ref({
  password: '',
  confirmPassword: ''
})
const submitLoading = ref(false)

// 密码校验规则
const passwordRules = {
  password: [
    { required: true, message: t('mobile_forget_code.rules.new_pass_require'), trigger: 'blur' },
    { min: 6, max: 16, message: t('mobile_forget_code.rules.new_pass_length', { len: '6-16' }), trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: t('mobile_forget_code.rules.confirm_pass_require'), trigger: 'blur' },
    {
      validator: (_: any, value: string) => {
        return value === passwordForm.value.password
      },
      message: 'mobile_forget_code.rules.pass_not_matcht',
      trigger: 'blur'
    }
  ]
}

// 下一步按钮禁用状态
const nextDisabled = computed(() => {
  return !(formData.value.email && formData.value.emailCode)
})

/** 不允许输入空格 */
const noSideSpace = (value: string) => !value.startsWith(' ') && !value.endsWith(' ')

/** 密码验证函数 */
const validateMinLength = (value: string) => value.length >= 6

// 获取图片验证码
const getCaptchaImage = async () => {
  // 检查是否可以获取新的验证码
  if (captchaInCooldown.value) {
    // 显示剩余冷却时间
    window.$message.warning(t('mobile_forget_code.too_many_requests', { s: captchaCooldownRemaining.value }))
    return
  }

  try {
    // 更新上次获取时间并设置冷却状态
    lastCaptchaTime.value = Date.now()
    captchaInCooldown.value = true

    const result = await getCaptcha()
    captchaImage.value = result.img
    formData.value.uuid = result.uuid

    // 获取成功后，启动冷却计时器
    timerWorker.postMessage({
      type: 'startTimer',
      msgId: CAPTCHA_TIMER_ID,
      duration: captchaInterval // 使用设定的冷却时间
    })
  } catch (error) {
    console.error('获取验证码失败', error)
    // 获取失败时解除冷却状态，允许重试
    captchaInCooldown.value = false
  }
}

// 发送邮箱验证码
const sendEmailCode = async () => {
  // 邮箱校验
  if (!formData.value.email) {
    window.$message.warning(t('mobile_forget_code.rules.email_require'))
    return
  }

  if (!/^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/.test(formData.value.email)) {
    window.$message.warning(t('mobile_forget_code.rules.email_invalid'))
    return
  }

  // 设置loading状态
  sendingEmailCode.value = true

  try {
    await sendCaptcha({
      email: formData.value.email,
      uuid: formData.value.uuid,
      operationType: 'forgot',
      templateCode: 'PASSWORD_EDIT'
    })

    window.$message.success(t('mobile_forget_code.code_sent_email'))

    // 接口成功返回后才开始倒计时 - 使用 Web Worker
    sendBtnDisabled.value = true
    countDown.value = 60
    emailCodeBtnText.value = t('mobile_forget_code.email_resend_in', { seconds: countDown.value })

    // 发送消息给 Worker 开始计时
    timerWorker.postMessage({
      type: 'startTimer',
      msgId: EMAIL_TIMER_ID,
      duration: 60 * 1000 // 60秒，单位毫秒
    })
  } catch (error) {
    console.error('发送验证码失败', error)
    // 验证码可能错误，刷新图片验证码
    getCaptchaImage()
  } finally {
    // 无论成功或失败，都需要关闭loading状态
    sendingEmailCode.value = false
  }
}

// 验证邮箱
const verifyEmail = async () => {
  if (!formRef.value) return

  try {
    await (formRef.value as any).validate()
    verifyLoading.value = true

    // 这里只是验证表单，实际上不需要调用后端接口，直接进入下一步
    setTimeout(() => {
      currentStep.value = 2
      verifyLoading.value = false
    }, 500)
  } catch (error) {
    console.error('表单验证失败', error)
  }
}

// 返回上一步
const goBack = () => {
  currentStep.value = 1
}

// 提交新密码
const submitNewPassword = async () => {
  if (!passwordFormRef.value) return

  try {
    await (passwordFormRef.value as any).validate()
    submitLoading.value = true

    // 调用忘记密码接口
    await forgetPassword({
      email: formData.value.email,
      code: formData.value.emailCode,
      uuid: formData.value.uuid,
      password: passwordForm.value.password,
      confirmPassword: passwordForm.value.confirmPassword,
      key: 'PASSWORD_EDIT'
    })

    currentStep.value = 3
    stepStatus.value = 'finish'
    submitLoading.value = false

    setTimeout(() => {
      router.push('/mobile/login')
    }, 2000)
  } catch (error) {
    console.error('重置密码失败', error)
    submitLoading.value = false
  }
}

// 监听 Worker 消息
timerWorker.onmessage = (e) => {
  const { type, msgId, remainingTime } = e.data

  if (msgId === EMAIL_TIMER_ID) {
    // 邮箱验证码计时器消息处理
    if (type === 'debug') {
      // 更新倒计时显示
      const secondsRemaining = Math.ceil(remainingTime / 1000)
      countDown.value = secondsRemaining
      emailCodeBtnText.value = t('mobile_forget_code.email_resend_in', { seconds: secondsRemaining })
    } else if (type === 'timeout') {
      // 计时结束
      sendBtnDisabled.value = false
      emailCodeBtnText.value = t('mobile_forget_code.button.send_email_code')
    }
  } else if (msgId === CAPTCHA_TIMER_ID) {
    // 图片验证码冷却计时器消息处理
    if (type === 'debug') {
      // 更新剩余冷却时间，供用户点击时显示
      captchaCooldownRemaining.value = Math.ceil(remainingTime / 1000)
    } else if (type === 'timeout') {
      // 冷却结束
      captchaInCooldown.value = false
      captchaCooldownRemaining.value = 0
    }
  }
}

// Worker 错误处理
timerWorker.onerror = (error) => {
  console.error('[Timer Worker Error]', error)
  // 发生错误时恢复按钮状态
  sendBtnDisabled.value = false
  emailCodeBtnText.value = t('mobile_forget_code.button.send_email_code')
}

// 页面加载时获取验证码
onMounted(async () => {
  getCaptchaImage()
})

// 组件销毁时清除定时器
onBeforeUnmount(() => {
  // 清除Web Worker计时器
  timerWorker.postMessage({
    type: 'clearTimer',
    msgId: EMAIL_TIMER_ID
  })

  // 清除图片验证码冷却计时器
  timerWorker.postMessage({
    type: 'clearTimer',
    msgId: CAPTCHA_TIMER_ID
  })

  // 可选：终止Worker (如果不需要在其他地方使用)
  timerWorker.terminate()
})
</script>

<style scoped lang="scss">
@use '@/styles/scss/login';
</style>

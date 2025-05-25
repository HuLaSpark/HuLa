<template>
  <n-config-provider :theme="lightTheme" class="size-full bg-#fff rounded-8px select-none cursor-default">
    <!--顶部操作栏-->
    <ActionBar :max-w="false" :shrink="false" />

    <n-flex vertical class="w-full size-full">
      <!-- 标题 -->
      <n-flex justify="center" class="w-full">
        <p class="text-18px font-bold select-none">找回密码</p>
      </n-flex>

      <!-- 步骤条 -->
      <n-steps size="small" class="w-full px-40px mt-20px" :current="currentStep" :status="stepStatus">
        <n-step title="验证邮箱" description="验证您的账号邮箱" />
        <n-step title="设置新密码" description="设置您的新密码" />
        <n-step title="完成" description="密码修改成功" />
      </n-steps>

      <!-- 第一步：验证邮箱 -->
      <div v-if="currentStep === 1" class="w-full max-w-300px mx-auto mt-30px">
        <n-form ref="formRef" :model="formData" :rules="emailRules">
          <!-- 邮箱输入 -->
          <n-form-item path="email" label="邮箱账号">
            <n-input
              :allow-input="noSideSpace"
              class="border-(1px solid #90909080)"
              v-model:value="formData.email"
              placeholder="请输入您的邮箱"
              spellCheck="false"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              clearable />
          </n-form-item>

          <!-- 图片验证码 -->
          <n-form-item path="imgCode" label="图片验证码">
            <n-flex :size="8">
              <n-input
                :allow-input="noSideSpace"
                class="border-(1px solid #90909080)"
                v-model:value="formData.imgCode"
                placeholder="请输入图片验证码"
                spellCheck="false"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                maxlength="5" />
              <n-image
                width="120"
                height="40"
                class="cursor-pointer"
                :src="captchaImage"
                preview-disabled
                @click="getCaptchaImage">
                <template #placeholder>
                  <n-skeleton height="40px" width="120px" class="rounded-10px" />
                </template>
              </n-image>
            </n-flex>
          </n-form-item>

          <!-- 邮箱验证码 -->
          <n-form-item path="emailCode" label="邮箱验证码">
            <n-flex :size="8">
              <n-input
                :allow-input="noSideSpace"
                class="border-(1px solid #90909080)"
                v-model:value="formData.emailCode"
                placeholder="请输入邮箱验证码"
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
            @click="verifyEmail"
            color="#13987f"
            class="mt-10px w-full">
            下一步
          </n-button>
        </n-form>
      </div>

      <!-- 第二步：设置新密码 -->
      <div v-if="currentStep === 2" class="w-full max-w-300px mx-auto mt-30px">
        <n-form ref="passwordFormRef" :model="passwordForm" :rules="passwordRules">
          <!-- 新密码 -->
          <n-form-item path="password" label="新密码">
            <n-flex vertical :size="8" class="w-full">
              <n-input
                :allow-input="noSideSpace"
                class="border-(1px solid #90909080) w-full"
                v-model:value="passwordForm.password"
                type="password"
                show-password-on="click"
                placeholder="请输入6-16位新密码"
                maxlength="16"
                spellCheck="false"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                minlength="6" />
              <n-flex vertical :size="4" class="space-y-4px">
                <Validation :value="passwordForm.password" message="密码长度为6-16位" :validator="validateMinLength" />
                <Validation
                  :value="passwordForm.password"
                  message="由英文和数字构成"
                  :validator="validateAlphaNumeric" />
                <Validation
                  :value="passwordForm.password"
                  message="必须有一个特殊字符!@#¥%.&*"
                  :validator="validateSpecialChar" />
              </n-flex>
            </n-flex>
          </n-form-item>

          <!-- 确认密码 -->
          <n-form-item path="confirmPassword" label="确认密码">
            <n-flex vertical :size="8" class="w-full">
              <n-input
                :allow-input="noSideSpace"
                class="border-(1px solid #90909080) w-full"
                v-model:value="passwordForm.confirmPassword"
                type="password"
                show-password-on="click"
                placeholder="请再次输入密码"
                spellCheck="false"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                maxlength="16"
                minlength="6" />
              <n-flex vertical :size="4">
                <Validation
                  :value="passwordForm.confirmPassword"
                  message="两次密码输入一致"
                  :validator="(value) => value === passwordForm.password && value !== ''" />
              </n-flex>
            </n-flex>
          </n-form-item>

          <n-flex :size="16" class="mt-30px">
            <n-button @click="goBack" class="flex-1">上一步</n-button>
            <n-button color="#13987f" :loading="submitLoading" @click="submitNewPassword" class="flex-1">
              提交
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

        <div class="mt-16px text-18px font-bold">密码修改成功</div>
        <div class="mt-16px text-14px text-#666">您已成功重置密码，可以使用新密码登录</div>
      </div>
    </n-flex>
  </n-config-provider>
</template>

<script setup lang="ts">
import { lightTheme } from 'naive-ui'
import apis from '@/services/apis'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import Validation from '@/components/common/Validation.vue'

// 导入Web Worker
const timerWorker = new Worker(new URL('../../workers/timer.worker.ts', import.meta.url))

// 步骤状态
const currentStep = ref(1)
const stepStatus = ref<'error' | 'finish' | 'process' | 'wait' | undefined>('process')

// 第一步表单数据
const formRef = ref(null)
const formData = ref({
  email: '',
  imgCode: '',
  emailCode: '',
  uuid: '' // 图片验证码uuid
})

// 图片验证码相关
const captchaImage = ref('')
const sendBtnDisabled = ref(false)
const emailCodeBtnText = ref('发送验证码')
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
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/,
      message: '请输入正确的邮箱格式',
      trigger: 'blur'
    }
  ],
  imgCode: [
    { required: true, message: '请输入图片验证码', trigger: 'blur' },
    { min: 4, max: 5, message: '验证码长度为4-5位', trigger: 'blur' }
  ],
  emailCode: [
    { required: true, message: '请输入邮箱验证码', trigger: 'blur' },
    { min: 6, max: 6, message: '验证码长度为6位', trigger: 'blur' }
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
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 16, message: '密码长度为6-16位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (_: any, value: string) => {
        return value === passwordForm.value.password
      },
      message: '两次输入的密码不一致',
      trigger: 'blur'
    }
  ]
}

// 下一步按钮禁用状态
const nextDisabled = computed(() => {
  return !(formData.value.email && formData.value.imgCode && formData.value.emailCode)
})

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

// 获取图片验证码
const getCaptchaImage = async () => {
  // 检查是否可以获取新的验证码
  if (captchaInCooldown.value) {
    // 显示剩余冷却时间
    window.$message.warning(`请求过于频繁，${captchaCooldownRemaining.value}秒后再试`)
    return
  }

  try {
    // 更新上次获取时间并设置冷却状态
    lastCaptchaTime.value = Date.now()
    captchaInCooldown.value = true

    const result = await apis.getCaptcha()
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
    window.$message.warning('请先输入邮箱')
    return
  }

  if (!/^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/.test(formData.value.email)) {
    window.$message.warning('请输入正确的邮箱格式')
    return
  }

  if (!formData.value.imgCode) {
    window.$message.warning('请先输入图片验证码')
    return
  }

  // 设置loading状态
  sendingEmailCode.value = true

  try {
    await apis.sendCaptcha({
      email: formData.value.email,
      code: formData.value.imgCode,
      uuid: formData.value.uuid,
      operationType: 'forgot'
    })

    window.$message.success('验证码已发送至您的邮箱')

    // 接口成功返回后才开始倒计时 - 使用 Web Worker
    sendBtnDisabled.value = true
    countDown.value = 60
    emailCodeBtnText.value = `${countDown.value}秒后重新获取`

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
    await apis.forgetPassword({
      email: formData.value.email,
      code: formData.value.emailCode,
      uuid: formData.value.uuid,
      password: passwordForm.value.password
    })

    currentStep.value = 3
    stepStatus.value = 'finish'
    submitLoading.value = false
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
      emailCodeBtnText.value = `${secondsRemaining}秒后重新获取`
    } else if (type === 'timeout') {
      // 计时结束
      sendBtnDisabled.value = false
      emailCodeBtnText.value = '重新获取'
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
  emailCodeBtnText.value = '重新获取'
}

// 页面加载时获取验证码
onMounted(async () => {
  await getCurrentWebviewWindow().show()
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

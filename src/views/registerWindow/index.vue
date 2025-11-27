<template>
  <!-- 单独使用n-config-provider来包裹不需要主题切换的界面 -->
  <n-config-provider
    :theme="naiveTheme"
    data-tauri-drag-region
    class="login-box size-full rounded-8px select-none flex flex-col">
    <!--顶部操作栏-->
    <ActionBar :max-w="false" :shrink="false" />

    <n-flex vertical justify="center" :size="25" class="w-full mt--40px flex-1 pointer-events-none">
      <!-- 注册菜单 -->
      <n-flex class="ma text-center w-260px pointer-events-auto" vertical :size="16">
        <n-flex justify="center" align="center">
          <span class="text-(24px #70938c) textFont">{{ t('auth.register.title') }}</span>
          <img class="w-100px h-40px" src="/hula.png" alt="" />
        </n-flex>
        <n-form :model="info" :rules="rules" ref="registerForm">
          <!-- 注册信息 -->
          <div>
            <n-form-item path="name">
              <n-input
                :class="[{ 'pr-20px': info.nickName }, { 'pr-16px': showNamePrefix && !info.nickName }]"
                maxlength="8"
                minlength="1"
                size="large"
                v-model:value="info.nickName"
                type="text"
                spellCheck="false"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                :allow-input="noSideSpace"
                :placeholder="showNamePrefix ? '' : t('auth.register.placeholders.nickname')"
                @focus="handleInputState($event, 'nickName')"
                @blur="handleInputState($event, 'nickName')"
                clearable>
                <template #prefix v-if="showNamePrefix || info.nickName">
                  <p class="text-12px">{{ t('auth.register.labels.nickname') }}</p>
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
                :placeholder="showPasswordPrefix ? '' : t('auth.register.placeholders.password')"
                @focus="handleInputState($event, 'password')"
                @blur="handleInputState($event, 'password')"
                clearable>
                <template #prefix v-if="showPasswordPrefix || info.password">
                  <p class="text-12px">{{ t('auth.register.labels.password') }}</p>
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
                :placeholder="showConfirmPasswordPrefix ? '' : t('auth.register.placeholders.confirm_placeholder')"
                @focus="handleInputState($event, 'confirmPassword')"
                @blur="handleInputState($event, 'confirmPassword')"
                clearable>
                <template #prefix v-if="showConfirmPasswordPrefix || confirmPassword">
                  <p class="text-12px">{{ t('auth.register.labels.confirm') }}</p>
                </template>
              </n-input>
            </n-form-item>

            <n-form-item path="email">
              <n-auto-complete
                size="large"
                v-model:value="info.email"
                :placeholder="showemailPrefix ? '' : t('auth.register.placeholders.email')"
                :options="commonEmailDomains"
                :get-show="getShow"
                :append="true"
                clearable
                type="text"
                spellCheck="false"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                @focus="handleInputState($event, 'email')"
                @blur="handleInputState($event, 'email')">
                <template #prefix v-if="showemailPrefix || info.email">
                  <p class="text-12px">{{ t('auth.register.labels.email') }}</p>
                </template>
              </n-auto-complete>
            </n-form-item>

            <!-- 密码提示信息 -->
            <n-flex vertical v-if="info.password">
              <n-flex vertical :size="4">
                <Validation
                  :value="info.password"
                  :message="t('auth.register.password_hints.min_length')"
                  :validator="validateMinLength" />
                <Validation
                  :value="info.password"
                  :message="t('auth.register.password_hints.alpha_numeric')"
                  :validator="validateAlphaNumeric" />
                <Validation
                  :value="info.password"
                  :message="t('auth.register.password_hints.special_char')"
                  :validator="validateSpecialChar" />
              </n-flex>
            </n-flex>

            <!-- 协议 -->
            <n-flex align="center" justify="center" :size="6" class="mt-10px">
              <n-checkbox v-model:checked="protocol" />
              <div class="text-12px color-#909090 cursor-default lh-14px">
                <span>{{ t('login.term.checkout.text1') }}</span>
                <span class="color-#13987f cursor-pointer" @click.stop="openServiceAgreement">
                  {{ t('login.term.checkout.text2') }}
                </span>
                <span>{{ t('login.term.checkout.text3') }}</span>
                <span class="color-#13987f cursor-pointer" @click.stop="openPrivacyAgreement">
                  {{ t('login.term.checkout.text4') }}
                </span>
              </div>
            </n-flex>
          </div>
        </n-form>

        <n-button
          :loading="loading"
          :disabled="btnEnable"
          tertiary
          style="color: #fff"
          class="w-full mt-8px gradient-button"
          @click="handleStepAction">
          {{ btnText }}
        </n-button>
        <p v-if="sendCodeCooldown > 0" class="text-(12px #13987f) ml--8px mt-6px whitespace-nowrap">
          {{ t('auth.register.tips.reopen_code') }}
        </p>
      </n-flex>
    </n-flex>

    <!-- 底部栏 -->
    <n-flex
      class="text-(12px #909090) w-full absolute bottom-20px left-1/2 transform -translate-x-1/2"
      :size="8"
      justify="center">
      <span>Copyright {{ currentYear - 1 }}-{{ currentYear }} HuLaSpark All Rights Reserved.</span>
    </n-flex>

    <!-- 星标提示框 -->
    <n-modal v-model:show="starTipsModal" :mask-closable="false" class="rounded-8px" transform-origin="center">
      <div class="bg-[--bg-edit] w-380px h-fit box-border flex flex-col">
        <n-flex vertical class="w-full h-fit">
          <video class="w-full h-240px rounded-t-8px object-cover" src="@/assets/video/star.mp4" autoplay loop />
          <n-flex vertical :size="10" class="p-14px">
            <p class="text-(16px #303030)">{{ t('auth.register.modal.title') }}</p>
            <p class="text-(12px #808080) leading-5">{{ t('auth.register.modal.desc') }}</p>

            <n-flex :size="10" class="ml-auto">
              <a
                target="_blank"
                rel="noopener noreferrer"
                @click="handleStar"
                href="https://github.com/HuLaSpark/HuLa"
                class="bg-#363636 cursor-pointer w-70px h-30px rounded-8px flex-center text-(12px #f1f1f1) outline-none no-underline">
                {{ t('auth.register.modal.cta') }}
              </a>
            </n-flex>
          </n-flex>
        </n-flex>
      </div>
    </n-modal>

    <!-- 邮箱验证码输入弹窗 -->
    <n-modal v-model:show="emailCodeModal" :mask-closable="false" class="rounded-8px" transform-origin="center">
      <div class="bg-#f0f0f0 w-380px h-fit box-border flex flex-col">
        <div
          v-if="isMac()"
          @click="emailCodeModal = false"
          class="mac-close z-999 size-13px shadow-inner bg-#ed6a5eff rounded-50% select-none absolute top-3px left-4px">
          <svg class="hidden size-7px color-#000 select-none absolute top-3px left-3px">
            <use href="#close"></use>
          </svg>
        </div>

        <svg
          v-if="isWindows()"
          @click="emailCodeModal = false"
          class="w-12px h-12px ml-a mr-4px mt-4px cursor-pointer select-none">
          <use href="#close"></use>
        </svg>
        <n-flex vertical class="w-full h-fit">
          <n-flex vertical :size="10" class="p-24px">
            <p class="text-(16px #303030) mb-10px">{{ t('auth.register.email_modal.title') }}</p>
            <p class="text-(12px #808080) leading-5 mb-10px">
              {{ t('auth.register.email_modal.desc', { email: info.email }) }}
            </p>

            <!-- PIN 输入框 -->
            <div class="mb-20px">
              <PinInput v-model="emailCode" @complete="register" ref="pinInputRef" />
            </div>

            <n-button
              :loading="registerLoading"
              :disabled="!isEmailCodeComplete"
              tertiary
              style="color: #fff"
              class="w-full gradient-button"
              @click="register">
              {{ t('auth.register.actions.submit') }}
            </n-button>
          </n-flex>
        </n-flex>
      </div>
    </n-modal>
  </n-config-provider>
</template>

<script setup lang="ts">
import { getCurrentWebviewWindow, WebviewWindow } from '@tauri-apps/api/webviewWindow'
import dayjs from 'dayjs'
import { darkTheme, lightTheme, type FormInst } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import PinInput from '@/components/common/PinInput.vue'
import Validation from '@/components/common/Validation.vue'
import { useWindow } from '@/hooks/useWindow'
import type { RegisterUserReq } from '@/services/types.ts'
import { useSettingStore } from '@/stores/setting'
import * as ImRequestUtils from '@/utils/ImRequestUtils'
import { isMac, isWindows } from '@/utils/PlatformConstants'
import { validateAlphaNumeric, validateSpecialChar } from '@/utils/Validate'

// 输入框类型定义
type InputType = 'nickName' | 'email' | 'password' | 'confirmPassword'

const settingStore = useSettingStore()
const { themes } = storeToRefs(settingStore)
const naiveTheme = computed(() => (themes.value.content === 'dark' ? darkTheme : lightTheme))
const { t } = useI18n()

/** 注册信息 */
const info = unref(
  ref<RegisterUserReq>({
    avatar: '',
    email: '',
    password: '',
    nickName: '',
    code: '',
    uuid: '',
    key: 'REGISTER_EMAIL',
    confirmPassword: '',
    systemType: 2
  })
)

/** 确认密码 */
const confirmPassword = ref('')

/** 协议 */
const protocol = ref(true)
const btnEnable = ref(false)
const loading = ref(false)
const registerLoading = ref(false)

// 占位符
// 前缀显示状态
const showNamePrefix = ref(false)
const showemailPrefix = ref(false)
const showPasswordPrefix = ref(false)
const showConfirmPasswordPrefix = ref(false)
const { createModalWindow } = useWindow()
// 常用邮箱后缀
const commonEmailDomains = computed(() => {
  return ['gmail.com', '163.com', 'qq.com'].map((suffix) => {
    return {
      label: suffix,
      value: suffix
    }
  })
})

/** 发送验证码冷却时间(秒) */
const sendCodeCooldown = ref(0)
/** 验证码倒计时消息ID */
const EMAIL_TIMER_ID = 'register_window_email_timer'
/** 倒计时定时器 Worker */
const timerWorker = new Worker(new URL('@/workers/timer.worker.ts', import.meta.url))
/** 发送验证码按钮文本 */
const btnText = computed(() => {
  if (loading.value) {
    return t('auth.register.actions.sending')
  }
  if (sendCodeCooldown.value > 0) {
    return t('auth.register.actions.retry_in', { seconds: sendCodeCooldown.value })
  }
  return t('auth.register.actions.send_code')
})
// 使用day.js获取当前年份
const currentYear = dayjs().year()
const registerForm = ref<FormInst | null>(null)
const starTipsModal = ref(false)
const emailCodeModal = ref(false)

// 邮箱验证码PIN输入
const emailCode = ref('')
const pinInputRef = ref()
const isEmailCodeComplete = computed(() => emailCode.value.length === 6)
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const isEmailValid = computed(() => emailPattern.test(info.email.trim()))

// 校验规则
const rules = {
  nickName: {
    required: true,
    message: t('auth.register.form.rules.nickname_required'),
    trigger: 'blur'
  },
  email: {
    required: true,
    trigger: ['blur', 'input'],
    validator(_: unknown, value: string) {
      const email = (value || '').trim()
      if (!email) {
        return new Error(t('auth.register.form.rules.email_required'))
      }
      if (!emailPattern.test(email)) {
        return new Error(t('auth.register.form.rules.email_format'))
      }
      return true
    }
  },
  password: {
    required: true,
    message: t('auth.register.form.rules.password_required'),
    trigger: ['blur', 'input']
  },
  confirmPassword: {
    required: true,
    message: t('auth.register.form.rules.confirm_mismatch'),
    trigger: 'blur',
    validator() {
      if (confirmPassword.value !== info.password) {
        return false
      }
      return true
    }
  }
}

const getShow = (value: string) => {
  if (value.endsWith('@')) {
    return true
  }
  return false
}

/** 打开服务协议窗口 */
const openServiceAgreement = async () => {
  await createModalWindow(t('login.term.checkout.text2'), 'modal-serviceAgreement', 600, 600, 'login')
}

/** 打开隐私保护协议窗口 */
const openPrivacyAgreement = async () => {
  await createModalWindow(t('login.term.checkout.text4'), 'modal-privacyAgreement', 600, 600, 'login')
}

/** 不允许输入空格 */
const noSideSpace = (value: string) => !value.startsWith(' ') && !value.endsWith(' ')

/** 密码验证函数 */
const validateMinLength = (value: string) => value.length >= 6

/** 检查密码是否满足所有条件 */
const isPasswordValid = computed(() => {
  const password = info.password
  return validateMinLength(password) && validateAlphaNumeric(password) && validateSpecialChar(password)
})

/** 检查是否可以发送邮箱验证码 */
const canSendCode = computed(() => {
  return (
    !!info.nickName &&
    isPasswordValid.value &&
    confirmPassword.value === info.password &&
    protocol.value &&
    isEmailValid.value
  )
})

watchEffect(() => {
  btnEnable.value = loading.value || !canSendCode.value
})

/**
 * 处理输入框状态变化
 * @param type 输入框类型：name-昵称 / email-邮箱 / password-密码 / confirmPassword-确认密码
 * @param event 事件对象
 */
const handleInputState = (event: FocusEvent, type: InputType): void => {
  const prefixMap: Record<InputType, Ref<boolean>> = {
    nickName: showNamePrefix,
    email: showemailPrefix,
    password: showPasswordPrefix,
    confirmPassword: showConfirmPasswordPrefix
  }
  prefixMap[type].value = event.type === 'focus'
}

/** 处理步骤操作 */
const handleStepAction = async () => {
  if (btnEnable.value || loading.value) return

  try {
    await registerForm.value?.validate?.()
  } catch (error) {
    return
  }

  if (sendCodeCooldown.value > 0) {
    emailCodeModal.value = true
    nextTick(() => {
      pinInputRef.value?.focus()
    })
    return
  }

  loading.value = true
  try {
    const email = info.email.trim()
    info.email = email
    await ImRequestUtils.sendCaptcha({
      email,
      operationType: 'register',
      templateCode: 'REGISTER_EMAIL'
    })
    startSendCodeCountdown()
    window.$message.success(t('auth.register.messages.code_sent'))
    emailCodeModal.value = true
    emailCode.value = ''
    nextTick(() => {
      pinInputRef.value?.focus()
    })
  } catch (error) {
    console.error('发送验证码失败', error)
  } finally {
    loading.value = false
  }
}

const startSendCodeCountdown = () => {
  sendCodeCooldown.value = 60
  timerWorker.postMessage({
    type: 'startTimer',
    msgId: EMAIL_TIMER_ID,
    duration: 60 * 1000
  })
}

timerWorker.onmessage = (e) => {
  const { type, msgId, remainingTime } = e.data
  if (msgId !== EMAIL_TIMER_ID) return

  if (type === 'debug') {
    sendCodeCooldown.value = Math.max(0, Math.ceil(remainingTime / 1000))
  } else if (type === 'timeout') {
    sendCodeCooldown.value = 0
  }
}

timerWorker.onerror = () => {
  sendCodeCooldown.value = 0
}

/** 邮箱注册 */
const register = async () => {
  registerLoading.value = true

  // 合并验证码
  info.code = emailCode.value
  info.email = info.email.trim()

  try {
    // 随机生成头像编号
    const avatarNum = Math.floor(Math.random() * 21) + 1
    const avatarId = avatarNum.toString().padStart(3, '0')
    info.avatar = avatarId

    info.confirmPassword = confirmPassword.value

    // 注册
    await ImRequestUtils.register({ ...info })
    window.$message.success(t('auth.register.messages.register_success'))

    // 关闭弹窗并跳转到登录页
    emailCodeModal.value = false
    setTimeout(() => {
      WebviewWindow.getByLabel('login').then((win) => {
        win?.setFocus()
      })
      WebviewWindow.getCurrent().close()
    }, 1200)
  } catch (error) {
    window.$message.error(t('auth.register.messages.register_fail'))
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
  timerWorker.postMessage({
    type: 'clearTimer',
    msgId: EMAIL_TIMER_ID
  })
  timerWorker.terminate()
  sendCodeCooldown.value = 0
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

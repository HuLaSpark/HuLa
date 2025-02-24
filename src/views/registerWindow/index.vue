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
              :class="[{ 'pr-20px': info.name }, { 'pr-16px': showNamePrefix && !info.name }]"
              maxlength="8"
              minlength="1"
              size="large"
              v-model:value="info.name"
              type="text"
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

          <n-form-item path="account">
            <n-input
              :class="[{ 'pr-20px': info.account }, { 'pr-16px': showAccountPrefix && !info.account }]"
              size="large"
              maxlength="12"
              minlength="6"
              v-model:value="info.account"
              type="text"
              :allow-input="onlyAlphaNumeric"
              :placeholder="showAccountPrefix ? '' : placeholders.account"
              @focus="handleInputState($event, 'account')"
              @blur="handleInputState($event, 'account')"
              clearable>
              <template #prefix v-if="showAccountPrefix || info.account">
                <p class="text-12px">账号</p>
              </template>
            </n-input>
          </n-form-item>

          <n-form-item path="password">
            <n-input
              :class="{ 'pl-16px': !showPasswordPrefix && !info.password }"
              maxlength="16"
              minlength="6"
              size="large"
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
          @click="register()"
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
              <!-- <div
                @click="starTipsModal = false"
                class="border-(1px solid #999) cursor-pointer w-40px h-30px rounded-8px flex-center text-(12px [--text-color])">
                稍后
              </div> -->

              <a
                target="_blank"
                rel="noopener noreferrer"
                @click="starTipsModal = false"
                href="https://github.com/HuLaSpark/HuLa"
                class="bg-#363636 cursor-pointer w-70px h-30px rounded-8px flex-center text-(12px #f1f1f1) outline-none no-underline">
                点亮星标
              </a>
            </n-flex>
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

// 输入框类型定义
type InputType = 'name' | 'account' | 'password'

/** 账号信息 */
const info = unref(
  ref<RegisterUserReq>({
    avatar: '',
    account: '',
    password: '',
    name: ''
  })
)

/** 协议 */
const protocol = ref(true)
const btnEnable = ref(false)
const loading = ref(false)

// 占位符
const placeholders: Record<InputType, string> = {
  name: '输入HuLa昵称',
  account: '输入HuLa账号',
  password: '输入HuLa密码'
} as const

// 前缀显示状态
const showNamePrefix = ref(false)
const showAccountPrefix = ref(false)
const showPasswordPrefix = ref(false)

/** 登录按钮的文本内容 */
const btnText = ref('注册')
// 使用day.js获取当前年份
const currentYear = dayjs().year()
const registerForm = ref()
const starTipsModal = ref(false)
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
  const password = info.password
  return validateMinLength(password) && validateAlphaNumeric(password) && validateSpecialChar(password)
})

/**
 * 处理输入框状态变化
 * @param type 输入框类型：name-昵称 / account-账号 / password-密码
 * @param event 事件对象
 */
const handleInputState = (event: FocusEvent, type: InputType): void => {
  const prefixMap: Record<InputType, Ref<boolean>> = {
    name: showNamePrefix,
    account: showAccountPrefix,
    password: showPasswordPrefix
  }
  prefixMap[type].value = event.type === 'focus'
}

/** 注册账号 */
const register = async () => {
  btnEnable.value = true
  loading.value = true
  btnText.value = '注册中...'

  setTimeout(() => {
    // 随机生成头像编号
    const avatarNum = Math.floor(Math.random() * 21) + 1
    const avatarId = avatarNum.toString().padStart(3, '0')
    info.avatar = avatarId
    // 更新按钮文本
    btnText.value = '正在分配默认头像...'

    setTimeout(() => {
      // 注册
      apis
        .register({ ...info })
        .then(() => {
          window.$message.success('注册成功')
          btnText.value = '注册'
          setTimeout(() => {
            WebviewWindow.getByLabel('login').then((win) => {
              win?.setFocus()
            })
            WebviewWindow.getCurrent().close()
          }, 1200)
        })
        .finally(() => {
          loading.value = false
          btnEnable.value = false
          btnText.value = '注册'
        })
    }, 800)
  }, 600)
}

watchEffect(() => {
  btnEnable.value = !(info.account && isPasswordValid.value && protocol.value)
})

onMounted(async () => {
  await getCurrentWebviewWindow().show()
  await nextTick(() => {
    starTipsModal.value = true
  })
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

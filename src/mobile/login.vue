<template>
  <n-config-provider :theme="lightTheme" class="login-bg flex-col-center gap-40px h-100vh">
    <div class="absolute top-13vh left-36px flex-center">
      <p class="text-(20px #333)">HI, 欢迎来到</p>
      <img src="@/assets/mobile/2.svg" alt="" class="w-80px h-20px" />
    </div>

    <!-- 选项卡导航 -->
    <div class="w-80% h-40px absolute top-20vh flex-center">
      <div class="flex w-200px relative">
        <div
          @click="activeTab = 'login'"
          :class="[
            'z-999 w-100px text-center transition-all duration-300 ease-out',
            activeTab === 'login' ? 'text-(18px #000)' : 'text-(16px #666)'
          ]">
          登录
        </div>
        <div
          @click="activeTab = 'register'"
          :class="[
            'z-999 w-100px text-center transition-all duration-300 ease-out',
            activeTab === 'register' ? 'text-(18px #000)' : 'text-(16px #666)'
          ]">
          注册
        </div>
        <!-- 选中条 -->
        <div
          style="border-radius: 24px 42px 4px 24px"
          :class="[
            'z-10 absolute bottom--4px h-6px w-34px bg-#13987f transition-all duration-300 ease-out',
            activeTab === 'login' ? 'left-[33px]' : 'left-[133px]'
          ]"></div>
      </div>
    </div>

    <!-- 头像 -->
    <img v-if="activeTab === 'login'" :src="userInfo.avatar" alt="logo" class="size-86px rounded-full" />

    <!-- 登录表单 -->
    <n-flex v-if="activeTab === 'login'" class="text-center w-80%" vertical :size="16">
      <n-input
        :class="{ 'pl-22px': loginHistories.length > 0 }"
        size="large"
        v-model:value="userInfo.account"
        type="text"
        spellCheck="false"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        :placeholder="accountPH"
        @focus="accountPH = ''"
        @blur="accountPH = '输入HuLa账号'"
        clearable>
        <template #suffix>
          <n-flex v-if="loginHistories.length > 0" @click="arrowStatus = !arrowStatus">
            <svg v-if="!arrowStatus" class="down w-18px h-18px color-#505050">
              <use href="#down"></use>
            </svg>
            <svg v-else class="down w-18px h-18px color-#505050"><use href="#up"></use></svg>
          </n-flex>
        </template>
      </n-input>

      <!-- 账号选择框-->
      <div
        style="border: 1px solid rgba(70, 70, 70, 0.1)"
        v-if="loginHistories.length > 0 && arrowStatus"
        class="account-box absolute w-80% max-h-140px bg-#fdfdfd mt-45px z-99 rounded-8px p-8px box-border">
        <n-scrollbar style="max-height: 120px" trigger="none">
          <n-flex
            vertical
            v-for="item in loginHistories"
            :key="item.account"
            @click="giveAccount(item)"
            class="p-8px hover:bg-#f3f3f3 hover:rounded-6px">
            <div class="flex-between-center">
              <n-avatar :src="AvatarUtils.getAvatarUrl(item.avatar)" class="size-28px bg-#ccc rounded-50%" />
              <p class="text-14px color-#505050">{{ item.account }}</p>
              <svg @click.stop="delAccount(item)" class="w-12px h-12px">
                <use href="#close"></use>
              </svg>
            </div>
          </n-flex>
        </n-scrollbar>
      </div>

      <n-input
        class="pl-22px mt-8px"
        size="large"
        show-password-on="click"
        v-model:value="userInfo.password"
        type="password"
        spellCheck="false"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        :placeholder="passwordPH"
        @focus="passwordPH = ''"
        @blur="passwordPH = '输入HuLa密码'"
        clearable />

      <n-flex justify="flex-end" :size="6">
        <n-button text color="#13987f" @click="handleForgetPassword">忘记密码</n-button>
      </n-flex>

      <n-button
        :loading="loading"
        :disabled="loginDisabled"
        tertiary
        style="color: #fff"
        class="w-full mt-8px mb-50px gradient-button"
        @click="normalLogin(false)">
        <span>{{ loginText }}</span>
      </n-button>

      <!-- 协议 -->
      <n-flex
        align="center"
        justify="center"
        :style="isAndroid() ? { bottom: safeArea.bottom + 10 + 'px' } : {}"
        :size="6"
        class="absolute bottom-0 w-[80%]">
        <n-checkbox v-model:checked="protocol" />
        <div class="text-12px color-#909090 cursor-default lh-14px">
          <span>已阅读并同意</span>
          <span class="color-#13987f">服务协议</span>
          <span>和</span>
          <span class="color-#13987f">HuLa隐私保护指引</span>
        </div>
      </n-flex>
    </n-flex>

    <!-- 注册表单 - 第一步：昵称和密码 -->
    <n-flex v-if="activeTab === 'register' && currentStep === 1" class="text-center w-80%" vertical :size="16">
      <n-input
        size="large"
        maxlength="8"
        minlength="1"
        v-model:value="registerInfo.nickName"
        type="text"
        spellCheck="false"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        :allow-input="noSideSpace"
        :placeholder="registerNamePH"
        @focus="registerNamePH = ''"
        @blur="registerNamePH = '输入HuLa昵称'"
        clearable />

      <n-input
        class="pl-16px"
        size="large"
        minlength="6"
        show-password-on="click"
        v-model:value="registerInfo.password"
        type="password"
        spellCheck="false"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        :allow-input="noSideSpace"
        :placeholder="registerPasswordPH"
        @focus="registerPasswordPH = ''"
        @blur="registerPasswordPH = '设置密码'"
        clearable />

      <n-input
        class="pl-16px"
        size="large"
        minlength="6"
        show-password-on="click"
        v-model:value="registerInfo.confirmPassword"
        type="password"
        spellCheck="false"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        :allow-input="noSideSpace"
        :placeholder="confirmPasswordPH"
        @focus="confirmPasswordPH = ''"
        @blur="confirmPasswordPH = '确认密码'"
        clearable />

      <!-- 密码提示信息 -->
      <n-flex vertical v-if="registerInfo.password" :size="10" class="mt-8px">
        <Validation :value="registerInfo.password" message="最少6位" :validator="validateMinLength" />
        <Validation :value="registerInfo.password" message="由英文和数字构成" :validator="validateAlphaNumeric" />
        <Validation :value="registerInfo.password" message="必须有一个特殊字符" :validator="validateSpecialChar" />
      </n-flex>

      <!-- 协议 -->
      <n-flex align="center" justify="center" :size="6" class="mt-10px">
        <n-checkbox v-model:checked="registerProtocol" />
        <div class="text-12px color-#909090 cursor-default lh-14px">
          <span>已阅读并同意</span>
          <span class="color-#13987f">服务协议</span>
          <span>和</span>
          <span class="color-#13987f">HuLa隐私保护指引</span>
        </div>
      </n-flex>

      <n-button
        :loading="registerLoading"
        :disabled="!isStep1Valid"
        tertiary
        style="color: #fff"
        class="w-full mt-8px mb-50px gradient-button"
        @click="handleRegisterStep">
        <span>下一步</span>
      </n-button>
    </n-flex>

    <!-- 注册表单 - 第二步：邮箱和图片验证码 -->
    <n-flex v-if="activeTab === 'register' && currentStep === 2" class="text-center w-80%" vertical :size="16">
      <n-auto-complete
        size="large"
        v-model:value="registerInfo.email"
        :placeholder="registerEmailPH"
        :options="commonEmailDomains"
        :get-show="getShow"
        clearable
        type="text"
        @focus="registerEmailPH = ''"
        @blur="registerEmailPH = '输入邮箱'" />

      <!-- 图片验证码 -->
      <div class="flex justify-between items-center gap-10px">
        <n-input
          size="large"
          maxlength="6"
          v-model:value="registerInfo.code"
          type="text"
          spellCheck="false"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          :allow-input="noSideSpace"
          :placeholder="registerCodePH"
          @focus="registerCodePH = ''"
          @blur="registerCodePH = '输入验证码'"
          clearable />

        <n-image
          width="120"
          height="40"
          class="rounded-8px flex-shrink-0"
          :src="captcha.base64"
          preview-disabled
          @click="getVerifyCode">
          <template #placeholder>
            <n-skeleton height="40px" width="120px" class="rounded-8px" />
          </template>
        </n-image>
      </div>

      <n-button
        :loading="registerLoading"
        :disabled="!isStep2Valid"
        tertiary
        style="color: #fff"
        class="w-full mt-8px mb-50px gradient-button"
        @click="handleRegisterStep">
        <span>发送验证码</span>
      </n-button>
    </n-flex>

    <!-- 邮箱验证码输入弹窗 -->
    <n-modal
      v-model:show="emailCodeModal"
      :mask-closable="true"
      @click="emailCodeModal = false"
      class="rounded-8px"
      transform-origin="center">
      <div class="bg-#fdfdfd w-320px h-fit box-border flex flex-col rounded-8px">
        <n-flex vertical class="w-full h-fit">
          <n-flex vertical :size="10" class="p-20px">
            <p class="text-(16px #333) mb-10px">请输入邮箱验证码</p>
            <p class="text-(12px #666) leading-5 mb-10px">
              验证码已发送至 {{ registerInfo.email }}，请查收并输入验证码完成注册
            </p>

            <!-- PIN 输入框 -->
            <div class="mb-20px">
              <PinInput
                v-model="emailCode"
                @complete="handleRegisterComplete"
                :size="'40px'"
                ref="pinInputRef"
                input-class="bg-#f5f5f5 border-#e0e0e0" />
            </div>

            <n-button
              :loading="finalRegisterLoading"
              :disabled="!isEmailCodeComplete"
              tertiary
              style="color: #fff; margin-bottom: 0"
              class="w-full mt-8px mb-50px gradient-button"
              @click="handleRegisterComplete">
              注册
            </n-button>
          </n-flex>
        </n-flex>
      </div>
    </n-modal>
  </n-config-provider>
</template>

<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core'
import { emit } from '@tauri-apps/api/event'
import { info } from '@tauri-apps/plugin-log'
import { debounce } from 'lodash-es'
import { lightTheme } from 'naive-ui'
import { ErrorType } from '@/common/exception'
import PinInput from '@/components/common/PinInput.vue'
import Validation from '@/components/common/Validation.vue'
import { TauriCommand } from '@/enums'
import router from '@/router'
import { getEnhancedFingerprint } from '@/services/fingerprint'
import type { RegisterUserReq, UserInfoType } from '@/services/types'
import rustWebSocketClient from '@/services/webSocketRust'
import { useLoginHistoriesStore } from '@/stores/loginHistory.ts'
import { useMobileStore } from '@/stores/mobile'
import { useUserStore } from '@/stores/user'
import { useUserStatusStore } from '@/stores/userStatus'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { getAllUserState, getCaptcha, getUserDetail, register, sendCaptcha } from '@/utils/ImRequestUtils'
import { isAndroid } from '@/utils/PlatformConstants'
import { invokeWithErrorHandler } from '@/utils/TauriInvokeHandler'
import { useCheckUpdate } from '../hooks/useCheckUpdate'
import { useLogin } from '../hooks/useLogin'
import { useMitt } from '../hooks/useMitt'
import { WsResponseMessageType } from '../services/wsType'
import { useChatStore } from '../stores/chat'
import { useConfigStore } from '../stores/config'
import { useGlobalStore } from '../stores/global'
import { useGroupStore } from '../stores/group'
import { useSettingStore } from '../stores/setting'
import { clearListener } from '../utils/ReadCountQueue'

// 本地注册信息类型，扩展API类型以包含确认密码
interface LocalRegisterInfo extends RegisterUserReq {}

const loginHistoriesStore = useLoginHistoriesStore()
const userStore = useUserStore()
const { loginHistories } = loginHistoriesStore
const mobileStore = useMobileStore()
const safeArea = computed(() => mobileStore.safeArea)
const { setLoginState } = useLogin()
const settingStore = useSettingStore()
const { login } = storeToRefs(settingStore)
const userStatusStore = useUserStatusStore()
const { stateId } = storeToRefs(userStatusStore)

const isJumpDirectly = ref(false)

/** 当前激活的选项卡 */
const activeTab = ref<'login' | 'register'>('login')

/** 当前注册步骤 */
const currentStep = ref(1)

/** 登录账号信息 */
const userInfo = ref({
  account: '',
  password: '',
  avatar: '/logo.png',
  nickName: '',
  uid: ''
})

/** 注册账号信息 */
const registerInfo = ref<LocalRegisterInfo>({
  nickName: '',
  email: '',
  password: '',
  confirmPassword: '',
  code: '',
  uuid: '',
  avatar: '',
  key: 'REGISTER_EMAIL',
  systemType: 2
})

// 登录相关的占位符和状态
const accountPH = ref('输入HuLa账号')
const passwordPH = ref('输入HuLa密码')
const protocol = ref(true)
const loginDisabled = ref(false)
const loading = ref(false)
const arrowStatus = ref(false)
const loginText = ref('登录')

// 注册相关的占位符和状态
const registerNamePH = ref('输入HuLa昵称')
const registerEmailPH = ref('输入邮箱')
const registerPasswordPH = ref('设置密码')
const confirmPasswordPH = ref('确认密码')
const registerCodePH = ref('输入验证码')
const registerProtocol = ref(true)
const registerLoading = ref(false)
const finalRegisterLoading = ref(false)

/** 验证码 */
const captcha = ref({ base64: '', uuid: '' })

/** 邮箱验证码模态框 */
const emailCodeModal = ref(false)
const emailCode = ref('')
const pinInputRef = ref()

// 常用邮箱后缀
const commonEmailDomains = computed(() => {
  return ['@gmail.com', '@163.com', '@qq.com'].map((suffix) => {
    const prefix = registerInfo.value.email.split('@')[0]
    return {
      label: prefix + suffix,
      value: prefix + suffix
    }
  })
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
const validateSpecialChar = (value: string) => /[!@#¥$%.&*^()_+=-~]/.test(value)

/** 检查密码是否满足所有条件 */
const isPasswordValid = computed(() => {
  const password = registerInfo.value.password
  return validateMinLength(password) && validateAlphaNumeric(password) && validateSpecialChar(password)
})

/** 检查第一步是否可以继续 */
const isStep1Valid = computed(() => {
  return (
    registerInfo.value.nickName &&
    isPasswordValid.value &&
    registerInfo.value.confirmPassword === registerInfo.value.password &&
    registerProtocol.value
  )
})

/** 检查第二步是否可以继续 */
const isStep2Valid = computed(() => {
  return registerInfo.value.email && registerInfo.value.code
})

/** 检查邮箱验证码是否完整 */
const isEmailCodeComplete = computed(() => emailCode.value.length === 6)

const getShow = (value: string) => {
  if (value.endsWith('@')) {
    return true
  }
  return false
}

// 监听登录表单变化
watchEffect(() => {
  loginDisabled.value = !(userInfo.value.account && userInfo.value.password && protocol.value)
  // 清空账号的时候设置默认头像
  if (!userInfo.value.account) {
    userInfo.value.avatar = '/logo.png'
  }
})

// 监听选项卡切换，重置状态
watch(activeTab, (newTab) => {
  if (newTab === 'login') {
    // 切换到登录时重置注册状态
    resetRegisterForm()
  } else {
    // 切换到注册时重置登录表单
    resetLoginForm()
  }
})

/** 重置登录表单 */
const resetLoginForm = () => {
  userInfo.value = {
    account: '',
    password: '',
    avatar: '',
    nickName: '',
    uid: ''
  }
  accountPH.value = '输入HuLa账号'
  passwordPH.value = '输入HuLa密码'
  arrowStatus.value = false
}

/** 重置注册表单 */
const resetRegisterForm = () => {
  registerInfo.value = {
    nickName: '',
    email: '',
    password: '',
    confirmPassword: '',
    code: '',
    uuid: '',
    avatar: ''
  } as LocalRegisterInfo
  currentStep.value = 1
  registerNamePH.value = '输入HuLa昵称'
  registerEmailPH.value = '输入邮箱'
  registerPasswordPH.value = '设置密码'
  confirmPasswordPH.value = '确认密码'
  registerCodePH.value = '输入验证码'
  emailCode.value = ''
  emailCodeModal.value = false
}

/**
 * 获取验证码
 */
const getVerifyCode = async () => {
  try {
    const { img, uuid } = await getCaptcha()
    captcha.value = { base64: img, uuid }
  } catch (error) {
    // 处理错误
  }
}

/** 处理注册步骤 */
const handleRegisterStep = async () => {
  if (currentStep.value === 1) {
    // 进入第二步
    currentStep.value = 2
    // 获取验证码
    await getVerifyCode()
  } else if (currentStep.value === 2) {
    // 发送邮箱验证码
    registerLoading.value = true
    try {
      await sendCaptcha({
        email: registerInfo.value.email,
        uuid: captcha.value.uuid.toString(),
        templateCode: 'REGISTER_EMAIL'
      })

      registerLoading.value = false
      // 显示邮箱验证码输入弹窗
      emailCodeModal.value = true
      emailCode.value = ''

      // 聚焦第一个输入框
      nextTick(() => {
        if (pinInputRef.value) {
          pinInputRef.value.focus()
        }
      })
    } catch (error) {
      registerLoading.value = false
    }
  }
}

/** 完成注册 */
const handleRegisterComplete = async () => {
  finalRegisterLoading.value = true

  try {
    // 合并验证码
    registerInfo.value.code = emailCode.value
    registerInfo.value.uuid = captcha.value.uuid

    // 随机生成头像编号
    const avatarNum = Math.floor(Math.random() * 21) + 1
    const avatarId = avatarNum.toString().padStart(3, '0')
    registerInfo.value.avatar = avatarId

    // 注册 - 只传递API需要的字段
    const { ...apiRegisterInfo } = registerInfo.value
    await register(apiRegisterInfo)

    // 关闭弹窗并切换到登录页面
    emailCodeModal.value = false
    activeTab.value = 'login'
    userInfo.value.account = registerInfo.value.nickName || registerInfo.value.email

    window.$message.success('注册成功')

    // 重置注册表单
    resetRegisterForm()
  } catch (error) {
    // 处理注册失败
  } finally {
    finalRegisterLoading.value = false
  }
}

const configStore = useConfigStore()
const chatStore = useChatStore()
const groupStore = useGroupStore()
const globalStore = useGlobalStore()

const initData = async () => {
  info('init all data')
  const cachedConfig = localStorage.getItem('config')
  if (cachedConfig) {
    configStore.config = JSON.parse(cachedConfig).config
  } else {
    await configStore.initConfig()
  }
  // 加载所有会话
  await chatStore.getSessionList(true)
  // 设置全局会话为第一个
  globalStore.currentSessionRoomId = chatStore.sessionList[0].roomId

  // 加载所有群的成员数据
  const groupSessions = chatStore.getGroupSessions()
  await Promise.all([
    ...groupSessions.map((session) => groupStore.getGroupUserList(session.roomId, true)),
    groupStore.setGroupDetails(),
    chatStore.setAllSessionMsgList(1)
  ])
  info('init all data complete')
}

/**登录后创建主页窗口*/
const normalLogin = async (auto = false) => {
  loading.value = true
  loginText.value = '登录中...'
  loginDisabled.value = true
  // 根据auto参数决定从哪里获取登录信息
  const loginInfo = auto ? (userStore.userInfo as UserInfoType) : userInfo.value
  const { account } = loginInfo

  const clientId = await getEnhancedFingerprint()
  localStorage.setItem('clientId', clientId)

  await invoke('login_command', {
    data: {
      account: account,
      password: userInfo.value.password,
      deviceType: 'MOBILE',
      systemType: '2', // 2是im 1是后台
      clientId,
      grantType: 'PASSWORD',
      isAutoLogin: auto,
      uid: auto ? userStore.userInfo!.uid : null
    }
  })
    .then(async (res: any) => {
      settingStore.toggleLogin(true, false)
      loginDisabled.value = true
      console.log('登录成功')
      window.$message.success('登录成功')
      // 开启 ws 连接
      await rustWebSocketClient.initConnect()
      // 初始化数据
      await initData()
      // 登录处理
      await loginProcess(res.token, res.refreshToken, res.client)
    })
    .catch((e: any) => {
      console.error('登录失败，出现未知错误:', e)
      if (e) {
        window.$message.warning(e)
      } else {
        window.$message.warning('登录失败，出现未知错误')
      }

      loading.value = false
      loginDisabled.value = false
      loginText.value = '登录'
      // 如果是自动登录失败，重置按钮状态允许手动登录
      if (auto) {
        loginDisabled.value = false
        loginText.value = '登录'
      }
    })
}

const loginProcess = async (token: string, refreshToken: string, client: string) => {
  loading.value = false
  // 获取用户状态列表
  if (userStatusStore.stateList.length === 0) {
    try {
      userStatusStore.stateList = await getAllUserState()
    } catch (error) {
      console.error('获取用户状态列表失败', error)
    }
  }
  // 获取用户详情
  // const userDetail = await apis.getUserDetail()
  const userDetail: any = await getUserDetail()

  // 设置用户状态id
  stateId.value = userDetail.userStateId
  // const token = localStorage.getItem('TOKEN')
  // const refreshToken = localStorage.getItem('REFRESH_TOKEN')
  // TODO 先不获取 emoji 列表，当我点击 emoji 按钮的时候再获取
  // await emojiStore.getEmojiList()
  const account = {
    ...userDetail,
    token,
    refreshToken,
    client
  }
  userStore.userInfo = account
  loginHistoriesStore.addLoginHistory(account)
  // 在 sqlite 中存储用户信息
  await invokeWithErrorHandler(
    TauriCommand.SAVE_USER_INFO,
    {
      userInfo: userDetail
    },
    {
      customErrorMessage: '保存用户信息失败',
      errorType: ErrorType.Client
    }
  )

  // 在 rust 部分设置 token
  await emit('set_user_info', {
    token,
    refreshToken,
    uid: userDetail.uid
  })

  loginText.value = '登录成功正在跳转...'
  await setLoginState()

  router.push('/mobile/message')
}

/**
 * 给账号赋值
 * @param item 账户信息
 * */
const giveAccount = (item: UserInfoType) => {
  const { account, avatar, name, uid } = item
  userInfo.value.account = account || ''
  userInfo.value.avatar = avatar
  userInfo.value.nickName = name
  userInfo.value.uid = uid
  arrowStatus.value = false
}

/** 删除账号列表内容 */
const delAccount = (item: UserInfoType) => {
  // 获取删除前账户列表的长度
  const lengthBeforeDelete = loginHistories.length
  loginHistoriesStore.removeLoginHistory(item)
  // 判断是否删除了最后一个条目，并据此更新arrowStatus
  if (lengthBeforeDelete === 1 && loginHistories.length === 0) {
    arrowStatus.value = false
  }
  userInfo.value.account = ''
  userInfo.value.password = ''
  userInfo.value.avatar = '/logo.png'
}

const handleForgetPassword = () => {
  router.push('/mobile/forget-password')
}

const closeMenu = (event: MouseEvent) => {
  const target = event.target as Element
  if (!target.matches('.account-box, .account-box *, .down')) {
    arrowStatus.value = false
  }
}

onBeforeMount(async () => {
  // const token = localStorage.getItem('TOKEN')
  // const refreshToken = localStorage.getItem('REFRESH_TOKEN')

  if (!login.value.autoLogin) {
    localStorage.removeItem('TOKEN')
    localStorage.removeItem('REFRESH_TOKEN')
    clearListener()
    return
  }

  // 只有在非自动登录的情况下才验证token并直接打开主窗口
  // if (token && refreshToken && !login.value.autoLogin) {
  //   isJumpDirectly.value = true
  //   try {
  //     // await openHomeWindow()
  //     return // 直接返回，不执行后续的登录相关逻辑
  //   } catch (error) {
  //     isJumpDirectly.value = false
  //     // token无效，清除token并重置状态
  //     localStorage.removeItem('TOKEN')
  //     localStorage.removeItem('REFRESH_TOKEN')
  //     userStore.userInfo = undefined
  //   }
  // }
})

const { checkUpdate } = useCheckUpdate()
onMounted(async () => {
  window.addEventListener('click', closeMenu, true)
  console.log('新的', userStore)
  // const uid = userStore.userInfo?.uid

  // 只有在需要登录的情况下才显示登录窗口
  if (isJumpDirectly.value) {
    loading.value = false
    router.push('/mobile/message')
    return
  }

  useMitt.on(WsResponseMessageType.NO_INTERNET, () => {
    loginDisabled.value = true
    loginText.value = '服务异常断开'
  })

  if (login.value.autoLogin) {
    normalLogin(true)
  } else {
    loginHistories.length > 0 && giveAccount(loginHistories[0])
  }

  await checkUpdate('login', true)

  // 如果找到uid就自动登录，找不到就手动登录
  // if (uid) {
  //   loading.value = true
  //   await loginCommand({ uid }, true).then(() => {
  //     setTimeout(() => {
  //       loading.value = false
  //       router.push('/mobile/message')
  //     }, 100)
  //   })
  // }
})

onUnmounted(() => {
  window.removeEventListener('click', closeMenu, true)
})

const refreshAvatar = debounce((newAccount: string) => {
  const matchedAccount = loginHistories.find(
    (history) => history.account === newAccount || history.email === newAccount
  )
  if (matchedAccount) {
    userInfo.value.avatar = AvatarUtils.getAvatarUrl(matchedAccount.avatar)
  } else {
    userInfo.value.avatar = '/logo.png'
  }
}, 300)

// 监听账号输入
watch(
  () => userInfo.value.account,
  (newAccount) => {
    if (!newAccount) {
      userInfo.value.avatar = '/logo.png'
      return
    }

    refreshAvatar(newAccount)
  }
)
</script>

<style scoped lang="scss">
@use '@/styles/scss/login';
.login-bg {
  background-image: url('@/assets/mobile/1.webp');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
</style>

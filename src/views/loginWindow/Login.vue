<template>
  <!-- 单独使用n-config-provider来包裹不需要主题切换的界面 -->
  <n-config-provider :theme="lightTheme" data-tauri-drag-region class="login-box size-full rounded-8px select-none">
    <!--顶部操作栏-->
    <ActionBar :max-w="false" :shrink="false" proxy />

    <!--  手动登录样式  -->
    <n-flex vertical :size="25" v-if="!login.autoLogin || !TOKEN || !isAutoLogin">
      <!-- 头像 -->
      <n-flex justify="center" class="w-full pt-35px" data-tauri-drag-region>
        <n-avatar
          class="size-80px rounded-50% bg-#90909090 border-(2px solid #fff)"
          :src="AvatarUtils.getAvatarUrl(info.avatar || '/logo.png')" />
      </n-flex>

      <!-- 登录菜单 -->
      <n-flex class="ma text-center h-full w-260px" vertical :size="16">
        <n-input
          :class="{ 'pl-16px': loginHistories.length > 0 }"
          size="large"
          v-model:value="info.account"
          type="text"
          :placeholder="accountPH"
          @focus="accountPH = ''"
          @blur="accountPH = '邮箱/HuLa账号'"
          spellCheck="false"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          clearable>
          <template #suffix>
            <n-flex v-if="loginHistories.length > 0" @click="arrowStatus = !arrowStatus">
              <svg v-if="!arrowStatus" class="down w-18px h-18px color-#505050 cursor-pointer">
                <use href="#down"></use>
              </svg>
              <svg v-else class="down w-18px h-18px color-#505050 cursor-pointer"><use href="#up"></use></svg>
            </n-flex>
          </template>
        </n-input>

        <!-- 账号选择框-->
        <div
          style="border: 1px solid rgba(70, 70, 70, 0.1)"
          v-if="loginHistories.length > 0 && arrowStatus"
          class="account-box absolute w-260px max-h-140px bg-#fdfdfd mt-45px z-99 rounded-8px p-8px box-border">
          <n-scrollbar style="max-height: 120px" trigger="none">
            <n-flex
              vertical
              v-for="item in loginHistories"
              :key="item.account"
              @click="giveAccount(item)"
              class="p-8px cursor-pointer hover:bg-#f3f3f3 hover:rounded-6px">
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
          class="pl-16px"
          maxlength="16"
          minlength="6"
          size="large"
          show-password-on="click"
          v-model:value="info.password"
          type="password"
          spellCheck="false"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
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
          :disabled="loginDisabled"
          class="w-full mt-8px mb-50px"
          @click="normalLogin()"
          color="#13987f">
          <span>{{ loginText }}</span>
        </n-button>
      </n-flex>
    </n-flex>

    <!-- 自动登录样式 -->
    <n-flex v-else vertical :size="29" data-tauri-drag-region>
      <n-flex justify="center" class="mt-15px">
        <img src="@/assets/logo/hula.png" class="w-140px h-60px" alt="" />
      </n-flex>
      <n-flex :size="30" vertical>
        <!-- 头像 -->
        <n-flex justify="center">
          <n-avatar
            round
            :size="110"
            :color="'#fff'"
            class="border-(2px solid #fff)"
            :src="AvatarUtils.getAvatarUrl(userStore.userInfo.avatar || '/logo.png')" />
        </n-flex>

        <n-flex justify="center">
          <n-ellipsis style="max-width: 200px" class="text-18px">{{ userStore.userInfo.name }}</n-ellipsis>
        </n-flex>
      </n-flex>

      <n-flex justify="center">
        <n-button
          :loading="loading"
          :disabled="loginDisabled"
          class="w-200px mt-12px mb-40px"
          @click="normalLogin(true)"
          color="#13987f">
          {{ loginText }}
        </n-button>
      </n-flex>
    </n-flex>

    <!-- 底部操作栏 -->
    <n-flex justify="center" class="text-14px" id="bottomBar">
      <div class="color-#13987f cursor-pointer" @click="router.push('/qrCode')">扫码登录</div>
      <div class="w-1px h-14px bg-#ccc"></div>
      <div v-if="login.autoLogin && TOKEN" class="color-#13987f cursor-pointer" @click="removeToken">移除账号</div>
      <n-popover
        v-else
        trigger="click"
        id="moreShow"
        v-model:show="moreShow"
        :show-checkmark="false"
        :show-arrow="false">
        <template #trigger>
          <div class="color-#13987f cursor-pointer">更多选项</div>
        </template>
        <n-flex vertical :size="2">
          <div
            class="text-14px cursor-pointer hover:bg-#f3f3f3 hover:rounded-6px p-8px"
            @click="createWebviewWindow('注册', 'register', 600, 600)">
            注册账号
          </div>
          <div
            class="text-14px cursor-pointer hover:bg-#f3f3f3 hover:rounded-6px p-8px"
            @click="createWebviewWindow('忘记密码', 'forgetPassword', 600, 600)">
            忘记密码
          </div>
          <div
            v-if="!isCompatibility"
            @click="router.push('/network')"
            class="text-14px cursor-pointer hover:bg-#f3f3f3 hover:rounded-6px p-8px">
            网络设置
          </div>
        </n-flex>
      </n-popover>
    </n-flex>
  </n-config-provider>
</template>
<script setup lang="ts">
import router from '@/router'
import { useWindow } from '@/hooks/useWindow.ts'
import { lightTheme } from 'naive-ui'
import { useLogin } from '@/hooks/useLogin.ts'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useLoginHistoriesStore } from '@/stores/loginHistory.ts'
import apis from '@/services/apis.ts'
import { useUserStore } from '@/stores/user.ts'
import { UserInfoType } from '@/services/types.ts'
import { useSettingStore } from '@/stores/setting.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { useMitt } from '@/hooks/useMitt'
import { WsResponseMessageType } from '@/services/wsType'
import { useNetwork } from '@vueuse/core'
import { useUserStatusStore } from '@/stores/userStatus'
import { clearListener } from '@/utils/ReadCountQueue'
import { useGlobalStore } from '@/stores/global'
import { type } from '@tauri-apps/plugin-os'
import { useCheckUpdate } from '@/hooks/useCheckUpdate'

const isCompatibility = computed(() => type() === 'windows' || type() === 'linux')
const settingStore = useSettingStore()
const userStore = useUserStore()
const userStatusStore = useUserStatusStore()
const globalStore = useGlobalStore()
const { isTrayMenuShow } = storeToRefs(globalStore)
const { stateId } = storeToRefs(userStatusStore)
/** 网络连接是否正常 */
const { isOnline } = useNetwork()
const loginHistoriesStore = useLoginHistoriesStore()
const { loginHistories } = loginHistoriesStore
const { login } = storeToRefs(settingStore)
const TOKEN = ref(localStorage.getItem('TOKEN'))
const REFRESH_TOKEN = ref(localStorage.getItem('REFRESH_TOKEN'))
/** 账号信息 */
const info = ref({
  account: '',
  password: '',
  avatar: '',
  name: '',
  uid: ''
})
/** 协议 */
const protocol = ref(true)
const loginDisabled = ref(!isOnline.value)
const loading = ref(false)
const arrowStatus = ref(false)
const moreShow = ref(false)
const isAutoLogin = ref(login.value.autoLogin && TOKEN.value && REFRESH_TOKEN.value)
const { setLoginState } = useLogin()
const { createWebviewWindow } = useWindow()
const { checkUpdate, CHECK_UPDATE_LOGIN_TIME } = useCheckUpdate()

const accountPH = ref('邮箱/HuLa账号')
const passwordPH = ref('输入HuLa密码')
/** 登录按钮的文本内容 */
const loginText = ref(isOnline.value ? (isAutoLogin.value ? '登录' : '登录') : '网络异常')
/** 是否直接跳转 */
const isJumpDirectly = ref(false)

// 导入Web Worker
const timerWorker = new Worker(new URL('../../workers/timer.worker.ts', import.meta.url))

// 添加错误处理
timerWorker.onerror = (error) => {
  console.error('[Worker Error]', error)
}

// 监听 Worker 消息
timerWorker.onmessage = (e) => {
  const { type } = e.data
  if (type === 'timeout') {
    checkUpdate('login')
  }
}

watchEffect(() => {
  loginDisabled.value = !(info.value.account && info.value.password && protocol.value && isOnline.value)
})

watch(isOnline, (v) => {
  loginDisabled.value = !v
  loginText.value = v ? (isAutoLogin.value ? '登录' : '登录') : '网络异常'
})

// 监听账号输入
watch(
  () => info.value.account,
  (newAccount) => {
    if (!newAccount) {
      info.value.avatar = '/logo.png'
      return
    }

    // 在登录历史中查找匹配的账号
    const matchedAccount = loginHistories.find(
      (history) => history.account === newAccount || history.email === newAccount
    )
    if (matchedAccount) {
      info.value.avatar = matchedAccount.avatar
    } else {
      info.value.avatar = '/logo.png'
    }
  }
)

/** 删除账号列表内容 */
const delAccount = (item: UserInfoType) => {
  // 获取删除前账户列表的长度
  const lengthBeforeDelete = loginHistories.length
  loginHistoriesStore.removeLoginHistory(item)
  // 判断是否删除了最后一个条目，并据此更新arrowStatus
  if (lengthBeforeDelete === 1 && loginHistories.length === 0) {
    arrowStatus.value = false
  }
  info.value.account = ''
  info.value.password = ''
  info.value.avatar = '/logo.png'
}

/**
 * 给账号赋值
 * @param item 账户信息
 * */
const giveAccount = (item: UserInfoType) => {
  const { account, password, avatar, name, uid } = item
  info.value.account = account || ''
  info.value.password = password || ''
  info.value.avatar = avatar
  info.value.name = name
  info.value.uid = uid
  arrowStatus.value = false
}

/**登录后创建主页窗口*/
const normalLogin = async (auto = false) => {
  loading.value = true
  loginText.value = '登录中...'
  loginDisabled.value = true
  // 根据auto参数决定从哪里获取登录信息
  const loginInfo = auto ? (userStore.userInfo as UserInfoType) : info.value
  const { account } = loginInfo

  // 自动登录
  if (auto) {
    // 添加2秒延迟
    await new Promise((resolve) => setTimeout(resolve, 1200))

    try {
      // 直接获取用户详情，如果token过期会自动续签，如果续签失败就回到登录页面
      const userDetail = await apis.getUserDetail()
      // 设置用户状态id
      stateId.value = userDetail.userStateId
      const account = {
        ...userDetail
      }
      userStore.userInfo = account
      loginHistoriesStore.addLoginHistory(account)

      loginText.value = '登录成功正在跳转...'
      await setLoginState()
      await openHomeWindow()
      loading.value = false
    } catch (error) {
      console.error('自动登录失败', error)
      // 如果是网络异常，不删除token
      if (!isOnline.value) {
        loginDisabled.value = true
        loginText.value = '网络异常'
        loading.value = false
      } else {
        // 其他错误才清除token并重置状态
        localStorage.removeItem('TOKEN')
        isAutoLogin.value = false
        loginDisabled.value = true
        loginText.value = '登录'
        loading.value = false
      }
    }
    return
  }

  apis
    .login({ account: account, password: info.value.password, source: 'pc' })
    .then(async (res) => {
      loginDisabled.value = true
      loginText.value = '登录成功, 正在跳转'
      userStore.isSign = true
      // 存储双token
      localStorage.setItem('TOKEN', res.token)
      localStorage.setItem('REFRESH_TOKEN', res.refreshToken)
      // 需要删除二维码，因为用户可能先跳转到二维码界面再回到登录界面，会导致二维码一直保持在内存中
      if (localStorage.getItem('wsLogin')) {
        localStorage.removeItem('wsLogin')
      }
      // 获取用户状态列表
      if (userStatusStore.stateList.length === 0) {
        try {
          userStatusStore.stateList = await apis.getAllUserState()
        } catch (error) {
          console.error('获取用户状态列表失败', error)
        }
      }
      // 获取用户详情
      const userDetail = await apis.getUserDetail()

      // 设置用户状态id
      stateId.value = userDetail.userStateId
      // TODO 先不获取 emoji 列表，当我点击 emoji 按钮的时候再获取
      // await emojiStore.getEmojiList()
      const account = {
        ...userDetail,
        token: res.token,
        client: res.client
      }
      userStore.userInfo = account
      loginHistoriesStore.addLoginHistory(account)

      await setLoginState()
      await openHomeWindow()
      loading.value = false
    })
    .catch(() => {
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

const openHomeWindow = async () => {
  await createWebviewWindow('HuLa', 'home', 960, 720, 'login', true, undefined, 480, undefined, false)
}

/** 移除已登录账号 */
const removeToken = () => {
  localStorage.removeItem('TOKEN')
  localStorage.removeItem('REFRESH_TOKEN')
  userStore.userInfo = {}
}

const closeMenu = (event: MouseEvent) => {
  const target = event.target as Element
  if (!target.matches('.account-box, .account-box *, .down')) {
    arrowStatus.value = false
  }
  if (!target.matches('#moreShow')) {
    moreShow.value = false
  }
}

const enterKey = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !loginDisabled.value) {
    normalLogin()
  }
}

onBeforeMount(async () => {
  const token = localStorage.getItem('TOKEN')
  const refreshToken = localStorage.getItem('REFRESH_TOKEN')

  if (!login.value.autoLogin) {
    localStorage.removeItem('TOKEN')
    localStorage.removeItem('REFRESH_TOKEN')
    clearListener()
    isTrayMenuShow.value = false
    return
  }

  // 只有在非自动登录的情况下才验证token并直接打开主窗口
  if (token && refreshToken && !login.value.autoLogin) {
    isJumpDirectly.value = true
    try {
      await openHomeWindow()
      return // 直接返回，不执行后续的登录相关逻辑
    } catch (error) {
      isJumpDirectly.value = false
      // token无效，清除token并重置状态
      localStorage.removeItem('TOKEN')
      localStorage.removeItem('REFRESH_TOKEN')
      userStore.userInfo = {}
      userStore.isSign = false
    }
  }
})

onMounted(async () => {
  // 只有在需要登录的情况下才显示登录窗口
  if (!isJumpDirectly.value) {
    await getCurrentWebviewWindow().show()
  }

  useMitt.on(WsResponseMessageType.NO_INTERNET, () => {
    loginDisabled.value = true
    loginText.value = '服务异常断开'
  })

  // 自动登录时直接触发登录
  if (isAutoLogin.value) {
    normalLogin(true)
  } else {
    loginHistories.length > 0 && giveAccount(loginHistories[0])
  }

  window.addEventListener('click', closeMenu, true)
  window.addEventListener('keyup', enterKey)
  await checkUpdate('login', true)
  timerWorker.postMessage({
    type: 'startTimer',
    msgId: 'checkUpdate',
    duration: CHECK_UPDATE_LOGIN_TIME
  })
})

onUnmounted(() => {
  window.removeEventListener('click', closeMenu, true)
  window.removeEventListener('keyup', enterKey)
  // 清除Web Worker计时器
  timerWorker.postMessage({
    type: 'clearTimer',
    msgId: 'checkUpdate'
  })
  timerWorker.terminate()
})
</script>

<style scoped lang="scss">
@use '@/styles/scss/global/login-bg';
@use '@/styles/scss/login';
</style>

<template>
  <!-- 单独使用n-config-provider来包裹不需要主题切换的界面 -->
  <n-config-provider :theme="lightTheme" data-tauri-drag-region class="login-box size-full rounded-8px select-none">
    <!--顶部操作栏-->
    <ActionBar :max-w="false" :shrink="false" proxy />

    <!--  手动登录样式  -->
    <n-flex vertical :size="25" v-if="uiState === 'manual'">
      <!-- 头像 -->
      <n-flex justify="center" class="w-full pt-35px" data-tauri-drag-region>
        <n-avatar
          class="welcome size-80px rounded-50% border-(2px solid #fff)"
          :src="AvatarUtils.getAvatarUrl(info.avatar)"
          color="#fff" />
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
              <svg v-else class="down w-18px h-18px color-#505050 cursor-pointer">
                <use href="#up"></use>
              </svg>
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
                <n-avatar :src="AvatarUtils.getAvatarUrl(item.avatar)" color="#fff" class="size-28px rounded-50%" />
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
        <n-flex align="center" justify="center" :size="6">
          <n-checkbox v-model:checked="protocol" />
          <div class="text-12px color-#909090 cursor-default lh-14px agreement">
            <span>已阅读并同意</span>
            <span class="color-#13987f cursor-pointer" @click.stop="openServiceAgreement">服务协议</span>
            <span>和</span>
            <span class="color-#13987f cursor-pointer" @click.stop="openPrivacyAgreement">HuLa隐私保护指引</span>
          </div>
        </n-flex>

        <n-button
          :loading="loading"
          :disabled="loginDisabled"
          tertiary
          style="color: #fff"
          class="gradient-button w-full mt-8px mb-50px"
          @click="normalLogin('PC')">
          <span>{{ loginText }}</span>
        </n-button>
      </n-flex>
    </n-flex>

    <!-- 自动登录样式 -->
    <n-flex v-else-if="uiState === 'auto'" vertical :size="29" data-tauri-drag-region>
      <n-flex justify="center" class="mt-15px">
        <img src="/hula.png" class="w-140px h-60px" alt="" />
      </n-flex>
      <n-flex :size="30" vertical>
        <!-- 头像 -->
        <n-flex justify="center">
          <n-avatar
            round
            :size="110"
            color="#fff"
            class="border-(2px solid #fff)"
            :src="AvatarUtils.getAvatarUrl(userStore.userInfo!.avatar)" />
        </n-flex>

        <n-flex justify="center">
          <n-ellipsis style="max-width: 200px" class="text-18px">{{ userStore.userInfo!.name }}</n-ellipsis>
        </n-flex>
      </n-flex>

      <n-flex justify="center">
        <n-button
          :loading="loading"
          :disabled="loginDisabled"
          tertiary
          style="color: #fff"
          class="gradient-button w-200px mt-12px mb-40px"
          @click="normalLogin('PC', true)">
          <span>{{ loginText }}</span>
        </n-button>
      </n-flex>
    </n-flex>

    <!-- 底部操作栏 -->
    <n-flex justify="center" class="text-14px" id="bottomBar">
      <div class="color-#13987f cursor-pointer" @click="router.push('/qrCode')">扫码登录</div>
      <div class="w-1px h-14px bg-#ccc"></div>
      <div v-if="uiState === 'auto'" class="color-#13987f cursor-pointer" @click="removeToken">移除账号</div>
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
            class="register text-14px cursor-pointer hover:bg-#f3f3f3 hover:rounded-6px p-8px"
            @click="createWebviewWindow('注册', 'register', 600, 600)">
            注册账号
          </div>
          <div
            class="text-14px cursor-pointer hover:bg-#f3f3f3 hover:rounded-6px p-8px"
            @click="createWebviewWindow('忘记密码', 'forgetPassword', 600, 600)">
            忘记密码
          </div>
          <div
            v-if="!isCompatibility()"
            @click="router.push('/network')"
            :class="{ network: isMac() }"
            class="text-14px cursor-pointer hover:bg-#f3f3f3 hover:rounded-6px p-8px">
            网络设置
          </div>
        </n-flex>
      </n-popover>
    </n-flex>
  </n-config-provider>
</template>
<script setup lang="ts">
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useNetwork } from '@vueuse/core'
import { lightTheme } from 'naive-ui'
import { useCheckUpdate } from '@/hooks/useCheckUpdate'
import { type DriverStepConfig, useDriver } from '@/hooks/useDriver'
import { useMitt } from '@/hooks/useMitt'
import { useWindow } from '@/hooks/useWindow.ts'
import router from '@/router'
import type { UserInfoType } from '@/services/types.ts'
import { WsResponseMessageType } from '@/services/wsType'
import { useGlobalStore } from '@/stores/global'
import { useGuideStore } from '@/stores/guide'
import { useLoginHistoriesStore } from '@/stores/loginHistory.ts'
import { useSettingStore } from '@/stores/setting.ts'
import { useUserStore } from '@/stores/user.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { isCompatibility, isMac } from '@/utils/PlatformConstants'
import { clearListener } from '@/utils/ReadCountQueue'
import { useLogin } from '@/hooks/useLogin'

// 定义引导步骤配置
const driverSteps: DriverStepConfig[] = [
  {
    element: '.welcome',
    popover: {
      title: '🎉 欢迎使用HuLa',
      description: 'HuLa是一款基于Tauri的聊天软件，支持Windows、macOS、Linux、IOS、Android',
      side: 'bottom',
      align: 'center'
    }
  },
  {
    element: '.agreement',
    popover: {
      title: '🤔 关于 隐私条款 和 服务协议',
      description: '或许您需要查看 HuLa 的隐私条款和服务协议',
      onNextClick: () => {
        if (isMac()) {
          moreShow.value = true
        }
      }
    }
  },
  {
    element: '.network',
    popover: {
      title: '⚙️ 关于网络设置',
      description: 'HuLa 支持自定义服务设置，您可以替换官方的服务地址',
      onNextClick: () => {
        moreShow.value = true
      }
    }
  },
  {
    element: '.register',
    popover: {
      title: '🤓 如何登录HuLa',
      description: '在使用HuLa之前您需要注册一个帐号'
    }
  }
]

const settingStore = useSettingStore()
const userStore = useUserStore()
const globalStore = useGlobalStore()
const guideStore = useGuideStore()
const { isTrayMenuShow } = storeToRefs(globalStore)
const { isGuideCompleted } = storeToRefs(guideStore)
const { startTour } = useDriver(driverSteps)
/** 网络连接是否正常 */
const { isOnline } = useNetwork()
const loginHistoriesStore = useLoginHistoriesStore()
const { loginHistories } = loginHistoriesStore
const { login } = storeToRefs(settingStore)
/** 协议 */
const protocol = ref(true)
const arrowStatus = ref(false)
const moreShow = ref(false)
const { createWebviewWindow, createModalWindow } = useWindow()
const { checkUpdate, CHECK_UPDATE_LOGIN_TIME } = useCheckUpdate()
const { normalLogin, loading, loginText, loginDisabled, info, uiState } = useLogin()

const accountPH = ref('邮箱/HuLa账号')
const passwordPH = ref('输入HuLa密码')
/** 登录按钮的文本内容 */
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
  loginText.value = v ? '登录' : '网络异常'
})

// 监听账号输入
watch(
  () => info.value.account,
  (newAccount) => {
    if (!newAccount) {
      info.value.avatar = '/logoD.png'
      return
    }

    // 在登录历史中查找匹配的账号
    const matchedAccount = loginHistories.find(
      (history) => history.account === newAccount || history.email === newAccount
    )
    if (matchedAccount) {
      info.value.avatar = matchedAccount.avatar
    } else {
      info.value.avatar = '/logoD.png'
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
  info.value.avatar = '/logoD.png'
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

/** 移除已登录账号 */
const removeToken = () => {
  localStorage.removeItem('TOKEN')
  localStorage.removeItem('REFRESH_TOKEN')
  userStore.userInfo = undefined
}

/** 打开服务协议窗口 */
const openServiceAgreement = async () => {
  await createModalWindow('服务协议', 'modal-serviceAgreement', 600, 600, 'login')
}

/** 打开隐私保护协议窗口 */
const openPrivacyAgreement = async () => {
  await createModalWindow('隐私保护指引', 'modal-privacyAgreement', 600, 600, 'login')
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
    normalLogin('PC')
  }
}

onBeforeMount(async () => {
  // 始终初始化托盘菜单状态为false
  isTrayMenuShow.value = false

  if (!login.value.autoLogin) {
    // 非自动登录模式，直接显示手动登录界面
    uiState.value = 'manual'
    localStorage.removeItem('TOKEN')
    localStorage.removeItem('REFRESH_TOKEN')
    clearListener()
    return
  }
})

onMounted(async () => {
  // 检查引导状态，只有未完成时才启动引导
  if (!isGuideCompleted.value) {
    startTour()
  }

  // 只有在需要登录的情况下才显示登录窗口
  if (!isJumpDirectly.value) {
    await getCurrentWebviewWindow().show()
  }

  useMitt.on(WsResponseMessageType.NO_INTERNET, () => {
    loginDisabled.value = true
    loginText.value = '服务异常断开'
  })

  // 自动登录时显示自动登录界面并触发登录
  if (login.value.autoLogin) {
    uiState.value = 'auto'
    normalLogin('PC', true)
  } else {
    // 手动登录模式，自动填充第一个历史账号
    uiState.value = 'manual'
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

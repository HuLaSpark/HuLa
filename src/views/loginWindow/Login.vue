<template>
  <!-- 单独使用n-config-provider来包裹不需要主题切换的界面 -->
  <n-config-provider :theme="lightTheme" data-tauri-drag-region class="login-box size-full rounded-8px select-none">
    <!--顶部操作栏-->
    <ActionBar :max-w="false" :shrink="false" proxy />

    <!--  手动登录样式  -->
    <n-flex vertical :size="25" v-if="!login.autoLogin || !TOKEN">
      <!-- 头像 -->
      <n-flex justify="center" class="w-full pt-35px" data-tauri-drag-region>
        <n-avatar
          class="size-80px rounded-50% bg-#b6d6d9ff border-(2px solid #fff)"
          :src="AvatarUtils.getAvatarUrl(info.avatar || '/logo.png')" />
      </n-flex>

      <!-- 登录菜单 -->
      <n-flex class="ma text-center h-full w-260px" vertical :size="16">
        <n-input
          :class="{ 'pl-16px': loginHistories.length > 0 }"
          size="large"
          maxlength="16"
          minlength="6"
          v-model:value="info.account"
          type="text"
          :placeholder="accountPH"
          @focus="accountPH = ''"
          @blur="accountPH = '输入HuLa账号'"
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
          @click="normalLogin"
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
          @click="autoLogin"
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
          <div class="text-14px cursor-pointer hover:bg-#f3f3f3 hover:rounded-6px p-8px">忘记密码</div>
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
import { invoke } from '@tauri-apps/api/core'
import { AvatarUtils } from '@/utils/avatarUtils'
import { useMitt } from '@/hooks/useMitt'
import { WsResponseMessageType } from '@/services/wsType'
import { useNetwork } from '@vueuse/core'
import { computedToken } from '@/services/request'
import ws from '@/services/webSocket'
import { useGlobalStore } from '@/stores/global.ts'

const settingStore = useSettingStore()
const userStore = useUserStore()
const globalStore = useGlobalStore()
const { isTrayMenuShow } = storeToRefs(globalStore)
/** 网络连接是否正常 */
const { isOnline } = useNetwork()
const loginHistoriesStore = useLoginHistoriesStore()
const { loginHistories } = loginHistoriesStore
const { login } = storeToRefs(settingStore)
const TOKEN = ref(localStorage.getItem('TOKEN'))
/** 账号信息 */
const info = ref({
  account: '',
  password: '',
  avatar: '',
  name: '',
  uid: 0
})
/** 协议 */
const protocol = ref(true)
const loginDisabled = ref(false)
const loading = ref(false)
const arrowStatus = ref(false)
const moreShow = ref(false)
const { setLoginState } = useLogin()
const accountPH = ref('输入HuLa账号')
const passwordPH = ref('输入HuLa密码')
/** 登录按钮的文本内容 */
const loginText = ref('登录')
const { createWebviewWindow } = useWindow()
const route = useRoute()

watchEffect(() => {
  loginDisabled.value = !(info.value.account && info.value.password && protocol.value)
  // 清空账号的时候设置默认头像
  if (!info.value.account) {
    info.value.avatar = '/logo.png'
  }
})

watch(isOnline, (v) => {
  if (v) {
    loginDisabled.value = false
    loginText.value = '登录'
  }
})

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
const normalLogin = async () => {
  loading.value = true
  const { account, password } = info.value
  apis
    .login({ account, password })
    .then(async (token) => {
      loginDisabled.value = true
      loginText.value = '登录成功, 正在跳转'
      userStore.isSign = true
      localStorage.setItem('TOKEN', token)
      // 需要删除二维码，因为用户可能先跳转到二维码界面再回到登录界面，会导致二维码一直保持在内存中
      if (localStorage.getItem('wsLogin')) {
        localStorage.removeItem('wsLogin')
      }
      // 更新一下请求里面的 token.
      // computedToken.clear()
      // computedToken.get()
      // 获取用户详情
      const userDetail = await apis.getUserDetail()
      // TODO 先不获取 emoji 列表，当我点击 emoji 按钮的时候再获取
      // await emojiStore.getEmojiList()
      // TODO 这里的id暂时赋值给uid，因为后端没有统一返回uid，待后端调整
      const account = {
        ...userDetail,
        token
      }
      loading.value = false
      userStore.userInfo = account
      loginHistoriesStore.addLoginHistory(account)

      await setLoginState()
      // rust保存用户信息
      await invoke('save_user_info', {
        userId: account.uid,
        username: account.name,
        token: account.token,
        portrait: '',
        isSign: true
      }).finally(() => {
        // 打开主界面
        openHomeWindow()
      })
    })
    .catch(() => {
      loading.value = false
    })
}

const openHomeWindow = async () => {
  await createWebviewWindow('HuLa', 'home', 960, 720, 'login', true)
}

/** 自动登录 */
const autoLogin = () => {
  loading.value = true
  loginText.value = '网络连接中'
  setTimeout(() => {
    apis
      .checkToken()
      .then(async () => {
        loginText.value = '登录成功, 正在跳转'
        loading.value = false
        const userDetail = await apis.getUserDetail()
        await setLoginState()
        // rust保存用户信息
        await invoke('save_user_info', {
          userId: userDetail.uid,
          username: userDetail.name,
          token: '',
          portrait: '',
          isSign: true
        }).finally(() => {
          openHomeWindow()
        })
      })
      .catch(() => {
        loading.value = false
        loginText.value = '登录'
      })
  }, 1000)
}

/** 移除已登录账号 */
const removeToken = () => {
  localStorage.removeItem('TOKEN')
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
  // 如果不是自动登录且当前在登录页面，清除 TOKEN，防止用户直接使用控制台退出导致登录前还没有退出账号就继续登录
  if (!login.value.autoLogin && route.path === '/login' && TOKEN.value) {
    await apis.logout()
    isTrayMenuShow.value = false
    computedToken.clear()
    // 重新初始化 WebSocket 连接，此时传入 null 作为 token
    ws.initConnect()
    const headers = new Headers()
    headers.append('Authorization', '')
  }
})

onMounted(async () => {
  await getCurrentWebviewWindow().show()
  useMitt.on(WsResponseMessageType.NO_INTERNET, () => {
    loginDisabled.value = true
    loginText.value = '网络已断开'
  })
  // 自动登录
  if (login.value.autoLogin && TOKEN.value) {
    autoLogin()
  } else {
    loginHistories.length > 0 && giveAccount(loginHistories[0])
  }
  window.addEventListener('click', closeMenu, true)
  window.addEventListener('keyup', enterKey)
})

onUnmounted(() => {
  window.removeEventListener('click', closeMenu, true)
  window.removeEventListener('keyup', enterKey)
})
</script>

<style scoped lang="scss">
@use '@/styles/scss/global/login-bg';
@use '@/styles/scss/login';
</style>

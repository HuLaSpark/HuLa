<template>
  <!-- todo 这里设置了 data-tauri-drag-region但是有部分区域不可以拖动 -->
  <!-- 单独使用n-config-provider来包裹不需要主题切换的界面 -->
  <n-config-provider :theme="lightTheme" data-tauri-drag-region class="login-box size-full rounded-8px select-none">
    <!--顶部操作栏-->
    <ActionBar :max-w="false" :shrink="false" />

    <!--  手动登录样式  -->
    <n-flex vertical :size="25" v-if="!isAutoLogin" data-tauri-drag-region>
      <!-- 头像 -->
      <n-flex justify="center" class="w-full pt-35px" data-tauri-drag-region>
        <img
          class="w-80px h-80px rounded-50% bg-#b6d6d9ff border-(2px solid #fff)"
          :src="info.avatar || '/logo.png'"
          alt="" />
      </n-flex>

      <!-- 登录菜单 -->
      <n-flex class="ma text-center h-full w-260px" vertical :size="16" data-tauri-drag-region>
        <n-input
          style="padding-left: 20px"
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
            <n-flex @click="arrowStatus = !arrowStatus">
              <svg v-if="!arrowStatus" class="down w-18px h-18px color-#505050 cursor-pointer">
                <use href="#down"></use>
              </svg>
              <svg v-else class="down w-18px h-18px color-#505050 cursor-pointer"><use href="#up"></use></svg>
            </n-flex>
          </template>
        </n-input>

        <!-- 账号选择框 TODO 尝试使用n-popover组件来实现这个功能 (nyh -> 2024-03-09 02:56:06)-->
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
              class="p-8px cursor-pointer hover:bg-#f3f3f3 hover: rounded-6px">
              <div class="flex-between-center">
                <img :src="item.avatar" class="w-28px h-28px bg-#ccc rounded-50%" alt="" />
                <p class="text-14px color-#505050">{{ item.account }}</p>
                <svg @click.stop="delAccount(item)" class="w-12px h-12px">
                  <use href="#close"></use>
                </svg>
              </div>
            </n-flex>
          </n-scrollbar>
        </div>

        <n-input
          maxlength="16"
          minlength="6"
          size="large"
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
          @click="loginWin"
          color="#13987f">
          {{ loginText }}
        </n-button>
      </n-flex>
    </n-flex>

    <!-- 自动登录样式 -->
    <n-flex vertical :size="29" v-else data-tauri-drag-region>
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
            :src="login.accountInfo.avatar || '/logo.png'" />
        </n-flex>

        <n-flex justify="center">
          <n-ellipsis style="max-width: 200px" class="text-18px">{{ login.accountInfo.name }}</n-ellipsis>
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
    <n-flex justify="center" class="text-14px" id="bottomBar" data-tauri-drag-region>
      <div class="color-#13987f cursor-pointer" @click="router.push('/qrCode')">扫码登录</div>
      <div class="w-1px h-14px bg-#ccc"></div>
      <div v-if="isAutoLogin" class="color-#13987f cursor-pointer">移除账号</div>
      <n-popover v-else trigger="click" :show-checkmark="false" :show-arrow="false">
        <template #trigger>
          <div class="color-#13987f cursor-pointer">更多选项</div>
        </template>
        <n-flex vertical :size="2">
          <div class="text-14px cursor-pointer hover:bg-#f3f3f3 hover:rounded-6px p-8px">注册账号</div>
          <div class="text-14px cursor-pointer hover:bg-#f3f3f3 hover:rounded-6px p-8px">忘记密码</div>
        </n-flex>
      </n-popover>
    </n-flex>
  </n-config-provider>
</template>
<script setup lang="ts">
import router from '@/router'
import { useWindow } from '@/hooks/useWindow.ts'
import { delay } from 'lodash-es'
import { lightTheme } from 'naive-ui'
import { useSettingStore } from '@/stores/setting.ts'
import { useLogin } from '@/hooks/useLogin.ts'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useLoginHistoriesStore } from '@/stores/loginHistory.ts'

const settingStore = useSettingStore()
const loginHistoriesStore = useLoginHistoriesStore()
const { loginHistories } = loginHistoriesStore
const { login } = storeToRefs(settingStore)
/** 账号信息 */
const info = ref({
  account: '',
  password: '',
  avatar: '',
  name: '',
  uid: 0
})
/** 是否中断登录 */
const interruptLogin = ref(false)
/** 协议 */
const protocol = ref(true)
const loginDisabled = ref(false)
const loading = ref(false)
const arrowStatus = ref(false)
const isAutoLogin = ref(false)
const { setLoginState } = useLogin()
const accountPH = ref('输入HuLa账号')
const passwordPH = ref('输入HuLa密码')
/** 登录按钮的文本内容 */
const loginText = ref('登录')
const { createWebviewWindow } = useWindow()

watchEffect(() => {
  loginDisabled.value = !(info.value.account && info.value.password && protocol.value)
  // 清空账号的时候设置默认头像
  if (!info.value.account) {
    info.value.avatar = '/logo.png'
  }
  if (interruptLogin.value) {
    loginDisabled.value = false
  }
})

/** 删除账号列表内容 */
const delAccount = (item: STO.Setting['login']['accountInfo']) => {
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
const giveAccount = (item: STO.Setting['login']['accountInfo']) => {
  const { account, password, avatar, name, uid } = item
  info.value.account = account || ''
  info.value.password = password || ''
  info.value.avatar = avatar
  info.value.name = name
  info.value.uid = uid
  arrowStatus.value = false
}

/**登录后创建主页窗口*/
const loginWin = () => {
  if (interruptLogin.value) return
  loading.value = true
  delay(async () => {
    await createWebviewWindow('HuLa', 'home', 960, 720, 'login', true)
    loading.value = false
    if (!login.value.autoLogin || login.value.accountInfo.password === '') {
      const account = {
        ...info.value,
        token: 'test'
      }
      settingStore.setAccountInfo(account)
      loginHistoriesStore.addLoginHistory(account)
      await setLoginState()
    }
  }, 1000)
}

/** 自动登录 */
const autoLogin = () => {
  interruptLogin.value = false
  isAutoLogin.value = true
  // TODO 检查用户网络是否连接 (nyh -> 2024-03-16 12:06:59)
  loginText.value = '网络连接中'
  delay(async () => {
    loginWin()
    loginText.value = '登录'
    await setLoginState()
  }, 1000)
}

const closeMenu = (event: MouseEvent) => {
  const target = event.target as Element
  if (!target.matches('.account-box, .account-box *, .down')) {
    arrowStatus.value = false
  }
  if (target.matches('#bottomBar *') && isAutoLogin.value) {
    interruptLogin.value = true
  }
}

onMounted(async () => {
  // 判断是否需要马上跳转到二维码登录页面
  if (localStorage.getItem('isToQrcode')) {
    router.push('/qrCode')
    await nextTick(() => {
      localStorage.removeItem('isToQrcode')
    })
  }
  await getCurrentWebviewWindow().show()
  if (login.value.autoLogin && login.value.accountInfo.password !== '') {
    autoLogin()
  }
  loginHistories.length > 0 && giveAccount(loginHistories[0])
  window.addEventListener('click', closeMenu, true)
})

onUnmounted(() => {
  window.removeEventListener('click', closeMenu, true)
})
</script>

<style scoped lang="scss">
@use '@/styles/scss/global/login-bg';
@use '@/styles/scss/login';
</style>

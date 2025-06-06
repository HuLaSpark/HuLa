<template>
  <n-config-provider :theme="lightTheme" class="login-box flex-col-center gap-40px h-100vh">
    <img src="@/assets/logo/hula.png" alt="logo" class="w-130px h-58px" />

    <!-- 登录菜单 -->
    <n-flex class="text-center w-260px" vertical :size="16">
      <n-input
        :class="{ 'pl-16px': loginHistories.length > 0 }"
        size="large"
        maxlength="16"
        minlength="6"
        v-model:value="info.account"
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
        @click="normalLogin"
        color="#13987f">
        <span>{{ loginText }}</span>
      </n-button>
    </n-flex>
  </n-config-provider>
</template>

<script setup lang="ts">
import { useLoginHistoriesStore } from '@/stores/loginHistory.ts'
import apis from '@/services/apis'
import { useUserStore } from '@/stores/user'
import { useLogin } from '@/hooks/useLogin'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { UserInfoType } from '@/services/types'
import { lightTheme } from 'naive-ui'
import router from '../router'

const loginHistoriesStore = useLoginHistoriesStore()
const userStore = useUserStore()
const { setLoginState } = useLogin()
const { loginHistories } = loginHistoriesStore
/** 账号信息 */
const info = ref({
  account: '',
  password: '',
  avatar: '',
  name: '',
  uid: ''
})
const accountPH = ref('输入HuLa账号')
const passwordPH = ref('输入HuLa密码')
const protocol = ref(true)
const loginDisabled = ref(false)
const loading = ref(false)
const arrowStatus = ref(false)
/** 登录按钮的文本内容 */
const loginText = ref('登录')

watchEffect(() => {
  loginDisabled.value = !(info.value.account && info.value.password && protocol.value)
  // 清空账号的时候设置默认头像
  if (!info.value.account) {
    info.value.avatar = '/logo.png'
  }
})

/**登录后创建主页窗口*/
const normalLogin = async () => {
  loading.value = true
  const { account, password } = info.value
  apis
    .login({ account, password, source: 'mobile' })
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
      // 获取用户详情
      const userDetail = await apis.getUserDetail()
      // TODO 先不获取 emoji 列表，当我点击 emoji 按钮的时候再获取
      // await emojiStore.getEmojiList()
      // TODO 这里的id暂时赋值给uid，因为后端没有统一返回uid，待后端调整
      const account = {
        ...userDetail,
        token: res.token,
        client: res.client
      }
      loading.value = false
      userStore.userInfo = account
      loginHistoriesStore.addLoginHistory(account)
      router.push('/mobile/home')
      await setLoginState()
    })
    .catch(() => {
      loading.value = false
    })
}

/**
 * 给账号赋值
 * @param item 账户信息
 * */
const giveAccount = (item: UserInfoType) => {
  const { account, avatar, name, uid } = item
  info.value.account = account || ''
  info.value.avatar = avatar
  info.value.name = name
  info.value.uid = uid
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
  info.value.account = ''
  info.value.password = ''
  info.value.avatar = '/logo.png'
}
</script>

<style scoped lang="scss">
@use '@/styles/scss/login';
@use '@/styles/scss/global/login-bg';
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
</style>

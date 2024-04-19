<template>
  <!-- todo 这里设置了 data-tauri-drag-region但是有部分区域不可以拖动 -->
  <!-- 单独使用n-config-provider来包裹不需要主题切换的界面 -->
  <n-config-provider :theme="lightTheme" data-tauri-drag-region class="login-box size-full rounded-8px select-none">
    <!--顶部操作栏-->
    <ActionBar :max-w="false" :shrink="false" />

    <!--  手动登录样式  -->
    <n-flex vertical :size="25" v-if="!isAutoLogin">
      <!-- 头像 -->
      <n-flex justify="center" class="w-full mt-35px">
        <img class="w-80px h-80px rounded-50% bg-#fff border-(2px solid #fff)" :src="avatarRef || '/logo.png'" alt="" />
      </n-flex>

      <!-- 登录菜单 -->
      <n-flex class="ma text-center h-full w-260px" vertical :size="16">
        <n-input
          style="padding-left: 20px"
          size="large"
          maxlength="16"
          minlength="6"
          v-model:value="accountRef"
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
          v-if="accountOption.length > 0 && arrowStatus"
          class="account-box absolute w-260px max-h-140px bg-#fdfdfd mt-45px z-99 rounded-8px p-8px box-border">
          <n-scrollbar style="max-height: 120px" trigger="none">
            <n-flex
              vertical
              v-for="(item, index) in accountOption"
              :key="item.account"
              @click="giveAccount(item)"
              class="p-8px cursor-pointer hover:bg-#f3f3f3 hover: rounded-6px">
              <div class="flex-between-center">
                <img :src="item.avatar" class="w-28px h-28px bg-#ccc rounded-50%" alt="" />
                <p class="text-14px color-#505050">{{ item.account }}</p>
                <svg @click.stop="delAccount(index)" class="w-12px h-12px">
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
          v-model:value="passwordRef"
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
    <n-flex vertical :size="29" v-else>
      <n-flex justify="center" class="mt-15px">
        <img src="@/assets/logo/hula.png" class="w-140px h-60px" alt="" />
      </n-flex>

      <n-flex :size="30" vertical>
        <!-- 头像 -->
        <n-flex justify="center">
          <img
            class="w-110px h-110px rounded-50% bg-#fff border-(2px solid #fff)"
            :src="login.accountInfo.avatar || '/logo.png'"
            alt="" />
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
          @click="loginWin"
          color="#13987f">
          {{ loginText }}
        </n-button>
      </n-flex>
    </n-flex>

    <!-- 顶部操作栏 -->
    <n-flex justify="center" class="text-14px">
      <div class="color-#13987f cursor-pointer" @click="router.push('/qrCode')">扫码登录</div>
      <div class="w-1px h-14px bg-#ccc"></div>
      <n-popover trigger="click" :show-checkmark="false" :show-arrow="false">
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
import { setting } from '@/stores/setting.ts'
import { storeToRefs } from 'pinia'
import { invoke } from '@tauri-apps/api/tauri'
import { emit } from '@tauri-apps/api/event'

const settingStore = setting()
const { login } = storeToRefs(settingStore)
const accountRef = ref()
const passwordRef = ref()
const avatarRef = ref()
const nameRef = ref()
const protocol = ref()
const loginDisabled = ref(false)
const loading = ref(false)
const arrowStatus = ref(false)
const isAutoLogin = ref(false)
/* todo 模拟账号列表 */
const accountOption = ref<STO.Setting['login']['accountInfo'][]>([
  {
    account: 'hula',
    password: '123456',
    name: '超级GG帮',
    avatar: 'https://picsum.photos/140?1'
  },
  {
    account: 'hula1',
    password: '123456',
    name: '二狗子',
    avatar: 'https://picsum.photos/140?2'
  },
  {
    account: 'hula2',
    password: '123456',
    name: '李山离',
    avatar: 'https://picsum.photos/140?3'
  },
  {
    account: 'hula3',
    password: '123456',
    name: '牛什么呢',
    avatar: 'https://picsum.photos/140?4'
  }
])
const accountPH = ref('输入HuLa账号')
const passwordPH = ref('输入HuLa密码')
/* 登录按钮的文本内容 */
const loginText = ref('登录')
const { createWebviewWindow } = useWindow()

watchEffect(() => {
  loginDisabled.value = !(accountRef.value && passwordRef.value && protocol.value)
  // 清空账号的时候设置默认头像
  if (!accountRef.value) {
    avatarRef.value = '/logo.png'
  }
})

/* 删除账号列表内容 */
const delAccount = (index: number) => {
  // 检查索引有效性
  if (index < 0 || index >= accountOption.value.length) return
  // 获取删除前账户列表的长度
  const lengthBeforeDelete = accountOption.value.length
  accountOption.value.splice(index, 1)
  // 判断是否删除了最后一个条目，并据此更新arrowStatus
  if (lengthBeforeDelete === 1 && accountOption.value.length === 0) {
    arrowStatus.value = false
  }
  accountRef.value = null
  passwordRef.value = null
  avatarRef.value = '/logo.png'
}

/**
 * 给账号赋值
 * @param item 账户信息
 * */
const giveAccount = (item: STO.Setting['login']['accountInfo']) => {
  const { account, password, avatar, name } = item
  accountRef.value = account
  passwordRef.value = password
  avatarRef.value = avatar
  nameRef.value = name
  arrowStatus.value = false
}

/**
 * 设置登录状态(系统托盘图标，系统托盘菜单选项)
 */
const setLoginState = async () => {
  await emit('login_success')
  await invoke('set_main_icon').catch((error) => {
    console.error('设置主要图标失败:', error)
  })
}

/*登录后创建主页窗口*/
const loginWin = () => {
  loading.value = true
  delay(async () => {
    await createWebviewWindow('HuLa', 'home', 960, 720, 'login', false, true)
    loading.value = false
    if (!login.value.autoLogin || login.value.accountInfo.password === '') {
      settingStore.setAccountInfo({
        account: accountRef.value,
        password: passwordRef.value,
        avatar: avatarRef.value,
        name: nameRef.value
      })
      await setLoginState()
    }
  }, 1000)
}

/*监听是否点击了除了下拉框外的其他地方*/
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Element
  if (!target.matches('.account-box, .account-box *, .down')) {
    arrowStatus.value = false
  }
}

onMounted(async () => {
  await invoke('set_stateless_icon').catch((error) => {
    console.error('设置无状态图标失败:', error)
  })
  if (login.value.autoLogin && login.value.accountInfo.password !== '') {
    isAutoLogin.value = true
    // TODO 检查用户网络是否连接 (nyh -> 2024-03-16 12:06:59)
    loginText.value = '网络连接中'
    delay(async () => {
      loginWin()
      loginText.value = '登录'
      await setLoginState()
    }, 1000)
  }
  window.addEventListener('click', handleClickOutside, true)
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside, true)
})
</script>

<style scoped lang="scss">
@import '@/styles/scss/global/login-bg';
@import '@/styles/scss/login';
</style>

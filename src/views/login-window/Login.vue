<template>
  <!-- todo 这里设置了 data-tauri-drag-region但是有部分区域不可以拖动 -->
  <!-- 单独使用n-config-provider来包裹不需要主题切换的界面 -->
  <n-config-provider :theme="lightTheme" data-tauri-drag-region class="login-box wh-full rounded-8px select-none">
    <!--顶部操作栏-->
    <ActionBar :max-w="false" :shrink="false" />

    <!-- 头像 -->
    <div class="w-full flex-x-center mt-35px mb-25px">
      <img
        style="border: 2px solid #fff"
        class="w-80px h-80px rounded-50% bg-#fff"
        :src="avatarRef || '/logo.png'"
        alt="" />
    </div>

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
          <span class="color-#059669 cursor-pointer">服务协议</span>
          <span>和</span>
          <span class="color-#059669 cursor-pointer">HuLa隐私保护指引</span>
        </div>
      </n-flex>

      <n-button
        :loading="loading"
        :disabled="loginDisabled"
        class="w-full mt-8px mb-35px"
        @click="loginWin"
        color="#059669">
        登录
      </n-button>

      <!-- 顶部操作栏 -->
      <n-flex justify="center" class="text-14px">
        <div class="color-#059669 cursor-pointer" @click="toQRCode">扫码登录</div>
        <div class="w-1px h-14px bg-#ccc"></div>
        <n-popover style="padding: 6px; border-radius: 8px" trigger="click" :show-checkmark="false" :show-arrow="false">
          <template #trigger>
            <div class="color-#059669 cursor-pointer">更多选项</div>
          </template>
          <n-flex vertical :size="2">
            <div class="text-14px cursor-pointer hover:bg-#f3f3f3 hover:rounded-6px p-8px">注册账号</div>
            <div class="text-14px cursor-pointer hover:bg-#f3f3f3 hover:rounded-6px p-8px">忘记密码</div>
          </n-flex>
        </n-popover>
      </n-flex>
    </n-flex>
  </n-config-provider>
</template>
<script setup lang="ts">
import router from '@/router'
import { useWindow } from '@/hooks/useWindow.ts'
import { delay } from 'lodash-es'
import { lightTheme } from 'naive-ui'

type Account = {
  account: string
  password: string
  avatar?: string
}

const accountRef = ref()
const passwordRef = ref()
const avatarRef = ref()
const protocol = ref()
const loginDisabled = ref(false)
const loading = ref(false)
const arrowStatus = ref(false)
/* todo 模拟账号列表 */
const accountOption = ref<Account[]>([
  {
    account: 'hula',
    password: '123456',
    avatar: 'https://picsum.photos/140?1'
  },
  {
    account: 'hula1',
    password: '123456',
    avatar: 'https://picsum.photos/140?2'
  },
  {
    account: 'hula2',
    password: '123456',
    avatar: 'https://picsum.photos/140?3'
  },
  {
    account: 'hula3',
    password: '123456',
    avatar: 'https://picsum.photos/140?4'
  }
])
const accountPH = ref('输入HuLa账号')
const passwordPH = ref('输入HuLa密码')
const { createWebviewWindow } = useWindow()

watchEffect(() => {
  loginDisabled.value = !(accountRef.value && passwordRef.value && protocol.value)
  // 情况账号的时候设置默认头像
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
 * @param { Account } item 账户信息
 * */
const giveAccount = (item: Account) => {
  const { account, password, avatar } = item
  accountRef.value = account
  passwordRef.value = password
  avatarRef.value = avatar
  arrowStatus.value = false
}

/*跳转到二维码页面*/
const toQRCode = () => {
  router.push('/QRCode')
}

/*登录后创建主页窗口*/
const loginWin = () => {
  loading.value = true
  delay(async () => {
    await createWebviewWindow('HuLa', 'home', 960, 720, 'login', false, true)
    loading.value = false
  }, 800)
}

/*监听是否点击了除了下拉框外的其他地方*/
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Element
  if (!target.matches('.account-box, .account-box *, .down')) {
    arrowStatus.value = false
  }
}

onMounted(() => {
  window.addEventListener('click', handleClickOutside, true)
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside, true)
})
</script>

<style scoped lang="scss">
@import '@/styles/scss/global/login-bg';
:deep(.hover-box) {
  @apply w-28px h24px flex-center hover:bg-#e7e7e7;
  svg {
    color: #404040;
  }
}
:deep(.action-close) {
  svg {
    color: #404040;
  }
}
/* 改变输入框中的位置 */
:deep(.n-input .n-input__input, .n-input .n-input__textarea) {
  margin-left: 22px;
}

/* 隐藏naive UI的滚动条 */
:deep(
    .n-scrollbar > .n-scrollbar-rail.n-scrollbar-rail--vertical > .n-scrollbar-rail__scrollbar,
    .n-scrollbar + .n-scrollbar-rail.n-scrollbar-rail--vertical > .n-scrollbar-rail__scrollbar
  ) {
  display: none;
}
</style>

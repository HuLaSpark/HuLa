<template>
  <!-- todo 这里设置了 data-tauri-drag-region但是有部分区域不可以拖动 -->
  <div data-tauri-drag-region class="login-box wh-full rounded-8px select-none" @click="handleClickOutside">
    <!--顶部操作栏-->
    <ActionBar :max-w="false" :shrink="false" />

    <!-- 头像 -->
    <div class="w-full flex-x-center mt-35px mb-25px">
      <img style="border: 2px solid #fff" class="w-80px h-80px rounded-50% bg-#fff" src="/logo.png" alt="" />
    </div>

    <!-- 登录菜单 -->
    <n-flex class="ma text-center h-full w-260px" vertical :size="16">
      <n-input
        style="padding-left: 20px"
        size="large"
        maxlength="16"
        minlength="6"
        v-model:value="account"
        type="text"
        :placeholder="accountPH"
        @focus="accountPH = ''"
        @blur="accountPH = '输入HuLa账号'"
        clearable>
        <template #suffix>
          <n-flex @click="arrowStatus = !arrowStatus">
            <svg v-if="!arrowStatus" class="w-18px h-18px color-#505050 cursor-pointer"><use href="#down"></use></svg>
            <svg v-else class="w-18px h-18px color-#505050 cursor-pointer"><use href="#up"></use></svg>
          </n-flex>
        </template>
      </n-input>

      <!-- 账号选择框 -->
      <div
        style="border: 1px solid rgba(70, 70, 70, 0.1)"
        v-if="accountOption.length > 0 && arrowStatus"
        class="absolute w-260px max-h-140px bg-#fdfdfd mt-45px z-99 rounded-8px p-8px box-border">
        <n-scrollbar style="max-height: 120px" trigger="none">
          <n-flex
            vertical
            v-for="(item, index) in accountOption"
            :key="index"
            @click="giveAccount(item.account, item.password)"
            class="p-8px cursor-pointer hover:bg-#f3f3f3 hover: rounded-6px">
            <div class="flex-between-center">
              <div class="w-28px h-28px bg-#ccc rounded-50%"></div>
              <p class="font-size-14px color-#505050">{{ item.account }}</p>
              <img @click.stop="delAccount(index)" src="@/assets/svg/close.svg" class="w-10px h-10px" alt="" />
            </div>
          </n-flex>
        </n-scrollbar>
      </div>

      <n-input
        maxlength="16"
        minlength="6"
        size="large"
        v-model:value="password"
        type="password"
        :placeholder="passwordPH"
        @focus="passwordPH = ''"
        @blur="passwordPH = '输入HuLa密码'"
        clearable />

      <!-- 协议 -->
      <n-flex justify="center" :size="6">
        <n-checkbox v-model:checked="protocol" />
        <div class="font-size-12px color-#909090 cursor-default lh-14px">
          <span>已阅读并同意</span>
          <span class="color-#059669 cursor-pointer">服务协议</span>
          <span>和</span>
          <span class="color-#059669 cursor-pointer">HuLa隐私保护指引</span>
        </div>
      </n-flex>

      <n-button
        :loading="loading"
        :disabled="loginDisabled"
        class="w-full mt-10px mb-35px"
        @click="loginWin"
        type="primary">
        登录
      </n-button>

      <!-- 顶部操作栏 -->
      <n-flex justify="center" class="font-size-14px">
        <div class="color-#059669 cursor-pointer" @click="toQRCode">扫码登录</div>
        <div class="w-1px h-14px bg-#ccc"></div>
        <n-popover style="padding: 6px; border-radius: 8px" trigger="click" :show-checkmark="false" :show-arrow="false">
          <template #trigger>
            <div class="color-#059669 cursor-pointer">更多选项</div>
          </template>
          <n-flex vertical :size="2">
            <div class="font-size-14px cursor-pointer hover:bg-#f3f3f3 hover:rounded-6px p-8px font-size-12px">
              注册账号
            </div>
            <div class="font-size-14px cursor-pointer hover:bg-#f3f3f3 hover:rounded-6px p-8px font-size-12px">
              忘记密码
            </div>
          </n-flex>
        </n-popover>
      </n-flex>
    </n-flex>
  </div>
</template>
<script setup lang="ts">
import router from '@/router'
import { useWindow } from '@/hooks/useWindow.ts'
import { delay } from 'lodash-es'

type Account = {
  account: string
  password: string
  avatar?: string
}[]

const account = ref()
const password = ref()
const protocol = ref()
const loginDisabled = ref(false)
const loading = ref(false)
const arrowStatus = ref(false)
/* todo 模拟账号列表 */
const accountOption = ref<Account>([
  {
    account: 'hula',
    password: '123456'
  },
  {
    account: 'hula1',
    password: '123456'
  },
  {
    account: 'hula2',
    password: '123456'
  },
  {
    account: 'hula3',
    password: '123456'
  }
])
const accountPH = ref('输入HuLa账号')
const passwordPH = ref('输入HuLa密码')
const { createWebviewWindow } = useWindow()

watchEffect(() => {
  loginDisabled.value = !(account.value && password.value && protocol.value)
})

/*监听是否点击了除了下拉框外的其他地方*/
const handleClickOutside = (event: MouseEvent) => {
  if (arrowStatus.value) {
    const accountInput = document.querySelector('.login-box')?.contains(event.target as HTMLElement)
    if (accountInput) {
      arrowStatus.value = false
    }
  }
}

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
  account.value = null
  password.value = null
}

/**
 * 给账号赋值
 * @param au 账号
 * @param paw 密码
 * */
const giveAccount = (au: string, paw: string) => {
  account.value = au
  password.value = paw
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
    await createWebviewWindow('home', 1050, 720, 'login')
    loading.value = false
  }, 800)
}
</script>

<style scoped lang="scss">
@import '@/styles/scss/global/login-bg';
/* 改变输入框中的位置 */
:deep(.n-input .n-input__input, .n-input .n-input__textarea) {
  margin-left: 22px;
}

/* 修改复选框的样式 */
:deep(.n-checkbox .n-checkbox-box) {
  border-radius: 50%;
  width: 16px;
  height: 16px;
}

/* 隐藏naive UI的滚动条 */
:deep(
    .n-scrollbar > .n-scrollbar-rail.n-scrollbar-rail--vertical > .n-scrollbar-rail__scrollbar,
    .n-scrollbar + .n-scrollbar-rail.n-scrollbar-rail--vertical > .n-scrollbar-rail__scrollbar
  ) {
  display: none;
}
</style>

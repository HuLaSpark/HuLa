<template>
  <div class="bg-#f1f1f1 wh-full rounded-8px">
    <!--顶部操作栏-->
    <div data-tauri-drag-region class="w-full flex justify-end">
      <!-- 最小化 -->
      <div @click="minimizeWindow" class="w-28px h24px flex-center hover:bg-#e7e7e7">
        <img src="@/assets/svg/minimize.svg" class="w-38px h-34px" alt="" />
      </div>
      <!-- 关闭窗口 -->
      <div
        @click="closeWindow"
        class="close-box w-28px h24px flex-center cursor-pointer hover:bg-#c22b1c rounded-tr-6px">
        <img src="@/assets/svg/close.svg" class="default-img w-10px h-10px" alt="" />
        <img src="@/assets/svg/close-hover.svg" class="hover-img w-10px h-10px" alt="" />
      </div>
    </div>

    <!-- 头像 -->
    <div class="w-full flex-x-center mt-35px mb-25px">
      <img style="border: 2px solid #fff" class="w-80px h-80px rounded-50%" src="/logo.png" alt="" />
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
          <!--todo 可以参考yao3的关于下拉框-->
          <svg class="w-18px h-18px color-#505050 cursor-pointer"><use href="#down-bojg611f"></use></svg>
        </template>
      </n-input>
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
          <span class="color-#189f57 cursor-pointer">服务协议</span>
          <span>和</span>
          <span class="color-#189f57 cursor-pointer">HuLa隐私保护指引</span>
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
        <div class="color-#189f57 cursor-pointer">扫码登录</div>
        <div class="w-1px h-14px bg-#ccc"></div>
        <n-popover style="padding: 6px; border-radius: 8px" trigger="click" :show-checkmark="false" :show-arrow="false">
          <template #trigger>
            <div class="color-#189f57 cursor-pointer">更多选项</div>
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
import { WebviewWindow } from '@tauri-apps/api/window'
import { closeWindow, autoCloseWindow, minimizeWindow } from '@/common/WindowEvent.ts'

const account = ref()
const password = ref()
const protocol = ref()
const loginDisabled = ref(false)
const loading = ref(false)
const accountPH = ref('输入HuLa账号')
const passwordPH = ref('输入HuLa密码')

watchEffect(() => {
  loginDisabled.value = !(account.value && password.value && protocol.value)
})

const loginWin = async () => {
  loading.value = true
  const webview = new WebviewWindow('home', {
    url: '/',
    fullscreen: false,
    resizable: true,
    center: true,
    width: 1050,
    height: 720,
    skipTaskbar: false,
    decorations: false,
    transparent: true
  })
  await webview.once('tauri://created', function () {
    console.log('创建成功')
    autoCloseWindow('login')
    loading.value = false
  })
  await webview.once('tauri://error', function (e) {
    console.log(e)
    loading.value = false
  })
}
</script>

<style scoped lang="scss">
/* 当鼠标悬停在按钮上时，切换显示状态 */
.close-box {
  /* 默认不显示 */
  .hover-img {
    display: none;
  }
  &:hover {
    .default-img {
      display: none;
    }
    .hover-img {
      display: block;
    }
  }
}

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
</style>

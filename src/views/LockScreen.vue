<template>
  <!-- 锁屏页面 -->
  <div class="login-box select-none absolute top-0 left-0 w-full h-full z-9999 transition-all duration-300 ease-in-out">
    <ActionBar :current-label="appWindow.label" :shrink="false" />

    <Transition name="slide-fade" appear>
      <!--  壁纸界面  -->
      <div v-if="!isUnlockPage" data-tauri-drag-region @click.stop="isUnlockPage = true" class="size-full">
        <n-flex vertical align="center" :size="120" class="size-full mt-60px">
          <n-flex vertical align="center" :size="20">
            <p class="text-(80px #808080) font-bold">{{ currentTime }}</p>
            <n-flex align="center" :size="30" class="text-(26px #909090)">
              <p>{{ currentMonthAndDate }}</p>
              <p>{{ currentWeekday }}</p>
            </n-flex>
          </n-flex>

          <n-flex
            vertical
            justify="center"
            align="center"
            :size="20"
            style="transition: all 0.6s ease-in-out"
            class="cursor-pointer p-12px rounded-8px hover:bg-#13987f33">
            <svg class="size-24px color-#808080 p-4px bg-#e3e3e3 rounded-8px"><use href="#search"></use></svg>
            <p class="text-(16px #909090) w-240px line-clamp-2">
              这是一个开源的即时通讯(IM)应用，它采用了一些最新的前端技术，包括 Tauri、Vue3、Vite5、UnoCSS 和
              TypeScript。这个项目的目标是提供一个高效、稳定且易于使用的即时通讯平台。
            </p>
          </n-flex>
        </n-flex>
      </div>

      <!-- 解锁界面  -->
      <n-flex v-else data-tauri-drag-region vertical align="center" justify="center" :size="10" class="h-full">
        <n-flex vertical align="center" justify="center" :size="30" class="mt--75px">
          <n-avatar round bordered :size="120" :src="login.accountInfo.avatar" />
          <p class="text-(18px #606060)">{{ login.accountInfo.name }}</p>

          <!-- 密码输入框 -->
          <n-input
            v-if="!isLogining && !isWrongPassword"
            ref="inputInstRef"
            style="
              width: 320px;
              border: 2px solid rgba(104, 104, 104, 0.2);
              border-bottom-color: rgba(19, 152, 127, 0.8);
            "
            placeholder="锁屏密码"
            show-password-on="click"
            type="password"
            @keyup.enter.prevent="unlock"
            v-model:value="password">
            <template #suffix>
              <n-popover trigger="hover">
                <template #trigger>
                  <svg
                    @click.stop="unlock"
                    class="size-16px mr-6px p-[4px_6px] rounded-8px cursor-pointer transition-all duration-300 ease-in-out hover:(bg-#13987fe6 color-#e3e3e3)">
                    <use href="#arrow-right"></use>
                  </svg>
                </template>
                <p>进入系统</p>
              </n-popover>
            </template>
          </n-input>

          <!-- 登录时显示的文字 -->
          <n-flex vertical align="center" justify="center" :size="30" v-if="isLogining && !isWrongPassword">
            <img class="size-32px" src="@/assets/img/loading-one.svg" alt="" />
            <p class="text-(18px #404040)">登录中...</p>
          </n-flex>

          <!-- 密码不正常时显示 -->
          <n-flex v-if="isWrongPassword" vertical justify="center" align="center" :size="30">
            <p class="text-(16px #707070)">密码不正确, 请再试一次</p>
            <n-button @click="init" secondary class="w-120px"> 确定 </n-button>
          </n-flex>
        </n-flex>

        <n-flex v-if="!isLogining && !isWrongPassword" justify="space-between" align="center" :size="0" class="options">
          <n-button quaternary color="#606060" @click="isUnlockPage = false">返回</n-button>
          <n-button @click="logout" quaternary color="#707070">退出登录</n-button>
          <n-button quaternary color="#707070">忘记密码</n-button>
          <n-button @click="unlock" quaternary type="primary">进入系统</n-button>
        </n-flex>
      </n-flex>
    </Transition>
  </div>
</template>
<script setup lang="ts">
import { appWindow } from '@tauri-apps/api/window'
import { setting } from '@/stores/setting.ts'
import { storeToRefs } from 'pinia'
import { useLogin } from '@/hooks/useLogin.ts'
import { onKeyStroke } from '@vueuse/core'
import { InputInst } from 'naive-ui'
import { getWeekday } from '@/utils/Day.ts'
import dayjs from 'dayjs'

const settingStore = setting()
const { lockScreen, login } = storeToRefs(settingStore)
const { logout } = useLogin()
/** 解锁密码 */
const password = ref('')
/** 是否是解锁页面 */
const isUnlockPage = ref(false)
/** 是否是登录中 */
const isLogining = ref(false)
/** 密码不正确时显示 */
const isWrongPassword = ref(false)
/** 当前时间 */
const currentTime = ref(dayjs().format('HH:mm'))
/** 当前月份和日期 */
const currentMonthAndDate = ref(dayjs().format('MM/DD'))
// const currentMonthAndDate = ref(new Date().toLocaleDateString('chinese', { month: 'long', day: 'numeric' }))
/** 当前星期 */
const currentWeekday = ref(getWeekday(new Date().toLocaleString()))
/** 计算当前时间的定时器 */
let intervalId: NodeJS.Timeout | null = null
/** 密码输入框实例 */
const inputInstRef = ref<InputInst | null>(null)

watch(isUnlockPage, (val) => {
  if (val) {
    /** 延迟 300ms 后自动获取焦点，不然会触发一次回车事件 */
    setTimeout(() => {
      inputInstRef.value?.focus()
    }, 300)
  }
})

watch(isWrongPassword, (val) => {
  if (val) {
    onKeyStroke('Enter', (e) => {
      e.preventDefault()
      init()
    })
  }
})

const unlock = () => {
  if (password.value === '') {
    window.$message.error('请输入密码')
  } else {
    isLogining.value = true
    if (password.value === lockScreen.value.password) {
      setTimeout(() => {
        lockScreen.value.enable = false
        isLogining.value = false
      }, 1000)
    } else {
      setTimeout(() => {
        isWrongPassword.value = true
      }, 300)
    }
  }
}

/** 重置登录状态 */
const init = () => {
  if (isWrongPassword.value) {
    isWrongPassword.value = false
    isLogining.value = false
    setTimeout(() => {
      inputInstRef.value?.focus()
    }, 600)
    password.value = ''
  }
}

onMounted(() => {
  console.log(currentWeekday.value)
  intervalId = setInterval(() => {
    currentTime.value = dayjs().format('HH:mm')
    currentMonthAndDate.value = dayjs().format('MM/DD')
    currentWeekday.value = getWeekday(new Date().toLocaleString())
  }, 1000)
  if (!isUnlockPage.value) {
    onKeyStroke('Enter', (e) => {
      e.preventDefault()
      isUnlockPage.value = true
    })
  }
})

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId)
  }
})
</script>
<style scoped lang="scss">
@import '@/styles/scss/global/login-bg';
.options {
  @apply w-320px;
  p {
    @apply text-(14px [--chat-text-color]) cursor-pointer select-none p-8px bg-#ccc rounded-lg;
  }
}

/*
  进入和离开动画可以使用不同
  持续时间和速度曲线。
*/
.slide-fade-enter-active {
  transition: all 0.2s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.6s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(20px);
  opacity: 0;
}
</style>

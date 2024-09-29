<template>
  <!-- 锁屏页面 -->
  <!--  // TODO 锁屏时隐藏其他窗口，解锁后再显示 (nyh -> 2024-07-14 01:39:01) -->
  <div
    data-tauri-drag-region
    class="lock-bg rounded-8px select-none absolute top-0 left-0 w-full h-full z-9999 transition-all duration-300 ease-in-out">
    <ActionBar class="absolute top-0 right-0 z-99999" :current-label="appWindow.label" :shrink="false" />

    <Transition name="slide-fade" appear>
      <!--  壁纸界面  -->
      <div v-if="!isUnlockPage" @click.stop="isUnlockPage = true" class="size-full rounded-8px">
        <n-flex vertical align="center" :size="120" class="size-full mt-10%">
          <n-flex vertical align="center" :size="20" class="will-change-auto will-change-contents">
            <p class="text-(100px #f1f1f1) font-500">{{ currentTime }}</p>
            <n-flex align="center" :size="30" class="text-(30px #f1f1f1)">
              <p>{{ currentMonthAndDate }}</p>
              <p>{{ currentWeekday }}</p>
            </n-flex>
          </n-flex>

          <n-flex vertical justify="center" align="center" :size="20" class="tips">
            <svg><use href="#search"></use></svg>
            <p class="text-(16px #f1f1f1) text-center">
              这是一个开源的即时通讯(IM)应用，它采用了一些最新的前端技术，包括 Tauri、Vue3、Vite5、UnoCSS 和
              TypeScript。
            </p>
            <p class="text-(12px #909090) opacity-0">这个项目的目标是提供一个高效、稳定且易于使用的即时通讯平台。</p>
            <a
              @click.stop="$event.stopPropagation()"
              target="_blank"
              rel="noopener noreferrer"
              href="https://github.com/HuLaSpark/HuLa-IM-Tauri"
              class="no-underline text-(14px #f3f3f3) opacity-0">
              了解更多
            </a>
          </n-flex>
        </n-flex>
      </div>

      <!-- 解锁界面  -->
      <n-flex
        v-else
        data-tauri-drag-region
        vertical
        align="center"
        justify="center"
        :size="16"
        class="h-full backdrop-blur-md rounded-8px">
        <n-flex vertical align="center" justify="center" :size="30" class="mt--75px">
          <n-avatar round style="border: 2px solid #f1f1f1" :size="120" :src="login.accountInfo.avatar" />
          <p class="text-(24px #f1f1f1) font-500">{{ login.accountInfo.name }}</p>

          <!-- 密码输入框 -->
          <n-config-provider :theme="lightTheme">
            <n-input
              v-if="!isLogining && !isWrongPassword"
              ref="inputInstRef"
              style="
                width: 320px;
                border: 2px solid rgba(255, 255, 255, 0.1);
                border-bottom-color: rgba(19, 152, 127, 1);
                background-color: #404040;
                color: #fff;
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
                      class="size-16px color-#e3e3e3 mr-6px p-[4px_6px] rounded-8px cursor-pointer transition-all duration-300 ease-in-out hover:bg-#13987fe6">
                      <use href="#arrow-right"></use>
                    </svg>
                  </template>
                  <p>进入系统</p>
                </n-popover>
              </template>
            </n-input>
          </n-config-provider>

          <!-- 登录时显示的文字 -->
          <n-flex vertical align="center" justify="center" :size="30" v-if="isLogining && !isWrongPassword">
            <img class="size-42px" src="@/assets/img/loading-bright.svg" alt="" />
            <p class="text-(20px #f1f1f1)">解锁中</p>
          </n-flex>

          <!-- 密码不正常时显示 -->
          <n-flex v-if="isWrongPassword" vertical justify="center" align="center" :size="30">
            <p class="text-(18px #f1f1f1)">密码不正确, 请再试一次</p>
            <p
              @click="init"
              class="w-120px bg-[rgba(255,255,255,0.1)] backdrop-blur-xl cursor-pointer p-10px rounded-8px text-(14px #323232 center) font-500">
              确定
            </p>
          </n-flex>
        </n-flex>

        <n-flex v-if="!isLogining && !isWrongPassword" justify="space-around" align="center" :size="0" class="options">
          <p class="text-(14px #fefefe)" @click="isUnlockPage = false">返回</p>
          <p class="text-(14px #fefefe)" @click="logout">退出登录</p>
          <p class="text-(14px #fefefe)">忘记密码</p>
          <p class="text-(14px #fff)" @click="unlock">进入系统</p>
        </n-flex>
      </n-flex>
    </Transition>
  </div>
</template>
<script setup lang="ts">
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { setting } from '@/stores/setting.ts'
import { useLogin } from '@/hooks/useLogin.ts'
import { onKeyStroke } from '@vueuse/core'
import { InputInst, lightTheme } from 'naive-ui'
import { getWeekday } from '@/utils/Day.ts'
import dayjs from 'dayjs'

const appWindow = WebviewWindow.getCurrent()
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

/** 解锁 */
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
.lock-bg {
  background-image: url('@/assets/img/lock_bg.jpg');
  background-size: cover; // 或者使用 contain，取决于你想要的效果
  background-position: center; // 确保图片居中
  background-repeat: no-repeat; // 防止图片重复
}

.options {
  @apply w-320px;
  p {
    @apply cursor-pointer select-none;
  }
}

.tips {
  @apply cursor-pointer w-240px p-12px rounded-8px transition-all duration-300 ease-in-out hover:bg-#323232;
  svg {
    @apply size-24px color-#f1f1f1 p-4px bg-#323232 rounded-8px;
  }
  &:hover {
    p {
      @apply opacity-100;
    }
    a {
      @apply opacity-100 hover:underline;
    }
  }
}

:deep(.hover-box),
:deep(.action-close) {
  svg {
    color: #fff;
  }
}
:deep(.hover-box) {
  &:hover {
    background-color: #464646;
  }
}
:deep(.n-input .n-input__input-el, .n-input .n-input__textarea-el) {
  color: #fff;
}

/*
  进入和离开动画可以使用不同
  持续时间和速度曲线。
*/
.slide-fade-enter-active {
  transition: all 0.2s ease-in-out;
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

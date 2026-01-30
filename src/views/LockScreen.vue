<template>
  <!-- 锁屏页面 -->
  <div
    data-tauri-drag-region
    class="login-box overflow-y-hidden rounded-8px select-none absolute top-0 left-0 w-full h-full z-9999 transition-all duration-300 ease-in-out">
    <ActionBar class="absolute top-0 right-0 z-99999" :current-label="appWindow.label" :shrink="false" />

    <Transition name="slide-fade" appear>
      <!--  壁纸界面  -->
      <div v-if="!isUnlockPage" @click.stop="isUnlockPage = true" class="size-full rounded-8px">
        <n-flex vertical align="center" :size="120" class="size-full mt-10%">
          <n-flex vertical align="center" :size="20" class="will-change-auto will-change-contents">
            <p class="text-(100px [--chat-text-color]) font-500">{{ currentTime }}</p>
            <n-flex align="center" :size="30" class="text-(30px [--chat-text-color])">
              <p>{{ currentMonthAndDate }}</p>
              <p>{{ currentWeekday }}</p>
            </n-flex>
          </n-flex>

          <n-flex vertical justify="center" align="center" :size="20" class="tips">
            <svg><use href="#search"></use></svg>
            <p class="text-(16px [--chat-text-color]) text-center leading-24px">
              {{ t('message.lock_screen.tip_description') }}
            </p>
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
          <n-avatar
            round
            style="border: 2px solid #f1f1f1"
            :size="120"
            :src="AvatarUtils.getAvatarUrl(userStore.userInfo!.avatar!)" />
          <p class="text-(24px [--chat-text-color]) font-500">{{ userStore.userInfo!.name }}</p>

          <!-- 密码输入框 -->
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
            spellCheck="false"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            :placeholder="t('message.lock_screen.password_placeholder')"
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
                <p>{{ t('message.lock_screen.enter_system_tooltip') }}</p>
              </n-popover>
            </template>
          </n-input>

          <!-- 登录时显示的文字 -->
          <n-flex vertical align="center" justify="center" :size="30" v-if="isLogining && !isWrongPassword">
            <img class="size-42px" src="@/assets/img/loading-one.svg" alt="" />
            <p class="text-(20px [--chat-text-color])">{{ t('message.lock_screen.unlocking') }}</p>
          </n-flex>

          <!-- 密码不正常时显示 -->
          <n-flex v-if="isWrongPassword" vertical justify="center" align="center" :size="30">
            <p class="text-(18px [--chat-text-color])">{{ t('message.lock_screen.wrong_password') }}</p>
            <p
              @click="init"
              class="w-120px bg-[rgba(255,255,255,0.1)] backdrop-blur-xl cursor-pointer p-10px rounded-8px text-(14px #323232 center) font-500">
              {{ t('message.lock_screen.confirm_button') }}
            </p>
          </n-flex>
        </n-flex>

        <n-flex
          v-if="!isLogining && !isWrongPassword"
          justify="space-around"
          align="center"
          :size="0"
          class="options text-(14px [--chat-text-color])">
          <p @click="isUnlockPage = false">{{ t('message.lock_screen.return_action') }}</p>
          <p @click="logout">{{ t('message.lock_screen.logout_action') }}</p>
          <p>{{ t('message.lock_screen.forgot_password') }}</p>
          <p @click="unlock">{{ t('message.lock_screen.enter_system_action') }}</p>
        </n-flex>
      </n-flex>
    </Transition>
  </div>
</template>
<script setup lang="ts">
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { onKeyStroke } from '@vueuse/core'
import dayjs from 'dayjs'
import { type InputInst } from 'naive-ui'
import { useLogin } from '@/hooks/useLogin.ts'
import { useSettingStore } from '@/stores/setting.ts'
import { useUserStore } from '@/stores/user.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { getWeekday } from '@/utils/ComputedTime'
import { useI18n } from 'vue-i18n'

const appWindow = WebviewWindow.getCurrent()
const settingStore = useSettingStore()
const userStore = useUserStore()
const { lockScreen } = storeToRefs(settingStore)
const { logout } = useLogin()
const { t } = useI18n()
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
/** 白名单窗口（锁屏时不隐藏的窗口） */
const whitelistWindows = ['home', 'tray', 'capture', 'checkupdate', 'notify']
/** 被隐藏的窗口列表 */
const hiddenWindows = ref<string[]>([])

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
    window.$message.error(t('message.lock_screen.toast_empty_password'))
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

/** 隐藏其他窗口 */
const hideOtherWindows = async () => {
  const allWindows = await WebviewWindow.getAll()
  const windowsToHide = allWindows.filter(
    (window) => !whitelistWindows.includes(window.label) && window.label !== 'lockScreen'
  )

  for (const window of windowsToHide) {
    await window.hide()
    hiddenWindows.value.push(window.label)
  }
}

/** 显示之前隐藏的窗口 */
const showHiddenWindows = async () => {
  for (const windowLabel of hiddenWindows.value) {
    const window = await WebviewWindow.getByLabel(windowLabel)
    if (window) {
      await window.show()
    }
  }
  hiddenWindows.value = []
}

// 监听锁屏状态变化
watchEffect(() => {
  if (!lockScreen.value.enable) {
    // 解锁时显示之前隐藏的窗口
    showHiddenWindows()
  }
})

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

  // 锁屏时隐藏其他窗口，解锁时显示
  hideOtherWindows()
})

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId)
  }
})
</script>
<style scoped lang="scss">
@use '@/styles/scss/global/login-bg';

.options {
  @apply w-320px;
  p {
    @apply cursor-pointer select-none;
  }
}

.tips {
  @apply cursor-pointer w-240px p-12px rounded-8px transition-all duration-300 ease-in-out;
  svg {
    @apply size-24px color-#f1f1f1 p-4px bg-#80808080 rounded-8px;
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

<template>
  <NaiveProvider :message-max="3" :notific-max="3">
    <div v-if="!isLock" id="app-container">
      <router-view />
    </div>
    <!-- 锁屏页面 -->
    <LockScreen v-else />
  </NaiveProvider>
</template>
<script setup lang="ts">
import { listen } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { type } from '@tauri-apps/plugin-os'
import { useStorage } from '@vueuse/core'
import { MittEnum, StoresEnum, ThemeEnum } from '@/enums'
import { useLogin } from '@/hooks/useLogin.ts'
import { useMitt } from '@/hooks/useMitt.ts'
import { useWindow } from '@/hooks/useWindow.ts'
import router from '@/router'
import { useSettingStore } from '@/stores/setting.ts'
import LockScreen from '@/views/LockScreen.vue'
import { useTauriListener } from './hooks/useTauriListener'
import type { IKeyboardDidShowDetail } from './mobile/mobile-client/interface/adapter'

const appWindow = WebviewWindow.getCurrent()
const { createWebviewWindow } = useWindow()
const settingStore = useSettingStore()
const { themes, lockScreen, page } = storeToRefs(settingStore)
const { resetLoginState, logout } = useLogin()
const token = useStorage<string | null>('TOKEN', null)
const refreshToken = useStorage<string | null>('REFRESH_TOKEN', null)
const { addListener } = useTauriListener()

/** 不需要锁屏的页面 */
const LockExclusion = new Set(['/login', '/tray', '/qrCode', '/about', '/onlineStatus'])
const isLock = computed(() => {
  return !LockExclusion.has(router.currentRoute.value.path) && lockScreen.value.enable
})
const isDesktop = computed(() => {
  return type() === 'windows' || type() === 'linux' || type() === 'macos'
})
const isMobile = computed(() => {
  return type() === 'android' || type() === 'ios'
})

/** 禁止图片以及输入框的拖拽 */
const preventDrag = (e: MouseEvent) => {
  const event = e.target as HTMLElement
  // 检查目标元素是否是<img>元素
  if (event.nodeName.toLowerCase() === 'img' || event.nodeName.toLowerCase() === 'input') {
    e.preventDefault()
  }
}

/** 控制阴影 */
watch(
  () => page.value.shadow,
  (val) => {
    document.documentElement.style.setProperty('--shadow-enabled', val ? '0' : '1')
  },
  { immediate: true }
)

/** 控制高斯模糊 */
watch(
  () => page.value.blur,
  (val) => {
    document.documentElement.setAttribute('data-blur', val ? '1' : '0')
  },
  { immediate: true }
)

/** 控制字体样式 */
watch(
  () => page.value.fonts,
  (val) => {
    document.documentElement.style.setProperty('--font-family', val)
  },
  { immediate: true }
)

/** 控制变化主题 */
watch(
  () => themes.value.versatile,
  async (val, oldVal) => {
    await import(`@/styles/scss/theme/${val}.scss`)
    // 然后给最顶层的div设置val的类样式
    const app = document.querySelector('#app')?.classList as DOMTokenList
    app.remove(oldVal as string)
    await nextTick(() => {
      app.add(val)
    })
  },
  { immediate: true }
)

watch(
  [token, refreshToken],
  async ([newToken, newRefreshToken]) => {
    // 如果不在主窗口下，则不执行token检查和重新登录逻辑
    if (appWindow.label !== 'home') {
      return
    }

    // 非登录页面才执行 token 检查和重新登录逻辑
    if (!newToken || !newRefreshToken) {
      console.log('🔑 Token 或 RefreshToken 丢失，需要重新登录')
      await resetLoginState()
      await logout()
    }
  },
  { immediate: true }
)

onMounted(async () => {
  // 判断是否是桌面端，桌面端需要调整样式
  isDesktop.value && (await import('@/styles/scss/global/desktop.scss'))
  // 判断是否是移动端，移动端需要加载安全区域适配样式
  isMobile.value && (await import('@/styles/scss/global/mobile.scss'))
  await import(`@/styles/scss/theme/${themes.value.versatile}.scss`)
  // 判断localStorage中是否有设置主题
  if (!localStorage.getItem(StoresEnum.SETTING)) {
    settingStore.initTheme(ThemeEnum.OS)
  }
  document.documentElement.dataset.theme = themes.value.content
  window.addEventListener('dragstart', preventDrag)
  /** 开发环境不禁止 */
  if (process.env.NODE_ENV !== 'development') {
    /** 禁用浏览器默认的快捷键 */
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && (e.key === 'f' || e.key === 'r' || e.key === 'g' || e.key === 'j')) {
        e.preventDefault()
      }
    })
    /** 禁止右键菜单 */
    window.addEventListener('contextmenu', (e) => e.preventDefault(), false)
  }
  // 监听需要重新登录的事件
  window.addEventListener('needReLogin', async () => {
    console.log('👾 需要重新登录')
    // 重置登录状态
    await resetLoginState()
    // 最后调用登出方法(这会创建登录窗口)
    await logout()
  })
  useMitt.on(MittEnum.CHECK_UPDATE, async () => {
    const checkUpdateWindow = await WebviewWindow.getByLabel('checkupdate')
    await checkUpdateWindow?.show()
  })
  useMitt.on(MittEnum.DO_UPDATE, async (event) => {
    await createWebviewWindow('更新', 'update', 490, 335, '', false, 490, 335, false, true)
    const closeWindow = await WebviewWindow.getByLabel(event.close)
    closeWindow?.close()
  })

  addListener(
    listen('refresh_token_event', (event) => {
      console.log('🔄 收到 refresh_token 事件')

      // 从 event.payload 中获取 token 和 refreshToken
      const payload: any = event.payload

      if (payload.token) {
        token.value = payload.token
      }

      if (payload.refreshToken) {
        refreshToken.value = payload.refreshToken
      }
    }),
    'refresh_token_event'
  )
})

onUnmounted(() => {
  window.removeEventListener('contextmenu', (e) => e.preventDefault(), false)
  window.removeEventListener('dragstart', preventDrag)
})

if (type() === 'ios' || type() === 'android') {
  import('@/mobile/mobile-client/MobileClient').then(async (module) => {
    const { useMobileStore } = await import('@/stores/mobile')

    const mobileStore = useMobileStore()

    await module.initMobileClient()

    const showKeyboard = (detail: IKeyboardDidShowDetail) => {
      mobileStore.updateKeyboardDetail(detail)
      mobileStore.updateKeyboardState(true)
    }

    const hideKeyboard = () => {
      mobileStore.updateKeyboardState(false)
    }

    const { removeHideFunction, removeShowFunction } = module.mobileClient.keyboardListener(showKeyboard, hideKeyboard)

    onUnmounted(() => {
      removeShowFunction()
      removeHideFunction()
    })
  })
}
</script>
<style lang="scss">
/* 修改naive-ui select 组件的样式 */
.n-base-selection,
.n-base-select-menu,
.n-base-select-menu .n-base-select-option .n-base-select-option__content,
.n-base-select-menu .n-base-select-option::before {
  border-radius: 8px;
  font-size: 12px;
}

img {
  user-select: none;
  -webkit-user-select: none;
}

input,
button,
a {
  user-select: auto;
  cursor: auto;
}
</style>

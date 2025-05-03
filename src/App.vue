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
import { useSettingStore } from '@/stores/setting.ts'
import { StoresEnum, ThemeEnum } from '@/enums'
import LockScreen from '@/views/LockScreen.vue'
import router from '@/router'
import { type } from '@tauri-apps/plugin-os'
import { useLogin } from '@/hooks/useLogin.ts'
import { useStorage } from '@vueuse/core'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { check } from '@tauri-apps/plugin-updater'
import { getVersion } from '@tauri-apps/api/app'
import { useWindow } from '@/hooks/useWindow.ts'

const appWindow = WebviewWindow.getCurrent()
const settingStore = useSettingStore()
const { createWebviewWindow } = useWindow()
const { themes, lockScreen, page } = storeToRefs(settingStore)
const { resetLoginState, logout } = useLogin()
const token = useStorage('TOKEN', null)
const refreshToken = useStorage('REFRESH_TOKEN', null)

/** 不需要锁屏的页面 */
const LockExclusion = new Set(['/login', '/tray', '/qrCode', '/about', '/onlineStatus'])
const isLock = computed(() => {
  return !LockExclusion.has(router.currentRoute.value.path) && lockScreen.value.enable
})
const isDesktop = computed(() => {
  return type() === 'windows' || type() === 'linux' || type() === 'macos'
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

const checkUpdate = async () => {
  const url = `https://gitee.com/api/v5/repos/HuLaSpark/HuLa/tags?access_token=${import.meta.env.VITE_GITEE_TOKEN}&sort=name&direction=desc&page=1&per_page=1`

  await check()
    .then((e) => {
      if (!e?.available) {
        return
      }
      // 检查版本之间不同的提交信息和提交日期
      fetch(url).then((res) => {
        res
          .json()
          .then(async () => {
            await nextTick(() => {
              let url = `https://gitee.com/api/v5/repos/HuLaSpark/HuLa/tags?access_token=${import.meta.env.VITE_GITEE_TOKEN}&sort=updated&direction=desc&page=1&per_page=1`
              fetch(url).then((res) => {
                res.json().then(async (data) => {
                  const newVersion = data[0].name.replace('v', '')
                  const newMajorVersion = newVersion.substring(0, newVersion.indexOf('.'))
                  const newMiddleVersion = newVersion.substring(
                    newVersion.indexOf('.') + 1,
                    newVersion.lastIndexOf('.') === -1 ? newVersion.length : newVersion.lastIndexOf('.')
                  )
                  const currenVersion = await getVersion()
                  const currentMajorVersion = currenVersion.substring(0, currenVersion.indexOf('.'))
                  const currentMiddleVersion = currenVersion.substring(
                    currenVersion.indexOf('.') + 1,
                    currenVersion.lastIndexOf('.') === -1 ? currenVersion.length : currenVersion.lastIndexOf('.')
                  )
                  if (
                    newMajorVersion > currentMajorVersion ||
                    (newMajorVersion === currentMajorVersion && newMiddleVersion > currentMiddleVersion)
                  ) {
                    await createWebviewWindow('HuLa', 'update', 490, 335, '', false)
                    const loginWindow = await WebviewWindow.getByLabel('login')
                    loginWindow?.close()
                  }
                })
              })
            })
          })
          .catch((e) => {
            console.log(e)
          })
      })
    })
    .catch((e) => {
      console.log(e)
    })
}

onMounted(async () => {
  // 判断是否是桌面端，桌面端需要调整样式
  isDesktop.value && (await import('@/styles/scss/desktop.scss'))
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
  await checkUpdate()
})

onUnmounted(() => {
  window.removeEventListener('contextmenu', (e) => e.preventDefault(), false)
  window.removeEventListener('dragstart', preventDrag)
})
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

* {
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

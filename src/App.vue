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
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { exit } from '@tauri-apps/plugin-process'
import { EventEnum, MittEnum, StoresEnum, ThemeEnum } from '@/enums'
import { useFixedScale } from '@/hooks/useFixedScale'
import { useGlobalShortcut } from '@/hooks/useGlobalShortcut.ts'
import { useMitt } from '@/hooks/useMitt.ts'
import { useMobile } from '@/hooks/useMobile.ts'
import { useWindow } from '@/hooks/useWindow.ts'
import router from '@/router'
import { useSettingStore } from '@/stores/setting.ts'
import { isDesktop, isMobile, isWindows } from '@/utils/PlatformConstants'
import LockScreen from '@/views/LockScreen.vue'

const appWindow = WebviewWindow.getCurrent()
// 只在桌面端初始化窗口管理功能
const { createWebviewWindow } = isDesktop() ? useWindow() : { createWebviewWindow: () => {} }
const settingStore = useSettingStore()
const { themes, lockScreen, page } = storeToRefs(settingStore)
// 全局快捷键管理
const { initializeGlobalShortcut, cleanupGlobalShortcut } = useGlobalShortcut()

// 创建固定缩放控制器（使用 #app-container 作为目标，避免影响浮层定位）
const fixedScale = useFixedScale({
  target: '#app-container',
  mode: 'transform',
  enableWindowsTextScaleDetection: true
})

/** 不需要锁屏的页面 */
const LockExclusion = new Set(['/login', '/tray', '/qrCode', '/about', '/onlineStatus', '/capture'])
const isLock = computed(() => {
  return !LockExclusion.has(router.currentRoute.value.path) && lockScreen.value.enable
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

// 只在桌面端监听退出事件
if (isDesktop()) {
  appWindow.listen(EventEnum.EXIT, async () => {
    await exit(0)
  })
}

onMounted(async () => {
  // 仅在windows上使用
  if (isWindows()) {
    fixedScale.enable()
  }
  // 判断是否是桌面端，桌面端需要调整样式
  isDesktop() && (await import('@/styles/scss/global/desktop.scss'))
  // 判断是否是移动端，移动端需要加载安全区域适配样式
  isMobile() && (await import('@/styles/scss/global/mobile.scss'))
  await import(`@/styles/scss/theme/${themes.value.versatile}.scss`)
  // 判断localStorage中是否有设置主题
  if (!localStorage.getItem(StoresEnum.SETTING)) {
    settingStore.initTheme(ThemeEnum.OS)
  }
  document.documentElement.dataset.theme = themes.value.content
  window.addEventListener('dragstart', preventDrag)

  // 只在桌面端的主窗口中初始化全局快捷键
  if (isDesktop() && appWindow.label === 'home') {
    await initializeGlobalShortcut()
  }
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
  // 只在桌面端处理窗口相关事件
  if (isDesktop()) {
    useMitt.on(MittEnum.CHECK_UPDATE, async () => {
      const checkUpdateWindow = await WebviewWindow.getByLabel('checkupdate')
      await checkUpdateWindow?.show()
    })
    useMitt.on(MittEnum.DO_UPDATE, async (event) => {
      await createWebviewWindow('更新', 'update', 490, 335, '', false, 490, 335, false, true)
      const closeWindow = await WebviewWindow.getByLabel(event.close)
      closeWindow?.close()
    })
  }
})

onUnmounted(async () => {
  // 关闭固定缩放，恢复样式与监听
  fixedScale.disable()

  window.removeEventListener('contextmenu', (e) => e.preventDefault(), false)
  window.removeEventListener('dragstart', preventDrag)

  // 只在桌面端的主窗口中清理全局快捷键
  if (isDesktop() && appWindow.label === 'home') {
    await cleanupGlobalShortcut()
  }
})

useMobile()
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

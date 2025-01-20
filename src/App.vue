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
import { onlineStatus } from '@/stores/onlineStatus.ts'
import LockScreen from '@/views/LockScreen.vue'
import router from '@/router'
import { type } from '@tauri-apps/plugin-os'

const settingStore = useSettingStore()
const OLStatusStore = onlineStatus()
const { themes, lockScreen, page } = storeToRefs(settingStore)
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

onMounted(async () => {
  // 判断是否是桌面端，桌面端需要调整样式
  isDesktop.value && (await import('@/styles/scss/desktop.scss'))
  await import(`@/styles/scss/theme/${themes.value.versatile}.scss`)
  // 判断localStorage中是否有设置主题
  if (!localStorage.getItem(StoresEnum.SETTING)) {
    settingStore.initTheme(ThemeEnum.OS)
  }
  /** 第一次没有选状态的时候随机选中一个状态 */
  if (!localStorage.getItem(StoresEnum.ONLINE_STATUS)) {
    OLStatusStore.init()
  }
  document.documentElement.dataset.theme = themes.value.content
  window.addEventListener('dragstart', preventDrag)
  /** 开发环境不禁止 */
  if (process.env.NODE_ENV !== 'development') {
    /** 禁用浏览器默认的快捷键 */
    window.addEventListener('keydown', (e) => {
      // 排除ctrl+c ctrl+v ctrl+enter
      if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'Enter')) return
      if (e.ctrlKey || e.metaKey || e.altKey) {
        e.preventDefault()
      }
    })
    /** 禁止右键菜单 */
    window.addEventListener('contextmenu', (e) => e.preventDefault(), false)
  }
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
</style>

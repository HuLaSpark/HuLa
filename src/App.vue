<template>
  <NaiveProvider :message-max="3" :notific-max="3">
    <div id="app">
      <router-view />
    </div>
  </NaiveProvider>
</template>
<script setup lang="ts">
import { setting } from '@/stores/setting.ts'
import { storeToRefs } from 'pinia'
import { StoresEnum, ThemeEnum } from '@/enums'
import { onlineStatus } from '@/stores/onlineStatus.ts'

const settingStore = setting()
const OLStatusStore = onlineStatus()
const { themes } = storeToRefs(settingStore)

/** 禁止图片以及输入框的拖拽 */
const preventDrag = (e: MouseEvent) => {
  const event = e.target as HTMLElement
  // 检查目标元素是否是<img>元素
  if (event.nodeName.toLowerCase() === 'img' || event.nodeName.toLowerCase() === 'input') {
    e.preventDefault()
  }
}

onMounted(() => {
  // initWebSocket()
  // /**! 使用msi或者其他安装包安装后才会显示应用的名字和图标 */
  // sendNotification({ title: 'TAURI', body: 'Tauri is awesome!' })
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
#app {
  min-height: 100vh;
  background-repeat: no-repeat;
  background-size: 100% 100%;
  position: fixed;
  height: 100%;
  width: 100%;
  top: 0;
  left: 0;
  transition: all 0.9s ease;
  border-radius: 10px;
}
</style>

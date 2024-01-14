<template>
  <n-button @click="switchTheme" secondary type="error">切换主题</n-button>
</template>
<script setup lang="ts">
import { delay } from 'lodash-es'
import { theme } from '@/stores/theme.ts'
import { storeToRefs } from 'pinia'

const themeStore = theme()
const { EYE_THEME } = storeToRefs(themeStore)

/*切换主题*/
const switchTheme = (event: MouseEvent) => {
  const x = event.clientX
  const y = event.clientY
  const endRadius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))

  let isDark: boolean

  delay(() => {
    EYE_THEME.value = !EYE_THEME.value
    /*在登录页面设置了护眼模式就需要把其他的颜色给关闭*/
    themeStore.toggleTheme()
    /*判断当前浏览器是否支持startViewTransition API*/
    if (document.startViewTransition) {
      const transition = document.startViewTransition(() => {
        const root = document.documentElement
        isDark = root.classList.contains('dark')
        root.classList.remove(isDark ? 'dark' : 'light')
        root.classList.add(isDark ? 'light' : 'dark')
      })
      transition.ready.then(() => {
        const clipPath = [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`]
        document.documentElement.animate(
          {
            clipPath: isDark ? [...clipPath].reverse() : clipPath
          },
          {
            duration: 500,
            easing: 'ease-in',
            pseudoElement: isDark ? '::view-transition-old(root)' : '::view-transition-new(root)'
          }
        )
      })
    }
  }, 500)
}
</script>

<style lang="scss">
@import '@/styles/scss/toggle-theme';
</style>

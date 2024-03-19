<template>
  <!-- 通用设置 -->
  <main>
    <span class="pl-10px text-14px color-[--text-color]">外观设置</span>
    <section class="bg-[--bg-setting-item] rounded-12px wh-full mt-12px p-12px box-border flex-y-center gap-20px">
      <div
        class="flex-col-x-center w-120px h-100px"
        @click="activeItem = item.code"
        v-for="(item, index) in titleList"
        :key="index">
        <div
          @click="handleTheme($event, item.code)"
          class="wh-full rounded-8px cursor-pointer"
          :style="activeItem === item.code ? 'border: 2px solid #059669' : 'border: 2px solid transparent'">
          <component :is="item.model" />
        </div>
        <span class="text-12px pt-8px color-[--text-color]">{{ item.title }}</span>
      </div>
    </section>
  </main>
</template>
<script setup lang="tsx">
import { setting } from '@/stores/setting.ts'
import { storeToRefs } from 'pinia'
import { EventEnum, ThemeEnum } from '@/enums'
import { emit } from '@tauri-apps/api/event'
import { titleList } from './model.tsx'

const settingStore = setting()
const { themes } = storeToRefs(settingStore)
const activeItem = ref<string>(themes.value.pattern)

/* 切换主题 */
const handleTheme = async (event: MouseEvent, code: string) => {
  if (code === themes.value.pattern) return
  const x = event.clientX
  const y = event.clientY
  const endRadius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))

  let isDark: boolean

  settingStore.toggleTheme(code)
  await emit(EventEnum.THEME, code)
  /*判断当前浏览器是否支持startViewTransition API*/
  if (document.startViewTransition) {
    const transition = document.startViewTransition(() => {
      isDark = code.includes(ThemeEnum.DARK)
    })
    // TODO 从亮色主题切换到暗色主题的时候没有动画效果 (nyh -> 2024-02-12 23:07:54)
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
}
</script>

<style scoped lang="scss">
@import '@/styles/scss/toggle-theme';
</style>

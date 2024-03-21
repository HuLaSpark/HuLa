<template>
  <n-flex vertical :size="40">
    <!-- 通用设置 -->
    <n-flex vertical class="text-[--text-color] text-14px" :size="16">
      <span class="pl-10px">外观设置</span>
      <n-flex align="center" :size="20" class="item">
        <n-flex
          vertical
          align="center"
          class="w-120px h-100px"
          :size="0"
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
        </n-flex>
      </n-flex>
    </n-flex>

    <!-- 系统设置 -->
    <n-flex vertical class="text-[--text-color] text-14px" :size="16">
      <span class="pl-10px">系统</span>

      <n-flex class="item" :size="15">
        <!-- 关闭面板 -->
        <n-flex vertical :size="15" class="w-full">
          <n-flex align="center" justify="space-between" :size="20" class="h-20px">
            <span>关闭主面板</span>

            <label class="text-14px text-#707070 flex gap-6px lh-16px items-center">
              <n-radio :checked="tray.type === CloseBxEnum.HIDE" @change="tray.type = CloseBxEnum.HIDE" />
              <span>最小化到系统托盘</span>
            </label>
            <label class="text-14px text-#707070 flex gap-6px lh-16px items-center">
              <n-radio :checked="tray.type === CloseBxEnum.CLOSE" @change="tray.type = CloseBxEnum.CLOSE" />
              <span>直接退出程序</span>
            </label>

            <label class="text-12px text-#909090 flex gap-6px justify-end items-center">
              <n-checkbox size="small" v-model:checked="tray.notTips" />
              <span>是否关闭提示</span>
            </label>
          </n-flex>
          <span class="w-full h-1px bg-[--line-color]"></span>
        </n-flex>

        <!-- ESC关闭面板 -->
        <n-flex vertical :size="15" class="w-full">
          <n-flex align="center" justify="space-between" :size="20" class="h-20px">
            <span>是否启用ESC关闭窗口</span>

            <n-switch size="small" v-model:value="escClose" />
          </n-flex>
        </n-flex>
      </n-flex>
    </n-flex>
  </n-flex>
</template>
<script setup lang="tsx">
import { setting } from '@/stores/setting.ts'
import { storeToRefs } from 'pinia'
import { CloseBxEnum, EventEnum, ThemeEnum } from '@/enums'
import { emit } from '@tauri-apps/api/event'
import { titleList } from './model.tsx'

const settingStore = setting()
const { themes, tray, escClose } = storeToRefs(settingStore)
const activeItem = ref<string>(themes.value.pattern)

watchEffect(() => {
  /* 给主页窗口提示传递事件 */
  emit(EventEnum.CLOSE_HOME, { type: tray.value.type, notTips: tray.value.notTips, escClose: escClose.value })
})

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
.item {
  @apply bg-[--bg-setting-item] rounded-12px wh-full p-12px box-border;
}
</style>

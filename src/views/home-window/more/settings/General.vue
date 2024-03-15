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

const settingStore = setting()
const { themes } = storeToRefs(settingStore)
const activeItem = ref<string>(themes.value.pattern)

const titleList = [
  {
    title: '白天模式',
    code: ThemeEnum.LIGHT,
    model: (() => (
      <div class="wh-full flex">
        <div class="bg-#f1f1f1 flex-[1] rounded-[6px_0_0_6px]"></div>

        <div class="bg-#fff flex-[3.5] p-[8px_4px] box-border flex flex-col gap-8px">
          <div class="flex gap-4px">
            <div class="bg-#f1f1f1 w-10px h-10px rounded-50%"></div>
            <div class="flex flex-col gap-2px">
              <div class="bg-#f1f1f1 w-16px h-4px"></div>
              <div class="bg-#f1f1f1 w-24px h-4px"></div>
            </div>
          </div>

          <div class="flex gap-4px">
            <div class="bg-#f1f1f1 w-10px h-10px rounded-50%"></div>
            <div class="flex flex-col gap-2px">
              <div class="bg-#f1f1f1 w-16px h-4px"></div>
              <div class="bg-#f1f1f1 w-24px h-4px"></div>
            </div>
          </div>
        </div>

        <div class="bg-#f1f1f1 flex-[5.5] p-[8px_4px] rounded-[0_6px_6px_0] flex flex-col gap-8px">
          <div class="flex-y-center gap-4px">
            <div class="bg-#ccc w-6px h-6px rounded-50%"></div>
            <div class="bg-#fff w-28px h-6px"></div>
          </div>

          <div class="flex-y-center gap-4px ml-a">
            <div class="bg-#059669 w-28px h-6px"></div>
            <div class="bg-#ccc w-6px h-6px rounded-50%"></div>
          </div>
        </div>
      </div>
    ))()
  },
  {
    title: '夜间模式',
    code: ThemeEnum.DARK,
    model: (() => (
      <div class="wh-full flex">
        <div class="bg-#454545 flex-[1] rounded-[6px_0_0_6px]"></div>

        <div class="bg-#212121 flex-[3.5] p-[8px_4px] box-border flex flex-col gap-8px">
          <div class="flex gap-4px">
            <div class="bg-#4d4d4d w-10px h-10px rounded-50%"></div>
            <div class="flex flex-col gap-2px">
              <div class="bg-#4d4d4d w-16px h-4px"></div>
              <div class="bg-#4d4d4d w-24px h-4px"></div>
            </div>
          </div>

          <div class="flex gap-4px">
            <div class="bg-#4d4d4d w-10px h-10px rounded-50%"></div>
            <div class="flex flex-col gap-2px">
              <div class="bg-#4d4d4d w-16px h-4px"></div>
              <div class="bg-#4d4d4d w-24px h-4px"></div>
            </div>
          </div>
        </div>

        <div class="bg-#1a1a1a flex-[5.5] p-[8px_4px] rounded-[0_6px_6px_0] flex flex-col gap-8px">
          <div class="flex-y-center gap-4px">
            <div class="bg-#4d4d4d w-6px h-6px rounded-50%"></div>
            <div class="bg-#4d4d4d w-28px h-6px"></div>
          </div>

          <div class="flex-y-center gap-4px ml-a">
            <div class="bg-#4d4d4d w-28px h-6px"></div>
            <div class="bg-#4d4d4d w-6px h-6px rounded-50%"></div>
          </div>
        </div>
      </div>
    ))()
  },
  {
    title: '跟随系统',
    code: ThemeEnum.OS,
    model: (() => (
      <div class="wh-full flex">
        <div class="bg-#f1f1f1 flex-[1] rounded-[6px_0_0_6px]"></div>

        <div class="bg-#fff flex-[4.5] p-[8px_4px] box-border flex flex-col gap-8px">
          <div class="flex gap-4px">
            <div class="bg-#f1f1f1 w-10px h-10px rounded-50%"></div>
            <div class="flex flex-col gap-2px">
              <div class="bg-#f1f1f1 w-16px h-4px"></div>
              <div class="bg-#f1f1f1 w-24px h-4px"></div>
            </div>
          </div>

          <div class="flex gap-4px">
            <div class="bg-#f1f1f1 w-10px h-10px rounded-50%"></div>
            <div class="flex flex-col gap-2px">
              <div class="bg-#f1f1f1 w-16px h-4px"></div>
              <div class="bg-#f1f1f1 w-24px h-4px"></div>
            </div>
          </div>
        </div>

        <div class="bg-#454545 flex-[1]"></div>

        <div class="bg-#212121 flex-[4.5] p-[8px_4px] rounded-[0_6px_6px_0] box-border flex flex-col gap-8px">
          <div class="flex gap-4px">
            <div class="bg-#4d4d4d w-10px h-10px rounded-50%"></div>
            <div class="flex flex-col gap-2px">
              <div class="bg-#4d4d4d w-16px h-4px"></div>
              <div class="bg-#4d4d4d w-24px h-4px"></div>
            </div>
          </div>

          <div class="flex gap-4px">
            <div class="bg-#4d4d4d w-10px h-10px rounded-50%"></div>
            <div class="flex flex-col gap-2px">
              <div class="bg-#4d4d4d w-16px h-4px"></div>
              <div class="bg-#4d4d4d w-24px h-4px"></div>
            </div>
          </div>
        </div>
      </div>
    ))()
  }
]

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

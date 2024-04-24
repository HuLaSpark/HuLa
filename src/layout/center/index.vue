<template>
  <main data-tauri-drag-region class="resizable select-none" :style="{ width: width + 'px' }">
    <ActionBar
      class="absolute right-0"
      v-if="shrinkStatus"
      :shrink-status="!shrinkStatus"
      :max-w="false"
      :current-label="appWindow.label" />

    <!--    <div class="resize-handle" @mousedown="initDrag"></div>-->

    <!-- 顶部搜索栏 -->
    <header
      style="box-shadow: 0 2px 4px var(--box-shadow-color)"
      class="mt-30px w-full h-38px flex flex-col items-center">
      <div class="flex-center gap-5px w-full pr-16px pl-16px box-border">
        <n-input
          id="search"
          @focus="() => router.push('/searchDetails')"
          class="rounded-4px w-full"
          style="background: var(--search-bg-color)"
          :maxlength="20"
          clearable
          size="small"
          placeholder="搜索">
          <template #prefix>
            <svg class="w-12px h-12px"><use href="#search"></use></svg>
          </template>
        </n-input>
        <n-button size="small" secondary style="padding: 0 5px">
          <template #icon>
            <svg class="w-24px h-24px"><use href="#plus"></use></svg>
          </template>
        </n-button>
      </div>
    </header>

    <!-- 列表 -->
    <div id="centerList">
      <router-view />
    </div>
  </main>
</template>

<script setup lang="ts">
import Mitt from '@/utils/Bus.ts'
import router from '@/router'
import { MittEnum } from '@/enums'
import { appWindow } from '@tauri-apps/api/window'

// const minWidth = 160 // 设置最小宽度
// const maxWidth = 320 // 设置最大宽度
const width = ref(250) // 初始化宽度

// const startX = ref()
// const startWidth = ref()
const shrinkStatus = ref(false)

// todo 1.了解这里是怎么实现的 2.修改拖拽放大缩小的事件
Mitt.on(MittEnum.SHRINK_WINDOW, (event) => {
  shrinkStatus.value = event as boolean
  width.value = 250
})

const closeMenu = (event: Event) => {
  const e = event.target as HTMLInputElement
  const route = router.currentRoute.value.path
  /** 判断如果点击的搜索框，就关闭消息列表 */
  if (!e.matches('#search, #search *, #centerList *, #centerList') && route === '/searchDetails') {
    router.go(-1)
  }
}

onMounted(() => {
  window.addEventListener('click', closeMenu, true)
})

onUnmounted(() => {
  window.removeEventListener('click', closeMenu, true)
})
// watchEffect(() => {
//   if (width.value === maxWidth) {
//     Mitt.emit('shrinkWindow', false)
//   }
// })

// const initDrag = (e: MouseEvent) => {
//   startX.value = e.clientX
//   startWidth.value = width.value
//
//   document.addEventListener('mousemove', doDrag, false)
//   document.addEventListener('mouseup', stopDrag, false)
// }
//
// const doDrag = (e: MouseEvent) => {
//   const newWidth = startWidth.value + e.clientX - startX.value
//   if (newWidth <= maxWidth && newWidth >= minWidth) {
//     width.value = newWidth
//   } else if (newWidth > maxWidth) {
//     width.value = maxWidth
//   } else if (newWidth < minWidth) {
//     width.value = minWidth
//   }
// }
//
// const stopDrag = () => {
//   document.removeEventListener('mousemove', doDrag, false)
//   document.removeEventListener('mouseup', stopDrag, false)
// }
</script>

<style scoped lang="scss">
@import 'style';
</style>

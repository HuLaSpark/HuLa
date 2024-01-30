<template>
  <div data-tauri-drag-region class="resizable bg-#fdfdfd select-none" :style="{ width: width + 'px' }">
    <ActionBar class="absolute right-0" v-if="shrinkStatus" :shrink-status="!shrinkStatus" :max-w="false" />

    <!--    <div class="resize-handle" @mousedown="initDrag"></div>-->

    <!-- 顶部搜索栏 -->
    <div class="mt-30px w-full h-38px flex flex-col items-center shadow-[0_2px_4px_rgba(0,0,0,0.08)]">
      <div class="flex-center gap-5px w-full pr-16px pl-16px box-border">
        <n-input
          :on-focus="() => router.push('/searchDetails')"
          class="rounded-4px w-full"
          style="background-color: #f3f3f3"
          :maxlength="20"
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
    </div>

    <!-- 列表 -->
    <n-scrollbar style="max-height: calc(100vh - 70px)">
      <div class="h-full flex-1 p-[4px_10px_0px_8px]">
        <router-view />
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import Mitt from '@/utils/Bus.ts'
import router from '@/router'

// const minWidth = 160 // 设置最小宽度
// const maxWidth = 320 // 设置最大宽度
const width = ref(250) // 初始化宽度

// const startX = ref()
// const startWidth = ref()
const shrinkStatus = ref(false)

// todo 1.了解这里是怎么实现的 2.修改拖拽放大缩小的事件
Mitt.on('shrinkWindow', (event) => {
  shrinkStatus.value = event as boolean
  width.value = 250
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

<style scoped>
.resizable {
  height: 100%;
  position: relative;
  overflow: hidden;
}

.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  cursor: ew-resize;
  background-color: #ccc; /* 可以根据需要更改颜色 */
}
</style>

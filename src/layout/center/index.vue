<template>
  <div class="resizable bg-#fdfdfd select-none" :style="{ width: width + 'px' }">
    <ActionBar v-if="shrinkStatus" :shrink-status="!shrinkStatus" :max-w="false" />
    中间区域
    <div class="resize-handle" @mousedown="initDrag"></div>
  </div>
</template>

<script setup lang="ts">
import Mitt from '@/utils/Bus.ts'

const minWidth = 250 // 设置最小宽度
const maxWidth = 320 // 设置最大宽度
const width = ref(250) // 初始化宽度

const startX = ref()
const startWidth = ref()
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

const initDrag = (e: MouseEvent) => {
  startX.value = e.clientX
  startWidth.value = width.value

  document.addEventListener('mousemove', doDrag, false)
  document.addEventListener('mouseup', stopDrag, false)
}

const doDrag = (e: MouseEvent) => {
  const newWidth = startWidth.value + e.clientX - startX.value
  if (newWidth <= maxWidth && newWidth >= minWidth) {
    width.value = newWidth
  } else if (newWidth > maxWidth) {
    width.value = maxWidth
  } else if (newWidth < minWidth) {
    width.value = minWidth
  }
}

const stopDrag = () => {
  document.removeEventListener('mousemove', doDrag, false)
  document.removeEventListener('mouseup', stopDrag, false)
}
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

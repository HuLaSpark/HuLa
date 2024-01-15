<template>
  <div class="resizable" :style="{ width: width + 'px', backgroundColor: '#4db652' }">
    中间区域
    <div class="resize-handle" @mousedown="initDrag"></div>
  </div>
</template>

<script setup lang="ts">
const minWidth = 160 // 设置最小宽度
const maxWidth = 320 // 设置最大宽度
const width = ref(240) // 初始化宽度

const startX = ref()
const startWidth = ref()

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
  width: 1px;
  cursor: ew-resize;
  background-color: #ccc; /* 可以根据需要更改颜色 */
}
</style>

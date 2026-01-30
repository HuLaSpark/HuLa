<template>
  <div class="flex flex-col flex-1 min-h-0">
    <!-- 页面容器 -->
    <div class="flex w-full items-start flex-col flex-1 min-h-0">
      <div class="w-full">
        <slot name="header"></slot>
      </div>
      <!-- 消息内容区 -->
      <div class="w-full flex-1 overflow-y-hidden min-h-0">
        <slot name="container"></slot>
      </div>
    </div>

    <slot name="footer"></slot>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  showFooter: {
    type: Boolean,
    default: true
  }
})
</script>

<style lang="scss"></style>

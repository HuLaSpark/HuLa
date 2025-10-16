<template>
  <div class="flex flex-col h-full">
    <!-- 页面容器 -->
    <div class="flex w-full items-start flex-col flex-1 min-h-0">
      <div class="w-full relative">
        <slot name="header"></slot>
      </div>
      <!-- 消息内容区 -->
      <div class="w-full flex-1 overflow-y-hidden min-h-0 relative">
        <div class="absolute inset-0">
          <slot name="container"></slot>
        </div>
      </div>
    </div>

    <div class="w-full min-h-25px bg-#FAFAFA">
      <slot name="footer"></slot>
    </div>
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

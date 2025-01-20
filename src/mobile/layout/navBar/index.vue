<template>
  <nav class="safe-area-nav">
    <div class="flex items-center justify-between w-full box-border px-16px h-full">
      <!-- 左侧插槽 -->
      <div class="flex-1 min-w-0">
        <slot name="left"></slot>
      </div>

      <!-- 中间内容 -->
      <div v-if="$slots.center" class="flex-1 flex justify-center">
        <div class="flex justify-center">
          <slot name="center"></slot>
        </div>
      </div>

      <!-- 右侧插槽 -->
      <div class="flex-1 min-w-0 flex justify-end">
        <div class="ml-auto">
          <slot name="right"></slot>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts"></script>
<style scoped lang="scss">
.safe-area-nav {
  @apply z-99999 fixed top-0 w-full bg-#e3e3e396 backdrop-blur-md;
  padding-top: env(safe-area-inset-top);
  height: 44px;
}
</style>

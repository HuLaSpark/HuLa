<template>
  <!-- 顶部操作栏和显示用户名 -->
  <div class="flex-y-center justify-between pl-20px pr-20px pt-8px pb-12px select-none">
    <div>宝贝🐶 ⛅</div>
    <div class="options flex-y-center gap-20px">
      <svg><use href="#phone-call"></use></svg>
      <svg><use href="#video-one"></use></svg>
      <svg><use href="#computer"></use></svg>
      <svg><use href="#devices"></use></svg>
      <svg><use href="#newlybuild"></use></svg>
      <svg><use href="#more"></use></svg>
    </div>
  </div>
  <div>123</div>
  <div>123</div>
  <div>123</div>
  <div>123</div>
  <div>123</div>
  <div>123</div>
  <div>123</div>
  <div>123</div>
</template>
<script setup lang="ts"></script>

<style scoped lang="scss">
.options {
  svg {
    width: 22px;
    height: 22px;
    color: #303030;
    cursor: pointer;
    &:hover {
      color: #189f57;
    }
  }
}
</style>

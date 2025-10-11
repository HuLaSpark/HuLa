<template>
  <!-- 🚀 加载页 DOM -->
  <div id="loading-page">
    <img src="/Mobile/4.png" alt="hula" class="w-300px h-200px mb-140px" />
    <div class="bottom-bar">
      <img src="/Mobile/3.png" alt="hula" class="size-50px rounded-14px" />
      <img src="/Mobile/1.png" alt="hula" class="w-78px h-40px" />
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
#loading-page {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background-image: url('/Mobile/2.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  transition: opacity 0.4s ease-out;
  opacity: 1;
}

.bottom-bar {
  position: absolute;
  bottom: 40px;
  display: flex;
  gap: 16px;
  align-items: center;
}
</style>

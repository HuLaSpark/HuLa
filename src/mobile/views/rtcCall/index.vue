<template>
  <div class="w-full h-full">
    <SafeAreaPlaceholder type="layout" direction="top" />
    <div @click="router.back()" class="w-full h-full flex items-center">
      <svg class="iconpark-icon w-24px h-24px ms-16px p-5px">
        <use href="#fanhui"></use>
      </svg>
    </div>
    <CallWindow />
    <SafeAreaPlaceholder type="layout" direction="bottom" />
  </div>
</template>

<script setup lang="ts">
import CallWindow from '@/views/callWindow/index.vue'

const router = useRouter()
</script>

<style scoped lang="scss"></style>

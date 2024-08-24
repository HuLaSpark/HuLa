<template>
  <Screenshot :is-capturing="isCapturing" />
</template>
<script setup lang="ts">
import { listen } from '@tauri-apps/api/event'

const isCapturing = ref(false)

watchEffect(() => {
  listen('capture', (e) => {
    nextTick(() => {
      isCapturing.value = e.payload as boolean
    })
  })
})
</script>

<style scoped lang="scss"></style>

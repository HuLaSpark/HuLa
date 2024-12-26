<template>
  <Screenshot :is-capturing="isCapturing" />
</template>
<script setup lang="ts">
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useTauriListener } from '@/hooks/useTauriListener'

const appWindow = WebviewWindow.getCurrent()
const { addListener } = useTauriListener()
const isCapturing = ref(false)

watchEffect(() => {
  addListener(
    appWindow.listen('capture', (e) => {
      nextTick(() => {
        isCapturing.value = e.payload as boolean
      })
    })
  )
})
</script>

<style scoped lang="scss"></style>

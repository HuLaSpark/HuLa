<template>
  <div class="wh-full bg-[--right-bg-color]">
    <ActionBar :shrink="false" :current-label="appWindow.label" />

    <p>邮箱</p>
  </div>
</template>
<script setup lang="ts">
import { appWindow } from '@tauri-apps/api/window'
import { useWindowState } from '@/hooks/useWindowState.ts'

useWindowState(appWindow.label)
</script>

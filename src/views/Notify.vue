<template>
  <n-flex vertical :size="10">
    <n-flex align="left" :size="10" class="m-[8px_0_0_0] p-[0_3px]">
      <span style="font-size: 14px">新消息·16</span>
    </n-flex>
    <component :is="division" />
    <n-flex align="left" :size="10" class="p-[0_3px] hover:bg-[--tray-hover-e] cursor-pointer">
      <n-flex align="center" :size="10">
        <n-image src="/logo.png" width="25" height="25" />
      </n-flex>
      <n-flex vertical align="left" :size="5">
        <span style="font-size: 14px"> ZOL </span>
        <span>as</span>
      </n-flex>
      <n-flex align="center" :size="10">
        <span>16</span>
      </n-flex>
    </n-flex>
    <component :is="division" />
    <n-flex v-if="tipVisible" @click="handleTip" align="right" :size="10" class="p-[0_3px] cursor-pointer">
      <span style="font-size: 14px; align-self: end">取消闪烁</span>
    </n-flex>
  </n-flex>
</template>
<script setup lang="tsx">
import { useGlobalStore } from '@/stores/global.ts'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'

const globalStore = useGlobalStore()

const { tipVisible } = storeToRefs(globalStore)

const division = () => {
  return <div class={'h-1px bg-[--line-color] w-full'}></div>
}

// 取消状态栏闪烁
const handleTip = async () => {
  globalStore.setTipVisible(false)
  await WebviewWindow.getCurrent().hide()
}
</script>
<style scoped lang="scss">
.tray {
  @apply bg-[--center-bg-color] size-full p-8px box-border select-none text-[--text-color] text-12px;
}
</style>

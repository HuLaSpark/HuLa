<template>
  <div data-tauri-drag-region class="flex-col-center gap-30px size-full">
    <n-flex vertical justify="center" :size="20">
      <img src="@/assets/logo/hula.png" class="w-220px h-104px mb-10px" />
      <n-progress
        type="line"
        :show-indicator="false"
        :color="'#13987f'"
        :rail-color="'#13987f30'"
        :percentage="percentage" />
      <n-flex justify="center" align="center" :gap="12">
        <n-spin :size="12" :color="'#13987f'" />
        <span class="text-14px text-#666">{{ loadingText }}</span>
      </n-flex>
    </n-flex>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  percentage: number
  loadingText: string
}>()
</script>

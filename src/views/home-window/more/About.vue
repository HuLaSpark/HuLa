<template>
  <main class="login-box size-full select-none">
    <ActionBar :shrink="false" :max-w="false" />

    <n-flex vertical align="center" justify="center" :size="30" class="size-full">
      <img class="w-220px h-100px" src="@/assets/logo/hula.png" alt="" />

      <n-flex vertical align="center" :size="20">
        <span class="text-(15px #707070)">版本：{{ _pkg.version }}({{ osArch }})</span>
        <span class="text-(15px #707070)">当前设备：{{ osType }}{{ osVersion }}</span>
        <n-flex vertical class="text-(12px #909090)" :size="8" align="center">
          <span>Copyright © 2023-2024 nongyehong</span>
          <span>All Rights Reserved.</span>
        </n-flex>
      </n-flex>
    </n-flex>
  </main>
</template>
<script setup lang="ts">
import pkg from '~/package.json'
import { type, arch, version } from '@tauri-apps/api/os'

const _pkg = reactive({
  version: pkg.version
})
const osType = ref()
const osArch = ref()
const osVersion = ref()

onMounted(() => {
  arch().then((e) => {
    if (e.includes('64')) {
      osArch.value = '64位'
    } else {
      osArch.value = '32位'
    }
  })
  type().then((e) => {
    if (e === 'Windows_NT') {
      osType.value = 'Windows'
      version().then((e) => {
        let parts = e.split('.')
        let build_number = Number(parts[2])
        osVersion.value = build_number > 22000 ? '11' : '10'
      })
    } else if (e === 'Darwin') {
      osType.value = 'MacOS'
    } else {
      osType.value = e
    }
  })
})
</script>

<style scoped lang="scss">
@import '@/styles/scss/global/login-bg';
:deep(.hover-box) {
  @apply w-28px h24px flex-center hover:bg-#e7e7e7;
  svg {
    color: #404040;
  }
}
:deep(.action-close) {
  svg {
    color: #404040;
  }
}
</style>

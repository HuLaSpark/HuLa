<template>
  <div
    class="grid grid-cols-[32px_32px_32px_32px] px-16px gap-12px z-1 h-32px items-center justify-end mt-10px dark:invert">
    <div @click="toMyMessages" class="h-32px w-32px flex items-center justify-center">
      <n-badge :max="99" :value="unreadApplyCount" :show="unreadApplyCount > 0">
        <svg class="iconpark-icon h-24px w-24px block"><use href="#remind"></use></svg>
      </n-badge>
    </div>

    <div @click="activate" class="h-32px w-32px flex items-center justify-center">
      <svg class="iconpark-icon h-24px w-24px block"><use href="#share"></use></svg>
    </div>

    <div @click="toScanQRCode" class="h-32px w-32px flex items-center justify-center">
      <svg class="iconpark-icon h-30px w-30px block"><use href="#saoma"></use></svg>
    </div>

    <div @click="toSettings" class="h-32px w-32px flex items-center justify-center">
      <svg class="iconpark-icon h-30px w-30px block"><use href="#wode-shezhi"></use></svg>
    </div>

    <n-drawer v-model:show="active" :width="502" placement="bottom">
      <n-drawer-content header-class="text-center" title="分享至"></n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import router from '@/router'
import { useGlobalStore } from '@/stores/global.ts'

const active = ref(false)
const globalStore = useGlobalStore()

const unreadApplyCount = computed(() => {
  return globalStore.unReadMark.newFriendUnreadCount + globalStore.unReadMark.newGroupUnreadCount
})

// 点击按钮打开底部抽屉
const activate = () => {
  // active.value = true
}

const toScanQRCode = () => {
  router.push('/mobile/mobileMy/scanQRCode')
}

const toSettings = () => {
  router.push('/mobile/mobileMy/settings')
}

const toMyMessages = () => {
  router.push('/mobile/mobileMy/myMessages')
}
</script>

<style scoped></style>

<template>
  <div class="bg-#fefefe flex-col-center h-100vh">{{ userStore.userInfo.name }}</div>
</template>
<script setup lang="ts">
import { useUserStore } from '@/stores/user.ts'

const userStore = useUserStore()
</script>
<style scoped></style>

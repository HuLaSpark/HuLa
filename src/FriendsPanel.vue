<script setup lang="ts">
import FriendsList from '@/views/homeWindow/FriendsList.vue'
import CenterPanel from '@/layout/center/index.vue'
</script>

<template>
  <CenterPanel>
    <FriendsList />
  </CenterPanel>
  <router-view v-slot="{ Component }">
    <component v-if="Component != void 0" :is="Component" />
    <LogoPlaceholder v-else />
  </router-view>
</template>

<script setup lang="ts">
import CenterPanel from '@/layout/center/index.vue'
import MessageList from '@/MessageList.vue'
</script>

<template>
  <CenterPanel>
    <MessageList />
  </CenterPanel>
  <router-view v-slot="{ Component }">
    <component v-if="Component != void 0" :is="Component" />
    <LogoPlaceholder v-else />
  </router-view>
</template>

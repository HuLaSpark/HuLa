<template>
  <NaiveProvider :message-max="3" :notific-max="3">
    <Home />
  </NaiveProvider>
</template>
<script setup lang="ts">
import Home from '@/views/page/Home.vue'
</script>

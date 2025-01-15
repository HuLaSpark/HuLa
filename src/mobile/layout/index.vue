<template>
  <div class="h-100vh">
    <NavBar />
    <RouterView />
    <TabBar />
  </div>
</template>

<script setup lang="ts">
import TabBar from './tabBar/index.vue'
import NavBar from './navBar/index.vue'
</script>

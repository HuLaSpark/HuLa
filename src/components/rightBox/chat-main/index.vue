<template>
  <!-- 头部 -->
  <Header :active-item="activeItem" />
  <!-- 中间聊天框内容  -->
  <Main />
  <!-- 输入框和操作列表 -->
  <Footer />
</template>
<script setup lang="ts">
import Footer from './footer.vue'
import Header from './header.vue'
import Main from './main.vue'

const { activeItem } = defineProps<{
  activeItem: any
}>()
</script>

<style scoped lang="scss"></style>

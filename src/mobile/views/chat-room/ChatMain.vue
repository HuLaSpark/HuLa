<template>
  <div class="flex flex-1 flex-col">
    <HeaderBar room-name="官方1群" :msg-count="1002" />

    <!-- 内容区 -->
    <div class="flex flex-1 bg-#F2F2F2">1234566</div>

    <FooterBar @focus="handleFocus"></FooterBar>
  </div>
</template>

<script setup lang="ts">
import HeaderBar from '@/mobile/components/chat-room/HeaderBar.vue'
import FooterBar from '@/mobile/components/chat-room/FooterBar.vue'

const handleFocus = () => {}
</script>

<style lang="scss"></style>

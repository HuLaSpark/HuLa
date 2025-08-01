<template>
  <div class="flex flex-1 flex-col">
    <HeaderBar room-name="官方1群" :msg-count="1002" />

    <!-- 内容区 -->
    <div class="flex flex-1">1234566</div>

    <FooterBar @focus="handleFocus"></FooterBar>
  </div>
</template>

<script setup lang="ts">
import HeaderBar from '@/mobile/components/chat-room/HeaderBar.vue'
import FooterBar from '@/mobile/components/chat-room/FooterBar.vue'

const handleFocus = () => {
  // TODO 这事件是组件的输入框聚焦后触发的，需要做处理，监听输入法窗口的顶部位置，然后改变footbar的位置到输入法顶部，这样才不让输入法窗口把原来的组件覆盖了
}
</script>

<style lang="scss"></style>

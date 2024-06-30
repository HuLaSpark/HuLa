<template>
  <main class="left min-w-60px h-full p-[30px_6px_15px] box-border flex-col-center select-none" data-tauri-drag-region>
    <!-- 头像模块 -->
    <LeftAvatar />
    <!-- 导航选项按钮模块 -->
    <ActionList />
    <!-- 编辑资料弹窗 -->
    <InfoPopover />
  </main>
</template>
<script lang="ts" setup>
import LeftAvatar from './components/LeftAvatar.vue'
import ActionList from './components/ActionList.vue'
import InfoPopover from './components/InfoPopover.vue'
</script>

<style lang="scss" scoped>
@import 'style';
</style>

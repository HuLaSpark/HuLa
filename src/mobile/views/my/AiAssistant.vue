<template>
  <MobileScaffold :show-footer="false">
    <template #header>
      <HeaderBar
        :isOfficial="false"
        class="bg-white"
        style="border-bottom: 1px solid; border-color: #dfdfdf"
        :hidden-right="true"
        room-name="AI助手" />
    </template>

    <template #container>
      <div class="bg-cover bg-center flex flex-col overflow-auto h-full">
        <div class="flex flex-col flex-1 gap-20px py-15px px-20px">
          <!-- TODO: 这里后续添加 AI 助手的内容 -->
        </div>
      </div>
    </template>
  </MobileScaffold>
</template>

<script setup lang="ts">
// AI 助手页面
</script>

<style lang="scss" scoped></style>

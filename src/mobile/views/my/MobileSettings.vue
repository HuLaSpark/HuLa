<template>
  <AutoFixHeightPage :show-footer="false">
    <template #header>
      <HeaderBar
        :isOfficial="false"
        class="bg-white"
        style="border-bottom: 1px solid; border-color: #dfdfdf"
        :hidden-right="true"
        room-name="设置" />
    </template>

    <template #container="{ height }">
      <img src="@/assets/mobile/chat-home/background.webp" class="w-100% relative top-0 z-1" alt="hula" />
      <div :style="{ height: height + 'px' }" class="z-2 flex flex-col absolute overflow-auto min-h-70vh w-full">
        <div class="flex flex-col p-20px gap-20px"></div>
      </div>
    </template>
  </AutoFixHeightPage>
</template>

<script setup lang="ts"></script>

<style lang="scss" scoped></style>

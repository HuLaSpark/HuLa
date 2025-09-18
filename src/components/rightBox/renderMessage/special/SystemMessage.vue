<template>
  <!-- 系统消息 -->
  <main class="w-full flex-center h-62px">
    <p class="select-none cursor-default text-(12px #909090)">
      {{ props.body }}
    </p>
  </main>
</template>

<script setup lang="ts">
const props = defineProps<{
  body: string
  fromUserUid: string
}>()
</script>

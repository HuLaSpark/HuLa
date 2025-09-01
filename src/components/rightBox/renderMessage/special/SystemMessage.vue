<template>
  <!-- 系统消息 -->
  <div class="flex-col-y-center h-62px select-none cursor-default text-(12px #909090)">
    {{ props.body }}
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  body: string
  fromUserUid: string
}>()
</script>

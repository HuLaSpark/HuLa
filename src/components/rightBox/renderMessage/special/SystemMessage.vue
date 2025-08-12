<template>
  <!-- 视频通话消息 -->
  <div class="select-none cursor-default text-(12px #909090)">
    {{ props.body }}
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  body: string
  fromUserUid: string
}>()
</script>

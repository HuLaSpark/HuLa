<template>
  <div class="w-full h-92px bg-pink">
    <div class="flex flex-1">
      <div class="my-10px mx-25px max-h-40px w-full bg-green">
        <n-input @focus="handleFocus" placeholder="输入/唤醒AI助手"></n-input>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits(['focus'])

const handleFocus = () => {
  emit('focus')
}
</script>

<style scoped></style>

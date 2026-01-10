<template>
  <section class="size-full p-16px">
    <n-flex vertical :size="12">
      <h1 class="text-18px font-600">{{ title }}</h1>
      <div class="text-14px text-[--text-color]">
        {{ description }}
      </div>
    </n-flex>
  </section>
</template>

<script setup lang="ts">
const title = 'Title'
const description = 'Description'
</script>

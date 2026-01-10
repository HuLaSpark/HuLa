<template>
  <section class="min-h-100vh p-16px">
    <div class="text-18px font-600">{{ title }}</div>
    <div class="text-14px text-[--text-color] mt-8px">
      {{ description }}
    </div>
  </section>
</template>

<script setup lang="ts">
const title = 'Title'
const description = 'Description'
</script>

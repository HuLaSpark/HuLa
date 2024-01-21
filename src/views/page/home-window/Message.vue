<template>
  <div class="w-full h-75px bg-#d8eee2 rounded-8px">
    <div class="flex items-center h-full pl-6px pr-8px gap-10px">
      <img class="w-44px h-44px rounded-50% bg-#fff" style="border: 1px solid #f1f1f1" src="/logo.png" alt="" />

      <div class="w-full h-38px flex flex-col justify-between">
        <div class="flex items-center justify-between">
          <span class="font-size-14px">宝贝🍓</span>
          <span class="font-size-10px color-#808080">昨天</span>
        </div>

        <div class="flex items-center justify-between">
          <p
            class="w-135px font-size-12px color-#808080"
            style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis">
            说的很经典哈萨克的哈萨克看到贺卡上
          </p>

          <div class="w-16px max-w-30px h-16px bg-#ccc rounded-40px font-size-10px flex-center font-bold color-#f1f1f1">
            {{ msgTotal }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
const msgTotal = ref('99+')
</script>

<style scoped></style>

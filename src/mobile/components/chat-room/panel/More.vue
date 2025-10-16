<template>
  <div class="h-15rem w-full">
    <van-swipe class="h-full" :loop="false" :show-indicators="true" indicator-color="#999">
      <van-swipe-item v-for="(page, pageIndex) in pages" :key="pageIndex">
        <div class="px-15px pt-15px pb-30px grid grid-cols-4 gap-3 auto-rows-18">
          <div v-for="item in page" :key="item.id" class="flex flex-col items-center justify-center bg-red rounded-2">
            <span class="text-white text-12px">{{ item.name }}</span>
          </div>
        </div>
      </van-swipe-item>
    </van-swipe>
  </div>
</template>

<script setup lang="ts">
// 测试数据
const testData = computed(() => {
  const data: any[] = []
  for (let i = 0; i < 50; i++) {
    data.push({
      id: i,
      name: '测试' + i
    })
  }
  return data
})

// 将数据分页，每页8个（2行4列）
const pages = computed(() => {
  const pageSize = 8
  const result: any[][] = []
  for (let i = 0; i < testData.value.length; i += pageSize) {
    result.push(testData.value.slice(i, i + pageSize))
  }
  return result
})
</script>

<style scoped></style>

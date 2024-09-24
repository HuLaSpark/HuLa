<template>
  <n-flex :size="14" vertical justify="center" class="p-14px text-(12px #909090)">
    <p>搜索建议</p>

    <n-flex align="center" class="text-(12px #909090)">
      <p class="p-6px bg-[--search-color] rounded-8px cursor-pointer">@我</p>
      <p class="p-6px bg-[--search-color] rounded-8px cursor-pointer">特别关心</p>
    </n-flex>

    <span class="w-full h-1px bg-[--line-color]"></span>

    <n-flex align="center" justify="space-between">
      <p class="text-(12px #909090)">历史记录</p>
      <p class="cursor-pointer text-(12px #13987f)">清除</p>
    </n-flex>

    <template v-for="(item, _index) in historyList" :key="_index">
      <n-flex align="center" :size="14" class="p-6px cursor-pointer rounded-8px hover:bg-[--list-hover-color]">
        <n-avatar :size="38" round bordered :src="item.avatar" />
        <p class="text-(14px [--text-color])">{{ item.name }}</p>
      </n-flex>
    </template>
  </n-flex>
</template>
<script setup lang="ts">
const historyList = [
  {
    avatar: 'https://picsum.photos/140?1',
    name: '小瘪三'
  },
  {
    avatar: 'https://picsum.photos/140?2',
    name: '号啊玉'
  },
  {
    avatar: 'https://picsum.photos/140?3',
    name: '张三'
  }
]
</script>

<style scoped></style>

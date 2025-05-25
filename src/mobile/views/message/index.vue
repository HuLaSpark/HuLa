<template>
  <div class="flex flex-col h-full">
    <PullToRefresh class="flex-1 overflow-auto" @refresh="handleRefresh" ref="pullRefreshRef">
      <div class="flex flex-col h-full">
        <div class="bg-#e3e3e396 px-18px py-8px shrink-0">
          <n-input
            id="search"
            class="rounded-6px w-full relative text-12px"
            :maxlength="20"
            clearable
            spellCheck="false"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            :placeholder="'搜索'">
            <template #prefix>
              <svg class="w-12px h-12px"><use href="#search"></use></svg>
            </template>
          </n-input>
        </div>

        <div class="flex-1">
          <div v-for="item in messageItems" :key="item.key" class="message-item">
            <n-avatar :size="40" :src="item.avatar" fallback-src="/logo.png" round />
            <div class="flex-1">
              <span>{{ item.value }}</span>
            </div>
          </div>
        </div>
      </div>
    </PullToRefresh>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import PullToRefresh from '#/components/PullToRefresh.vue'

const pullRefreshRef = ref()

const avatars = [
  'https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg',
  'https://avatars.githubusercontent.com/u/20943608?s=60&v=4',
  'https://avatars.githubusercontent.com/u/46394163?s=60&v=4',
  'https://avatars.githubusercontent.com/u/39197136?s=60&v=4',
  'https://avatars.githubusercontent.com/u/19239641?s=60&v=4'
]

const messageItems = ref(
  Array.from({ length: 20 }, (_, i) => ({
    key: `${i}`,
    value: i,
    avatar: avatars[i % avatars.length]
  }))
)

const handleRefresh = async () => {
  // 模拟加载数据
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // 在这里添加新的消息数据
  messageItems.value.unshift({
    key: `new-${Date.now()}`,
    value: messageItems.value.length,
    avatar: avatars[messageItems.value.length % avatars.length]
  })

  // 完成刷新
  pullRefreshRef.value?.finishRefresh()
}
</script>

<style scoped lang="scss">
.message-item {
  @apply flex items-center p-3 hover:bg-gray-100 transition-colors cursor-pointer;
}
</style>

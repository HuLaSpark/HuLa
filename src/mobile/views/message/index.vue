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
          <div v-for="item in messageItems" :key="item.id" class="message-item relative">
            <n-avatar :size="40" :src="item.avatar" fallback-src="/logo.png" round />
            <div class="flex flex-col ml-14px justify-between h-[35px]">
              <span class="text-14px text-#333">{{ item.name }}</span>
              <span class="text-12px text-#999">{{ item.text }}</span>
            </div>
            <!-- 未读数 悬浮到头像上 -->
            <div v-if="item.unreadCount > 0" class="flex flex-col justify-between h-[35px] absolute left-30px top-5px">
              <span class="text-12px text-[#fff] bg-[red] rounded-full px-8px py-3px">{{ item.unreadCount }}</span>
            </div>
          </div>
        </div>
      </div>
    </PullToRefresh>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useChatStore } from '@/stores/chat.ts'
import PullToRefresh from '#/components/PullToRefresh.vue'

const chatStore = useChatStore()

const pullRefreshRef = ref()

const messageItems = computed(() => chatStore.sessionList)

const getSessionList = async () => {
  await chatStore.getSessionList(true)
}

onMounted(() => {
  getSessionList()
})

const handleRefresh = async () => {
  await getSessionList()
  // 完成刷新
  pullRefreshRef.value?.finishRefresh()
}
</script>

<style scoped lang="scss">
.message-item {
  @apply flex items-center p-3 hover:bg-gray-100 transition-colors cursor-pointer;
}
</style>

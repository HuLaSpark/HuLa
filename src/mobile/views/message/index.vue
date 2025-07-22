<template>
  <div class="flex flex-col h-full">
    <PullToRefresh class="flex-1 overflow-auto" @refresh="handleRefresh" ref="pullRefreshRef">
      <div class="flex flex-col h-full px-18px">
        <div class="py-8px shrink-0">
          <n-input
            id="search"
            class="rounded-6px w-full bg-white relative text-12px"
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

        <div class="border-b-1 border-solid color-gray-200 px-18px my-8px"></div>

        <div class="flex-1">
          <div
            v-for="item in messageItems"
            :key="item.id"
            class="grid grid-cols-[2.2rem_1fr_4rem] items-start px-2 py-3 gap-1 hover:bg-#DEEDE7 hover:rounded-10px transition-colors cursor-pointer">
            <!-- 头像：单独居中 -->
            <div class="self-center h-38px">
              <n-badge :value="item.unreadCount">
                <n-avatar :size="40" :src="item.avatar" fallback-src="/logo.png" round />
              </n-badge>
            </div>

            <!-- 中间：两行内容 -->
            <div class="truncate pl-4 flex gap-10px flex-col">
              <div class="text-14px leading-tight font-bold flex-1 truncate text-#333 truncate">{{ item.name }}</div>
              <div class="text-12px text-#333 truncate">
                {{ item.text }}
              </div>
            </div>

            <!-- 时间：靠顶 -->
            <div class="text-12px text-right flex gap-1 items-center justify-right">
              <span v-if="item.hotFlag === IsAllUserEnum.Yes">
                <svg class="size-20px select-none outline-none cursor-pointer color-#13987f">
                  <use href="#auth"></use>
                </svg>
              </span>
              <span class="text-#555">
                {{ formatTimestamp(item?.activeTime) }}
              </span>
            </div>
          </div>

          <!-- <div v-for="item in messageItems" :key="item.id" class="message-item relative">
            <div>
              <n-badge :value="item.unreadCount">
                <n-avatar :size="40" :src="item.avatar" fallback-src="/logo.png" round />
              </n-badge>
              <div class="flex flex-col ml-14px justify-between h-[35px]">
                <span class="text-14px text-#333">{{ item.name }}</span>
                <span class="text-12px text-#999">{{ item.text }}</span>
              </div>
            </div>
            <div class="flex justify-right text text-12px w-fit truncate text-right">
              {{ formatTimestamp(item?.activeTime) }}
            </div>
            未读数 悬浮到头像上
            <div v-if="item.unreadCount > 0" class="flex flex-col justify-between h-[35px] absolute left-30px top-5px">
              <span class="text-12px text-[#fff] bg-[red] rounded-full px-8px py-3px">{{ item.unreadCount }}</span>
            </div>
          </div> -->
        </div>
      </div>
    </PullToRefresh>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useChatStore } from '@/stores/chat.ts'
import PullToRefresh from '#/components/PullToRefresh.vue'
import { formatTimestamp } from '@/utils/ComputedTime.ts'
import { IsAllUserEnum } from '@/services/types.ts'

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
// .message-item {
//   @apply flex justify-around items-center p-3 hover:bg-#DEEDE7 hover:rounded-10px transition-colors cursor-pointer;
// }
</style>

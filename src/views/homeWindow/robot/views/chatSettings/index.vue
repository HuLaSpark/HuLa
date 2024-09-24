<template>
  <div class="flex border-b-(1px solid [--line-color]) truncate p-[14px_20px] justify-between items-center gap-50px">
    <n-flex :size="10" vertical class="truncate">
      <p class="text-(22px [--chat-text-color]) truncate font-500">设置</p>
      <p class="text-(14px #909090)">所有设置选项</p>
    </n-flex>

    <n-flex class="min-w-fit">
      <div @click="handleClose" class="right-btn">
        <svg><use href="#close"></use></svg>
      </div>
    </n-flex>
  </div>

  <!-- 设置的主体内容  -->
  <n-scrollbar :class="{ 'shadow-inner': page.shadow }" style="max-height: calc(100vh - 104px)">
    <n-flex vertical :size="20" class="p-[20px_0]">
      <div v-for="(key, index) in content" :key="index" class="flex flex-1 p-[0_20px]">
        <n-flex
          vertical
          class="w-full h-fit bg-[--bg-setting-item] border-(solid 1px [--line-color]) custom-shadow rounded-8px p-10px">
          <n-flex vertical justify="center" v-for="(item, index) in key" :key="index">
            <n-flex justify="space-between" :size="20" align="center" class="p-8px">
              <n-flex vertical :size="4">
                <p class="text-(15px [--chat-text-color]) font-500">{{ item.title }}</p>
                <p v-if="item.description" class="text-(12px #909090)">{{ item.description }}</p>
              </n-flex>

              <component :is="item.features" />
            </n-flex>

            <div v-if="index !== key.length - 1" class="h-1px bg-[--line-color]"></div>
          </n-flex>
        </n-flex>
      </div>
    </n-flex>
  </n-scrollbar>
</template>
<script setup lang="tsx">
import router from '@/router'
import Mitt from '@/utils/Bus.ts'
import { content } from './config.tsx'
import { setting } from '@/stores/setting.ts'

const settingStore = setting()
const { page } = storeToRefs(settingStore)
const handleClose = () => {
  router.push('/chat').then(() => {
    nextTick(() => {
      Mitt.emit('return-chat')
    })
  })
}
</script>
<style scoped lang="scss">
.right-btn {
  @apply size-fit border-(1px solid [--line-color]) cursor-pointer bg-[--chat-bt-color] color-[--chat-text-color] rounded-8px custom-shadow p-[10px_11px];
  svg {
    @apply size-18px;
  }
}
</style>

<template>
  <!--! 这里最好不要使用n-flex,滚动高度会有问题  -->
  <main v-if="activeItem.type === RoomTypeEnum.GROUP" style="border-left: 1px solid var(--line-color)" class="item-box">
    <n-flex v-if="!isSearch" align="center" justify="space-between" class="pr-8px pl-8px h-42px">
      <span class="text-14px">群聊成员</span>
      <svg @click="handleSearch" class="size-14px"><use href="#search"></use></svg>
    </n-flex>
    <!-- 搜索框 -->
    <n-flex v-else align="center" class="pr-8px h-42px">
      <n-input
        @blur="isSearch = false"
        ref="inputInstRef"
        v-model:value="searchRef"
        clearable
        placeholder="搜索"
        type="text"
        size="tiny"
        class="h-26px w-95% lh-26px rounded-6px">
        <template #prefix>
          <svg class="w-12px h-12px"><use href="#search"></use></svg>
        </template>
      </n-input>
    </n-flex>

    <n-virtual-list
      id="image-scroll-container"
      ref="virtualListInst"
      style="max-height: calc(100vh - 130px)"
      item-resizable
      :item-size="42"
      :items="MockList">
      <template #default="{ item }">
        <ContextMenu @select="$event.click(item)" :menu="optionsList" :special-menu="report">
          <n-flex :key="item.key" :size="10" align="center" class="item">
            <n-avatar
              lazy
              round
              :color="'#fff'"
              :size="24"
              :src="item.avatar"
              fallback-src="/logo.png"
              :render-placeholder="() => null"
              :intersection-observer-options="{
                root: '#image-scroll-container'
              }"></n-avatar>
            <span class="text-12px">{{ item.accountName }}</span>
          </n-flex>
        </ContextMenu>
      </template>
    </n-virtual-list>
  </main>
</template>
<script setup lang="ts">
import { RoomTypeEnum } from '@/enums'
import { MockItem } from '@/services/types.ts'
import { MockList } from '@/mock'
import { InputInst } from 'naive-ui'
import { optionsList, report } from './config.ts'

const isSearch = ref(false)
const searchRef = ref('')
const inputInstRef = ref<InputInst | null>(null)
const { activeItem } = defineProps<{
  activeItem: MockItem
}>()

const handleSearch = () => {
  isSearch.value = !isSearch.value
  nextTick(() => {
    inputInstRef.value?.select()
  })
}
</script>

<style scoped lang="scss">
@import '@/styles/scss/chat-sidebar';
</style>

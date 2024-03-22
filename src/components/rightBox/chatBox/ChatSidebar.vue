<template>
  <!--! 这里最好不要使用n-flex,滚动高度会有问题  -->
  <main
    v-if="activeItem?.type === RoomTypeEnum.GROUP"
    style="border-left: 1px solid var(--line-color)"
    class="item-box">
    <n-flex v-if="!isSearch" align="center" justify="space-between" class="pr-8px pl-8px h-42px">
      <span class="text-14px">群聊成员</span>
      <svg @click="handleSearch" class="size-14px"><use href="#search"></use></svg>
    </n-flex>

    <n-flex v-else align="center" class="pr-8px h-42px">
      <n-input
        @blur="isSearch = false"
        ref="inputInstRef"
        v-model:value="searchRef"
        autofocus
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
      ref="virtualListInst"
      style="max-height: calc(100vh - 130px)"
      item-resizable
      :item-size="42"
      :items="MockList">
      <template #default="{ item }">
        <n-flex :key="item.key" :size="10" align="center" class="item">
          <n-avatar lazy round :size="24" :src="item.avatar"></n-avatar>
          <span class="text-12px">{{ item.accountName }}</span>
        </n-flex>
      </template>
    </n-virtual-list>
  </main>
</template>
<script setup lang="ts">
import { RoomTypeEnum } from '@/enums'
import { MockItem } from '@/services/types.ts'
import { MockList } from '@/mock'
import { InputInst } from 'naive-ui'

const isSearch = ref(false)
const searchRef = ref('')
const inputInstRef = ref<InputInst | null>(null)
const { activeItem } = defineProps<{
  activeItem?: MockItem
}>()

const handleSearch = () => {
  isSearch.value = !isSearch.value
  nextTick(() => {
    inputInstRef.value?.select()
  })
}
</script>

<style scoped lang="scss">
.item-box {
  @apply flex flex-col w-180px h-100vh z-20 p-[12px_0_12px_6px] box-border select-none text-[--text-color];
  .item {
    height: 42px;
    padding-left: 4px;
    width: 95%;
    box-sizing: border-box;
    border-radius: 6px;
    &:hover {
      cursor: pointer;
      background-color: var(--bg-group-hover);
    }
  }
}
/*! 修改naive-ui虚拟列表滚动条的宽度 */
:deep(
    .n-scrollbar > .n-scrollbar-rail.n-scrollbar-rail--vertical,
    .n-scrollbar + .n-scrollbar-rail.n-scrollbar-rail--vertical
  ) {
  width: 6px;
}
</style>

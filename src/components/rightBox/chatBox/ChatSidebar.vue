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

    <!--  // TODO popover显示的时候去改变窗口的大小、当点击了半个选项的时候也会出现原生滚动条 (nyh -> 2024-03-25 05:04:37)  -->
    <!-- // TODO 如果popover显示就先暂时不让滚动，因为在n-scrollbar和n-virtual-list中使用当我点击最后一个选项时候n-popover位置不够导致出现原生滚动条 (nyh -> 2024-03-24 22:46:38) -->
    <!-- // TODO 如果直接使用n-virtual-list的滚动配上n-popover似乎也没有这个bug，但是当点击倒数第二个的时候还是会出现滚动条 (nyh -> 2024-03-25 00:30:53)   -->
    <n-virtual-list
      id="image-chat-sidebar"
      style="max-height: calc(100vh - 130px)"
      item-resizable
      :item-size="42"
      :items="MockList">
      <template #default="{ item }">
        <n-popover
          @update:show="handlePopoverUpdate(item.key)"
          trigger="click"
          placement="left-start"
          :show-arrow="false"
          style="padding: 0; background: var(--bg-info); backdrop-filter: blur(10px)">
          <template #trigger>
            <ContextMenu @select="$event.click(item)" :menu="optionsList" :special-menu="report">
              <n-flex @click="selectKey = item.key" :key="item.key" :size="10" align="center" class="item">
                <n-avatar
                  lazy
                  round
                  :color="'#fff'"
                  :size="24"
                  :src="item.avatar"
                  fallback-src="/logo.png"
                  :render-placeholder="() => null"
                  :intersection-observer-options="{
                    root: '#image-chat-sidebar'
                  }"></n-avatar>
                <span class="text-12px">{{ item.accountName }}</span>
              </n-flex>
            </ContextMenu>
          </template>
          <!-- 用户个人信息框 -->
          <InfoPopover :info="item" />
        </n-popover>
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
import { usePopover } from '@/hooks/usePopover.ts'

/** 当前点击的用户的key */
const selectKey = ref()
const isSearch = ref(false)
const searchRef = ref('')
const inputInstRef = ref<InputInst | null>(null)
const { handlePopoverUpdate } = usePopover(selectKey, 'image-chat-sidebar')

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

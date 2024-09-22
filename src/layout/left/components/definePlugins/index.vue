<template>
  <!-- 弹出框 -->
  <n-modal v-model:show="isShow as boolean" :mask-closable="false" class="w-390px border-rd-8px">
    <div class="bg-[--bg-popover] h-full box-border flex flex-col">
      <!-- 顶部图片加上操作栏 -->
      <div class="h-140px relative w-full p-6px box-border">
        <img
          class="absolute blur-6px rounded-t-6px z-1 top-0 left-0 w-full h-140px object-cover"
          src="@/assets/img/dispersion-bg.png"
          alt="" />
        <img
          class="absolute rounded-t-6px z-2 top-0 left-0 w-full h-140px object-cover"
          src="@/assets/img/dispersion-bg.png"
          alt="" />

        <div
          v-if="type() === 'macos'"
          @click="isShow = false"
          class="mac-close z-10 relative size-13px shadow-inner bg-#ed6a5eff rounded-50% select-none">
          <svg class="hidden size-7px color-#000 font-bold select-none absolute top-3px left-3px">
            <use href="#close"></use>
          </svg>
        </div>

        <svg
          v-if="type() === 'windows'"
          @click="isShow = false"
          class="z-10 color-#333 w-12px h-12px absolute top-6px right-6px cursor-pointer select-none">
          <use href="#close"></use>
        </svg>
      </div>

      <n-flex justify="space-between" align="center">
        <n-flex :size="4" align="center" class="p-18px">
          <p class="text-(16px [--text-color])">插件管理</p>
          <div class="ml-6px p-[4px_8px] size-fit bg-[--bate-bg] rounded-8px text-(12px [--bate-color] center)">
            Beta
          </div>
        </n-flex>

        <n-tabs
          :value="viewMode"
          :on-update:value="(v) => (viewMode = v)"
          class="w-76px h-28px mr-22px"
          type="segment"
          animated>
          <n-tab name="card">
            <template #default>
              <svg class="size-16px"><use href="#view-grid-card"></use></svg>
            </template>
          </n-tab>
          <n-tab name="list">
            <template #default>
              <svg class="size-16px"><use href="#view-grid-list"></use></svg>
            </template>
          </n-tab>
        </n-tabs>
      </n-flex>

      <Transition name="slide-up" mode="out-in">
        <Card v-if="viewMode === 'card'" />
        <List v-else />
      </Transition>
    </div>
  </n-modal>
</template>
<script setup lang="ts">
import { type } from '@tauri-apps/plugin-os'
import { usePluginsStore } from '@/stores/plugins.ts'
import Card from './Card.vue'
import List from './List.vue'

/** 是否展示插件管理弹窗 */
const isShow = defineModel()
const { viewMode } = storeToRefs(usePluginsStore())
</script>

<style scoped lang="scss">
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.25s ease-out;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-30px);
}
</style>

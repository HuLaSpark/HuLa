<template>
  <n-flex vertical :size="30">
    <n-flex align="end" :size="20">
      <component :is="versatileModel" />

      <n-flex vertical :size="20">
        <n-flex
          @click="handleVersatile('default')"
          :size="6"
          align="center"
          class="bg-[--bg-setting-item] p-[2px_6px] cursor-pointer rounded-50px w-80px h-30px">
          <svg class="size-22px outline-none color-[--chat-text-color]"><use href="#forbid"></use></svg>

          <p class="text-(12px [--chat-text-color])">恢复默认</p>
        </n-flex>
      </n-flex>
    </n-flex>

    <n-flex vertical align="start" :size="20" class="variation-item">
      <n-flex :size="20" align="end">
        <p class="text-(16px [--text-color])">变出活力色彩</p>
        <p class="text-(12px #999)">感受色彩的魅力，创造属于你的色彩世界</p>
      </n-flex>

      <n-flex align="center" :size="20">
        <div
          @click="handleVersatile('simple')"
          :class="{ 'outline outline-2 outline-[--border-active-color] outline-offset': themes.versatile === 'simple' }"
          class="w-108px h-84px flex-col-center gap-10px cursor-pointer rounded-8px bg-#f1f1f1">
          <img class="size-34px" src="@/assets/img/hula_bg_l.png" alt="" />
          <p class="text-(12px [--chat-text-color])">极简素雅</p>
        </div>
      </n-flex>
    </n-flex>
  </n-flex>
</template>
<script setup lang="ts">
import { versatileModel } from './model.tsx'
import { setting } from '@/stores/setting.ts'

const settingStore = setting()
const { themes } = storeToRefs(settingStore)

const handleVersatile = (val: string) => {
  themes.value.versatile = val
}
</script>

<style scoped lang="scss">
.variation-item {
  @apply border-(solid 1px [--line-color]) custom-shadow
  bg-[--bg-setting-item] h-156px rounded-12px p-[16px_16px] box-border;
}
</style>

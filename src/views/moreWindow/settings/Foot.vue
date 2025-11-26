<template>
  <div class="flex items-center justify-center p-[20px_0]">
    <div class="flex items-center justify-center gap-8px">
      <svg class="size-18px"><use href="#SmilingFace"></use></svg>
      <p class="text-(12px #777)">{{ t('setting.footer.like_product') }}</p>
      <n-popover v-model:show="isStar" style="padding: 0" trigger="hover" placement="top">
        <template #trigger>
          <p class="text-(12px #13987f) cursor-pointer">{{ t('setting.footer.star_cta') }}</p>
        </template>
        <n-flex vertical class="w-360px h-fit">
          <video class="w-full h-240px rounded-t-8px object-cover" src="../../../assets/video/star.mp4" autoplay loop />
          <n-flex vertical :size="10" class="p-14px">
            <p class="text-(16px [--text-color])">{{ t('setting.footer.star_popover_title') }}</p>
            <p class="text-(12px [--chat-text-color]) leading-5">{{ t('setting.footer.star_popover_desc') }}</p>

            <n-flex :size="10" class="ml-auto">
              <div
                @click="isStar = false"
                class="border-(1px solid #999) cursor-pointer w-40px h-30px rounded-8px flex-center text-(12px [--text-color])">
                {{ t('setting.footer.later') }}
              </div>

              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://github.com/HuLaSpark/HuLa"
                class="bg-#363636 cursor-pointer w-fit px-10px h-30px rounded-8px flex-center text-(12px #f1f1f1) no-underline">
                {{ t('setting.footer.star_button') }}
              </a>
            </n-flex>
          </n-flex>
        </n-flex>
      </n-popover>
      <p class="text-(12px #777)">{{ t('setting.footer.share_joiner') }}</p>
      <n-popover v-model:show="isIssue" style="padding: 0" trigger="hover" placement="top-end">
        <template #trigger>
          <p class="text-(12px #13987f) cursor-pointer">{{ t('setting.footer.share_cta') }}</p>
        </template>
        <n-flex vertical class="w-360px h-fit">
          <video
            class="w-full h-240px rounded-t-8px object-cover"
            src="../../../assets/video/issue.mp4"
            autoplay
            loop />
          <n-flex vertical :size="10" class="p-14px">
            <p class="text-(16px [--text-color] )">{{ t('setting.footer.issue_popover_title') }}</p>
            <p class="text-(12px [--chat-text-color]) leading-5">{{ t('setting.footer.issue_popover_desc') }}</p>

            <n-flex :size="10" class="ml-auto">
              <div
                @click="isIssue = false"
                class="border-(1px solid #999) cursor-pointer w-40px h-30px rounded-8px flex-center text-(12px [--text-color])">
                {{ t('setting.footer.later') }}
              </div>

              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://github.com/HuLaSpark/HuLa/issues"
                class="bg-#363636 cursor-pointer w-fit px-10px h-30px rounded-8px flex-center text-(12px #f1f1f1) no-underline">
                {{ t('setting.footer.issue_button') }}
              </a>
            </n-flex>
          </n-flex>
        </n-flex>
      </n-popover>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const isStar = ref(false)
const isIssue = ref(false)
</script>

<style scoped lang="scss"></style>

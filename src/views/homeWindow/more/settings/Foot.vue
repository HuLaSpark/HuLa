<template>
  <div class="flex items-center justify-center p-[20px_0]">
    <div class="flex items-center justify-center gap-8px">
      <svg class="size-18px"><use href="#SmilingFace"></use></svg>
      <p class="text-(12px #777)">喜欢这款的产品？ 在</p>
      <n-popover v-model:show="isStar" style="padding: 0" trigger="click" placement="top">
        <template #trigger>
          <p class="text-(12px #13987f) cursor-pointer">GitHub 给添加星标</p>
        </template>
        <n-flex vertical class="w-360px h-fit">
          <video class="w-full h-240px rounded-t-8px object-cover" src="@/assets/video/star.mp4" autoplay loop />
          <n-flex vertical :size="10" class="p-14px">
            <p class="text-(16px [--text-color] font-bold)">在 GitHub 为我们点亮星标</p>
            <p class="text-(12px [--chat-text-color]) leading-5">
              如果您喜爱我们的产品，并希望支持我们，可以去 GitHub
              给我们点一颗星吗？这个小小的动作对我们来说意义重大，能激励我们为您持续提供特性体验。
            </p>

            <n-flex :size="10" class="ml-auto">
              <div
                @click="isStar = false"
                class="border-(1px solid #999) cursor-pointer w-40px h-30px rounded-8px flex-center text-(12px [--text-color])">
                稍后
              </div>

              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://github.com/HuLaSpark/HuLa-IM-Tauri"
                class="bg-#363636 cursor-pointer w-70px h-30px rounded-8px flex-center text-(12px #f1f1f1) no-underline">
                点亮星标
              </a>
            </n-flex>
          </n-flex>
        </n-flex>
      </n-popover>
      <p class="text-(12px #777)">并</p>
      <n-popover v-model:show="isIssue" style="padding: 0" trigger="click" placement="top-end">
        <template #trigger>
          <p class="text-(12px #13987f) cursor-pointer">分享您宝贵的建议</p>
        </template>
        <n-flex vertical class="w-360px h-fit">
          <video class="w-full h-240px rounded-t-8px object-cover" src="@/assets/video/issue.mp4" autoplay loop />
          <n-flex vertical :size="10" class="p-14px">
            <p class="text-(16px [--text-color] font-bold)">在 GitHub 分享您宝贵的反馈</p>
            <p class="text-(12px [--chat-text-color]) leading-5">
              您的每一个想法和建议对我们来说都弥足珍贵，我们迫不及待地想知道您的看法！欢迎联系我们提供产品功能和使用体验反馈。
            </p>

            <n-flex :size="10" class="ml-auto">
              <div
                @click="isIssue = false"
                class="border-(1px solid #999) cursor-pointer w-40px h-30px rounded-8px flex-center text-(12px [--text-color])">
                稍后
              </div>

              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://github.com/HuLaSpark/HuLa-IM-Tauri/issues"
                class="bg-#363636 cursor-pointer w-70px h-30px rounded-8px flex-center text-(12px #f1f1f1) no-underline">
                提出建议
              </a>
            </n-flex>
          </n-flex>
        </n-flex>
      </n-popover>
    </div>
  </div>
</template>
<script setup lang="ts">
const isStar = ref(false)
const isIssue = ref(false)
</script>

<style scoped lang="scss"></style>

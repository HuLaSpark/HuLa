<template>
  <n-flex vertical :size="50" align="center" justify="center" class="flex flex-1">
    <!-- logo -->
    <img class="w-275px h-125px drop-shadow-2xl" src="@/assets/logo/hula.png" alt="" />

    <n-flex vertical justify="center" :size="16" class="p-[40px_20px]">
      <p class="text-(14px [--chat-text-color])">你可以尝试使用以下功能：</p>
      <n-flex align="center" :size="16">
        <n-flex
          vertical
          v-for="(item, index) in examplesList"
          :key="index"
          justify="center"
          :size="12"
          class="examples">
          <p class="text-(14px [--chat-text-color]) font-bold">{{ item.title }}</p>
          <component :is="item.content" />
        </n-flex>
      </n-flex>
    </n-flex>
  </n-flex>
</template>
<script setup lang="tsx">
import { NFlex } from 'naive-ui'

type Example = {
  title: string
  content: JSX.Element
}[]
const avatars = [
  'https://avatars.githubusercontent.com/u/20943608?s=60&v=4',
  'https://avatars.githubusercontent.com/u/46394163?s=60&v=4',
  'https://avatars.githubusercontent.com/u/39197136?s=60&v=4',
  'https://avatars.githubusercontent.com/u/19239641?s=60&v=4'
]
const examplesList: Example = [
  {
    title: 'AI搜索',
    content: (
      <NFlex vertical size={12}>
        {Array.from({ length: 3 }, (_, index) => (
          <NFlex key={index} class={'examples-item'}>
            <img class={'rounded-12px w-55px h-45px object-fill'} src={avatars[2]} alt="" />
            <NFlex vertical justify="center" class={'text-(12px [--chat-text-color]) truncate flex-1'}>
              <p class="truncate w-full">你好，我是机器人小助手，很高兴为你服务。</p>
              <p>你最近怎么样？</p>
            </NFlex>

            <svg
              style={{ filter: 'drop-shadow(0 0 0.6em #13987f)' }}
              class="color-#13987f p-[10px_4px] size-26px opacity-0 absolute top-1/2 right--14px transform -translate-x-1/2 -translate-y-1/2">
              <use href="#Up-GPT"></use>
            </svg>
          </NFlex>
        ))}
      </NFlex>
    )
  },
  {
    title: '情感消息',
    content: (
      <NFlex vertical size={12}>
        {Array.from({ length: 3 }, (_, index) => (
          <NFlex key={index} class={'examples-item'}>
            <img class={'rounded-12px w-55px h-45px object-fill'} src={avatars[1]} alt="" />
            <NFlex vertical justify="center" class={'text-(12px [--chat-text-color]) truncate flex-1'}>
              <p class="truncate w-full">你好，我是机器人小助手，很高兴为你服务。</p>
              <p>你最近怎么样？</p>
            </NFlex>

            <svg
              style={{ filter: 'drop-shadow(0 0 0.6em #13987f)' }}
              class="color-#13987f p-[10px_4px] size-26px opacity-0 absolute top-1/2 right--14px transform -translate-x-1/2 -translate-y-1/2">
              <use href="#Up-GPT"></use>
            </svg>
          </NFlex>
        ))}
      </NFlex>
    )
  }
]
</script>

<style lang="scss">
.examples {
  @apply w-300px h-fit rounded-12px p-10px box-border cursor-pointer border-(solid 1px [--line-color]) shadow-md;
}
.examples-item {
  @apply relative rounded-12px p-6px box-border cursor-pointer transition-all duration-600 ease-in-out;
  svg {
    @apply transition-all duration-600 ease-in-out;
  }
  &:hover {
    @apply bg-[--chat-hover-color];
    svg {
      @apply opacity-100;
    }
  }
}
</style>

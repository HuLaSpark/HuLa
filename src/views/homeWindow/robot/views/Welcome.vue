<template>
  <n-flex vertical :size="10" align="center" justify="center" class="flex flex-1">
    <!-- logo -->
    <img class="w-275px h-125px drop-shadow-2xl" src="@/assets/logo/hula.png" alt="" />

    <n-flex vertical justify="center" :size="16" class="p-[30px_20px]">
      <p class="text-(14px [--chat-text-color])">你可以尝试使用以下功能：</p>
      <n-scrollbar style="max-height: calc(100vh - 210px)">
        <n-flex style="padding: 6px" align="center" :size="[24, 16]">
          <n-flex
            vertical
            v-for="(item, index) in examplesList"
            :key="index"
            justify="center"
            :size="12"
            class="examples">
            <n-flex align="center" justify="space-between">
              <p class="text-(14px [--chat-text-color]) font-500">{{ item.title }}</p>
              <svg class="size-16px"><use :href="`#${item.icon}`"></use></svg>
            </n-flex>
            <component :is="item.content" />
          </n-flex>
        </n-flex>
      </n-scrollbar>
    </n-flex>
  </n-flex>
</template>
<script setup lang="tsx">
import { NFlex, NImage, NSkeleton } from 'naive-ui'
import { VNode } from 'vue'

type Example = {
  title: string
  icon: string
  content: VNode
}[]
const avatars = 'https://picsum.photos/140'
const examplesList: Example = [
  {
    title: 'AI搜索',
    icon: 'search',
    content: (
      <NFlex vertical size={12}>
        {Array.from({ length: 3 }, (_, index) => (
          <NFlex key={index} class={'search-item'}>
            <NImage width={50} height={45} previewDisabled class={'rounded-12px'} src={`${avatars}?${index}1`}>
              {{
                placeholder: () => (
                  <div class="w-50px h-45px rounded-12px bg-[--chat-hover-color]">
                    <NSkeleton height="100%" width="100%" class={'rounded-12px'} />
                  </div>
                )
              }}
            </NImage>
            <NFlex vertical justify="center" class={'text-(12px [--chat-text-color]) truncate flex-1'}>
              <p class="truncate w-full">你好，我是机器人小助手，很高兴为你服务。</p>
              <p>你最近怎么样？</p>
            </NFlex>

            <svg
              style={{ filter: 'drop-shadow(0 0 0.6em #13987f)' }}
              class="color-#13987f p-[10px_4px] size-26px opacity-0 absolute top-1/2 right-24px transform -translate-x-1/2 -translate-y-1/2">
              <use href="#Up-GPT"></use>
            </svg>
          </NFlex>
        ))}
      </NFlex>
    )
  },
  {
    title: 'PDF阅读',
    icon: 'notes',
    content: (
      <NFlex vertical size={12} class={'pdf-item'}>
        <NFlex vertical justify="center" class="content">
          <NFlex size={12} align={'center'}>
            <img class="size-24px" src="/file/pdf.svg" alt="" />
            <p class="text-(12px [--chat-text-color]) underline">全球经济金融展望报告.pdf</p>
          </NFlex>
          <p class="indent-8 text-(12px [--chat-text-color]) text-wrap leading-5">
            2023年全球经济增长动力持续回落，各国复苏 分化，发达经济体增速明显放缓，新兴经济体 整体表现稳定。
          </p>
          <ul class="list-disc list-inside indent-4 truncate text-(12px [--chat-text-color]) text-wrap leading-5">
            <li>
              展望2024年，预计全球经济复苏将依日疲软，主要经济体增长态势和货币政策走势将
              进一步分化。全球贸易环境的不确定性亦将上升，受保护主义和技术变革的双重影响，供应链重组趋势或将加速。
            </li>
          </ul>
        </NFlex>

        <NFlex vertical justify="center" align="center" class="foot">
          <svg
            style={{ filter: 'drop-shadow(0 0 0.6em #13987f)' }}
            class="color-#13987f p-[10px_4px] size-26px opacity-0">
            <use href="#Up-GPT"></use>
          </svg>
          <p class="text-(14px [--chat-text-color]) opacity-0">前往阅读</p>
        </NFlex>
      </NFlex>
    )
  },
  {
    title: '图像生成',
    icon: 'photo',
    content: (
      <NFlex vertical justify="center" size={0} class={'photo-item'}>
        <NFlex align={'center'} size={10} class={'head'}>
          {Array.from({ length: 4 }, (_, index) => (
            <NImage width={128} height={90} previewDisabled class={'rounded-12px'} src={`${avatars}?${index}`}>
              {{
                placeholder: () => (
                  <div class="w-128px h-90px rounded-12px bg-[--chat-hover-color]">
                    <NSkeleton height="100%" width="100%" class={'rounded-12px'} />
                  </div>
                )
              }}
            </NImage>
          ))}
        </NFlex>

        <NFlex justify={'space-between'} align={'center'} class={'foot'}>
          <p class={'text-(14px [--chat-text-color]) font-500 pl-6px opacity-0'}>试一试</p>
          <svg style={{ filter: 'drop-shadow(0 0 0.6em #13987f)' }} class="color-#13987f pr-6px size-26px opacity-0">
            <use href="#Up-GPT"></use>
          </svg>
        </NFlex>
      </NFlex>
    )
  }
]
</script>

<style lang="scss">
.examples {
  @apply w-300px h-fit rounded-12px p-10px box-border cursor-pointer border-(solid 1px [--line-color]) custom-shadow;
  &:hover {
    .search-item:not(:hover) {
      @apply blur-md scale-94;
    }
    @apply outline outline-2 outline-#13987f outline-offset;
  }
}

.search-item {
  @apply relative rounded-12px p-6px box-border cursor-pointer transition-all duration-600 ease-in-out;
  svg {
    @apply transition-all duration-600 ease-in-out;
  }
  &:hover {
    @apply bg-[--chat-hover-color] scale-104;
    svg {
      @apply opacity-100 translate-x-20px;
    }
  }
}

.pdf-item {
  @apply relative;
  .content {
    @apply bg-[--chat-hover-color] h-195px rounded-12px p-10px box-border transition-all duration-600 ease-in-out;
  }
  .foot {
    @apply absolute top-2/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2;
    svg,
    p {
      @apply transition-all duration-600 ease-in-out;
    }
  }
  &:hover .content {
    @apply blur-md;
  }
  &:hover .foot {
    svg,
    p {
      @apply opacity-100 translate-y--30px;
    }
  }
}

.photo-item {
  @apply relative p-6px box-border;
  .foot {
    @apply w-full h-40px absolute bottom--30px left-0 rounded-12px transition-all duration-600 ease-in-out;
  }
  &:hover {
    .head {
      @apply blur-md scale-94 transition-all duration-600 ease-in-out;
    }
    .foot {
      @apply backdrop-blur-xl bg-#F1F1F133 translate-y--30px;
      svg,
      p {
        @apply opacity-100;
      }
    }
  }
}
</style>

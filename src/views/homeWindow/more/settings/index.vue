<template>
  <main class="size-full flex select-none">
    <!-- 侧边栏选项 -->
    <section class="left-bar" data-tauri-drag-region>
      <div class="menu-list">
        <div v-for="(item, index) in sideOptions" :key="index">
          <div class="menu-item" :class="{ active: activeItem === item.url }" @click="pageJumps(item.url, item.label)">
            <svg><use :href="`#${item.icon}`"></use></svg>
            {{ item.label }}
          </div>
        </div>
      </div>
    </section>

    <!-- 右边内容 -->
    <section class="bg-[--right-bg-color] flex-1 custom-shadow border-l-(1px solid [--line-color])">
      <ActionBar :shrink="false" :max-w="false" />

      <header class="header" style="box-shadow: var(--shadow-enabled) 4px 4px var(--box-shadow-color)">
        {{ title }}
      </header>

      <div class="flex-1 p-24px"><router-view /></div>
    </section>
  </main>
</template>
<script setup lang="ts">
import router from '@/router'
import { sideOptions } from './config.ts'

/**当前选中的元素 默认选中itemsTop的第一项*/
const activeItem = ref<string>(sideOptions.value[0].url)
const title = ref<string>(sideOptions.value[0].label)

/**
 * 统一跳转路由方法
 * @param url 跳转的路由
 * @param label 页面的标题
 * */
const pageJumps = (url: string, label: string) => {
  activeItem.value = url
  title.value = label
  router.push(url)
}

onMounted(() => {
  pageJumps(activeItem.value, title.value)
})
</script>

<style scoped lang="scss">
.left-bar {
  @include menu-list();
  background: var(--bg-left-menu);
  width: 200px;
  padding: 20px 12px;
  box-sizing: border-box;
  color: var(--text-color);
  .menu-item {
    padding: 8px 10px;
    border-radius: 10px;
    margin-top: 6px;
    font-size: 14px;
    svg {
      width: 18px;
      height: 18px;
    }
    &:not(.active):hover {
      background-color: var(--bg-left-menu-hover);
    }
    &:hover {
      background-color: var(--bg-left-active);
      svg {
        animation: none;
      }
    }
  }
}

.active {
  background-color: var(--bg-left-active);
}

.header {
  @apply w-full h-42px flex items-center pl-40px select-none text-18px color-[--text-color] border-b-(1px solid [--line-color]);
}
</style>

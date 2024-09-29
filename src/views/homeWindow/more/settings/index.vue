<template>
  <main class="size-full flex select-none">
    <!-- 侧边栏选项 -->
    <section class="left-bar" data-tauri-drag-region>
      <div class="menu-list relative">
        <div v-for="(item, index) in sideOptions" :key="index">
          <div class="menu-item" :class="{ active: activeItem === item.url }" @click="pageJumps(item.url, item.label)">
            <n-flex align="center">
              <svg><use :href="`#${item.icon}`"></use></svg>
              {{ item.label }}
            </n-flex>
            <Transition>
              <div
                v-if="item.versionStatus && activeItem !== item.url"
                class="bg-#f6dfe3ff p-[2px_6px] rounded-6px text-(12px #ce304f)">
                {{ item.versionStatus }}
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <div class="absolute bottom-20px left-60px select-none cursor-default flex items-center gap-10px">
        <p class="text-(12px #666)">提供者:</p>
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://github.com/HuLaSpark/HuLa-IM-Tauri"
          class="text-(12px #13987f) cursor-pointer no-underline">
          HuLa
        </a>
      </div>
    </section>

    <!-- 右边内容 -->
    <section class="bg-[--right-bg-color] relative rounded-r-8px flex-1 border-l-(1px solid [--line-color])">
      <ActionBar :shrink="false" :max-w="false" />

      <header class="header">
        {{ title }}
      </header>

      <n-scrollbar style="max-height: calc(100vh - 70px)" :class="{ 'shadow-inner': page.shadow }">
        <n-flex vertical class="p-24px" :size="12" justify="center" v-if="skeleton">
          <n-skeleton class="rounded-8px" height="26px" text style="width: 30%" />
          <n-skeleton class="rounded-8px" height="26px" text :repeat="5" />
          <n-skeleton class="rounded-8px" height="26px" text style="width: 60%" />
        </n-flex>
        <template v-else>
          <div class="flex-1 p-24px"><router-view /></div>

          <Foot />
        </template>
      </n-scrollbar>
    </section>
  </main>
</template>
<script setup lang="ts">
import router from '@/router'
import { sideOptions } from './config.ts'
import { setting } from '@/stores/setting.ts'
import Foot from '@/views/homeWindow/more/settings/Foot.vue'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'

const settingStore = setting()
const skeleton = ref(true)
const { page } = storeToRefs(settingStore)
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

onMounted(async () => {
  await getCurrentWebviewWindow().show()
  setTimeout(() => {
    skeleton.value = false
  }, 300)
  pageJumps(activeItem.value, title.value)
})
</script>

<style scoped lang="scss">
.left-bar {
  @include menu-list();
  background: var(--bg-left-menu);
  width: 200px;
  padding: 24px 12px;
  box-sizing: border-box;
  color: var(--text-color);
  .menu-item {
    padding: 8px 10px;
    border-radius: 10px;
    margin-top: 6px;
    font-size: 14px;
    display: flex;
    justify-content: space-between;
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

.v-enter-active,
.v-leave-active {
  transition: opacity 0.5s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}
</style>

<template>
  <main class="size-full flex select-none">
    <!-- 侧边栏选项 -->
    <section class="left-bar" data-tauri-drag-region>
      <div class="menu-list relative">
        <div v-for="(item, index) in sideOptions" :key="index">
          <div class="menu-item" :class="{ active: activeItem === item.url }" @click="pageJumps(item.url)">
            <n-flex align="center">
              <svg><use :href="`#${item.icon}`"></use></svg>
              {{ item.label }}
            </n-flex>
            <Transition>
              <div
                v-if="item.versionStatus && activeItem !== item.url"
                class="bg-[--danger-bg] p-[2px_6px] rounded-6px text-(12px [--danger-text])">
                {{ t(item.versionStatus) }}
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <div class="absolute bottom-20px left-60px select-none cursor-default flex items-center gap-10px">
        <p class="text-(12px #666)">{{ t('setting.common.provider_label') }}:</p>
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://github.com/HuLaSpark/HuLa"
          class="text-(12px #13987f) cursor-pointer no-underline">
          {{ t('setting.common.provider_name') }}
        </a>
      </div>
    </section>

    <!-- 右边内容 -->
    <section class="bg-[--right-bg-color] relative rounded-r-8px flex-1 border-l-(1px solid [--line-color])">
      <ActionBar :shrink="false" :max-w="true" />

      <header class="header" data-tauri-drag-region>
        {{ title }}
      </header>

      <n-scrollbar
        style="max-height: calc(100vh / var(--page-scale, 1) - 70px)"
        :class="{ 'shadow-inner': page.shadow }"
        data-tauri-drag-region>
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
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import router from '@/router'
import { useScannerStore } from '@/stores/scanner.ts'
import { useSettingStore } from '@/stores/setting.ts'
import Foot from '@/views/moreWindow/settings/Foot.vue'
import { useSideOptions } from './config.ts'
import { useI18n } from 'vue-i18n'

const settingStore = useSettingStore()
const scannerStore = useScannerStore()
const skeleton = ref(true)
const { page } = storeToRefs(settingStore)
const sideOptions = useSideOptions()
const { t } = useI18n()
/**当前选中的元素 默认选中itemsTop的第一项*/
const activeItem = ref<string>('/general')
const title = ref<string>('')

watch(
  sideOptions,
  (options) => {
    if (!options.length) return
    const current = options.find((item) => item.url === activeItem.value) ?? options[0]
    activeItem.value = current.url
    title.value = current.label
  },
  { immediate: true }
)

/**
 * 统一跳转路由方法
 * @param url 跳转的路由
 * @param label 页面的标题
 * */
const pageJumps = (url: string) => {
  const matched = sideOptions.value.find((item) => item.url === url)
  if (matched) {
    activeItem.value = matched.url
    title.value = matched.label
  }
  router.push(url)
}

onMounted(async () => {
  await getCurrentWebviewWindow().show()

  // 重置扫描器状态
  scannerStore.resetState()

  setTimeout(() => {
    skeleton.value = false
  }, 300)
  pageJumps(activeItem.value)
})

// 设置窗口关闭时清理扫描器资源
onUnmounted(async () => {
  await scannerStore.cleanup()
})
</script>

<style scoped lang="scss">
@use '@/styles/scss/global/variable' as *;
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

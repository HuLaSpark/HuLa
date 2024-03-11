<template>
  <main class="left w-60px h-full p-[30px_6px_15px] box-border flex-col-center select-none">
    <!-- 头像 -->
    <div class="relative w-36px h-36px rounded-50%">
      <img class="rounded-50% wh-full bg-#fff cursor-pointer" :src="'https://picsum.photos/140'" alt="" />

      <div
        class="bg-[--bg-avatar] text-10px rounded-50% w-10px h-10px absolute bottom-0 right-0"
        style="border: 2px solid var(--bg-avatar)">
        <span>⛅</span>
      </div>
    </div>

    <div data-tauri-drag-region class="flex-1 mt-20px flex-col-x-center justify-between">
      <!-- 上部分操作栏 -->
      <header class="flex-col-x-center gap-10px color-[--icon-color]">
        <div
          v-for="(item, index) in itemsTop"
          :key="index"
          @click="pageJumps(item.url)"
          :class="[
            { active: activeItem === item.url && item.url !== 'dynamic' },
            openWindowsList.has(item.url) ? 'p-[6px_8px] color-#059669' : 'top-action'
          ]">
          <n-badge :value="item.badge" :max="99">
            <svg class="w-22px h-22px">
              <use
                :href="`#${activeItem === item.url || openWindowsList.has(item.url) ? item.iconAction : item.icon}`"></use>
            </svg>
          </n-badge>
        </div>
      </header>

      <!-- 下部分操作栏 -->
      <footer class="flex-col-x-center gap-10px color-[--icon-color]">
        <div
          v-for="(item, index) in itemsBottom"
          :key="index"
          @click="openContent(item.title, item.label)"
          :class="openWindowsList.has(item.url.substring(1)) ? 'p-[6px_8px] color-#059669' : 'bottom-action'">
          <svg class="w-22px h-22px">
            <use :href="`#${openWindowsList.has(item.url.substring(1)) ? item.iconAction : item.icon}`"></use>
          </svg>
        </div>

        <svg
          @click="settingShow = !settingShow"
          class="more w-22px h-22px relative"
          :class="{ 'color-#059669': settingShow }">
          <use :href="settingShow ? '#hamburger-button-action' : '#hamburger-button'"></use>
        </svg>

        <!--  更多选项面板  -->
        <div v-if="settingShow" class="setting-item">
          <div class="menu-list">
            <div v-for="(item, index) in menuList" :key="index">
              <div class="menu-item" @click="() => item.click()">
                <svg><use :href="`#${item.icon}`"></use></svg>
                {{ item.label }}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  </main>
</template>
<script setup lang="ts">
import { delay } from 'lodash-es'
import { useWindow } from '@/hooks/useWindow.ts'
import router from '@/router'
import Mitt from '@/utils/Bus.ts'
import { EventEnum } from '@/enums'
import { listen } from '@tauri-apps/api/event'
import { itemsTop, itemsBottom, menuList } from './configure.ts'

/*当前选中的元素 默认选中itemsTop的第一项*/
const activeItem = ref<string>(itemsTop.value[0].url)
const settingShow = ref(false)
/* 已打开窗口的列表 */
const openWindowsList = ref(new Set())
const { createWebviewWindow } = useWindow()

watchEffect(async () => {
  Mitt.on('updateMsgTotal', (event) => {
    itemsTop.value.find((item) => {
      if (item.url === 'message') {
        item.badge = event as number
      }
    })
  })
  await listen(EventEnum.WIN_SHOW, (e) => {
    // 如果已经存在就不添加
    if (openWindowsList.value.has(e.payload)) return
    openWindowsList.value.add(e.payload)
  })
  await listen(EventEnum.WIN_CLOSE, (e) => {
    openWindowsList.value.delete(e.payload)
  })
})

/**
 * 统一跳转路由方法
 * @param url 跳转的路由
 * */
const pageJumps = (url: string) => {
  // 判断是否是动态页面
  if (url === 'dynamic') {
    delay(async () => {
      await createWebviewWindow('动态', 'dynamic', 840, 800)
    }, 300)
  } else {
    activeItem.value = url
    router.push(`/${url}`)
  }
}

/**
 * 打开内容对应窗口
 * @param title 窗口的标题
 * @param label 窗口的标识
 * */
const openContent = (title: string, label: string) => {
  delay(async () => {
    await createWebviewWindow(title, label, 840, 600)
  }, 300)
}

const closeMenu = (event: any) => {
  if (!event.target.matches('.setting-item, .more, .more *')) {
    settingShow.value = false
  }
}

onMounted(() => {
  /* 页面加载的时候默认显示消息列表 */
  pageJumps(activeItem.value)
  window.addEventListener('click', closeMenu, true)
})

onUnmounted(() => {
  window.removeEventListener('click', closeMenu, true)
})
</script>

<style scoped lang="scss">
@mixin action() {
  padding: 6px 8px 6px 8px;
  &:not(.active):hover {
    background: rgba(193, 193, 193, 0.4);
    border-radius: 8px;
    color: #059669;
    cursor: pointer;
    animation: linearAnimation 3s linear forwards;
  }
}

.left {
  background: var(--left-bg-color);
}

.top-action,
.bottom-action,
.more {
  @include action;
}

.active {
  background: var(--left-active-color);
  border-radius: 8px;
  color: #059669;
}

.setting-item {
  @include menu-item-style(absolute);
  left: 58px;
  bottom: 10px;
  @include menu-list();
}

:deep(.n-badge .n-badge-sup) {
  font-weight: bold;
  font-size: 10px;
}

:deep(.n-badge) {
  color: inherit;
}
</style>

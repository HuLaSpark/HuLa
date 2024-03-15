<template>
  <main class="left w-60px h-full p-[30px_6px_15px] box-border flex-col-center select-none">
    <!-- 点击时头像内容框 -->
    <n-popover v-model:show="infoShow" trigger="click" :show-arrow="false" placement="right-start" style="padding: 0">
      <template #trigger>
        <!-- 头像 -->
        <div class="relative w-36px h-36px rounded-50% cursor-pointer">
          <img class="rounded-50% wh-full bg-#fff" :src="'https://picsum.photos/140'" alt="" />

          <div
            class="bg-[--bg-avatar] text-10px rounded-50% w-10px h-10px absolute bottom-0 right-0"
            style="border: 2px solid var(--bg-avatar)">
            <div class="rounded-50% bg-#059669 wh-full"></div>
          </div>
        </div>
      </template>
      <!-- 用户个人信息框 -->
      <n-space vertical :size="26" class="wh-full p-15px box-border rounded-8px" style="background: var(--bg-info)">
        <!-- 头像以及信息区域 -->
        <n-flex justify="space-between" align="center" :size="50">
          <n-space>
            <img class="w-68px h-68px rounded-50% select-none" :src="'https://picsum.photos/140'" alt="" />

            <n-flex vertical justify="center" :size="10" class="text-[--text-color]">
              <span class="text-18px">用户名</span>
              <span class="text-12px text-#909090">账号 763868126381</span>
              <n-flex
                @click="openContent('在线状态', 'onlineStatus', 360, 480)"
                :size="5"
                align="center"
                style="margin-left: -4px"
                class="item-hover">
                <div class="rounded-50% bg-#059669 w-12px h-12px"></div>
                <span>在线</span>
              </n-flex>
            </n-flex>
          </n-space>

          <n-flex vertical align="center" :size="5" class="item-hover">
            <svg class="w-20px h-20px"><use href="#thumbs-up"></use></svg>
            <span class="text-12px">9999+</span>
          </n-flex>
        </n-flex>
        <!-- 地址 -->
        <n-flex :size="26">
          <span class="text-#707070">所在地</span>
          <span>中国</span>
        </n-flex>
        <!-- 动态 -->
        <n-flex :size="40">
          <span class="text-#707070">动态</span>
          <n-image-group>
            <n-space :size="6">
              <n-image
                v-for="n in 4"
                :key="n"
                preview-disabled
                class="rounded-8px"
                width="50"
                src="https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg" />
            </n-space>
          </n-image-group>
        </n-flex>

        <n-flex justify="center" align="center" :size="40">
          <n-button secondary> 编辑资料 </n-button>
        </n-flex>
      </n-space>
    </n-popover>

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
            <div v-for="(item, index) in moreList" :key="index">
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
import { itemsTop, itemsBottom, moreList } from './config.ts'

/*当前选中的元素 默认选中itemsTop的第一项*/
const activeItem = ref<string>(itemsTop.value[0].url)
const settingShow = ref(false)
const infoShow = ref(false)
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
 * @param w 窗口的宽度
 * @param h 窗口的高度
 * */
const openContent = (title: string, label: string, w = 840, h = 600) => {
  delay(async () => {
    await createWebviewWindow(title, label, w, h)
  }, 300)
  infoShow.value = false
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
@import 'style';
</style>

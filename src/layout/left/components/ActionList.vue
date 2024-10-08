<template>
  <div ref="actionList" class="flex-1 mt-20px flex-col-x-center justify-between" data-tauri-drag-region>
    <!-- 上部分操作栏 -->
    <header ref="header" class="flex-col-x-center gap-10px color-[--left-icon-color]">
      <div
        v-for="(item, index) in menuTop"
        :key="index"
        :class="[
          { active: activeUrl === item.url && item.url !== 'dynamic' },
          openWindowsList.has(item.url) ? 'p-[6px_8px] color-[--left-win-icon-color]' : 'top-action'
        ]"
        @click="pageJumps(item.url, item.title, item.size, item.window)">
        <!-- 已经打开窗口时展示 -->
        <n-popover :show-arrow="false" v-if="openWindowsList.has(item.url)" trigger="hover" placement="right">
          <template #trigger>
            <n-badge :max="99" :value="item.badge">
              <svg class="size-22px" @click="tipShow = false">
                <use
                  :href="`#${activeUrl === item.url || openWindowsList.has(item.url) ? item.iconAction || item.icon : item.icon}`"></use>
              </svg>
            </n-badge>
          </template>
          <p>{{ item.title }} 已打开</p>
        </n-popover>
        <!-- 该选项有提示时展示 -->
        <n-popover style="padding: 12px" v-else-if="item.tip" trigger="manual" v-model:show="tipShow" placement="right">
          <template #trigger>
            <n-badge :max="99" :value="item.badge" dot :show="item.dot">
              <svg class="size-22px" @click="handleTipShow(item)">
                <use
                  :href="`#${activeUrl === item.url || openWindowsList.has(item.url) ? item.iconAction : item.icon}`"></use>
              </svg>
            </n-badge>
          </template>
          <n-flex align="center" justify="space-between">
            <p class="select-none">{{ item.tip }}</p>
            <svg @click="handleTipShow(item)" class="size-12px cursor-pointer"><use href="#close"></use></svg>
          </n-flex>
        </n-popover>
        <!-- 该选项无提示时展示 -->
        <n-badge v-else :max="99" :value="item.badge">
          <svg class="size-22px">
            <use
              :href="`#${activeUrl === item.url || openWindowsList.has(item.url) ? item.iconAction : item.icon}`"></use>
          </svg>
        </n-badge>
      </div>

      <!-- (独立)菜单选项 -->
      <n-popover
        style="padding: 8px; margin-left: 4px; background: var(--bg-setting-item)"
        :show-arrow="false"
        trigger="hover"
        placement="right">
        <template #trigger>
          <svg class="size-22px top-action">
            <use href="#menu"></use>
          </svg>
        </template>
        <div v-if="excessItems.length">
          <div
            v-for="(item, index) in excessItems as any"
            :key="'excess-' + index"
            class="p-[6px_10px] rounded-4px cursor-pointer hover:bg-[--setting-item-line]">
            {{ item.title }}
          </div>
        </div>
        <n-flex
          @click="menuShow = true"
          class="p-[6px_10px] rounded-4px cursor-pointer hover:bg-[--setting-item-line]"
          align="center"
          justify="space-between"
          :size="10">
          <svg class="size-16px">
            <use href="#settings"></use>
          </svg>
          <p class="select-none">插件管理</p>
        </n-flex>
      </n-popover>
    </header>

    <!-- 下部分操作栏 -->
    <footer class="flex-col-x-center gap-10px color-[--left-icon-color] select-none">
      <div
        v-for="(item, index) in itemsBottom"
        :key="index"
        :class="openWindowsList.has(item.url) ? 'p-[6px_8px] color-[--left-win-icon-color]' : 'bottom-action'"
        @click="pageJumps(item.url, item.title, item.size, item.window)">
        <!-- 已经打开窗口时展示 -->
        <n-popover :show-arrow="false" v-if="openWindowsList.has(item.url)" trigger="hover" placement="right">
          <template #trigger>
            <n-badge :max="99" :value="item.badge">
              <svg class="size-22px" @click="tipShow = false">
                <use
                  :href="`#${activeUrl === item.url || openWindowsList.has(item.url) ? item.iconAction : item.icon}`"></use>
              </svg>
            </n-badge>
          </template>
          <p>{{ item.title }} 已打开</p>
        </n-popover>
        <!-- 该选项有提示时展示 -->
        <n-popover style="padding: 12px" v-else-if="item.tip" trigger="manual" v-model:show="tipShow" placement="right">
          <template #trigger>
            <n-badge :max="99" :value="item.badge">
              <svg class="size-22px" @click="tipShow = false">
                <use
                  :href="`#${activeUrl === item.url || openWindowsList.has(item.url) ? item.iconAction : item.icon}`"></use>
              </svg>
            </n-badge>
          </template>
          <n-flex align="center" justify="space-between">
            <p class="select-none">{{ item.tip }}</p>
            <svg @click="tipShow = false" class="size-12px cursor-pointer"><use href="#close"></use></svg>
          </n-flex>
        </n-popover>
        <!-- 该选项无提示时展示 -->
        <n-badge v-else :max="99" :value="item.badge">
          <svg class="size-22px">
            <use
              :href="`#${activeUrl === item.url || openWindowsList.has(item.url) ? item.iconAction : item.icon}`"></use>
          </svg>
        </n-badge>
      </div>

      <!--  更多选项面板  -->
      <n-popover
        v-model:show="settingShow"
        style="padding: 0; background: transparent; user-select: none"
        :show-arrow="false"
        trigger="click">
        <template #trigger>
          <svg
            :class="{ 'color-[--left-active-hover]': settingShow }"
            class="more size-22px relative"
            @click="settingShow = !settingShow">
            <use :href="settingShow ? '#hamburger-button-action' : '#hamburger-button'"></use>
          </svg>
        </template>
        <div class="setting-item">
          <div class="menu-list">
            <div v-for="(item, index) in moreList" :key="index">
              <div class="menu-item" @click="() => item.click()">
                <svg><use :href="`#${item.icon}`"></use></svg>
                {{ item.label }}
              </div>
            </div>
          </div>
        </div>
      </n-popover>
    </footer>
  </div>

  <DefinePlugins v-model="menuShow" />
</template>
<script setup lang="ts">
import { itemsBottom, moreList } from '../config.tsx'
import { leftHook } from '../hook.ts'
import DefinePlugins from './definePlugins/index.vue'
import { useMenuTopStore } from '@/stores/menuTop.ts'
import { PluginEnum } from '@/enums'

const { menuTop } = useMenuTopStore()
// const headerRef = useTemplateRef('header')
// const actionListRef = useTemplateRef('actionList')
const excessItems = ref([]) // 用于存储超出的内容
const menuShow = ref(false)
const { activeUrl, openWindowsList, settingShow, tipShow, pageJumps } = leftHook()

const handleTipShow = (item: any) => {
  tipShow.value = false
  item.dot = false
}

onMounted(() => {
  if (tipShow.value) {
    menuTop.filter((item) => {
      if (item.state !== PluginEnum.BUILTIN) {
        item.dot = true
      }
    })
  }
  /** 十秒后关闭提示 */
  setTimeout(() => {
    tipShow.value = false
  }, 5000)

  // // 创建 ResizeObserver 实例并监听 headerRef
  // const resizeObserver = new ResizeObserver((entries) => {
  //   for (let entry of entries) {
  //     console.log(entry.contentRect.height)
  //     // if (entry.contentRect.height > 220) {
  //     //   // 计算需要移动的项数量
  //     //   const itemsToMove = Math.floor(itemsTop.value.length / 2) // 例如：移动一半
  //     //   excessItems.value = itemsTop.value.splice(-itemsToMove, itemsToMove)
  //     // }
  //   }
  // })
  //
  // // 观察 headerRef 的大小变化
  // if (headerRef.value) {
  //   resizeObserver.observe(headerRef.value)
  // }
  //
  // if (actionListRef.value) {
  //   resizeObserver.observe(actionListRef.value)
  // }
  //
  // // 在组件卸载时停止观察
  // onUnmounted(() => {
  //   resizeObserver.disconnect()
  // })
})
</script>
<style lang="scss" scoped>
@import '../style';
.setting-item {
  left: 24px;
  bottom: -40px;
}
</style>

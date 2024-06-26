<template>
  <div class="flex-1 mt-20px flex-col-x-center justify-between" data-tauri-drag-region>
    <!-- 上部分操作栏 -->
    <header class="flex-col-x-center gap-10px color-[--icon-color]">
      <div
        v-for="(item, index) in itemsTop"
        :key="index"
        :class="[
          { active: activeUrl === item.url && item.url !== 'dynamic' },
          openWindowsList.has(item.url) ? 'p-[6px_8px] color-#13987f' : 'top-action'
        ]"
        @click="pageJumps(item.url, item.title, item.size)">
        <n-popover style="padding: 12px" v-if="item.tip" trigger="manual" v-model:show="tipShow" placement="right">
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
        <n-badge v-else :max="99" :value="item.badge">
          <svg class="size-22px">
            <use
              :href="`#${activeUrl === item.url || openWindowsList.has(item.url) ? item.iconAction : item.icon}`"></use>
          </svg>
        </n-badge>
      </div>
    </header>

    <!-- 下部分操作栏 -->
    <footer class="flex-col-x-center gap-10px color-[--icon-color]">
      <div
        v-for="(item, index) in itemsBottom"
        :key="index"
        :class="openWindowsList.has(item.url.substring(1)) ? 'p-[6px_8px] color-#13987f' : 'bottom-action'"
        @click="openContent(item.title, item.label)">
        <svg class="size-22px">
          <use :href="`#${openWindowsList.has(item.url.substring(1)) ? item.iconAction : item.icon}`"></use>
        </svg>
      </div>

      <svg
        :class="{ 'color-#13987f': settingShow }"
        class="more size-22px relative"
        @click="settingShow = !settingShow">
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
</template>
<script setup lang="ts">
import { itemsBottom, itemsTop, moreList } from '../config.ts'
import { leftHook } from '../hook.ts'

const { activeUrl, openWindowsList, settingShow, tipShow, openContent, pageJumps } = leftHook()

onMounted(() => {
  /** 十秒后关闭提示 */
  setTimeout(() => {
    tipShow.value = false
  }, 10000)
})
</script>
<style lang="scss" scoped>
@import '../style';
</style>

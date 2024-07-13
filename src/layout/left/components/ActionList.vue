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
            <n-badge :max="99" :value="item.badge" dot :show="dotShow">
              <svg class="size-22px" @click="handleTipShow">
                <use
                  :href="`#${activeUrl === item.url || openWindowsList.has(item.url) ? item.iconAction : item.icon}`"></use>
              </svg>
            </n-badge>
          </template>
          <n-flex align="center" justify="space-between">
            <p class="select-none">{{ item.tip }}</p>
            <svg @click="handleTipShow" class="size-12px cursor-pointer"><use href="#close"></use></svg>
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
    </header>

    <!-- 下部分操作栏 -->
    <footer class="flex-col-x-center gap-10px color-[--icon-color]">
      <div
        v-for="(item, index) in itemsBottom"
        :key="index"
        :class="openWindowsList.has(item.url) ? 'p-[6px_8px] color-#13987f' : 'bottom-action'"
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
import { itemsBottom, itemsTop, moreList } from '../config.tsx'
import { leftHook } from '../hook.ts'

const dotShow = ref(false)
const { activeUrl, openWindowsList, settingShow, tipShow, pageJumps } = leftHook()

const handleTipShow = () => {
  tipShow.value = false
  dotShow.value = false
}

onMounted(() => {
  if (tipShow.value) {
    dotShow.value = true
  }
  /** 十秒后关闭提示 */
  setTimeout(() => {
    tipShow.value = false
  }, 5000)
})
</script>
<style lang="scss" scoped>
@import '../style';
</style>

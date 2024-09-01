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

      <!-- (独立)菜单选项 -->
      <n-popover style="padding: 8px; margin-left: 4px" :show-arrow="false" trigger="hover" placement="right">
        <template #trigger>
          <svg class="size-22px top-action">
            <use href="#menu"></use>
          </svg>
        </template>
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

      <!--  更多选项面板  -->
      <n-popover v-model:show="settingShow" style="padding: 0" :show-arrow="false" trigger="click">
        <template #trigger>
          <svg
            :class="{ 'color-#13987f': settingShow }"
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

  <DefinePlugins :show="menuShow" @close="(e) => (menuShow = e)" />
</template>
<script setup lang="ts">
import { itemsBottom, itemsTop, moreList } from '../config.tsx'
import { leftHook } from '../hook.ts'
import DefinePlugins from './DefinePlugins.vue'

const menuShow = ref(false)
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
.setting-item {
  left: 24px;
  bottom: -40px;
}
</style>

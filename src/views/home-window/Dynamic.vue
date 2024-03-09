<template>
  <!-- TODO 项目初次启动然后初次打开窗口时候这个页面的样式没有渲染出来 (nyh -> 2024-03-04 05:30:15) -->
  <!-- TODO 我需要点击最左边侧边栏时候的选中样式（如果是淡出弹出窗口就把图标点亮但是不用设置背景颜色，然后如果关闭了对应窗口就把图标恢复原来的样式） (nyh -> 2024-03-04 05:32:03) -->
  <main class="wh-full bg-[--right-bg-color]">
    <ActionBar :shrink="false" :max-w="false" :top-win-label="appWindow.label" :current-label="appWindow.label" />
    <article class="flex flex-col items-center text-[--text-color] wh-full bg-[--right-bg-color]">
      <n-scrollbar
        style="max-height: calc(100vh - 20px)"
        class="w-650px bg-[--center-bg-color] h-full p-[10px_0] box-border rounded-4px">
        <n-flex justify="center">
          <!--  动态内容框   -->
          <n-space
            vertical
            v-for="item in dynamicList"
            :key="item.id"
            class="w-450px h-fit rounded-8px bg-[--right-bg-color] p-10px box-border">
            <n-flex align="center">
              <!--  用户的头像和用户名以及个签    -->
              <img class="w-45px h-45px bg-#ccc rounded-50% select-none" :src="item.avatar" alt="" />
              <n-space vertical style="flex: 1">
                <n-flex justify="space-between" align="center">
                  <label class="text-14px flex items-center gap-5px">
                    <span :class="item.isAuth ? 'text-#059669' : ''">{{ item.user }}</span>
                    <n-popover trigger="hover" v-if="item.isAuth">
                      <template #trigger>
                        <svg class="w-20px h-20px color-#059669 select-none outline-none cursor-pointer">
                          <use href="#auth"></use>
                        </svg>
                      </template>
                      <span>著名歌手</span>
                    </n-popover>
                  </label>

                  <span class="text-12px color-#707070">发布于：2021-01-01</span>
                </n-flex>

                <span class="text-12px color-#707070">个性签名</span>
              </n-space>

              <!--  个签照片墙  -->
              <n-space vertical>
                <n-scrollbar style="max-height: 240px; user-select: none">
                  <n-image-group>
                    <n-flex>
                      <n-image
                        v-for="i in item.img"
                        :key="i.url"
                        :src="i.url"
                        alt=""
                        width="134px"
                        height="120px"
                        class="rounded-6px" />
                    </n-flex>
                  </n-image-group>
                </n-scrollbar>

                <n-input />
              </n-space>
            </n-flex>
          </n-space>
        </n-flex>
      </n-scrollbar>
    </article>
  </main>
</template>
<script setup lang="ts">
import { dynamicList } from '@/mock'
import { appWindow } from '@tauri-apps/api/window'
import { useWindowState } from '@/hooks/useWindowState.ts'

useWindowState(appWindow.label)
</script>

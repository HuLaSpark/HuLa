<template>
  <main class="size-full bg-[--right-bg-color]">
    <ActionBar :shrink="false" :max-w="false" :top-win-label="appWindow.label" :current-label="appWindow.label" />
    <article class="flex flex-col items-center text-[--text-color] size-full bg-[--right-bg-color]">
      <n-scrollbar
        style="max-height: calc(100vh - 20px)"
        class="w-650px bg-[--center-bg-color] h-full p-[10px_0] box-border rounded-4px">
        <n-flex justify="center">
          <!--  动态内容框   -->
          <n-flex
            vertical
            v-for="item in dynamicList"
            :key="item.id"
            class="w-450px h-fit rounded-8px bg-[--right-bg-color] p-10px box-border">
            <n-flex align="center">
              <!--  用户的头像和用户名以及个签    -->
              <img class="size-45px bg-#ccc rounded-50% select-none" :src="item.avatar" alt="" />
              <n-flex vertical style="flex: 1">
                <n-flex justify="space-between" align="center">
                  <label class="text-14px flex items-center gap-5px">
                    <span :class="item.isAuth ? 'text-#13987f' : ''">{{ item.user }}</span>
                    <n-popover trigger="hover" v-if="item.isAuth">
                      <template #trigger>
                        <svg class="size-20px color-#13987f select-none outline-none cursor-pointer">
                          <use href="#auth"></use>
                        </svg>
                      </template>
                      <span>著名歌手</span>
                    </n-popover>
                  </label>

                  <span class="text-(12px #707070)">发布于：2021-01-01</span>
                </n-flex>

                <span class="text-(12px #707070)">个性签名</span>
              </n-flex>

              <!--  个签照片墙  -->
              <n-flex vertical>
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
              </n-flex>
            </n-flex>
          </n-flex>
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

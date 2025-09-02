<template>
  <main data-tauri-drag-region class="flex-1 bg-[--right-bg-color] h-full w-100vw min-w-600px">
    <div class="size-full" :style="{ background: isChat ? 'var(--right-theme-bg-color)' : '' }" data-tauri-drag-region>
      <ActionBar :current-label="appWindow.label" />

      <!-- 需要判断当前路由是否是信息详情界面 -->
      <ChatBox v-if="isChat" />

      <Details :content="detailsContent" v-else-if="detailsShow && isDetails && detailsContent?.type !== 'apply'" />

      <!-- 好友申请列表 -->
      <ApplyList
        v-else-if="detailsContent && isDetails && detailsContent.type === 'apply'"
        :type="detailsContent.applyType" />

      <!-- 聊天界面背景图标 -->
      <div v-else class="flex-center size-full select-none">
        <img class="w-150px h-140px" src="/logoD.png" alt="" />
      </div>
    </div>
  </main>
</template>
<script setup lang="ts">
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { MittEnum, ThemeEnum } from '@/enums'
import { useMitt } from '@/hooks/useMitt.ts'
import router from '@/router'
import type { DetailsContent } from '@/services/types'
import { useSettingStore } from '@/stores/setting.ts'

const appWindow = WebviewWindow.getCurrent()
const settingStore = useSettingStore()
const { themes } = storeToRefs(settingStore)
const detailsShow = ref(false)
const detailsContent = ref<DetailsContent>()
const imgTheme = ref<ThemeEnum>(themes.value.content)
const prefers = matchMedia('(prefers-color-scheme: dark)')
// 判断当前路由是否是聊天界面
const isChat = computed(() => {
  return router.currentRoute.value.path.includes('/message')
})
// 判断当前路由是否是信息详情界面
const isDetails = computed(() => {
  return router.currentRoute.value.path.includes('/friendsList')
})

/** 跟随系统主题模式切换主题 */
const followOS = () => {
  imgTheme.value = prefers.matches ? ThemeEnum.DARK : ThemeEnum.LIGHT
}

watchEffect(() => {
  if (themes.value.pattern === ThemeEnum.OS) {
    followOS()
    prefers.addEventListener('change', followOS)
  } else {
    imgTheme.value = themes.value.content || ThemeEnum.LIGHT
    prefers.removeEventListener('change', followOS)
  }
})

onMounted(() => {
  if (isDetails) {
    useMitt.on(MittEnum.APPLY_SHOW, (event: { context: DetailsContent }) => {
      detailsContent.value = event.context
    })
    useMitt.on(MittEnum.DETAILS_SHOW, (event: any) => {
      detailsContent.value = event.context
      detailsShow.value = event.detailsShow as boolean
    })
  }
})
</script>

<template>
  <main data-tauri-drag-region class="flex-1 bg-[--right-bg-color] h-full w-100vw min-w-600px">
    <div class="size-full" :style="{ background: isChat ? 'var(--right-theme-bg-color)' : '' }" data-tauri-drag-region>
      <ActionBar :current-label="appWindow.label" />
      <ChatBox :active-item="activeItem" />

      <!-- 需要判断当前路由是否是信息详情界面 -->
      <!-- <ChatBox :active-item="activeItem" :key="activeItem?.roomId" v-if="msgBoxShow && isChat && activeItem !== -1" /> -->

      <!-- <Details :content="DetailsContent" v-else-if="detailsShow && isDetails && DetailsContent.type !== 'apply'" /> -->

      <!-- 好友申请列表 -->
      <!-- <ApplyList v-else-if="DetailsContent && isDetails && DetailsContent.type === 'apply'" /> -->

      <!-- 聊天界面背景图标 -->
      <!-- <div v-else class="flex-center size-full select-none">
        <img
          v-if="imgTheme === ThemeEnum.DARK && themes.versatile === 'default' && !isDetails"
          class="w-110px h-100px"
          src="@/assets/img/hula_bg_d.svg"
          alt="" />
        <img v-else-if="imgTheme === ThemeEnum.DARK" class="w-110px h-100px" src="@/assets/img/hula-bg-h.png" alt="" />
        <img v-else class="svg-icon w-110px h-100px" src="@/assets/img/hula_bg_l.png" alt="" />
      </div> -->
    </div>
  </main>
</template>
<script setup lang="ts">
// import router from '@/router'
import { useSettingStore } from '@/stores/setting.ts'
import { MittEnum, ThemeEnum } from '@/enums'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useMitt } from './hooks/useMitt'
import { SessionItem } from './services/types'

const router = useRouter()

const activeItem = ref<SessionItem>()

// // 当前消息游标
// let messageCursor: string | undefined = undefined

// const loadMessageList = async (roomId: string) => {
//   const params = {
//     pageSize: 20,
//     // cursor: undefined,
//     roomId
//   }

//   if (messageCursor) {
//     Reflect.set(params, 'cursor', messageCursor)
//   }
//   const response = await apis.getMsgList()

//   console.log('response =======>>> ', response);

// }

// // TODO 路由即将改变，在此清理数据
// onBeforeRouteUpdate((l) => {
//   messageCursor = undefined
//   console.log('onBeforeRouteUpdate ===>> ', l)
// })

// // TODO 路由已经改变，在此处进行初始化
// watch(() => route.params.id, (roomId) => {
//   roomId =Array.isArray(roomId) ? roomId[0] : roomId
//   loadMessageList(roomId)
//   console.log('roomId =======>>>>', roomId)
// }, { immediate: true })

const appWindow = WebviewWindow.getCurrent()
const settingStore = useSettingStore()
const { themes } = storeToRefs(settingStore)
const imgTheme = ref<ThemeEnum>(themes.value.content)
const prefers = matchMedia('(prefers-color-scheme: dark)')
// 判断当前路由是否是聊天界面
const isChat = computed(() => {
  return router.currentRoute.value.path.includes('/message')
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
  // if (isChat) {
  useMitt.on(MittEnum.MSG_BOX_SHOW, (event: any) => {
    activeItem.value = event.item
  })
  // }

  // if (isDetails) {
  //   useMitt.on(MittEnum.APPLY_SHOW, (event: any) => {
  //     DetailsContent.value = event.context
  //   })
  //   useMitt.on(MittEnum.DETAILS_SHOW, (event: any) => {
  //     DetailsContent.value = event.context
  //     detailsShow.value = event.detailsShow as boolean
  //   })
  // }
})
</script>

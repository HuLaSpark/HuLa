<template>
  <div class="flex-1 bg-#f1f1f1 h-full w-100vw">
    <ActionBar />
    <!-- 需要判断当前路由是否是信息详情界面 -->
    <ChatMain v-if="msgBoxShow && router.currentRoute.value.path.includes('/message')" />

    <Details v-else-if="detailsShow && router.currentRoute.value.path.includes('/friendsList')" />

    <!-- 聊天界面背景图标 -->
    <div v-else class="flex-center wh-full select-none">
      <img class="w-130px h-100px" src="@/assets/img/hula_bg.png" alt="" />
    </div>
  </div>
</template>
<script setup lang="ts">
import Mitt from '@/utils/Bus.ts'
import router from '@/router'

const msgBoxShow = ref(false)
const detailsShow = ref(false)

Mitt.on('msgBoxShow', (event) => {
  msgBoxShow.value = event as boolean
})

Mitt.on('detailsShow', (event) => {
  detailsShow.value = event as boolean
})
</script>

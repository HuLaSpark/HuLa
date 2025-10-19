<template>
  <AutoFixHeightPage>
    <template #header>
      <HeaderBar
        ref="headerBar"
        :room-name="
          globalStore.currentSession.remark ? globalStore.currentSession.remark : globalStore.currentSession.name
        "
        :msg-count="1002"
        :is-official="globalStore.currentSession.roomId === '1'"
        @room-name-click="handleRoomNameClick" />
    </template>
    <template #container>
      <div @click="handleChatMainClick" class="h-full overflow-y-auto">
        <ChatMain @scroll="handleScroll" />
      </div>
    </template>
    <template #footer>
      <FooterBar ref="footerBar"></FooterBar>
    </template>
  </AutoFixHeightPage>
</template>

<script setup lang="ts">
import router from '@/router'
import { useGlobalStore } from '@/stores/global'
import { useMitt } from '@/hooks/useMitt'
import { MittEnum } from '@/enums'

defineOptions({
  name: 'mobileChatRoomDefault'
})

const globalStore = useGlobalStore()

const footerBar = ref<any>()
const headerBar = ref<any>()

const props = defineProps<{
  uid?: ''
}>()

const emitClosePanel = () => {
  useMitt.emit(MittEnum.MOBILE_CLOSE_PANEL)
}

const handleChatMainClick = () => {
  emitClosePanel()
}

const handleScroll = () => {
  emitClosePanel()
}

const handleRoomNameClick = () => {
  if (props.uid) {
    router.push(`/mobile/mobileFriends/friendInfo/${props.uid}`)
  }
}
</script>

<style lang="scss">
@use '@/styles/scss/render-message';
</style>

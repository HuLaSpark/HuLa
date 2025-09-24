<template>
  <AutoFixHeightPage>
    <template #header>
      <HeaderBar
        ref="header"
        :room-name="
          globalStore.currentSession.remark ? globalStore.currentSession.remark : globalStore.currentSession.name
        "
        :msg-count="1002"
        :is-official="globalStore.currentSession.roomId === '1'"
        @room-name-click="handleRoomNameClick" />
    </template>
    <template #container>
      <ChatMain />
    </template>
    <template #footer>
      <FooterBar></FooterBar>

      <SafeAreaPlaceholder ref="keyBoardRef" type="keyboard" direction="bottom" />
    </template>
  </AutoFixHeightPage>
</template>

<script setup lang="ts">
import router from '@/router'
import { useGlobalStore } from '@/stores/global'

const props = defineProps<{
  uid?: ''
}>()

const globalStore = useGlobalStore()

const handleRoomNameClick = () => {
  if (props.uid) {
    router.push(`/mobile/mobileFriends/friendInfo/${props.uid}`)
  }
}
</script>

<style lang="scss">
@use '@/styles/scss/render-message';
</style>

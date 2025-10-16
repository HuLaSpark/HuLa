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
      <div class="h-full overflow-y-auto">
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

defineOptions({
  name: 'mobileChatRoomDefault'
})

const globalStore = useGlobalStore()

const footerBar = ref<any>()
const headerBar = ref<any>()

const props = defineProps<{
  uid?: ''
}>()

const handleScroll = () => {
  const input = footerBar.value?.footerBarInput
  if (input && 'blur' in input) {
    ;(input as HTMLInputElement).blur()
  }
  const closePanel = footerBar.value?.closePanel
  if (closePanel && typeof closePanel === 'function') {
    closePanel()
  }
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

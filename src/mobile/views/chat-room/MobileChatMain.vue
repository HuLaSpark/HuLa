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
      <ChatMain :footer-height="footerBarHeight" @scroll="handleScroll" />
    </template>
    <template #footer>
      <FooterBar ref="footerBar" @update-height="onFooterBarUpdateHeight"></FooterBar>

      <SafeAreaPlaceholder ref="keyBoardRef" type="keyboard" direction="bottom" />
    </template>
  </AutoFixHeightPage>
</template>

<script setup lang="ts">
import router from '@/router'
import { useGlobalStore } from '@/stores/global'
import { useMobileStore } from '~/src/stores/mobile'

defineOptions({
  name: 'mobileChatRoomDefault'
})

const globalStore = useGlobalStore()
const mobileStore = useMobileStore()

const footerBar = ref<any>()
const headerBar = ref<any>()

const props = defineProps<{
  uid?: ''
}>()

let firstLoad = false

let headerBarHeight = 0

const footerBarHeight = ref(270)

const onFooterBarUpdateHeight = async (height: number) => {
  if (!firstLoad) {
    await nextTick()
    firstLoad = true

    if (headerBar.value?.rootEl) {
      headerBarHeight = headerBar.value.rootEl.offsetHeight
    }

    footerBarHeight.value = height + mobileStore.safeArea.bottom + mobileStore.safeArea.top + headerBarHeight
  }
}

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

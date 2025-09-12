<template>
  <AutoFixHeightPage>
    <template #header>
      <HeaderBar
        ref="header"
        :room-name="
          globalStore.currentSession.remark ? globalStore.currentSession.remark : globalStore.currentSession.name
        "
        :msg-count="1002" />
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
import { useGlobalStore } from '~/src/stores/global'

const globalStore = useGlobalStore()
</script>

<style lang="scss">
@use '@/styles/scss/chat-main';
</style>

<template>
  <AutoFixHeightPage>
    <template #header>
      <HeaderBar ref="header" room-name="官方3群" :msg-count="1002" />
    </template>
    <template #container>
      <div v-for="i in testList" :key="i" class="h-100px w-full bg-green">{{ i }}</div>
    </template>
    <template #footer>
      <FooterBar></FooterBar>
    </template>
  </AutoFixHeightPage>
</template>

<script setup lang="ts">
import AutoFixHeightPage from '@/mobile/components/chat-room/AutoFixHeightPage.vue'
import HeaderBar from '@/mobile/components/chat-room/HeaderBar.vue'
import FooterBar from '@/mobile/components/chat-room/FooterBar.vue'

const header = ref()

const testList = computed(() => {
  let a = []
  for (let i = 0; i < 20; i++) {
    a.push(i)
  }
  return a
})
</script>

<style lang="scss"></style>

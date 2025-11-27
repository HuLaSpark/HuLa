<template>
  <div class="agreement-container">
    <!-- 顶部操作栏 -->
    <ActionBar
      :isDrag="false"
      :max-w="false"
      :min-w="false"
      :shrink="false"
      :current-label="WebviewWindow.getCurrent().label" />

    <!-- 协议内容 -->
    <div class="agreement-content">
      <div class="agreement-header">
        <h1>{{ serverHeader.title }}</h1>
        <p class="update-time">{{ serverHeader.updatedAt }}</p>
      </div>

      <div class="agreement-body">
        <section v-for="section in serverSections" :key="section.title">
          <h2>{{ section.title }}</h2>

          <p v-for="(paragraph, pIndex) in section.paragraphs" :key="`paragraph-${pIndex}`">
            {{ paragraph }}
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getCurrentWebviewWindow, WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

type AgreementSection = {
  title: string
  paragraphs?: string[]
}

type AgreementHeader = {
  title: string
  updatedAt: string
}

const { tm } = useI18n()

const serverHeader = computed(() => tm('agreement.server.header') as AgreementHeader)
const serverSections = computed(() => tm('agreement.server.sections') as AgreementSection[])

onMounted(async () => {
  await getCurrentWebviewWindow().show()
})
</script>

<style scoped lang="scss">
@use '@/styles/scss/agreement';
</style>

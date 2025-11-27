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
        <h1>{{ privacyHeader.title }}</h1>
        <p class="update-time">{{ privacyHeader.updatedAt }}</p>
      </div>

      <div class="agreement-body">
        <section v-for="section in privacySections" :key="section.title">
          <h2>{{ section.title }}</h2>

          <p v-for="(paragraph, pIndex) in section.paragraphs" :key="`paragraph-${pIndex}`">
            {{ paragraph }}
          </p>

          <template v-for="(subSection, sIndex) in section.subSections" :key="`sub-${sIndex}`">
            <h3>{{ subSection.subtitle }}</h3>
            <p v-for="(subParagraph, spIndex) in subSection.paragraphs" :key="`sub-paragraph-${spIndex}`">
              {{ subParagraph }}
            </p>
          </template>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getCurrentWebviewWindow, WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

type AgreementSubSection = {
  subtitle: string
  paragraphs?: string[]
}

type AgreementSection = {
  title: string
  paragraphs?: string[]
  subSections?: AgreementSubSection[]
}

type AgreementHeader = {
  title: string
  updatedAt: string
}

const { tm } = useI18n()

const privacyHeader = computed(() => tm('agreement.privacy.header') as AgreementHeader)
const privacySections = computed(() => tm('agreement.privacy.sections') as AgreementSection[])

onMounted(async () => {
  await getCurrentWebviewWindow().show()
})
</script>

<style scoped lang="scss">
@use '@/styles/scss/agreement';
</style>

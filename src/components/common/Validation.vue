<template>
  <n-flex align="center" :size="6">
    <svg class="size-14px" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 48 48">
      <path
        :data-follow-stroke="strokeColor"
        :data-follow-fill="fillColor"
        stroke-linejoin="round"
        stroke-width="4"
        :stroke="strokeColor"
        :fill="fillColor"
        d="M24 44a19.937 19.937 0 0 0 14.142-5.858A19.937 19.937 0 0 0 44 24a19.938 19.938 0 0 0-5.858-14.142A19.937 19.937 0 0 0 24 4 19.938 19.938 0 0 0 9.858 9.858 19.938 19.938 0 0 0 4 24a19.937 19.937 0 0 0 5.858 14.142A19.938 19.938 0 0 0 24 44Z" />
      <path
        :data-follow-stroke="strokeColor"
        stroke-linejoin="round"
        stroke-linecap="round"
        stroke-width="4"
        :stroke="strokeColor"
        d="m16 24 6 6 12-12" />
    </svg>
    <p
      :class="[
        'text-12px',
        { 'color-#131313 dark:color-#fefefe': isValid, 'color-#909090 dark:color-#707070': !isValid }
      ]">
      {{ message }}
    </p>
  </n-flex>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ThemeEnum } from '@/enums'
import { useSettingStore } from '@/stores/setting'

const props = defineProps<{
  value: string
  message?: string
  validator?: (value: string) => boolean
}>()

const settingStore = useSettingStore()
const { themes } = storeToRefs(settingStore)

const isDarkMode = computed(() => {
  const theme = themes.value.content || document.documentElement.dataset.theme
  return theme === ThemeEnum.DARK
})

const successStrokeColor = computed(() => (isDarkMode.value ? '#4bd9bd' : '#13987f'))
const neutralStrokeColor = computed(() => (isDarkMode.value ? '#bdbdbd' : '#909090'))
const successFillColor = computed(() => (isDarkMode.value ? '#143a32' : '#AFDBD2'))
const neutralFillColor = computed(() => (isDarkMode.value ? '#303030' : '#fefefe'))

const isValid = computed(() => (props.validator ? props.validator(props.value) : true))
const strokeColor = computed(() => (isValid.value ? successStrokeColor.value : neutralStrokeColor.value))
const fillColor = computed(() => (isValid.value ? successFillColor.value : neutralFillColor.value))
</script>

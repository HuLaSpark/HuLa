<script setup lang="ts">
import { ThemeEnum } from '@/enums'
import { useSettingStore } from '@/stores/setting'

const settingStore = useSettingStore()
const { themes } = storeToRefs(settingStore)
const imgTheme = ref<ThemeEnum>(themes.value.content)
</script>

<template>
  <div class="flex-center size-full select-none">
    <img
      v-if="imgTheme === ThemeEnum.DARK && themes.versatile === 'default'"
      class="w-110px h-100px"
      src="@/assets/img/hula_bg_d.svg"
      alt="" />
    <img v-else-if="imgTheme === ThemeEnum.DARK" class="w-110px h-100px" src="@/assets/img/hula-bg-h.png" alt="" />
    <img v-else class="svg-icon w-110px h-100px" src="@/assets/img/hula_bg_l.png" alt="" />
  </div>
</template>

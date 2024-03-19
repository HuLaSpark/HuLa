<template>
  <component :is="componentMap" :body="message.body" :data-message-id="message.id" />
</template>
<script setup lang="ts">
import { MsgEnum } from '@/enums'
import type { MsgType } from '@/services/types'
import Text from './Text.vue'
import Image from './Image.vue'

const componentMap = {
  [MsgEnum.TEXT]: Text,
  [MsgEnum.IMAGE]: Image
}

defineProps<{ message: MsgType }>()
</script>

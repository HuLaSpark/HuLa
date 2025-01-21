<template>
  <component :is="componentMap[message.type]" :body="message.body" :data-message-id="message.id" />
</template>
<script setup lang="ts">
import { MsgEnum } from '@/enums'
import type { MsgType } from '@/services/types'
import Text from './Text.vue'
import Image from './Image.vue'
import type { Component } from 'vue'

const componentMap: Partial<Record<MsgEnum, Component>> = {
  [MsgEnum.TEXT]: Text,
  [MsgEnum.IMAGE]: Image
}

defineProps<{ message: MsgType }>()
</script>

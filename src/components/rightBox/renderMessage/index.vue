<template>
  <component :is="componentMap[message.type]" :body="message.body" :data-message-id="message.id" />
</template>
<script setup lang="ts">
import { MsgEnum } from '@/enums'
import type { MsgType } from '@/services/types'
import Text from './Text.vue'
import type { Component } from 'vue'

const componentMap: Partial<Record<MsgEnum, Component>> = {
  [MsgEnum.TEXT]: Text
}

defineProps<{ message: MsgType }>()
</script>

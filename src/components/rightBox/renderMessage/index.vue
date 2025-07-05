<template>
  <component
    :is="componentMap[message.type]"
    :body="message.body"
    :message-status="message.status"
    :upload-progress="uploadProgress"
    :from-user-uid="fromUser?.uid"
    :data-message-id="message.id" />
</template>
<script setup lang="ts">
import { MsgEnum } from '@/enums'
import type { MsgType } from '@/services/types'
import Text from './Text.vue'
import Image from './Image.vue'
import Emoji from './Emoji.vue'
import Announcement from './Announcement.vue'
import type { Component } from 'vue'
import Video from './Video.vue'
import Voice from './Voice.vue'
import File from './File.vue'

const componentMap: Partial<Record<MsgEnum, Component>> = {
  [MsgEnum.TEXT]: Text,
  [MsgEnum.IMAGE]: Image,
  [MsgEnum.EMOJI]: Emoji,
  [MsgEnum.VIDEO]: Video,
  [MsgEnum.VOICE]: Voice,
  [MsgEnum.FILE]: File,
  [MsgEnum.NOTICE]: Announcement
}

defineProps<{
  message: MsgType
  uploadProgress?: number
  fromUser?: {
    uid: string
  }
}>()
</script>

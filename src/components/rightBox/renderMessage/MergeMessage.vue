<template>
  <ChatMultiMsg :content-list="body.content" :msg-ids="msgIds" :msg-id="message.id" />
</template>

<script setup lang="ts">
import type { MergeBody, MsgType } from '@/services/types'
import type { MsgId } from '@/typings/global'

const { body, message } = defineProps<{
  body: MergeBody
  message: MsgType
}>()

const msgIds = computed((): MsgId[] => {
  return body.body.map((item) => {
    return {
      msgId: item.messageId,
      fromUid: item.uid
    }
  })
})
</script>

<style scoped lang="scss"></style>

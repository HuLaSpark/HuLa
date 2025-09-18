<template>
  <ChatMultiMsg :content-list="body.content" :msg-ids="msgIds" />
</template>

<script setup lang="ts">
import type { MergeBody } from '@/services/types'
import type { MsgId } from '@/typings/global'

const props = defineProps<{
  body: MergeBody
}>()

const { body } = toRefs(props)

const msgIds = computed((): MsgId[] => {
  return body.value.body.map((item) => {
    return {
      msgId: item.messageId,
      fromUid: item.uid
    }
  })
})

onMounted(() => {
  // console.log(props.body.body)
})
</script>

<style scoped lang="scss"></style>

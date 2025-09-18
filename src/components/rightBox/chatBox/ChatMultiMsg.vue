<template>
  <div class="border-solid border-2 border-#F9F9F9 p-2" @click="openMultiMsgWindow">
    <p class="font-600 text-size-14px mb-2">群聊的聊天记录</p>
    <div class="max-h-15 overflow-hidden">
      <p v-for="msg in multiMsgAbbreviation" class="text-size-14px text-#A2A2A2 line-height-normal truncate">
        {{ msg }}
      </p>
    </div>
    <n-divider class="!my-2" />
    <p class="text-size-14px text-#A2A2A2">聊天记录</p>
  </div>
</template>

<script setup lang="ts">
import { useWindow } from '@/hooks/useWindow'
import type { MessageType } from '@/services/types'
import { useGroupStore } from '@/stores/group'

const props = defineProps<{
  msgList: MessageType[]
}>()
const groupStore = useGroupStore()

const { msgList } = toRefs(props)
const { createWindow, sendWindowPayload } = useWindow()

const multiMsgAbbreviation = computed(() => {
  return msgList.value.map((msg) => {
    const userInfo = groupStore.getUserInfo(msg.fromUser.uid)
    const content = msg.message.body.content
    return userInfo?.name + ': ' + content
  })
})

const openMultiMsgWindow = async () => {
  const label = 'multiMsg--' + Date.now()
  try {
    // 创建窗口
    await createWindow({
      title: '聊天记录',
      label: label,
      width: 800,
      height: 600,
      wantCloseWindow: undefined,
      resizable: true,
      minW: 600,
      minH: 400,
      transparent: false,
      visible: true,
      queryParams: {
        key: label
      }
    })

    // 向窗口发送消息数据
    await sendWindowPayload(
      label,
      msgList.value.map((item) => {
        return {
          msgId: item.message.id,
          fromUid: item.fromUser.uid
        }
      })
    )
  } catch (e) {
    console.error('创建合并消息窗口失败:', e)
    window.$message?.error('打开聊天记录失败')
  }
}
</script>

<style scoped lang="scss"></style>

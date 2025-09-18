<template>
  <div class="border-solid border-2 border-#F9F9F9 p-2" @click="openMultiMsgWindow">
    <p class="font-600 text-size-14px mb-2">群聊的聊天记录</p>
    <div class="max-h-15 overflow-hidden">
      <p v-for="content in contentList" class="text-size-14px text-#A2A2A2 line-height-normal truncate">
        {{ content }}
      </p>
    </div>
    <n-divider class="!my-2" />
    <p class="text-size-14px text-#A2A2A2">聊天记录</p>
  </div>
</template>

<script setup lang="ts">
import { useWindow } from '@/hooks/useWindow'
import type { MsgId } from '@/typings/global'

const props = defineProps<{
  contentList: string[]
  msgIds: MsgId[]
}>()

const { contentList, msgIds } = toRefs(props)
const { createWindow, sendWindowPayload } = useWindow()

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
    await sendWindowPayload(label, msgIds.value)
  } catch (e) {
    console.error('创建合并消息窗口失败:', e)
    window.$message?.error('打开聊天记录失败')
  }
}
</script>

<style scoped lang="scss"></style>

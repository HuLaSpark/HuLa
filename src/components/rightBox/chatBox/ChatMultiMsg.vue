<template>
  <main
    style="cursor: default; user-select: none"
    class="w-280px flex flex-col h-fit bg-[--group-notice-bg] rounded-8px p-8px box-border custom-shadow"
    @click.stop="openMultiMsgWindow">
    <p class="text-(14px [--text-color]) pb-12px">群聊的聊天记录</p>

    <div class="max-h-90px overflow-hidden mx-6px">
      <p v-for="content in contentList" class="text-(12px [--chat-text-color]) line-height-normal truncate">
        {{ content }}
      </p>
    </div>

    <p class="w-full h-1px bg-#e3e3e3 dark:bg-#80808050 my-6px"></p>

    <p class="text-(12px [--text-color]) ml-a">聊天记录</p>
  </main>
</template>

<script setup lang="ts">
import { EventEnum } from '@/enums'
import { useWindow } from '@/hooks/useWindow'
import type { MsgId } from '@/typings/global'

const { contentList, msgIds, msgId } = defineProps<{
  contentList: string[]
  msgIds: MsgId[]
  msgId?: string
}>()

const { createWebviewWindow, sendWindowPayload } = useWindow()

const openMultiMsgWindow = async () => {
  const label = msgId ? `${EventEnum.MULTI_MSG}${msgId}` : EventEnum.MULTI_MSG
  try {
    // 创建窗口
    await createWebviewWindow('聊天记录', label, 600, 600, undefined, true, 600, 400, undefined, undefined, {
      key: label
    })

    // 向窗口发送消息数据
    await sendWindowPayload(label, msgIds)
  } catch (e) {
    console.error('创建聊天记录窗口失败:', e)
    window.$message?.error('打开聊天记录失败')
  }
}
</script>

<style scoped lang="scss"></style>
